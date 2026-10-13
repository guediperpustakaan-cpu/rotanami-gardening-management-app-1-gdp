import { db } from "@/db";
import { crops, plantings, plots, rotationPlans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ApiError, handle, loadCropOrThrow, ok, requirePlot } from "@/lib/api";
import { rotationPlanUpdateSchema } from "@/lib/schemas";
import { serializePlan } from "../route";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function loadPlanOrThrow(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "ID rencana tidak valid.");
  const rows = await db
    .select({ plan: rotationPlans, cropName: crops.name, plotName: plots.name })
    .from(rotationPlans)
    .innerJoin(crops, eq(rotationPlans.cropId, crops.id))
    .innerJoin(plots, eq(rotationPlans.plotId, plots.id))
    .where(eq(rotationPlans.id, id))
    .limit(1);
  if (rows.length === 0) throw new ApiError(404, "Rencana rotasi tidak ditemukan.");
  return rows[0];
}

/** PATCH /api/rotation-plans/:id — ubah tanaman/target/status rencana. */
export async function PATCH(req: Request, ctx: Params) {
  return handle(async () => {
    const { id } = await ctx.params;
    const row = await loadPlanOrThrow(Number(id));
    await requirePlot(row.plan.plotId);
    const body = rotationPlanUpdateSchema.parse(await req.json());
    if (body.cropId) await loadCropOrThrow(body.cropId);

    const updated = await db
      .update(rotationPlans)
      .set({
        cropId: body.cropId ?? row.plan.cropId,
        seasonId: body.seasonId !== undefined ? body.seasonId : row.plan.seasonId,
        targetDate: body.targetDate !== undefined ? body.targetDate : row.plan.targetDate,
        status: body.status ?? row.plan.status,
        notes: body.notes !== undefined ? body.notes : row.plan.notes,
      })
      .where(eq(rotationPlans.id, row.plan.id))
      .returning();

    const fresh = await db
      .select({ cropName: crops.name })
      .from(crops)
      .where(eq(crops.id, updated[0].cropId))
      .limit(1);
    return ok({ plan: serializePlan(updated[0], row.plotName, fresh[0]?.cropName ?? row.cropName) });
  });
}

/** DELETE /api/rotation-plans/:id */
export async function DELETE(_req: Request, ctx: Params) {
  return handle(async () => {
    const { id } = await ctx.params;
    const row = await loadPlanOrThrow(Number(id));
    await requirePlot(row.plan.plotId);
    await db.delete(rotationPlans).where(eq(rotationPlans.id, row.plan.id));
    return ok({ ok: true });
  });
}
