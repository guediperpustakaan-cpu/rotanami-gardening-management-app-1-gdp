import { db } from "@/db";
import { crops, plantings, plots, rotationPlans } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { handle, loadCropOrThrow, ok, requireFarm, requirePlot } from "@/lib/api";
import { rotationPlanCreateSchema } from "@/lib/schemas";
import type { PlanStatus } from "@/lib/labels";
import type { RotationRationale } from "@/lib/types";

export const dynamic = "force-dynamic";

export function serializePlan(
  row: typeof rotationPlans.$inferSelect,
  plotName: string | null,
  cropName: string | null,
) {
  return {
    id: row.id,
    plotId: row.plotId,
    plotName,
    cropId: row.cropId,
    cropName,
    seasonId: row.seasonId,
    targetDate: row.targetDate,
    status: row.status as PlanStatus,
    rationale: (row.rationale ?? null) as RotationRationale | null,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

/** GET /api/rotation-plans?farmId= — semua rencana rotasi sebuah kebun. */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const farmId = Number(url.searchParams.get("farmId") ?? "");
    const { farm } = await requireFarm(farmId);
    const rows = await db
      .select({ plan: rotationPlans, cropName: crops.name, plotName: plots.name })
      .from(rotationPlans)
      .innerJoin(crops, eq(rotationPlans.cropId, crops.id))
      .innerJoin(plots, eq(rotationPlans.plotId, plots.id))
      .where(eq(plots.farmId, farm.id))
      .orderBy(desc(rotationPlans.createdAt));
    return ok({
      plans: rows.map((r) => serializePlan(r.plan, r.plotName, r.cropName)),
    });
  });
}

/** POST /api/rotation-plans — simpan rencana rotasi (dari saran atau pilihan manual). */
export async function POST(req: Request) {
  return handle(async () => {
    const body = rotationPlanCreateSchema.parse(await req.json());
    const { plot } = await requirePlot(body.plotId);
    await loadCropOrThrow(body.cropId);
    const inserted = await db
      .insert(rotationPlans)
      .values({
        plotId: plot.id,
        seasonId: body.seasonId ?? null,
        cropId: body.cropId,
        targetDate: body.targetDate ?? null,
        status: body.status,
        rationale: body.rationale ?? null,
        notes: body.notes ?? null,
      })
      .returning();
    const cropRow = await db.select({ name: crops.name }).from(crops).where(eq(crops.id, body.cropId)).limit(1);
    return ok({ plan: serializePlan(inserted[0], plot.name, cropRow[0]?.name ?? null) });
  });
}
