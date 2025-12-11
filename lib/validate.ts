import { z } from "zod";

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errorMessages = result.error.errors
    .map((err) => err.message || "Invalid value")
    .join(", ");

  return { success: false, error: errorMessages };
}

