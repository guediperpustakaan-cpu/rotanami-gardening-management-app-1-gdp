// Mesin saran rotasi tanaman.
// Fungsi murni, transparan, dan dapat diuji: tidak mengakses database secara langsung.
// Aturan bersifat heuristik ringan; hasil selalu diberi penjelasan alasan dan
// penyangkalan bahwa ini panduan umum, bukan diagnosis agronomi.

import type { NutrientCategory } from "./labels";

export interface CatalogCrop {
  id: number;
  name: string;
  familyId: number | null;
  familyName: string | null;
  rotationGroup: string | null;
  nutrientCategory: NutrientCategory | null;
  isCoverCrop: boolean;
}

export interface PlotHistoryItem {
  cropId: number;
  cropName: string;
  familyId: number | null;
  rotationGroup: string | null;
  nutrientCategory: NutrientCategory | null;
  isCoverCrop: boolean;
  status: string;
  plantDate: string; // YYYY-MM-DD
  hasPestIssue: boolean; // ada observasi hama/penyakit terkait siklus ini
}

export interface Suggestion {
  crop: CatalogCrop;
  score: number;
  reasons: string[];
}

export interface SuggestionResult {
  status: "ok" | "insufficient";
  message: string | null; // alasan bila data belum cukup
  context: string[]; // ringkasan data yang dipakai
  primary: Suggestion | null;
  alternatives: Suggestion[];
  disclaimer: string;
}

export const ROTATION_DISCLAIMER =
  "Saran ini bersifat panduan umum berdasarkan riwayat petak dan data katalog, bukan diagnosis atau kepastian agronomi. Selalu sesuaikan dengan kondisi tanah, iklim, dan hama di lokasi Anda.";

export const INSUFFICIENT_NO_HISTORY =
  "Data belum cukup untuk memberi saran yang lebih spesifik karena belum ada riwayat tanam pada petak ini. Anda tetap bisa memilih tanaman secara manual.";

export const INSUFFICIENT_NO_FAMILY =
  "Data belum cukup untuk memberi saran yang lebih spesifik karena keluarga botani tanaman pada riwayat belum tercatat di katalog. Anda tetap bisa memilih tanaman secara manual.";

export const INSUFFICIENT_EMPTY_CATALOG =
  "Katalog tanaman masih kosong, sehingga belum ada pilihan yang bisa disarankan. Tambahkan tanaman ke katalog terlebih dahulu.";

/**
 * Memberi saran tanaman berikutnya untuk sebuah petak.
 * @param history riwayat penanaman petak (urutan bebas; akan diurutkan menurun)
 * @param catalog seluruh tanaman pada katalog
 */
