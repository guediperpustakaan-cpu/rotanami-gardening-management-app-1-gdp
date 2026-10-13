import { cookies } from "next/headers";
import { ACTIVE_FARM_COOKIE } from "@/lib/auth";
import { handle, ok, requireFarm } from "@/lib/api";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** POST /api/farms/:id/activate — tetapkan kebun aktif (disimpan di cookie). */
export async function POST(_req: Request, ctx: Params) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { farm } = await requireFarm(Number(id));
    const store = await cookies();
    store.set(ACTIVE_FARM_COOKIE, String(farm.id), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return ok({ ok: true, farmId: farm.id });
  });
}
