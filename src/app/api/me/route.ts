import { handle, ok, requireUser, getActiveFarm, getAccessibleFarms, serializeFarmId } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/me — pengguna masuk + kebun aktif + daftar kebun yang bisa diakses. */
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const farm = await getActiveFarm(user);
    const farms = await getAccessibleFarms(user.id);
    return ok({
      user,
      activeFarm: farm ? serializeFarmId(farm) : null,
      farms: farms.map(serializeFarmId),
    });
  });
}
