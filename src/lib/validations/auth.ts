import { z } from "zod";

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, "E-posta zorunludur.")
    .email("Geçerli bir e-posta adresi giriniz.")
    .max(255, "E-posta 255 karakterden uzun olamaz."),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalıdır.")
    .max(72, "Şifre 72 karakterden uzun olamaz.")
    .regex(/[A-Z]/, "Şifre en az bir büyük harf içermelidir.")
    .regex(/[a-z]/, "Şifre en az bir küçük harf içermelidir.")
    .regex(/[0-9]/, "Şifre en az bir rakam içermelidir."),
  fullName: z
    .string()
    .min(2, "Ad soyad en az 2 karakter olmalıdır.")
    .max(100, "Ad soyad 100 karakterden uzun olamaz.")
    .regex(/^[\p{L}\s'-]+$/u, "Ad soyad yalnızca harf, boşluk, tire ve kesme içerebilir."),
  teamId: z
    .string()
    .min(1, "Takım seçimi zorunludur.")
    .optional()
    .nullable(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "E-posta zorunludur.")
    .email("Geçerli bir e-posta adresi giriniz."),
  password: z.string().min(1, "Şifre zorunludur."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
