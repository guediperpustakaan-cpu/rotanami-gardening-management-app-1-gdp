import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <AppShell userName={user.name} userEmail={user.email}>
      {children}
    </AppShell>
  );
}
