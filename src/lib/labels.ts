// Label berbahasa Indonesia untuk nilai enum/kode internal.
// Dipakai bersama oleh server dan klien.

export type PlantingStatus = "direncanakan" | "ditanam" | "dipanen" | "dibatalkan";
export type NutrientCategory = "heavy" | "light" | "giver";
export type ObsCategory = "hama" | "penyakit" | "pertumbuhan" | "cuaca" | "lainnya";
export type PlanStatus = "aktif" | "selesai" | "dibatalkan";

export const PLANTING_STATUS_LABELS: Record<PlantingStatus, string> = {
  direncanakan: "Direncanakan",
  ditanam: "Ditanam",
  dipanen: "Dipanen",
  dibatalkan: "Dibatalkan",
};

export const NUTRIENT_LABELS: Record<NutrientCategory, string> = {
  heavy: "Penguras berat",
  light: "Penguras ringan",
  giver: "Penyumbang hara",
};

export const NUTRIENT_HINTS: Record<NutrientCategory, string> = {
  heavy: "Butuh banyak hara (contoh: tomat, jagung, kubis-kubisan).",
  light: "Butuh hara sedang hingga ringan (contoh: wortel, selada).",
  giver: "Umumnya membantu menambah nitrogen, misalnya keluarga polong.",
};

export const OBS_CATEGORY_LABELS: Record<ObsCategory, string> = {
  hama: "Hama",
  penyakit: "Penyakit",
  pertumbuhan: "Pertumbuhan",
  cuaca: "Cuaca",
  lainnya: "Catatan lain",
};

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  aktif: "Aktif",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export const AREA_UNIT_LABELS: Record<string, string> = {
  m2: "m²",
  are: "are",
  hektar: "hektar",
};

export function areaLabel(size: string | null, unit: string): string {
  if (!size) return "Ukuran belum diisi";
  return `${size} ${AREA_UNIT_LABELS[unit] ?? unit}`;
}
