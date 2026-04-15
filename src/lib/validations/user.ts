import { z } from "zod";

export const updateUserSchema = z.object({
  fullName: z
    .string()
    .min(2, "Ad soyad en az 2 karakter olmalıdır.")
    .max(100, "Ad soyad 100 karakterden uzun olamaz.")
    .optional(),
  teamId: z.string().nullable().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
