import { db } from "@/db";
import { crops, observations, plantings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ApiError, handle, ok, requirePlot } from "@/lib/api";
import { observationUpdateSchema } from "@/lib/schemas";
import { serializeObservation } from "../route";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function loadObservationOrThrow(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "ID observasi tidak valid.");
  const rows = await db.select().from(observations).where(eq(observations.id, id)).limit(1);
  if (rows.length === 0) throw new ApiError(404, "Catatan observasi tidak ditemukan.");
  return rows[0];
}

/** PATCH /api/observations/:id */
export async function PATCH(req: Request, ctx: Params) {
  return handle(async () => {
    const { id } = await ctx.params;
    const obs = await loadObservationOrThrow(Number(id));
    const { plot } = await requirePlot(obs.plotId);
    const body = observationUpdateSchema.parse(await req.json());

    let plantingId = obs.plantingId;
    let plantingCropName: string | null = null;
    if (body.plantingId !== undefined) {
      if (body.plantingId === null) {
        plantingId = null;
      } else {
        const rows = await db
          .select({ planting: plantings, cropName: crops.name })
          .from(plantings)
          .innerJoin(crops, eq(plantings.cropId, crops.id))
          .where(eq(plantings.id, body.plantingId))
          .limit(1);
        if (rows.length === 0 || rows[0].planting.plotId !== plot.id) {
          throw new ApiError(400, "Siklus tanam yang dipilih tidak ditemukan pada petak ini.");
        }
        plantingId = body.plantingId;
        plantingCropName = rows[0].cropName;
      }
    } else if (plantingId) {
      const rows = await db
        .select({ cropName: crops.name })
        .from(plantings)
        .innerJoin(crops, eq(plantings.cropId, crops.id))
        .where(eq(plantings.id, plantingId))
        .limit(1);
      plantingCropName = rows[0]?.cropName ?? null;
    }

    const updated = await db
      .update(observations)
      .set({
        plantingId,
        category: body.category ?? obs.category,
        obsDate: body.obsDate ?? obs.obsDate,
        description: body.description ?? obs.description,
      })
      .where(eq(observations.id, obs.id))
      .returning();
    return ok({ observation: serializeObservation(updated[0], plantingCropName) });
  });
}

/** DELETE /api/observations/:id */
export async function DELETE(_req: Request, ctx: Params) {
  return handle(async () => {
    const { id } = await ctx.params;
    const obs = await loadObservationOrThrow(Number(id));
    await requirePlot(obs.plotId);
    await db.delete(observations).where(eq(observations.id, obs.id));
    return ok({ ok: true });
  });
}
