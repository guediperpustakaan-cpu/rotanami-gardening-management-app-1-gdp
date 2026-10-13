import { db } from "@/db";
import { soilTests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handle, ok, requirePlot } from "@/lib/api";
import { soilTestCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

function toNum(v: number | undefined): string | null {
  return v === undefined ? null : String(v);
}

/** GET /api/soil-tests?plotId= — riwayat uji tanah sebuah petak (urut tanggal). */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const plotId = Number(url.searchParams.get("plotId") ?? "");
    const { plot } = await requirePlot(plotId);
    const rows = await db
      .select()
      .from(soilTests)
      .where(eq(soilTests.plotId, plot.id))
      .orderBy(soilTests.testDate);
    return ok({ soilTests: rows });
  });
}

/** POST /api/soil-tests — simpan hasil uji tanah. Hanya tanggal dan petak yang wajib. */
export async function POST(req: Request) {
  return handle(async () => {
    const body = soilTestCreateSchema.parse(await req.json());
    const { plot } = await requirePlot(body.plotId);
    const inserted = await db
      .insert(soilTests)
      .values({
        plotId: plot.id,
        testDate: body.testDate,
        ph: toNum(body.ph),
        nitrogen: toNum(body.nitrogen),
        phosphor: toNum(body.phosphor),
        potassium: toNum(body.potassium),
        organicMatter: toNum(body.organicMatter),
        method: body.method ?? null,
        notes: body.notes ?? null,
      })
      .returning();
    return ok({ soilTest: inserted[0] });
  });
}
