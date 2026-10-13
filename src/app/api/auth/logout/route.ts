import { handle, ok } from "@/lib/api";
import { destroySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  return handle(async () => {
    await destroySession();
    return ok({ ok: true });
  });
}
