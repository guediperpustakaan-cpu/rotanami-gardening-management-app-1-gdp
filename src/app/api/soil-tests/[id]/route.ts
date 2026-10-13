import { db } from "@/db";
import { soilTests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ApiError, handle, ok, requirePlot } from "@/lib/api";
import { soilTestUpdateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function loadSoilTestOrThrow(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "ID uji tanah tidak valid.");
  const rows = await db.select().from(soilTests).where(eq(soilTests.id, id)).limit(1);
  if (rows.length === 0) throw new ApiError(404, "Catatan uji tanah tidak ditemukan.");
  return rows[0];
}

/** PATCH /api/soil-tests/:id */
export async function PATCH(req: Request, ctx: Params) {
  return handle(async () => {
    const { id } = await ctx.params;
    const test = await loadSoilTestOrThrow(Number(id));
    await requirePlot(test.plotId);
    const body = soilTestUpdateSchema.parse(await req.json());
    const updated = await db
      .update(soilTests)
      .set({
        testDate: body.testDate ?? test.testDate,
        ph: body.ph !== undefined ? String(body.ph) : test.ph,
        nitrogen: body.nitrogen !== undefined ? String(body.nitrogen) : test.nitrogen,
        phosphor: body.phosphor !== undefined ? String(body.phosphor) : test.phosphor,
        potassium: body.potassium !== undefined ? String(body.potassium) : test.potassium,
        organicMatter:
          body.organicMatter !== undefined ? String(body.organicMatter) : test.organicMatter,
        method: body.method !== undefined ? body.method : test.method,
        notes: body.notes !== undefined ? body.notes : test.notes,
      })
      .where(eq(soilTests.id, test.id))
      .returning();
    return ok({ soilTest: updated[0] });
  });
}

/** DELETE /api/soil-tests/:id */
export async function DELETE(_req: Request, ctx: Params) {
  return handle(async () => {
    const { id } = await ctx.params;
    const test = await loadSoilTestOrThrow(Number(id));
    await requirePlot(test.plotId);
    await db.delete(soilTests).where(eq(soilTests.id, test.id));
    return ok({ ok: true });
  });
}
