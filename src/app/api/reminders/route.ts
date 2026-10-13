import { db } from "@/db";
import { plots, reminders } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { ApiError, handle, ok, requireFarm } from "@/lib/api";
import { reminderCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export function serializeReminder(
  row: typeof reminders.$inferSelect,
  plotName: string | null,
) {
  return {
    id: row.id,
    farmId: row.farmId,
    plotId: row.plotId,
    plotName,
    title: row.title,
    dueDate: row.dueDate,
    done: row.done,
    notes: row.notes,
  };
}

/** GET /api/reminders?farmId= — semua pengingat kebun, urut tanggal jatuh tempo. */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const farmId = Number(url.searchParams.get("farmId") ?? "");
    const { farm } = await requireFarm(farmId);
    const rows = await db
      .select({ reminder: reminders, plotName: plots.name })
      .from(reminders)
      .leftJoin(plots, eq(reminders.plotId, plots.id))
      .where(eq(reminders.farmId, farm.id))
      .orderBy(asc(reminders.dueDate), asc(reminders.id));
    return ok({ reminders: rows.map((r) => serializeReminder(r.reminder, r.plotName)) });
  });
}

/** POST /api/reminders */
export async function POST(req: Request) {
  return handle(async () => {
    const body = reminderCreateSchema.parse(await req.json());
    const { farm } = await requireFarm(body.farmId);
    let plotName: string | null = null;
    if (body.plotId) {
      const rows = await db.select().from(plots).where(eq(plots.id, body.plotId)).limit(1);
      if (rows.length === 0 || rows[0].farmId !== farm.id) {
        throw new ApiError(400, "Petak yang dipilih tidak ditemukan pada kebun ini.");
      }
      plotName = rows[0].name;
    }
    const inserted = await db
      .insert(reminders)
      .values({
        farmId: farm.id,
        plotId: body.plotId ?? null,
        title: body.title,
        dueDate: body.dueDate,
        notes: body.notes ?? null,
      })
      .returning();
    return ok({ reminder: serializeReminder(inserted[0], plotName) });
  });
}
