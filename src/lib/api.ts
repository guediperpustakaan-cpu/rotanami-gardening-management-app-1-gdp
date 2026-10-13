import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { and, eq, or } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { farmMembers, farms, plots, crops } from "@/db/schema";
import { getSessionUser, ACTIVE_FARM_COOKIE, type SessionUser } from "./auth";

/** Error API dengan kode status dan pesan ramah berbahasa Indonesia. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function ok<T>(data: T): NextResponse {
  return NextResponse.json(data);
}

/** Bungkus handler: tangani ApiError, ZodError, dan error tak terduga secara konsisten. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof ZodError) {
      const first = err.issues[0];
      return NextResponse.json(
        { error: first?.message ?? "Data yang dikirim tidak valid." },
        { status: 400 },
      );
    }
    const pgCode = (err as { code?: string } | null)?.code;
    if (pgCode === "23503") {
      return NextResponse.json(
        {
          error:
            "Data tidak dapat dihapus karena masih dipakai oleh catatan lain (misalnya riwayat tanam).",
        },
        { status: 409 },
      );
    }
    console.error("[api] kesalahan tak terduga:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan tak terduga. Silakan coba lagi beberapa saat." },
      { status: 500 },
    );
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "Silakan masuk terlebih dahulu untuk melanjutkan.");
  return user;
}

export type FarmRow = typeof farms.$inferSelect;
export type PlotRow = typeof plots.$inferSelect;

export function serializeFarmId(row: FarmRow) {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    location: row.location,
    timezone: row.timezone,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getAccessibleFarms(userId: number): Promise<FarmRow[]> {
  const rows = await db
    .select({ farm: farms })
    .from(farms)
    .leftJoin(farmMembers, eq(farmMembers.farmId, farms.id))
    .where(or(eq(farms.ownerId, userId), eq(farmMembers.userId, userId)));
  const seen = new Map<number, FarmRow>();
  for (const r of rows) seen.set(r.farm.id, r.farm);
  return Array.from(seen.values()).sort((a, b) => a.id - b.id);
}

/** Ambil kebun aktif pengguna (dari cookie, validasi akses; fallback ke kebun pertama). */
export async function getActiveFarm(user: SessionUser): Promise<FarmRow | null> {
  const store = await cookies();
  const raw = store.get(ACTIVE_FARM_COOKIE)?.value;
  const parsed = raw ? Number(raw) : Number.NaN;
  const accessible = await getAccessibleFarms(user.id);
  return accessible.find((f) => f.id === parsed) ?? accessible[0] ?? null;
}

/** Pastikan pengguna punya akses ke kebun; kembalikan baris kebunnya. */
export async function requireFarm(farmId: number): Promise<{ farm: FarmRow; user: SessionUser }> {
  if (!Number.isInteger(farmId) || farmId <= 0) {
    throw new ApiError(400, "ID kebun tidak valid.");
  }
  const user = await requireUser();
  const rows = await db.select().from(farms).where(eq(farms.id, farmId)).limit(1);
  const farm = rows[0];
  if (!farm) throw new ApiError(404, "Kebun tidak ditemukan.");
  if (farm.ownerId !== user.id) {
    const member = await db
      .select({ id: farmMembers.id })
      .from(farmMembers)
      .where(and(eq(farmMembers.farmId, farmId), eq(farmMembers.userId, user.id)))
      .limit(1);
    if (member.length === 0) {
      throw new ApiError(403, "Anda tidak memiliki akses ke kebun ini.");
    }
  }
  return { farm, user };
}

/** Pastikan pengguna punya akses ke petak (melalui kebunnya). */
export async function requirePlot(
  plotId: number,
): Promise<{ plot: PlotRow; farm: FarmRow; user: SessionUser }> {
  if (!Number.isInteger(plotId) || plotId <= 0) {
    throw new ApiError(400, "ID petak tidak valid.");
  }
  const rows = await db
    .select({ plot: plots, farm: farms })
    .from(plots)
    .innerJoin(farms, eq(plots.farmId, farms.id))
    .where(eq(plots.id, plotId))
    .limit(1);
  const row = rows[0];
  if (!row) throw new ApiError(404, "Petak tidak ditemukan.");
  if (row.farm.ownerId !== (await requireUser()).id) {
    const user = await requireUser();
    const member = await db
      .select({ id: farmMembers.id })
      .from(farmMembers)
      .where(
        and(eq(farmMembers.farmId, row.farm.id), eq(farmMembers.userId, user.id)),
      )
      .limit(1);
    if (member.length === 0) {
      throw new ApiError(403, "Anda tidak memiliki akses ke petak ini.");
    }
    return { plot: row.plot, farm: row.farm, user };
  }
  const user = await requireUser();
  return { plot: row.plot, farm: row.farm, user };
}

export type CropRow = typeof crops.$inferSelect;

/** Ambil tanaman katalog atau lempar 404 (katalog dipakai bersama oleh semua pengguna). */
export async function loadCropOrThrow(cropId: number): Promise<CropRow> {
  if (!Number.isInteger(cropId) || cropId <= 0) {
    throw new ApiError(400, "ID tanaman tidak valid.");
  }
  const rows = await db.select().from(crops).where(eq(crops.id, cropId)).limit(1);
  const crop = rows[0];
  if (!crop) throw new ApiError(404, "Tanaman tidak ditemukan di katalog.");
  return crop;
}
