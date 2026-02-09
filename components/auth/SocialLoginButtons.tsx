"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function SocialLoginButtons() {
    const [loading, setLoading] = useState<"google" | "apple" | null>(null);

    const handleSocialLogin = async (provider: "google" | "apple") => {
        setLoading(provider);
        try {
            const supabase = createClient();
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                console.error("Erreur social login:", error);
            }
        } catch (error) {
            console.error("Erreur inattendue:", error);
        } finally {
            // On laisse le loading actif car la redirection va se produire
            // Sauf s'il y a eu une erreur immédiate
            // setLoading(null); 
        }
    };

    return (
        <div className="flex flex-col gap-3 w-full">
            {/* Google */}
            <button
                type="button"
                onClick={() => handleSocialLogin("google")}
                disabled={loading !== null}
                className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {loading === "google" ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                ) : (
                    <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                style={{ fill: "#4285F4" }}
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                style={{ fill: "#34A853" }}
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                style={{ fill: "#FBBC05" }}
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                style={{ fill: "#EA4335" }}
                            />
                        </svg>
                        Continuer avec Google
                    </>
                )}
            </button>

            {/* Apple */}
            <button
                type="button"
                onClick={() => handleSocialLogin("apple")}
                disabled={loading !== null}
                className="w-full flex items-center justify-center gap-3 bg-black text-white font-semibold py-3 px-4 rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-70 disabled:cursor-not-allowed border border-white/10"
            >
                {loading === "apple" ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                    <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.05 20.28c-.98.95-2.05 1.72-3.18 1.74-.78.02-1.92-1.02-3.14-1.02-1.25 0-2.45 1.05-3.23 1.02-2.33-.12-4.14-2.82-4.14-5.35 0-5.83 7.05-5.9 7.37-1.12.06.91-.55 2.15-1.4 3.03zm-1.89-13.84c-1.12 1.45-3.22 1.13-3.69-.74.63-1.6 2-2.5 3.39-2.58 1.34.08 2.37 1.83.3 3.32zm-3.04 7.64c.26 2.38 2.05 3.2 2.09 3.23-.03.06-3.2 11.23-7.58 11.23-.62 0-1.21-.19-.71-.19z" />
                            <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.21-4.96 3.08-2.13 3.75-.55 9.27 1.5 12.33.99 1.48 2.15 3.13 3.69 3.07 1.46-.06 2.01-.96 3.79-.96 1.76 0 2.27.96 3.77.94 1.57-.03 2.57-1.43 3.53-2.87 1.1-1.65 1.55-3.26 1.58-3.34-.03-.02-3.05-1.19-3.08-4.73-.04-2.95 2.38-4.37 2.49-4.43-1.37-2.04-3.5-2.27-4.24-2.31-1.93-.15-3.8 1.12-4.11 1.26zm3.93-4.16c.86-1.07 1.43-2.55 1.27-4.04-1.24.05-2.73.85-3.62 1.93-.79.95-1.49 2.49-1.3 3.96 1.37.11 2.76-.75 3.65-1.85z" />
                        </svg>
                        Continuer avec Apple
                    </>
                )}
            </button>
        </div>
    );
}
