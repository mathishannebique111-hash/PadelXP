import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import OpenAI from "openai";
import { buildSystemPrompt } from "@/lib/coach/system-prompt";
import { loadPlayerContext } from "@/lib/coach/player-context";
import { getCoachName } from "@/lib/coach/coach-names";
import { logger } from "@/lib/logger";

const DAILY_LIMIT = 5;
const MAX_HISTORY_MESSAGES = 20;

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* read-only */ },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Parse body
    const { conversationId, message } = await req.json();
    if (!conversationId || !message?.trim()) {
      return new Response(
        JSON.stringify({ error: "conversationId et message requis" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const admin = getAdmin();

    // 3. Vérifier que la conversation appartient à l'utilisateur
    const { data: conv } = await admin
      .from("coach_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (!conv) {
      return new Response(
        JSON.stringify({ error: "Conversation non trouvée" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Rate limiting — vérifier AVANT d'appeler OpenAI
    const { data: profile } = await admin
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single();

    const isPremium = profile?.is_premium || false;

    if (!isPremium) {
      // Lire le compteur AVANT d'incrémenter pour ne pas gaspiller
      const { data: currentCount } = await admin.rpc("get_coach_usage", {
        p_user_id: user.id,
      });

      if ((currentCount ?? 0) >= DAILY_LIMIT) {
        return new Response(
          JSON.stringify({
            error: "limit_reached",
            message: "Tu as atteint ta limite de 5 messages par jour. Passe Premium pour un accès illimité !",
            used: currentCount,
            limit: DAILY_LIMIT,
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }

      // Incrémenter seulement si sous la limite
      await admin.rpc("increment_coach_usage", {
        p_user_id: user.id,
      });
    }

    // 5. Sauvegarder le message utilisateur
    await admin.from("coach_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: message.trim(),
    });

    // 6. Mettre à jour le titre si c'est le premier message
    const { data: msgCount } = await admin
      .from("coach_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId);

    // @ts-expect-error — Supabase count query
    if (msgCount === null || (typeof msgCount === "number" ? msgCount : msgCount?.length) <= 1) {
      const title = message.trim().slice(0, 60) + (message.trim().length > 60 ? "..." : "");
      await admin
        .from("coach_conversations")
        .update({ title })
        .eq("id", conversationId);
    }

    // 7. Charger le contexte joueur et l'historique
    const [playerContext, historyResult] = await Promise.all([
      loadPlayerContext(user.id),
      admin
        .from("coach_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(MAX_HISTORY_MESSAGES),
    ]);

    const history = historyResult.data || [];

    // 8. Construire les messages pour OpenAI
    const coachName = getCoachName(user.id);
    const systemPrompt = buildSystemPrompt(playerContext, coachName);
    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // 9. Appeler OpenAI en streaming
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openaiMessages,
      max_tokens: 1500,
      temperature: 0.7,
      stream: true,
    });

    // 10. Retourner un ReadableStream
    let fullResponse = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
          controller.close();

          // Sauvegarder la réponse complète en DB
          if (fullResponse.trim()) {
            await admin.from("coach_messages").insert({
              conversation_id: conversationId,
              role: "assistant",
              content: fullResponse.trim(),
            });
          }
        } catch (error) {
          logger.error("[coach/chat] Streaming error", {
            error: error instanceof Error ? error.message : String(error),
          });
          controller.error(error);

          // Sauvegarder même en cas d'erreur partielle
          if (fullResponse.trim()) {
            await admin.from("coach_messages").insert({
              conversation_id: conversationId,
              role: "assistant",
              content: fullResponse.trim(),
            });
          }
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    logger.error("[coach/chat] Error", { error: (error as Error).message });
    return new Response(
      JSON.stringify({ error: "Erreur serveur", details: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
