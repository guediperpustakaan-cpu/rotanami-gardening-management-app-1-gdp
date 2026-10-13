import { db } from "@/db";
import { farmMembers, farms } from "@/db/schema";
import { handle, ok, requireUser, getAccessibleFarms, serializeFarmId } from "@/lib/api";
import { farmCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/** GET /api/farms — daftar kebun yang bisa diakses pengguna. */
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const list = await getAccessibleFarms(user.id);
    return ok({ farms: list.map(serializeFarmId) });
  });
}

/** POST /api/farms — buat kebun baru; pembuat otomatis jadi pemilik. */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const body = farmCreateSchema.parse(await req.json());
    const inserted = await db
      .insert(farms)
      .values({
        ownerId: user.id,
        name: body.name,
        location: body.location ?? null,
        timezone: body.timezone ?? "Asia/Jakarta",
      })
      .returning();
    await db.insert(farmMembers).values({ farmId: inserted[0].id, userId: user.id, role: "pemilik" });
    return ok({ farm: serializeFarmId(inserted[0]) });
  });
}
