import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ApiError, handle, ok } from "@/lib/api";
import { createSessionForUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const body = registerSchema.parse(await req.json());
    const exists = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);
    if (exists.length > 0) {
      throw new ApiError(409, "Email sudah terdaftar. Silakan masuk dengan akun tersebut.");
    }
    const inserted = await db
      .insert(users)
      .values({
        email: body.email,
        passwordHash: hashPassword(body.password),
        name: body.name,
      })
      .returning();
    await createSessionForUser(inserted[0].id);
    return ok({ user: { id: inserted[0].id, name: inserted[0].name, email: inserted[0].email } });
  });
}
