import { handle, ok, requireFarm } from "@/lib/api";
import { getUpcomingEvents } from "@/lib/aggregator";
import { monthNowISO } from "@/lib/format";

export const dynamic = "force-dynamic";

/** GET /api/calendar?farmId=&month=YYYY-MM — kejadian pada bulan tertentu. */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const farmId = Number(url.searchParams.get("farmId") ?? "");
    const { farm } = await requireFarm(farmId);
    const month = url.searchParams.get("month") ?? monthNowISO();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return ok({ events: [], month: monthNowISO() });
    }
    const events = await getUpcomingEvents(farm.id, { monthPrefix: month, limit: 500 });
    return ok({ events, month });
  });
}
