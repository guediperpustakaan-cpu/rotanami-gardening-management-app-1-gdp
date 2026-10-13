import { describe, expect, it } from "vitest";
import {
  suggestRotation,
  INSUFFICIENT_NO_FAMILY,
  INSUFFICIENT_NO_HISTORY,
  INSUFFICIENT_EMPTY_CATALOG,
  type CatalogCrop,
  type PlotHistoryItem,
} from "./rotation";

function crop(partial: Partial<CatalogCrop> & { id: number; name: string }): CatalogCrop {
  return {
    familyId: null,
    familyName: null,
    rotationGroup: null,
    nutrientCategory: null,
    isCoverCrop: false,
    ...partial,
  };
}

function hist(partial: Partial<PlotHistoryItem> & { cropId: number; cropName: string }): PlotHistoryItem {
  return {
    familyId: null,
    rotationGroup: null,
    nutrientCategory: null,
    isCoverCrop: false,
    status: "dipanen",
    plantDate: "2026-01-01",
    hasPestIssue: false,
    ...partial,
  };
}

const solan = { familyId: 1, familyName: "Solanaceae", rotationGroup: "buah" } as const;
const faba = { familyId: 2, familyName: "Fabaceae", rotationGroup: "legum" } as const;
const brass = { familyId: 3, familyName: "Brassicaceae", rotationGroup: "kubis" } as const;

const catalog: CatalogCrop[] = [
  crop({ id: 1, name: "Tomat", ...solan, nutrientCategory: "heavy" }),
  crop({ id: 2, name: "Cabai", ...solan, nutrientCategory: "heavy" }),
  crop({ id: 3, name: "Buncis", ...faba, nutrientCategory: "giver" }),
  crop({ id: 4, name: "Kacang tanah", ...faba, nutrientCategory: "giver", isCoverCrop: true }),
  crop({ id: 5, name: "Kubis", ...brass, nutrientCategory: "heavy" }),
];

describe("suggestRotation", () => {
  it("menghindari keluarga yang sama dengan tanaman terakhir", () => {
    const result = suggestRotation(
      [hist({ cropId: 1, cropName: "Tomat", ...solan, nutrientCategory: "heavy" })],
      catalog,
    );
    expect(result.status).toBe("ok");
    expect(result.primary).not.toBeNull();
    expect(result.primary!.crop.familyId).not.toBe(1);
    const solanSuggestions = [result.primary!, ...result.alternatives].filter(
      (s) => s.crop.familyId === 1,
    );
    for (const s of solanSuggestions) {
      expect(s.reasons.join(" ")).toContain("Satu keluarga");
    }
  });

  it("mengutamakan tanaman penyumbang hara setelah penguras berat", () => {
    const result = suggestRotation(
      [hist({ cropId: 1, cropName: "Tomat", ...solan, nutrientCategory: "heavy" })],
      catalog,
    );
    expect(result.primary!.crop.nutrientCategory).toBe("giver");
    expect(result.primary!.reasons.join(" ")).toContain("penyumbang hara");
  });

  it("memberi penalti keluarga dengan riwayat masalah hama/penyakit", () => {
    const result = suggestRotation(
      [
        hist({ cropId: 5, cropName: "Kubis", ...brass, plantDate: "2026-02-01" }),
        hist({
          cropId: 3,
          cropName: "Buncis",
          ...faba,
          plantDate: "2026-01-01",
          hasPestIssue: true,
        }),
      ],
      catalog,
    );
    const buncisLike = [result.primary!, ...result.alternatives].find(
      (s) => s.crop.familyId === 2,
    );
    expect(buncisLike).toBeDefined();
    expect(buncisLike!.reasons.join(" ")).toContain("masalah hama/penyakit");
  });

  it("menyatakan data belum cukup bila riwayat kosong", () => {
    const result = suggestRotation([], catalog);
    expect(result.status).toBe("insufficient");
    expect(result.message).toBe(INSUFFICIENT_NO_HISTORY);
  });

  it("menyatakan data belum cukup bila keluarga botani tidak tercatat", () => {
    const result = suggestRotation(
      [hist({ cropId: 9, cropName: "Tanaman misterius" })],
      catalog,
    );
    expect(result.status).toBe("insufficient");
    expect(result.message).toBe(INSUFFICIENT_NO_FAMILY);
  });

  it("menyatakan katalog kosong", () => {
    const result = suggestRotation(
      [hist({ cropId: 1, cropName: "Tomat", ...solan })],
      [],
    );
    expect(result.status).toBe("insufficient");
    expect(result.message).toBe(INSUFFICIENT_EMPTY_CATALOG);
  });

  it("mengabaikan penanaman berstatus dibatalkan", () => {
    const result = suggestRotation(
      [
        hist({ cropId: 2, cropName: "Cabai", ...solan, plantDate: "2026-03-01", status: "dibatalkan" }),
      ],
      catalog,
    );
    expect(result.status).toBe("insufficient");
    expect(result.message).toBe(INSUFFICIENT_NO_HISTORY);
  });

  it("selalu menyertakan disclaimer panduan umum", () => {
    const result = suggestRotation(
      [hist({ cropId: 1, cropName: "Tomat", ...solan })],
      catalog,
    );
    expect(result.disclaimer).toContain("panduan umum");
  });
});
