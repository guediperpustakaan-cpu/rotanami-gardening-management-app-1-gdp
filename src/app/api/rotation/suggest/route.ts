import { db } from "@/db";
import {
  crops,
  observations,
  plantFamilies,
  plantings,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { handle, ok, requirePlot } from "@/lib/api";
import { suggestSchema } from "@/lib/schemas";
import { suggestRotation, type CatalogCrop, type PlotHistoryItem } from "@/lib/rotation";
import type { NutrientCategory } from "@/lib/labels";

export const dynamic = "force-dynamic";

/**
 * POST /api/rotation/suggest { plotId }
 * Membaca riwayat petak + katalog, lalu menjalankan mesin aturan rotasi.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const body = suggestSchema.parse(await req.json());
    const { plot } = await requirePlot(body.plotId);

    // Riwayat penanaman petak + data katalog tanaman terkait.
    const historyRows = await db
      .select({
        planting: plantings,
        cropName: crops.name,
        familyId: crops.familyId,
        familyName: plantFamilies.name,
        rotationGroup: plantFamilies.rotationGroup,
        nutrientCategory: crops.nutrientCategory,
        isCoverCrop: crops.isCoverCrop,
      })
      .from(plantings)
      .innerJoin(crops, eq(plantings.cropId, crops.id))
      .leftJoin(plantFamilies, eq(crops.familyId, plantFamilies.id))
      .where(eq(plantings.plotId, plot.id));

    // Tandai siklus tanam yang punya observasi hama/penyakit.
    const plantingIds = historyRows.map((r) => r.planting.id);
    const pestIds = new Set<number>();
    if (plantingIds.length > 0) {
      const pestObs = await db
        .select({ plantingId: observations.plantingId, category: observations.category })
        .from(observations)
        .where(inArray(observations.plantingId, plantingIds));
      for (const o of pestObs) {
        if (o.category === "hama" || o.category === "penyakit") {
          if (o.plantingId) pestIds.add(o.plantingId);
        }
      }
    }

    const history: PlotHistoryItem[] = historyRows.map((r) => ({
      cropId: r.planting.cropId,
      cropName: r.cropName,
      familyId: r.familyId,
      rotationGroup: r.rotationGroup,
      nutrientCategory: r.nutrientCategory as NutrientCategory | null,
      isCoverCrop: r.isCoverCrop,
      status: r.planting.status,
      plantDate: r.planting.plantDate,
      hasPestIssue: pestIds.has(r.planting.id),
    }));

    const catalogRows = await db
      .select({
        crop: crops,
        familyName: plantFamilies.name,
        rotationGroup: plantFamilies.rotationGroup,
      })
      .from(crops)
      .leftJoin(plantFamilies, eq(crops.familyId, plantFamilies.id));

    const catalog: CatalogCrop[] = catalogRows.map((r) => ({
      id: r.crop.id,
      name: r.crop.name,
      familyId: r.crop.familyId,
      familyName: r.familyName,
      rotationGroup: r.rotationGroup,
      nutrientCategory: r.crop.nutrientCategory as NutrientCategory | null,
      isCoverCrop: r.crop.isCoverCrop,
    }));

    const result = suggestRotation(history, catalog);
    return ok({
      status: result.status,
      message: result.message,
      context: result.context,
      primary: result.primary
        ? {
            crop: {
              id: result.primary.crop.id,
              name: result.primary.crop.name,
              familyName: result.primary.crop.familyName,
              rotationGroup: result.primary.crop.rotationGroup,
              nutrientCategory: result.primary.crop.nutrientCategory,
              isCoverCrop: result.primary.crop.isCoverCrop,
            },
            score: result.primary.score,
            reasons: result.primary.reasons,
          }
        : null,
      alternatives: result.alternatives.map((a) => ({
        crop: {
          id: a.crop.id,
          name: a.crop.name,
          familyName: a.crop.familyName,
          rotationGroup: a.crop.rotationGroup,
          nutrientCategory: a.crop.nutrientCategory,
          isCoverCrop: a.crop.isCoverCrop,
        },
        score: a.score,
        reasons: a.reasons,
      })),
      disclaimer: result.disclaimer,
    });
  });
}
