import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { plantings, plots, reminders, rotationPlans } from "@/db/schema";
import { handle, ok, requireUser, getActiveFarm, getAccessibleFarms, serializeFarmId } from "@/lib/api";
import { getPlotSummaries, getUpcomingEvents, serializeFarm } from "@/lib/aggregator";
import { todayISO } from "@/lib/format";

export const dynamic = "force-dynamic";

/** GET /api/dashboard — ringkasan kebun aktif untuk halaman dashboard. */
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const farm = await getActiveFarm(user);
    const farmsList = await getAccessibleFarms(user.id);

    if (!farm) {
      return ok({
        farm: null,
        farms: farmsList.map(serializeFarmId),
        plots: [],
        counts: { plots: 0, activePlans: 0, plantedNow: 0, planned: 0, actionsNeeded: 0 },
        upcoming: [],
      });
    }

    const plotSummaries = await getPlotSummaries(farm.id);
    const today = todayISO();

    const [planCount] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(rotationPlans)
      .innerJoin(plots, eq(rotationPlans.plotId, plots.id))
      .where(and(eq(plots.farmId, farm.id), eq(rotationPlans.status, "aktif")));

    const [plantedNow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(plantings)
      .innerJoin(plots, eq(plantings.plotId, plots.id))
      .where(and(eq(plots.farmId, farm.id), eq(plantings.status, "ditanam")));

    const [planned] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(plantings)
      .innerJoin(plots, eq(plantings.plotId, plots.id))
      .where(and(eq(plots.farmId, farm.id), eq(plantings.status, "direncanakan")));

    const [overdueReminders] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(reminders)
      .where(
        and(
          eq(reminders.farmId, farm.id),
          eq(reminders.done, false),
          sql`${reminders.dueDate} < ${today}`,
        ),
      );

    const [pastDuePlanned] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(plantings)
      .innerJoin(plots, eq(plantings.plotId, plots.id))
      .where(
        and(
          eq(plots.farmId, farm.id),
          eq(plantings.status, "direncanakan"),
          sql`${plantings.plantDate} < ${today}`,
        ),
      );

    const upcoming = await getUpcomingEvents(farm.id, { limit: 6 });

    return ok({
      farm: serializeFarm(farm),
      farms: farmsList.map(serializeFarmId),
      plots: plotSummaries,
      counts: {
        plots: plotSummaries.length,
        activePlans: planCount?.n ?? 0,
        plantedNow: plantedNow?.n ?? 0,
        planned: planned?.n ?? 0,
        actionsNeeded: (overdueReminders?.n ?? 0) + (pastDuePlanned?.n ?? 0),
      },
      upcoming,
    });
  });
}
