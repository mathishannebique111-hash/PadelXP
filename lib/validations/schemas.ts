import { z } from "zod";

// 1. Referral
export const ReferralSchema = z.object({
  referrer_code: z.string().min(6).max(12),
  referred_email: z.string().email(),
});

// 2. Billing update
export const BillingUpdateSchema = z.object({
  plan: z.enum(["monthly", "quarterly", "annual"]),
  clubId: z.string().uuid(),
});

// 3. Club import
export const ClubImportSchema = z.object({
  clubId: z.string().uuid().optional(), // Le front n'envoie pas clubId actuellement
  rows: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string().min(2).max(100),
        phone: z.string().optional(),
      })
    )
    .max(500),
});

// 4. Admin invite
export const AdminInviteSchema = z.object({
  clubId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "owner"]),
});

// 5. Match submit (padel)
const scoreSchema = z.object({
  team1: z.number().int().min(0).max(7),
  team2: z.number().int().min(0).max(7),
});

export const MatchSubmitSchema = z
  .object({
    clubId: z.string().uuid(),
    players: z.array(z.string().uuid()).min(2).max(4),
    winningTeam: z.enum(["team1", "team2"]),
    score: scoreSchema,
    hasBoost: z.boolean().optional(),
  })
  .refine(
    ({ score }) => {
      const maxScore = Math.max(score.team1, score.team2);
      return maxScore === 6 || maxScore === 7;
    },
    {
      message: "Le score maximum doit être 6 ou 7 (règles padel)",
      path: ["score"],
    }
  );

// 6. Boost purchase
export const BoostPurchaseSchema = z.object({
  quantity: z.number().int().min(1).max(50),
  userId: z.string().uuid(),
});

// 7. Remove admin
export const RemoveAdminSchema = z.object({
  clubId: z.string().uuid(),
  adminId: z.string().uuid(),
});

// 8. Billing update (adresse facturation)
export const BillingDetailsSchema = z.object({
  billingEmail: z.string().email(),
  billingAddress: z.string().min(5).max(500),
  vatNumber: z.string().optional(),
});

// 9. Review/Avis
export const ReviewSchema = z.object({
  matchId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
  reviewedPlayerId: z.string().uuid().optional(),
});

