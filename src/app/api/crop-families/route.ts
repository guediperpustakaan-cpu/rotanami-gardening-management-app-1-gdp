import { db } from "@/db";
import { plantFamilies } from "@/db/schema";
import { ApiError, handle, ok, requireUser } from "@/lib/api";
import { familyCreateSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** GET /api/crop-families — daftar keluarga botani / kelompok rotasi. */
export async function GET() {
  return handle(async () => {
    await requireUser();
    const rows = await db.select().from(plantFamilies).orderBy(plantFamilies.name);
    return ok({ families: rows });
  });
}

/** POST /api/crop-families — tambah keluarga baru ke katalog. */
export async function POST(req: Request) {
  return handle(async () => {
    await requireUser();
    const body = familyCreateSchema.parse(await req.json());
    const existing = await db
      .select({ id: plantFamilies.id })
      .from(plantFamilies)
      .where(eq(plantFamilies.name, body.name))
      .limit(1);
    if (existing.length > 0) {
      throw new ApiError(409, "Keluarga dengan nama tersebut sudah ada di katalog.");
    }
    const inserted = await db
      .insert(plantFamilies)
      .values({ name: body.name, rotationGroup: body.rotationGroup ?? null })
      .returning();
    return ok({ family: inserted[0] });
  });
}
