import { db } from "@/db";
import { crops, plantings, plots } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { handle, requireFarm } from "@/lib/api";
import { csvEscape } from "@/lib/format";
import { PLANTING_STATUS_LABELS, type PlantingStatus } from "@/lib/labels";

export const dynamic = "force-dynamic";

/** GET /api/export/plantings?farmId= — ekspor CSV riwayat penanaman. */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const farmId = Number(url.searchParams.get("farmId") ?? "");
    const { farm } = await requireFarm(farmId);

    const rows = await db
      .select({ planting: plantings, cropName: crops.name, plotName: plots.name })
      .from(plantings)
      .innerJoin(crops, eq(plantings.cropId, crops.id))
      .innerJoin(plots, eq(plantings.plotId, plots.id))
      .where(eq(plots.farmId, farm.id))
      .orderBy(desc(plantings.plantDate), desc(plantings.id));

    const header = [
      "Petak",
      "Tanaman",
      "Tanggal tanam",
      "Tanggal panen",
      "Status",
      "Hasil",
      "Satuan hasil",
      "Catatan",
    ];
    const lines = rows.map((r) =>
      [
        r.plotName,
        r.cropName,
        r.planting.plantDate,
        r.planting.harvestDate ?? "",
        PLANTING_STATUS_LABELS[r.planting.status as PlantingStatus] ?? r.planting.status,
        r.planting.yieldAmount ?? "",
        r.planting.yieldUnit ?? "",
        r.planting.notes ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );
    const csv = "\uFEFF" + [header.map(csvEscape).join(","), ...lines].join("\r\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="riwayat-tanam-${farm.id}.csv"`,
      },
    });
  });
}
