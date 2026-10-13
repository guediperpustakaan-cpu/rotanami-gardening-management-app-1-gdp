"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Card, Field, Input } from "@/components/ui";
import { Logo } from "@/components/app-shell";
import { loginSchema } from "@/lib/schemas";
import { postJSON } from "@/lib/client";

type LoginFormInput = z.input<typeof loginSchema>;
type LoginFormOutput = z.output<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [rootError, setRootError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState, setValue } = useForm<
    LoginFormInput,
    unknown,
    LoginFormOutput
  >({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function submit(values: LoginFormOutput) {
    setRootError(null);
    try {
      await postJSON("/api/auth/login", values);
      router.push("/");
      router.refresh();
    } catch (err) {
      setRootError(err instanceof Error ? err.message : "Gagal masuk. Coba lagi.");
    }
  }

  function fillDemo() {
    setValue("email", "demo@rotanami.id");
    setValue("password", "rotanami123");
    reset({ email: "demo@rotanami.id", password: "rotanami123" });
    setRootError(null);
  }

  return (
    <div className="bg-texture flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Logo />
          <p className="text-center text-sm text-ink-soft">
            Catatan kebun, riwayat tanam, dan rotasi tanaman dalam satu tempat.
          </p>
        </div>
        <Card className="p-6">
          <h1 className="font-display text-xl font-bold text-ink">Masuk</h1>
          <form onSubmit={handleSubmit(submit)} className="mt-4 space-y-4" noValidate>
            {rootError ? (
              <p role="alert" className="rounded-lg border border-danger-600/30 bg-danger-100 px-3 py-2 text-sm font-medium text-danger-700">
                {rootError}
              </p>
            ) : null}
            <Field label="Email" required error={formState.errors.email?.message}>
              <Input type="email" autoComplete="email" placeholder="nama@email.com" {...register("email")} />
            </Field>
            <Field label="Kata sandi" required error={formState.errors.password?.message}>
              <Input type="password" autoComplete="current-password" placeholder="••••••••" {...register("password")} />
            </Field>
            <Button type="submit" className="w-full" loading={formState.isSubmitting}>
              Masuk
            </Button>
          </form>
          <div className="mt-4 rounded-lg border border-moss-200 bg-moss-50 px-3 py-2.5">
            <p className="text-xs text-moss-800">
              Ingin mencoba dulu? Gunakan akun demo berisi data contoh.
            </p>
            <button type="button" onClick={fillDemo} className="mt-1 text-sm font-bold text-moss-700 hover:underline">
              Isi kredensial akun demo
            </button>
          </div>
        </Card>
        <p className="mt-4 text-center text-sm text-ink-soft">
          Belum punya akun?{" "}
          <Link href="/register" className="font-bold text-moss-700 hover:underline">
            Daftar gratis
          </Link>
        </p>
      </div>
    </div>
  );
}
