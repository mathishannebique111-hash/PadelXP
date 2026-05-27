const SEASON_BETA_EMAILS = [
  "capucine@gmail.com",
] as const;

type SeasonBetaEmail = (typeof SEASON_BETA_EMAILS)[number];

export function canSeeSeasons(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return SEASON_BETA_EMAILS.includes(normalized as SeasonBetaEmail);
}
