import { z } from "zod";

export const teamSchema = z.object({
  name: z
    .string()
    .min(2, "Takım adı en az 2 karakter olmalıdır.")
    .max(100, "Takım adı 100 karakterden uzun olamaz.")
    .regex(
      /^[\p{L}0-9\s&,.'()-]+$/u,
      "Takım adı geçersiz karakterler içeriyor."
    ),
});

export type TeamInput = z.infer<typeof teamSchema>;
