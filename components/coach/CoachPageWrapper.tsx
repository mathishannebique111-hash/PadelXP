"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import CoachChat from "./CoachChat";
import CoachPageTabs from "./CoachPageTabs";

const OracleTab = dynamic(() => import("@/components/OracleTab"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
    </div>
  ),
});

export default function CoachPageWrapper({ userId, coachName }: { userId: string; coachName: string }) {
  const [activeTab, setActiveTab] = useState<"coach" | "oracle">("coach");
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const tabRef = useRef<{ setTab: (tab: "coach" | "oracle") => void }>(null);

  // Called by OracleTab when user clicks "Demander au coach"
  const handleAskCoach = useCallback((message: string) => {
    setPendingMessage(message);
    setActiveTab("coach");
  }, []);

  // Called by CoachChat when it consumes the pending message
  const handleMessageConsumed = useCallback(() => {
    setPendingMessage(null);
  }, []);

  return (
    <CoachPageTabs
      coachName={coachName}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      chatContent={
        <CoachChat
          userId={userId}
          coachName={coachName}
          pendingMessage={pendingMessage}
          onPendingMessageConsumed={handleMessageConsumed}
        />
      }
      oracleContent={
        <OracleTab
          selfId={userId}
          onAskCoach={handleAskCoach}
        />
      }
    />
  );
}
