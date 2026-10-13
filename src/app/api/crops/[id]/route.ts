import { db } from "@/db";
import { crops, plantFamilies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ApiError, handle, loadCropOrThrow, ok, requireUser } from "@/lib/api";
import { cropUpdateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/crops/:id */
export async function PATCH(req: Request, ctx: Params) {
  return handle(async () => {
    await requireUser();
    const { id } = await ctx.params;
    const crop = await loadCropOrThrow(Number(id));
    const body = cropUpdateSchema.parse(await req.json());
    const updated = await db
      .update(crops)
      .set({
        name: body.name ?? crop.name,
        scientificName:
          body.scientificName !== undefined
            ? body.scientificName
            : crop.scientificName,
        familyId: body.familyId !== undefined ? body.familyId : crop.familyId,
        nutrientCategory:
          body.nutrientCategory !== undefined
            ? body.nutrientCategory
            : crop.nutrientCategory,
        isCoverCrop: body.isCoverCrop ?? crop.isCoverCrop,
        notes: body.notes !== undefined ? body.notes : crop.notes,
      })
      .where(eq(crops.id, crop.id))
      .returning();
    const fam = crop.familyId
      ? await db
          .select({ familyName: plantFamilies.name, rotationGroup: plantFamilies.rotationGroup })
          .from(plantFamilies)
          .where(eq(plantFamilies.id, updated[0].familyId ?? -1))
          .limit(1)
      : [];
    return ok({
      crop: {
        id: updated[0].id,
        name: updated[0].name,
        scientificName: updated[0].scientificName,
        familyId: updated[0].familyId,
        familyName: fam[0]?.familyName ?? null,
        rotationGroup: fam[0]?.rotationGroup ?? null,
        nutrientCategory: updated[0].nutrientCategory,
        isCoverCrop: updated[0].isCoverCrop,
        isSeed: updated[0].isSeed,
        notes: updated[0].notes,
      },
    });
  });
}

/** DELETE /api/crops/:id — diblokir bila masih dipakai riwayat (constraint DB). */
export async function DELETE(_req: Request, ctx: Params) {
  return handle(async () => {
    await requireUser();
    const { id } = await ctx.params;
    const crop = await loadCropOrThrow(Number(id));
    try {
      await db.delete(crops).where(eq(crops.id, crop.id));
    } catch (err) {
      if ((err as { code?: string })?.code === "23503") {
        throw new ApiError(
          409,
          `Tanaman "${crop.name}" masih dipakai pada riwayat tanam atau rencana, jadi tidak bisa dihapus.`,
        );
      }
      throw err;
    }
    return ok({ ok: true });
  });
}
