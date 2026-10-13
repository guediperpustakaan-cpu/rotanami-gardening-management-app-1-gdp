import { db } from "@/db";
import { seasons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handle, ok, requireFarm } from "@/lib/api";
import { seasonCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/** GET /api/seasons?farmId= */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const farmId = Number(url.searchParams.get("farmId") ?? "");
    const { farm } = await requireFarm(farmId);
    const rows = await db
      .select()
      .from(seasons)
      .where(eq(seasons.farmId, farm.id))
      .orderBy(seasons.startDate);
    return ok({ seasons: rows });
  });
}

/** POST /api/seasons */
export async function POST(req: Request) {
  return handle(async () => {
    const body = seasonCreateSchema.parse(await req.json());
    const { farm } = await requireFarm(body.farmId);
    const inserted = await db
      .insert(seasons)
      .values({
        farmId: farm.id,
        name: body.name,
        startDate: body.startDate,
        endDate: body.endDate,
      })
      .returning();
    return ok({ season: inserted[0] });
  });
}
