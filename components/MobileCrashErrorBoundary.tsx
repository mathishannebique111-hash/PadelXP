"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
    children: ReactNode;
    componentName?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export default class MobileCrashErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 bg-red-50/10 rounded-xl border border-red-500/20 backdrop-blur-sm">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4 text-red-500">
                        <AlertTriangle size={24} />
                    </div>

                    <h2 className="text-lg font-bold text-white mb-2">
                        Oups ! Une erreur est survenue
                    </h2>

                    <p className="text-sm text-white/60 text-center mb-6">
                        L'application a rencontré un problème inattendu dans {this.props.componentName || "cette section"}.
                    </p>

                    <div className="w-full bg-black/40 rounded-lg p-4 mb-6 overflow-auto max-h-60 text-left border border-white/5">
                        <p className="text-xs font-mono text-red-300 break-words mb-2">
                            {this.state.error?.toString()}
                        </p>
                        <details className="text-[10px] font-mono text-white/40 cursor-pointer">
                            <summary className="hover:text-white/60 transition-colors">Voir les détails techniques</summary>
                            <pre className="mt-2 whitespace-pre-wrap">
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 bg-white text-[#071554] px-5 py-2.5 rounded-full font-bold text-sm hover:bg-gray-100 transition-colors"
                    >
                        <RefreshCcw size={16} />
                        Recharger la page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
