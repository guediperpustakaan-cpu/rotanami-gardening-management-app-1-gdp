import { db } from "@/db";
import { farms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ApiError, handle, ok, requireFarm, serializeFarmId } from "@/lib/api";
import { farmUpdateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET /api/farms/:id */
export async function GET(_req: Request, ctx: Params) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { farm } = await requireFarm(Number(id));
    return ok({ farm: serializeFarmId(farm) });
  });
}

/** PATCH /api/farms/:id — ubah profil kebun (hanya pemilik). */
export async function PATCH(req: Request, ctx: Params) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { farm, user } = await requireFarm(Number(id));
    if (farm.ownerId !== user.id) {
      throw new ApiError(403, "Hanya pemilik kebun yang dapat mengubah profil kebun.");
    }
    const body = farmUpdateSchema.parse(await req.json());
    const updated = await db
      .update(farms)
      .set({
        name: body.name ?? farm.name,
        location: body.location !== undefined ? body.location : farm.location,
        timezone: body.timezone ?? farm.timezone,
      })
      .where(eq(farms.id, farm.id))
      .returning();
    return ok({ farm: serializeFarmId(updated[0]) });
  });
}

/** DELETE /api/farms/:id — hapus kebun (hanya pemilik; UI meminta konfirmasi). */
export async function DELETE(_req: Request, ctx: Params) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { farm, user } = await requireFarm(Number(id));
    if (farm.ownerId !== user.id) {
      throw new ApiError(403, "Hanya pemilik kebun yang dapat menghapus kebun.");
    }
    await db.delete(farms).where(eq(farms.id, farm.id));
    return ok({ ok: true });
  });
}
