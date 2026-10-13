import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ApiError, handle, ok } from "@/lib/api";
import { createSessionForUser } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const body = loginSchema.parse(await req.json());
    const rows = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
    const user = rows[0];
    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      throw new ApiError(401, "Email atau kata sandi salah.");
    }
    await createSessionForUser(user.id);
    return ok({ user: { id: user.id, name: user.name, email: user.email } });
  });
}
