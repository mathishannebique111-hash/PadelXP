import { redirect } from "next/navigation";

export default function PublicTournamentsPage() {
  redirect("/club?tab=tournaments");
}
