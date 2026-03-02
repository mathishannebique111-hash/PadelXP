import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v4.14.4/index.ts";

// ============ APNs (iOS) ============
const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID");
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID");
const APNS_BUNDLE_ID = "eu.padelxp.player";
const APNS_PRIVATE_KEY = Deno.env.get("APNS_PRIVATE_KEY");

// ============ FCM (Android) ============
const FCM_SERVICE_ACCOUNT = Deno.env.get("FCM_SERVICE_ACCOUNT");

serve(async (req) => {
    try {
        const { record } = await req.json();

        const userId = record.user_id;
        const title = record.title;
        const body = record.message;
        const data = record.data;

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

        // Préparer les tokens JWT/OAuth en parallèle
        let apnsJwt: string | null = null;
        let fcmAccessToken: string | null = null;

        const hasIosTokens = tokens.some(t => t.platform === "ios");
        const hasAndroidTokens = tokens.some(t => t.platform === "android");

        if (hasIosTokens && APNS_KEY_ID && APNS_TEAM_ID && APNS_PRIVATE_KEY) {
            apnsJwt = await generateApnsToken(APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY);
        }

        if (hasAndroidTokens && FCM_SERVICE_ACCOUNT) {
            try {
                fcmAccessToken = await generateFcmAccessToken(FCM_SERVICE_ACCOUNT);
            } catch (e) {
                console.error("[FCM] Failed to generate access token:", e);
            }
        }

        const results = await Promise.all(tokens.map(async (t) => {
            if (t.platform === "ios" && apnsJwt) {
                return await sendToAPNs(t.token, title, body, data, apnsJwt);
            } else if (t.platform === "android" && fcmAccessToken) {
                return await sendToFCM(t.token, title, body, data, fcmAccessToken);
            }
            return { status: "skipped", platform: t.platform, reason: "no credentials" };
        }));

        return new Response(JSON.stringify({ results }), { status: 200 });

    } catch (error) {
        console.error("Error processing notification:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});

// ============================================================
// APNs (iOS) — Token + envoi
// ============================================================

async function generateApnsToken(keyId: string, teamId: string, privateKey: string) {
    let p8 = privateKey;

    if (!p8.includes("-----BEGIN PRIVATE KEY-----")) {
        const rawKey = p8.replace(/\\n/g, '').replace(/\s/g, '');
        p8 = `-----BEGIN PRIVATE KEY-----\n${rawKey}\n-----END PRIVATE KEY-----`;
    } else {
        p8 = p8.replace(/\\n/g, '\n');
    }

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

    console.log(`[APNs] Sending to Production: ${deviceToken}`);
    let result = await send(productionEndpoint);

    if (!result.ok && result.status === 400 && result.error?.includes("BadDeviceToken")) {
        console.log(`[APNs] Production failed with BadDeviceToken. Retrying with Sandbox...`);
        result = await send(sandboxEndpoint);
    }

    if (!result.ok) {
        console.error(`[APNs Failure] Status: ${result.status}, Error: ${result.error}`);
        return { status: "failed", error: result.error, token: deviceToken };
    }

    console.log(`[APNs Success] Notification sent successfully.`);
    return { status: "sent", platform: "ios", token: deviceToken };
}

// ============================================================
// FCM (Android) — OAuth2 token + envoi via HTTP v1 API
// ============================================================

async function generateFcmAccessToken(serviceAccountInput: string): Promise<string> {
    let sa: any;
    try {
        // Tenter de parser directement (JSON brut)
        sa = JSON.parse(serviceAccountInput);
    } catch {
        // Si le parse échoue, c'est probablement en base64
        try {
            const decoded = atob(serviceAccountInput);
            sa = JSON.parse(decoded);
        } catch {
            throw new Error("FCM_SERVICE_ACCOUNT is neither valid JSON nor valid base64-encoded JSON");
        }
    }

    const now = Math.floor(Date.now() / 1000);

    // Nettoyer la clé privée
    let privateKey = sa.private_key;
    if (!privateKey) throw new Error("Missing private_key in service account");
    privateKey = privateKey.replace(/\\n/g, '\n');

    const privateKeyObj = await importPKCS8(privateKey, 'RS256');

    // Créer un JWT signé pour l'API Google OAuth2
    const jwt = await new SignJWT({
        iss: sa.client_email,
        sub: sa.client_email,
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
    })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
        .sign(privateKeyObj);

    // Échanger le JWT contre un access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`OAuth2 token exchange failed: ${tokenResponse.status} ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log("[FCM] OAuth2 access token obtained successfully");
    return tokenData.access_token;
}

async function sendToFCM(deviceToken: string, title: string, body: string, data: any, accessToken: string) {
    // Le project_id vient du service account, mais on peut aussi le mettre en dur
    // puisqu'on connaît le projet Firebase
    const FCM_PROJECT_ID = "padelxp-862ec";
    const endpoint = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`;

    // Convertir toutes les valeurs de data en strings (requis par FCM)
    const stringData: Record<string, string> = {};
    if (data && typeof data === 'object') {
        for (const [key, value] of Object.entries(data)) {
            stringData[key] = String(value);
        }
    }

    const message = {
        message: {
            token: deviceToken,
            notification: {
                title: title || "PadelXP",
                body: body || "",
            },
            data: stringData,
            android: {
                priority: "high" as const,
                notification: {
                    sound: "default",
                    channel_id: "PadelXP",
                },
            },
        },
    };

    console.log(`[FCM] Sending to: ${deviceToken.substring(0, 20)}...`);

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[FCM Failure] Status: ${response.status}, Error: ${errorText}`);
        return { status: "failed", platform: "android", error: errorText, token: deviceToken };
    }

    const result = await response.json();
    console.log(`[FCM Success] Message ID: ${result.name}`);
    return { status: "sent", platform: "android", messageId: result.name, token: deviceToken };
}
