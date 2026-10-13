import { db } from "@/db";
import { plots, soilTests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handle, requireFarm } from "@/lib/api";
import { csvEscape } from "@/lib/format";

export const dynamic = "force-dynamic";

/** GET /api/export/soil-tests?farmId= — ekspor CSV hasil uji tanah. */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const farmId = Number(url.searchParams.get("farmId") ?? "");
    const { farm } = await requireFarm(farmId);

    const rows = await db
      .select({ test: soilTests, plotName: plots.name })
      .from(soilTests)
      .innerJoin(plots, eq(soilTests.plotId, plots.id))
      .where(eq(plots.farmId, farm.id))
      .orderBy(soilTests.testDate);

    const header = [
      "Petak",
      "Tanggal tes",
      "pH",
      "Nitrogen",
      "Fosfor",
      "Kalium",
      "Bahan organik",
      "Metode/sumber",
      "Catatan",
    ];
    const lines = rows.map((r) =>
      [
        r.plotName,
        r.test.testDate,
        r.test.ph ?? "",
        r.test.nitrogen ?? "",
        r.test.phosphor ?? "",
        r.test.potassium ?? "",
        r.test.organicMatter ?? "",
        r.test.method ?? "",
        r.test.notes ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );
    const csv = "\uFEFF" + [header.map(csvEscape).join(","), ...lines].join("\r\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="hasil-uji-tanah-${farm.id}.csv"`,
      },
    });
  });
}
