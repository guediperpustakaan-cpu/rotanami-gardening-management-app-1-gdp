import { db } from "@/db";
import {
  crops,
  observations,
  plantFamilies,
  plantings,
  plots,
  seasons,
  soilTests,
} from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { handle, ok, requirePlot, serializeFarmId } from "@/lib/api";
import { serializePlanting } from "@/lib/aggregator";
import { plotUpdateSchema } from "@/lib/schemas";
import { serializePlot } from "../route";
import { serializeCrop } from "@/app/api/crops/route";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET /api/plots/:id — detail petak lengkap untuk halaman detail. */
export async function GET(_req: Request, ctx: Params) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { plot, farm } = await requirePlot(Number(id));

    const plantingRows = await db
      .select({ planting: plantings, cropName: crops.name })
      .from(plantings)
      .innerJoin(crops, eq(plantings.cropId, crops.id))
      .where(eq(plantings.plotId, plot.id))
      .orderBy(desc(plantings.plantDate), desc(plantings.id));

    const soilRows = await db
      .select()
      .from(soilTests)
      .where(eq(soilTests.plotId, plot.id))
      .orderBy(soilTests.testDate);

    const obsRows = await db
      .select({
        obs: observations,
        plantingCropName: crops.name,
      })
      .from(observations)
      .leftJoin(plantings, eq(observations.plantingId, plantings.id))
      .leftJoin(crops, eq(plantings.cropId, crops.id))
      .where(eq(observations.plotId, plot.id))
      .orderBy(desc(observations.obsDate), desc(observations.id));

    const cropRows = await db
      .select({ crop: crops, familyName: plantFamilies.name, rotationGroup: plantFamilies.rotationGroup })
      .from(crops)
      .leftJoin(plantFamilies, eq(crops.familyId, plantFamilies.id))
      .orderBy(crops.name);

    const seasonRows = await db
      .select()
      .from(seasons)
      .where(eq(seasons.farmId, farm.id))
      .orderBy(seasons.startDate);

    return ok({
      plot: serializePlot(plot),
      farm: serializeFarmId(farm),
      plantings: plantingRows.map((r) => serializePlanting(r.planting, r.cropName)),
      soilTests: soilRows,
      observations: obsRows.map((r) => ({
        id: r.obs.id,
        plotId: r.obs.plotId,
        plantingId: r.obs.plantingId,
        category: r.obs.category,
        obsDate: r.obs.obsDate,
        description: r.obs.description,
        plantingCropName: r.plantingCropName,
      })),
      crops: cropRows.map((r) => serializeCrop(r.crop, r.familyName, r.rotationGroup)),
      seasons: seasonRows,
    });
  });
}

/** PATCH /api/plots/:id */
export async function PATCH(req: Request, ctx: Params) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { plot } = await requirePlot(Number(id));
    const body = plotUpdateSchema.parse(await req.json());
    const updated = await db
      .update(plots)
      .set({
        name: body.name ?? plot.name,
        size:
          body.size !== undefined
            ? String(body.size)
            : plot.size,
        areaUnit: body.areaUnit ?? plot.areaUnit,
        soilType: body.soilType !== undefined ? body.soilType : plot.soilType,
        notes: body.notes !== undefined ? body.notes : plot.notes,
      })
      .where(eq(plots.id, plot.id))
      .returning();
    return ok({ plot: serializePlot(updated[0]) });
  });
}

/** DELETE /api/plots/:id — hapus petak beserta datanya (UI meminta konfirmasi). */
export async function DELETE(_req: Request, ctx: Params) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { plot } = await requirePlot(Number(id));
    await db.delete(plots).where(eq(plots.id, plot.id));
    return ok({ ok: true });
  });
}
