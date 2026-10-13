import { db } from "@/db";
import { plots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handle, ok, requireFarm } from "@/lib/api";
import { getPlotSummaries } from "@/lib/aggregator";
import { plotCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/** GET /api/plots?farmId= — daftar petak kebun beserta ringkasan penanaman terakhir. */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const farmId = Number(url.searchParams.get("farmId") ?? "");
    const { farm } = await requireFarm(farmId);
    const summaries = await getPlotSummaries(farm.id);
    return ok({ plots: summaries });
  });
}

export function serializePlot(row: typeof plots.$inferSelect) {
  return {
    id: row.id,
    farmId: row.farmId,
    name: row.name,
    size: row.size,
    areaUnit: row.areaUnit,
    soilType: row.soilType,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

/** POST /api/plots — tambah petak baru. */
export async function POST(req: Request) {
  return handle(async () => {
    const body = plotCreateSchema.parse(await req.json());
    const { farm } = await requireFarm(body.farmId);
    const inserted = await db
      .insert(plots)
      .values({
        farmId: farm.id,
        name: body.name,
        size: body.size !== undefined ? String(body.size) : null,
        areaUnit: body.areaUnit,
        soilType: body.soilType ?? null,
        notes: body.notes ?? null,
      })
      .returning();
    return ok({ plot: serializePlot(inserted[0]) });
  });
}
