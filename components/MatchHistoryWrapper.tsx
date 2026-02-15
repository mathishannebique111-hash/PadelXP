"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MatchTabBlockingOverlay from "./MatchTabBlockingOverlay";
import LevelAssessmentWizard from "./padel-level/LevelAssessmentWizard";

interface MatchHistoryWrapperProps {
    initialHasLevel: boolean;
    children: React.ReactNode;
}

export default function MatchHistoryWrapper({ initialHasLevel, children }: MatchHistoryWrapperProps) {
    const [hasLevel, setHasLevel] = useState(initialHasLevel);
    const [showAssessment, setShowAssessment] = useState(false);
    const router = useRouter();

    // Sync props if changed
    useEffect(() => {
        setHasLevel(initialHasLevel);
    }, [initialHasLevel]);

    return (
        <div className="relative min-h-[400px]">
            {showAssessment && (
                <div className="fixed inset-0 z-[100000]">
                    <LevelAssessmentWizard
                        forceStart={true}
                        onComplete={() => {
                            setHasLevel(true);
                            setShowAssessment(false);
                            router.refresh();
                        }}
                        onCancel={() => setShowAssessment(false)}
                    />
                </div>
            )}

            <div className={!hasLevel ? "blur-sm pointer-events-none select-none grayscale-[0.3]" : ""}>
                {children}
            </div>

            {!hasLevel && !showAssessment && (
                <MatchTabBlockingOverlay
                    type="history"
                    onEvaluate={() => setShowAssessment(true)}
                />
            )}
        </div>
    );
}
