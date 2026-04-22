"use client";

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
  return (
    <CoachPageTabs
      coachName={coachName}
      chatContent={<CoachChat userId={userId} coachName={coachName} />}
      oracleContent={<OracleTab selfId={userId} />}
    />
  );
}