export function suggestRotation(
  history: PlotHistoryItem[],
  catalog: CatalogCrop[],
): SuggestionResult {
  const base: SuggestionResult = {
    status: "insufficient",
    message: null,
    context: [],
    primary: null,
    alternatives: [],
    disclaimer: ROTATION_DISCLAIMER,
  };

  if (catalog.length === 0) {
    return { ...base, message: INSUFFICIENT_EMPTY_CATALOG };
  }

  const recent = history
    .filter((h) => h.status !== "dibatalkan")
    .sort((a, b) => b.plantDate.localeCompare(a.plantDate))
    .slice(0, 4);

  if (recent.length === 0) {
    return {
      ...base,
      message: INSUFFICIENT_NO_HISTORY,
      context: ["Belum ada riwayat tanam pada petak ini."],
    };
  }

  const last = recent[0];
  const context: string[] = [
    `Tanaman terakhir: ${last.cropName}${
      last.familyId !== null && last.rotationGroup
        ? ` (keluarga ${last.rotationGroup})`
        : last.familyId !== null
          ? " (keluarga botani tercatat tanpa kelompok rotasi)"
          : " (keluarga botani belum tercatat)"
    }.`,
    `${recent.length} penanaman terakhir diperiksa.`,
  ];

  const pestEntries = recent.filter((h) => h.hasPestIssue);
  if (pestEntries.length > 0) {
    context.push(
      `Ada catatan masalah hama/penyakit pada: ${pestEntries
        .map((p) => p.cropName)
        .join(", ")}.`,
    );
  }

  const anyFamilyKnown = recent.some((h) => h.familyId !== null);
  if (!anyFamilyKnown) {
    return {
      ...base,
      message: INSUFFICIENT_NO_FAMILY,
      context,
    };
  }

  const candidates: Suggestion[] = [];

  for (const crop of catalog) {
    const reasons: string[] = [];
    let score = 0;

    // Aturan 1: keluarga botani / kelompok rotasi terhadap riwayat terbaru.
    if (crop.familyId === null) {
      reasons.push(
        "Keluarga botani tanaman ini belum tercatat di katalog, sehingga aturan keluarga dilewati.",
      );
    } else if (last.familyId !== null && crop.familyId === last.familyId) {
      score -= 4;
      reasons.push(
        `Satu keluarga dengan tanaman terakhir (${crop.familyName ?? "keluarga yang sama"}); umumnya lebih aman memberi jeda.`,
      );
    } else if (recent.slice(1).some((h) => h.familyId === crop.familyId)) {
      score -= 2;
      reasons.push(
        `Keluarga ${crop.familyName ?? "ini"} juga muncul pada riwayat terbaru petak.`,
      );
    } else {
      score += 2;
      reasons.push(
        `Beda keluarga dengan tanaman terakhir${
          last.rotationGroup ? ` (kelompok rotasi ${last.rotationGroup})` : ""
        }.`,
      );
      if (
        crop.rotationGroup &&
        last.rotationGroup &&
        crop.rotationGroup !== last.rotationGroup
      ) {
        score += 1;
      }
    }

    // Aturan 2: kategori kebutuhan hara (hanya jika datanya tersedia).
    if (crop.nutrientCategory !== null && last.nutrientCategory !== null) {
      if (last.nutrientCategory === "heavy" && crop.nutrientCategory === "giver") {
        score += 2;
        reasons.push(
          "Tanaman terakhir tergolong penguras berat; tanaman penyumbang hara (mis. polong-polongan) dapat membantu pemulihan hara.",
        );
      } else if (
        last.nutrientCategory === "giver" &&
        crop.nutrientCategory === "heavy"
      ) {
        score += 1;
        reasons.push(
          "Tanaman terakhir penyumbang hara, sehingga cocok diikuti tanaman yang butuh banyak hara.",
        );
      } else if (crop.nutrientCategory === last.nutrientCategory) {
        score -= 1;
        reasons.push(
          "Kategori kebutuhan hara serupa dengan tanaman terakhir (data katalog).",
        );
      }
    }

    // Aturan 3: tanaman penutup tanah.
    const recentCover = recent.slice(0, 2).some((h) => h.isCoverCrop);
    if (crop.isCoverCrop && recentCover) {
      score -= 2;
      reasons.push(
        "Tanaman penutup tanah baru saja digunakan pada riwayat terbaru petak ini.",
      );
    } else if (crop.isCoverCrop) {
      score += 1;
      reasons.push(
        "Termasuk tanaman penutup tanah yang dapat membantu melindungi permukaan tanah.",
      );
    }

    // Aturan 4: riwayat masalah hama/penyakit pada keluarga yang sama.
    for (const p of pestEntries) {
      if (p.familyId !== null && crop.familyId === p.familyId) {
        score -= 4;
        reasons.push(
          `Ada catatan masalah hama/penyakit saat ${p.cropName} ditanam; sebaiknya beri jeda untuk keluarga yang sama.`,
        );
      }
    }

    // Aturan 5: jangan mengusulkan tanaman yang sama persis dengan terakhir.
    if (crop.id === last.cropId) {
      score -= 3;
      reasons.push("Tanaman ini baru saja ditanam pada petak ini.");
    }

    candidates.push({ crop, score, reasons });
  }

  candidates.sort(
    (a, b) => b.score - a.score || a.crop.name.localeCompare(b.crop.name, "id"),
  );

  const primary = candidates[0];
  const alternatives = candidates.slice(1, 4);

  return {
    status: "ok",
    message:
      primary.score <= 0
        ? "Semua pilihan katalog memiliki catatan kurang menguntungkan berdasarkan data yang ada. Pertimbangkan memilih tanaman lain secara manual atau menambah data katalog."
        : null,
    context,
    primary,
    alternatives,
    disclaimer: ROTATION_DISCLAIMER,
  };
}
