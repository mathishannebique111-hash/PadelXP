import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v4.14.4/index.ts";

const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID");
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID");
const APNS_BUNDLE_ID = "eu.padelxp.player";
const APNS_PRIVATE_KEY = Deno.env.get("APNS_PRIVATE_KEY");

serve(async (req) => {
    try {
        const { record } = await req.json();

        const userId = record.user_id;
        const title = record.title;
        const body = record.message;
        const data = record.data;

        // Validation des secrets
        if (!APNS_KEY_ID || !APNS_TEAM_ID || !APNS_PRIVATE_KEY) {
            console.error("Missing APNs credentials");
            return new Response(JSON.stringify({ error: "Missing APNs credentials" }), { status: 500 });
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { data: tokens, error: tokensError } = await supabase
            .from("push_tokens")
            .select("token, platform")
            .eq("user_id", userId);

        if (tokensError) throw tokensError;
        if (!tokens || tokens.length === 0) {
            return new Response(JSON.stringify({ message: "No tokens found" }), { status: 200 });
        }

        // Générer le token JWT pour APNs
        const jwt = await generateApnsToken(APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY);

        const results = await Promise.all(tokens.map(async (t) => {
            if (t.platform === "ios") {
                return await sendToAPNs(t.token, title, body, data, jwt);
            }
            return { status: "skipped", platform: t.platform };
        }));

        return new Response(JSON.stringify({ results }), { status: 200 });

    } catch (error) {
        console.error("Error processing notification:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});

async function generateApnsToken(keyId: string, teamId: string, privateKey: string) {
    // Nettoyage robuste de la clé privée
    let p8 = privateKey;

    // Si la clé ne contient pas les headers, on suppose qu'elle est mal formatée ou partielle
    if (!p8.includes("-----BEGIN PRIVATE KEY-----")) {
        // Tenter de nettoyer et reconstruire
        const rawKey = p8.replace(/\\n/g, '').replace(/\s/g, '');
        p8 = `-----BEGIN PRIVATE KEY-----\n${rawKey}\n-----END PRIVATE KEY-----`;
    } else {
        // Remplacer les \n littéraux par de vrais sauts de ligne si nécessaire
        p8 = p8.replace(/\\n/g, '\n');
    }

    // Assurer que les sauts de ligne sont corrects pour pem import
    // (Certains copier-coller suppriment les sauts de ligne du body)
    // Cette étape est délicate, le mieux est de faire confiance au replace précédent si la clé est complète.

    console.log(`[Auth] Key length: ${p8.length}`); // Debug log

    const privateKeyObj = await importPKCS8(p8, 'ES256');

    return new SignJWT({})
        .setProtectedHeader({ alg: 'ES256', kid: keyId })
        .setIssuer(teamId)
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(privateKeyObj);
}

async function sendToAPNs(deviceToken: string, title: string, body: string, data: any, jwt: string) {
    const productionEndpoint = "https://api.push.apple.com/3/device";
    const sandboxEndpoint = "https://api.sandbox.push.apple.com/3/device";

    async function send(endpoint: string) {
        const response = await fetch(`${endpoint}/${deviceToken}`, {
            method: "POST",
            headers: {
                "authorization": `bearer ${jwt}`,
                "apns-topic": APNS_BUNDLE_ID,
                "apns-push-type": "alert",
                "apns-priority": "10"
            },
            body: JSON.stringify({
                aps: {
                    alert: { title, body },
                    sound: "default",
                    badge: 1
                },
                data: data || {}
            })
        });

        if (!response.ok) {
            const text = await response.text();
            return { ok: false, status: response.status, error: text };
        }
        return { ok: true };
    }

    // 1. Tenter l'envoi vers la Production
    console.log(`[APNs] Sending to Production: ${deviceToken}`);
    let result = await send(productionEndpoint);

    // 2. Si échec "BadDeviceToken", tenter le Sandbox (cas du développement)
    if (!result.ok && result.status === 400 && result.error.includes("BadDeviceToken")) {
        console.log(`[APNs] Production failed with BadDeviceToken. Retrying with Sandbox...`);
        result = await send(sandboxEndpoint);
    }

    if (!result.ok) {
        console.error(`[APNs Failure] Status: ${result.status}, Error: ${result.error}`);
        return { status: "failed", error: result.error, token: deviceToken };
    }

    console.log(`[APNs Success] Notification sent successfully.`);
    return { status: "sent", token: deviceToken };
}
