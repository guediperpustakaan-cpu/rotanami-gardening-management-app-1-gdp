// Agregasi data sisi server untuk dashboard dan kalender.
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  crops,
  plantings,
  plots,
  reminders,
  rotationPlans,
} from "@/db/schema";
import type {
  CalendarEvent,
  Farm,
  Planting,
  PlantingStatus,
  PlotSummary,
} from "./types";
import { addDaysISO, todayISO } from "./format";

export function serializeFarm(row: {
  id: number;
  ownerId: number;
  name: string;
  location: string | null;
  timezone: string;
  createdAt: Date;
}): Farm {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    location: row.location,
    timezone: row.timezone,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Ringkasan petak + penanaman terakhir (non-batal terbaru). */
export async function getPlotSummaries(farmId: number): Promise<PlotSummary[]> {
  const plotRows = await db
    .select()
    .from(plots)
    .where(eq(plots.farmId, farmId))
    .orderBy(plots.id);

  if (plotRows.length === 0) return [];

  const plotIds = plotRows.map((p) => p.id);
  const plantingRows = await db
    .select({ planting: plantings, cropName: crops.name })
    .from(plantings)
    .innerJoin(crops, eq(plantings.cropId, crops.id))
    .where(inArray(plantings.plotId, plotIds))
    .orderBy(desc(plantings.plantDate), desc(plantings.id));

  const byPlot = new Map<number, { planting: Planting; cropName: string }[]>();
  for (const row of plantingRows) {
    const list = byPlot.get(row.planting.plotId) ?? [];
    list.push({
      planting: serializePlanting(row.planting, row.cropName),
      cropName: row.cropName,
    });
    byPlot.set(row.planting.plotId, list);
  }

  return plotRows.map((p) => {
    const list = byPlot.get(p.id) ?? [];
    const last = list.find((l) => l.planting.status !== "dibatalkan");
    return {
      id: p.id,
      farmId: p.farmId,
      name: p.name,
      size: p.size,
      areaUnit: p.areaUnit,
      soilType: p.soilType,
      notes: p.notes,
      createdAt: p.createdAt.toISOString(),
      lastPlanting: last
        ? {
            cropName: last.cropName,
            plantDate: last.planting.plantDate,
            status: last.planting.status,
          }
        : null,
      plantingCount: list.length,
    };
  });
}

export function serializePlanting(
  row: typeof plantings.$inferSelect,
  cropName: string | null,
): Planting {
  return {
    id: row.id,
    plotId: row.plotId,
    cropId: row.cropId,
    cropName: cropName ?? "Tanaman terhapus",
    seasonId: row.seasonId,
    plantDate: row.plantDate,
    harvestDate: row.harvestDate,
    status: row.status as PlantingStatus,
    yieldAmount: row.yieldAmount,
    yieldUnit: row.yieldUnit,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Kejadian mendatang untuk dashboard: pengingat, rencana tanam, rencana rotasi, panen. */
export async function getUpcomingEvents(
  farmId: number,
  opts?: { monthPrefix?: string; limit?: number },
): Promise<CalendarEvent[]> {
  const today = todayISO();
  const horizon = addDaysISO(today, 45);
  const events: CalendarEvent[] = [];

  const reminderRows = await db
    .select({ reminder: reminders, plotName: plots.name })
    .from(reminders)
    .leftJoin(plots, eq(reminders.plotId, plots.id))
    .where(eq(reminders.farmId, farmId));
  for (const r of reminderRows) {
    if (r.reminder.done && opts?.monthPrefix) {
      // tetap tampilkan di kalender bulanan
    } else if (r.reminder.done) {
      continue; // di dashboard, pengingat selesai tidak ditampilkan
    }
    events.push({
      key: `reminder-${r.reminder.id}`,
      kind: "reminder",
      id: r.reminder.id,
      date: r.reminder.dueDate,
      title: r.reminder.title,
      subtitle: r.plotName ? `Petak: ${r.plotName}` : null,
      done: r.reminder.done,
    });
  }

  const plantingRows = await db
    .select({ planting: plantings, cropName: crops.name, plotName: plots.name })
    .from(plantings)
    .innerJoin(crops, eq(plantings.cropId, crops.id))
    .innerJoin(plots, eq(plantings.plotId, plots.id))
    .where(eq(plots.farmId, farmId));
  for (const p of plantingRows) {
    const st = p.planting.status;
    if (st === "direncanakan") {
      events.push({
        key: `planting-${p.planting.id}`,
        kind: "planting",
        id: p.planting.id,
        date: p.planting.plantDate,
        title: `Rencana tanam: ${p.cropName}`,
        subtitle: `Petak: ${p.plotName}`,
        done: null,
      });
    } else if (st === "ditanam" && p.planting.harvestDate) {
      events.push({
        key: `harvest-${p.planting.id}`,
        kind: "planting",
        id: p.planting.id,
        date: p.planting.harvestDate,
        title: `Perkiraan panen: ${p.cropName}`,
        subtitle: `Petak: ${p.plotName}`,
        done: null,
      });
    }
  }

  const planRows = await db
    .select({ plan: rotationPlans, cropName: crops.name, plotName: plots.name })
    .from(rotationPlans)
    .innerJoin(crops, eq(rotationPlans.cropId, crops.id))
    .innerJoin(plots, eq(rotationPlans.plotId, plots.id))
    .where(and(eq(plots.farmId, farmId), eq(rotationPlans.status, "aktif")));
  for (const pl of planRows) {
    if (!pl.plan.targetDate) continue;
    events.push({
      key: `plan-${pl.plan.id}`,
      kind: "plan",
      id: pl.plan.id,
      date: pl.plan.targetDate,
      title: `Rencana rotasi: ${pl.cropName}`,
      subtitle: `Petak: ${pl.plotName}`,
      done: null,
    });
  }

  let filtered = events;
  if (opts?.monthPrefix) {
    filtered = filtered.filter((e) => e.date.startsWith(opts.monthPrefix!));
  } else {
    filtered = filtered.filter((e) => e.date <= horizon);
  }

  filtered.sort(
    (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "id"),
  );

  const limit = opts?.limit ?? 6;
  return filtered.slice(0, limit);
}
