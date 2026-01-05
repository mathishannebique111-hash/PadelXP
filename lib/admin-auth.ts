const ADMIN_EMAILS = [
  "contactpadelxp@gmail.com",
  "mathis.hannebique111@gmail.com",
] as const;

type AdminEmail = (typeof ADMIN_EMAILS)[number];

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return ADMIN_EMAILS.includes(normalized as AdminEmail);
}

export function getAdminEmails(): string[] {
  return [...ADMIN_EMAILS];
}


