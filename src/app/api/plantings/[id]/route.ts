import { db } from "@/db";
import { crops, plantings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ApiError, handle, loadCropOrThrow, ok, requirePlot } from "@/lib/api";
import { serializePlanting } from "@/lib/aggregator";
import { plantingUpdateSchema } from "@/lib/schemas";
import type { PlantingStatus } from "@/lib/labels";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function loadPlantingOrThrow(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "ID riwayat tidak valid.");
  const rows = await db
    .select({ planting: plantings, cropName: crops.name })
    .from(plantings)
    .innerJoin(crops, eq(plantings.cropId, crops.id))
    .where(eq(plantings.id, id))
    .limit(1);
  if (rows.length === 0) throw new ApiError(404, "Catatan penanaman tidak ditemukan.");
  return rows[0];
}

/** PATCH /api/plantings/:id */
export async function PATCH(req: Request, ctx: Params) {
  return handle(async () => {
    const { id } = await ctx.params;
    const row = await loadPlantingOrThrow(Number(id));
    await requirePlot(row.planting.plotId);
    const body = plantingUpdateSchema.parse(await req.json());
    if (body.cropId) await loadCropOrThrow(body.cropId);

    const plantDate = body.plantDate ?? row.planting.plantDate;
    const harvestDate =
      body.harvestDate !== undefined ? body.harvestDate : row.planting.harvestDate;
    if (harvestDate && harvestDate < plantDate) {
      throw new ApiError(400, "Tanggal panen tidak boleh sebelum tanggal tanam.");
    }

    const updated = await db
      .update(plantings)
      .set({
        cropId: body.cropId ?? row.planting.cropId,
        seasonId: body.seasonId !== undefined ? body.seasonId : row.planting.seasonId,
        plantDate,
        harvestDate,
        status: (body.status as PlantingStatus) ?? row.planting.status,
        yieldAmount:
          body.yieldAmount !== undefined ? String(body.yieldAmount) : row.planting.yieldAmount,
        yieldUnit: body.yieldUnit !== undefined ? body.yieldUnit : row.planting.yieldUnit,
        notes: body.notes !== undefined ? body.notes : row.planting.notes,
      })
      .where(eq(plantings.id, row.planting.id))
      .returning();
    return ok({ planting: serializePlanting(updated[0], row.cropName) });
  });
}

/** DELETE /api/plantings/:id */
export async function DELETE(_req: Request, ctx: Params) {
  return handle(async () => {
    const { id } = await ctx.params;
    const row = await loadPlantingOrThrow(Number(id));
    await requirePlot(row.planting.plotId);
    await db.delete(plantings).where(eq(plantings.id, row.planting.id));
    return ok({ ok: true });
  });
}
