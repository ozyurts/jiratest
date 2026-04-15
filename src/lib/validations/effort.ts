import { z } from "zod";

const percentageField = (label: string) =>
  z
    .number({ invalid_type_error: `${label} sayısal bir değer olmalıdır.` })
    .int(`${label} tam sayı olmalıdır.`)
    .min(0, `${label} 0'dan küçük olamaz.`)
    .max(100, `${label} 100'den büyük olamaz.`);

export const effortEntrySchema = z
  .object({
    weekStartDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Hafta başlangıç tarihi YYYY-MM-DD formatında olmalıdır."),
    pastPercentage: percentageField("Geçmişin İşleri"),
    todayPercentage: percentageField("Bugünün İşleri"),
    futurePercentage: percentageField("Yarının İşleri"),
    notes: z
      .string()
      .max(500, "Notlar 500 karakterden uzun olamaz.")
      .optional()
      .nullable(),
  })
  .refine(
    (data) =>
      data.pastPercentage + data.todayPercentage + data.futurePercentage === 100,
    {
      message: "Üç kategori toplamı tam olarak %100 olmalıdır.",
      path: ["pastPercentage"],
    }
  );

export const effortQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(52).default(12),
  userId: z.string().optional(),
  teamId: z.string().optional(),
  weekFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  weekTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type EffortEntryInput = z.infer<typeof effortEntrySchema>;
export type EffortQueryInput = z.infer<typeof effortQuerySchema>;
