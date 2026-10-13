import { z } from "zod";

// ---- Pembantu validasi dengan pesan berbahasa Indonesia ----

const dateIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD.");

const idNum = z.coerce.number().int().positive("ID tidak valid.");

/** Teks opsional: string kosong dianggap tidak diisi. */
const optText = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z
    .string()
    .trim()
    .max(1000, "Terlalu panjang (maksimal 1000 karakter).")
    .optional(),
);

/** Angka opsional dari input teks; kosong dianggap tidak diisi. */
const optNum = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number("Harus berupa angka.").finite().optional(),
);

/** ID opsional: kosong dianggap null. */
const optId = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number().int().positive("Pilihan tidak valid.").nullable(),
);

const optDate = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  dateIso.optional(),
);

const booleanish = z.preprocess(
  (v) => v === true || v === "true" || v === "on" || v === 1,
  z.boolean(),
);

// ---- Autentikasi ----

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter."),
  email: z.string().trim().toLowerCase().email("Format email tidak valid."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter."),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});

// ---- Kebun ----

export const farmCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama kebun minimal 2 karakter.")
    .max(80, "Nama kebun maksimal 80 karakter."),
  location: optText,
  timezone: z.string().trim().max(64).optional(),
});

export const farmUpdateSchema = farmCreateSchema.partial();

// ---- Petak ----

export const areaUnitEnum = z.enum(["m2", "are", "hektar"]);

export const plotCreateSchema = z.object({
  farmId: idNum,
  name: z
    .string()
    .trim()
    .min(2, "Nama petak minimal 2 karakter.")
    .max(80, "Nama petak maksimal 80 karakter."),
  size: optNum.refine(
    (v) => v === undefined || v > 0,
    "Ukuran harus lebih dari 0.",
  ),
  areaUnit: areaUnitEnum.default("m2"),
  soilType: optText,
  notes: optText,
});

export const plotUpdateSchema = plotCreateSchema.omit({ farmId: true }).partial();

// ---- Katalog ----

export const cropCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama tanaman minimal 2 karakter.")
    .max(80, "Nama tanaman maksimal 80 karakter."),
  scientificName: optText,
  familyId: optId,
  nutrientCategory: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : v),
    z.enum(["heavy", "light", "giver"]).nullable(),
  ),
  isCoverCrop: booleanish.default(false),
  notes: optText,
});

export const cropUpdateSchema = cropCreateSchema.partial();

export const familyCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama keluarga minimal 2 karakter.")
    .max(80, "Nama keluarga maksimal 80 karakter."),
  rotationGroup: optText,
});

// ---- Penanaman ----

export const plantingBaseSchema = z.object({
  plotId: idNum,
  cropId: idNum,
  seasonId: optId,
  plantDate: dateIso,
  harvestDate: optDate,
  status: z
    .enum(["direncanakan", "ditanam", "dipanen", "dibatalkan"])
    .default("direncanakan"),
  yieldAmount: optNum.refine(
    (v) => v === undefined || v >= 0,
    "Hasil panen tidak boleh negatif.",
  ),
  yieldUnit: optText,
  notes: optText,
});

export const plantingCreateSchema = plantingBaseSchema.refine(
  (v) => !v.harvestDate || v.harvestDate >= v.plantDate,
  "Tanggal panen tidak boleh sebelum tanggal tanam.",
);

export const plantingUpdateSchema = plantingBaseSchema.omit({ plotId: true }).partial();

// ---- Uji tanah ----

export const soilTestCreateSchema = z.object({
  plotId: idNum,
  testDate: dateIso,
  ph: optNum.refine(
    (v) => v === undefined || (v >= 0 && v <= 14),
    "pH harus di antara 0 dan 14.",
  ),
  nitrogen: optNum.refine(
    (v) => v === undefined || v >= 0,
    "Nilai nitrogen tidak boleh negatif.",
  ),
  phosphor: optNum.refine(
    (v) => v === undefined || v >= 0,
    "Nilai fosfor tidak boleh negatif.",
  ),
  potassium: optNum.refine(
    (v) => v === undefined || v >= 0,
    "Nilai kalium tidak boleh negatif.",
  ),
  organicMatter: optNum.refine(
    (v) => v === undefined || (v >= 0 && v <= 100),
    "Bahan organik harus di antara 0 dan 100.",
  ),
  method: optText,
  notes: optText,
});

export const soilTestUpdateSchema = soilTestCreateSchema
  .omit({ plotId: true })
  .partial();

// ---- Observasi ----

export const observationCreateSchema = z.object({
  plotId: idNum,
  plantingId: optId,
  category: z.enum(["hama", "penyakit", "pertumbuhan", "cuaca", "lainnya"]),
  obsDate: dateIso,
  description: z
    .string()
    .trim()
    .min(3, "Deskripsi minimal 3 karakter.")
    .max(2000, "Deskripsi maksimal 2000 karakter."),
});

export const observationUpdateSchema = observationCreateSchema
  .omit({ plotId: true })
  .partial();

// ---- Rencana rotasi ----

export const rotationPlanCreateSchema = z.object({
  plotId: idNum,
  cropId: idNum,
  seasonId: optId,
  targetDate: optDate,
  status: z.enum(["aktif", "selesai", "dibatalkan"]).default("aktif"),
  rationale: z
    .object({
      source: z.string(),
      context: z.array(z.string()),
      reasons: z.array(z.string()),
      disclaimer: z.string().optional(),
    })
    .nullable()
    .optional(),
  notes: optText,
});

export const rotationPlanUpdateSchema = z.object({
  cropId: z.coerce.number().int().positive().optional(),
  seasonId: optId.optional(),
  targetDate: optDate.optional(),
  status: z.enum(["aktif", "selesai", "dibatalkan"]).optional(),
  notes: optText.optional(),
});

export const suggestSchema = z.object({ plotId: idNum });

// ---- Pengingat ----

export const reminderCreateSchema = z.object({
  farmId: idNum,
  plotId: optId,
  title: z
    .string()
    .trim()
    .min(3, "Judul pengingat minimal 3 karakter.")
    .max(120, "Judul pengingat maksimal 120 karakter."),
  dueDate: dateIso,
  notes: optText,
});

export const reminderUpdateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Judul pengingat minimal 3 karakter.")
    .max(120, "Judul pengingat maksimal 120 karakter.")
    .optional(),
  plotId: optId.optional(),
  dueDate: dateIso.optional(),
  done: z.boolean().optional(),
  notes: optText.optional(),
});

// ---- Musim ----

export const seasonBaseSchema = z.object({
  farmId: idNum,
  name: z
    .string()
    .trim()
    .min(2, "Nama musim minimal 2 karakter.")
    .max(80, "Nama musim maksimal 80 karakter."),
  startDate: dateIso,
  endDate: dateIso,
});

export const seasonCreateSchema = seasonBaseSchema.refine(
  (v) => v.endDate >= v.startDate,
  "Tanggal selesai harus setelah tanggal mulai.",
);
