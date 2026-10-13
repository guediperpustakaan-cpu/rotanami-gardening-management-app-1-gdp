import { db } from "@/db";
import { crops, plantings, plots } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { handle, loadCropOrThrow, ok, requireFarm, requirePlot } from "@/lib/api";
import { serializePlanting } from "@/lib/aggregator";
import { plantingCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/** GET /api/plantings?farmId= — seluruh riwayat tanam sebuah kebun (terbaru dulu). */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const farmId = Number(url.searchParams.get("farmId") ?? "");
    const { farm } = await requireFarm(farmId);
    const rows = await db
      .select({ planting: plantings, cropName: crops.name, plotName: plots.name })
      .from(plantings)
      .innerJoin(crops, eq(plantings.cropId, crops.id))
      .innerJoin(plots, eq(plantings.plotId, plots.id))
      .where(eq(plots.farmId, farm.id))
      .orderBy(desc(plantings.plantDate), desc(plantings.id));
    return ok({
      plantings: rows.map((r) => ({
        ...serializePlanting(r.planting, r.cropName),
        plotName: r.plotName,
      })),
    });
  });
}

/** POST /api/plantings — catat penanaman baru. */
export async function POST(req: Request) {
  return handle(async () => {
    const body = plantingCreateSchema.parse(await req.json());
    const { plot } = await requirePlot(body.plotId);
    await loadCropOrThrow(body.cropId);
    const inserted = await db
      .insert(plantings)
      .values({
        plotId: plot.id,
        cropId: body.cropId,
        seasonId: body.seasonId ?? null,
        plantDate: body.plantDate,
        harvestDate: body.harvestDate ?? null,
        status: body.status,
        yieldAmount: body.yieldAmount !== undefined ? String(body.yieldAmount) : null,
        yieldUnit: body.yieldUnit ?? null,
        notes: body.notes ?? null,
      })
      .returning();
    const cropRow = await db.select({ name: crops.name }).from(crops).where(eq(crops.id, body.cropId)).limit(1);
    return ok({ planting: serializePlanting(inserted[0], cropRow[0]?.name ?? null) });
  });
}
