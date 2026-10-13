import { db } from "@/db";
import { crops, plantFamilies } from "@/db/schema";
import { eq, ilike, and } from "drizzle-orm";
import { handle, ok, requireUser } from "@/lib/api";
import { cropCreateSchema } from "@/lib/schemas";
import type { NutrientCategory } from "@/lib/labels";

export const dynamic = "force-dynamic";

export function serializeCrop(
  row: typeof crops.$inferSelect,
  familyName: string | null,
  rotationGroup: string | null,
) {
  return {
    id: row.id,
    name: row.name,
    scientificName: row.scientificName,
    familyId: row.familyId,
    familyName,
    rotationGroup,
    nutrientCategory: row.nutrientCategory as NutrientCategory | null,
    isCoverCrop: row.isCoverCrop,
    isSeed: row.isSeed,
    notes: row.notes,
  };
}

async function fetchCrops(opts: {
  search?: string;
  familyId?: number;
  nutrient?: string;
}) {
  const conditions = [];
  if (opts.search) {
    conditions.push(ilike(crops.name, `%${opts.search}%`));
  }
  if (opts.familyId) {
    conditions.push(eq(crops.familyId, opts.familyId));
  }
  if (
    opts.nutrient &&
    ["heavy", "light", "giver"].includes(opts.nutrient)
  ) {
    conditions.push(
      eq(crops.nutrientCategory, opts.nutrient as "heavy" | "light" | "giver"),
    );
  }

  const rows = await db
    .select({
      crop: crops,
      familyName: plantFamilies.name,
      rotationGroup: plantFamilies.rotationGroup,
    })
    .from(crops)
    .leftJoin(plantFamilies, eq(crops.familyId, plantFamilies.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(crops.name);
  return rows.map((r) => serializeCrop(r.crop, r.familyName, r.rotationGroup));
}

/** GET /api/crops?search=&familyId=&nutrient= — katalog tanaman. */
export async function GET(req: Request) {
  return handle(async () => {
    await requireUser();
    const url = new URL(req.url);
    const list = await fetchCrops({
      search: url.searchParams.get("search") ?? undefined,
      familyId: url.searchParams.get("familyId")
        ? Number(url.searchParams.get("familyId"))
        : undefined,
      nutrient: url.searchParams.get("nutrient") ?? undefined,
    });
    return ok({ crops: list });
  });
}

/** POST /api/crops — tambah tanaman ke katalog (dibuat pengguna, bukan data contoh). */
export async function POST(req: Request) {
  return handle(async () => {
    await requireUser();
    const body = cropCreateSchema.parse(await req.json());
    const inserted = await db
      .insert(crops)
      .values({
        name: body.name,
        scientificName: body.scientificName ?? null,
        familyId: body.familyId ?? null,
        nutrientCategory: body.nutrientCategory ?? null,
        isCoverCrop: body.isCoverCrop ?? false,
        isSeed: false,
        notes: body.notes ?? null,
      })
      .returning();
    const rows = await db
      .select({ familyName: plantFamilies.name, rotationGroup: plantFamilies.rotationGroup })
      .from(plantFamilies)
      .where(eq(plantFamilies.id, body.familyId ?? -1))
      .limit(1);
    return ok({
      crop: serializeCrop(
        inserted[0],
        rows[0]?.familyName ?? null,
        rows[0]?.rotationGroup ?? null,
      ),
    });
  });
}
