import { db } from "@/db";
import { crops, observations, plantings } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ApiError, handle, ok, requirePlot } from "@/lib/api";
import { observationCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export function serializeObservation(
  obs: typeof observations.$inferSelect,
  plantingCropName: string | null,
) {
  return {
    id: obs.id,
    plotId: obs.plotId,
    plantingId: obs.plantingId,
    category: obs.category,
    obsDate: obs.obsDate,
    description: obs.description,
    plantingCropName,
  };
}

/** GET /api/observations?plotId= */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const plotId = Number(url.searchParams.get("plotId") ?? "");
    const { plot } = await requirePlot(plotId);
    const rows = await db
      .select({ obs: observations, plantingCropName: crops.name })
      .from(observations)
      .leftJoin(plantings, eq(observations.plantingId, plantings.id))
      .leftJoin(crops, eq(plantings.cropId, crops.id))
      .where(eq(observations.plotId, plot.id))
      .orderBy(desc(observations.obsDate), desc(observations.id));
    return ok({ observations: rows.map((r) => serializeObservation(r.obs, r.plantingCropName)) });
  });
}

/** POST /api/observations */
export async function POST(req: Request) {
  return handle(async () => {
    const body = observationCreateSchema.parse(await req.json());
    const { plot } = await requirePlot(body.plotId);
    let plantingCropName: string | null = null;
    if (body.plantingId) {
      const rows = await db
        .select({ planting: plantings, cropName: crops.name })
        .from(plantings)
        .innerJoin(crops, eq(plantings.cropId, crops.id))
        .where(eq(plantings.id, body.plantingId))
        .limit(1);
      if (rows.length === 0 || rows[0].planting.plotId !== plot.id) {
        throw new ApiError(400, "Siklus tanam yang dipilih tidak ditemukan pada petak ini.");
      }
      plantingCropName = rows[0].cropName;
    }
    const inserted = await db
      .insert(observations)
      .values({
        plotId: plot.id,
        plantingId: body.plantingId ?? null,
        category: body.category,
        obsDate: body.obsDate,
        description: body.description,
      })
      .returning();
    return ok({ observation: serializeObservation(inserted[0], plantingCropName) });
  });
}
