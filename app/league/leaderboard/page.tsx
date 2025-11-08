import { redirect } from "next/navigation";

// Cette page redirige vers le vrai leaderboard sur /home
// car le système n'utilise plus de ligues
export default function LeaderboardPage() {
  redirect("/home");
}
