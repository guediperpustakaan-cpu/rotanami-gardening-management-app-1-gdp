import { db } from "@/db";
import { plots, reminders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ApiError, handle, ok, requireFarm } from "@/lib/api";
import { reminderUpdateSchema } from "@/lib/schemas";
import { serializeReminder } from "../route";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function loadReminderOrThrow(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "ID pengingat tidak valid.");
  const rows = await db.select().from(reminders).where(eq(reminders.id, id)).limit(1);
  if (rows.length === 0) throw new ApiError(404, "Pengingat tidak ditemukan.");
  return rows[0];
}

/** PATCH /api/reminders/:id — ubah judul/tanggal/status selesai. */
export async function PATCH(req: Request, ctx: Params) {
  return handle(async () => {
    const { id } = await ctx.params;
    const reminder = await loadReminderOrThrow(Number(id));
    const { farm } = await requireFarm(reminder.farmId);
    const body = reminderUpdateSchema.parse(await req.json());

    let plotId = reminder.plotId;
    if (body.plotId !== undefined) {
      if (body.plotId === null) {
        plotId = null;
      } else {
        const rows = await db.select().from(plots).where(eq(plots.id, body.plotId)).limit(1);
        if (rows.length === 0 || rows[0].farmId !== farm.id) {
          throw new ApiError(400, "Petak yang dipilih tidak ditemukan pada kebun ini.");
        }
        plotId = body.plotId;
      }
    }

    const updated = await db
      .update(reminders)
      .set({
        title: body.title ?? reminder.title,
        dueDate: body.dueDate ?? reminder.dueDate,
        done: body.done ?? reminder.done,
        plotId,
        notes: body.notes !== undefined ? body.notes : reminder.notes,
      })
      .where(eq(reminders.id, reminder.id))
      .returning();

    const plotRow = plotId
      ? await db.select({ name: plots.name }).from(plots).where(eq(plots.id, plotId)).limit(1)
      : [];
    return ok({ reminder: serializeReminder(updated[0], plotRow[0]?.name ?? null) });
  });
}

/** DELETE /api/reminders/:id */
export async function DELETE(_req: Request, ctx: Params) {
  return handle(async () => {
    const { id } = await ctx.params;
    const reminder = await loadReminderOrThrow(Number(id));
    await requireFarm(reminder.farmId);
    await db.delete(reminders).where(eq(reminders.id, reminder.id));
    return ok({ ok: true });
  });
}
