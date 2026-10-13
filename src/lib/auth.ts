import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

export const SESSION_COOKIE = "rotanami_session";
export const ACTIVE_FARM_COOKIE = "rotanami_farm";
const SESSION_DAYS = 30;

export interface SessionUser {
  id: number;
  name: string;
  email: string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Membuat sesi baru dan menyetel cookie HttpOnly (token tidak disimpan di DB secara mentah). */
export async function createSessionForUser(userId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ tokenHash: sha256(token), userId, expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function destroySession(tokenValue?: string): Promise<void> {
  const store = await cookies();
  const token = tokenValue ?? store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  }
  store.delete(SESSION_COOKIE);
}

/** Ambil pengguna yang sedang masuk, atau null bila tidak ada sesi valid. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, sha256(token)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const expires = new Date(row.session.expiresAt).getTime();
  if (Number.isNaN(expires) || expires < Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, row.session.id));
    return null;
  }

  return { id: row.user.id, name: row.user.name, email: row.user.email };
}
