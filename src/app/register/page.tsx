"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Card, Field, Input } from "@/components/ui";
import { Logo } from "@/components/app-shell";
import { registerSchema } from "@/lib/schemas";
import { postJSON } from "@/lib/client";

type RegisterFormInput = z.input<typeof registerSchema>;
type RegisterFormOutput = z.output<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [rootError, setRootError] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<
    RegisterFormInput,
    unknown,
    RegisterFormOutput
  >({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function submit(values: RegisterFormOutput) {
    setRootError(null);
    try {
      await postJSON("/api/auth/register", values);
      router.push("/");
      router.refresh();
    } catch (err) {
      setRootError(err instanceof Error ? err.message : "Gagal mendaftar. Coba lagi.");
    }
  }

  return (
    <div className="bg-texture flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Logo />
          <p className="text-center text-sm text-ink-soft">
            Mulai kelola kebun Anda: petak, riwayat tanam, rotasi, dan uji tanah.
          </p>
        </div>
        <Card className="p-6">
          <h1 className="font-display text-xl font-bold text-ink">Daftar akun baru</h1>
          <form onSubmit={handleSubmit(submit)} className="mt-4 space-y-4" noValidate>
            {rootError ? (
              <p role="alert" className="rounded-lg border border-danger-600/30 bg-danger-100 px-3 py-2 text-sm font-medium text-danger-700">
                {rootError}
              </p>
            ) : null}
            <Field label="Nama Anda" required error={formState.errors.name?.message}>
              <Input autoComplete="name" placeholder="cth. Bu Sari" {...register("name")} />
            </Field>
            <Field label="Email" required error={formState.errors.email?.message}>
              <Input type="email" autoComplete="email" placeholder="nama@email.com" {...register("email")} />
            </Field>
            <Field
              label="Kata sandi"
              required
              hint="Minimal 8 karakter."
              error={formState.errors.password?.message}
            >
              <Input type="password" autoComplete="new-password" placeholder="••••••••" {...register("password")} />
            </Field>
            <Button type="submit" className="w-full" loading={formState.isSubmitting}>
              Daftar dan mulai
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-ink-soft">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-bold text-moss-700 hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
