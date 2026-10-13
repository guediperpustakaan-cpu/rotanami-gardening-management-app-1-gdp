"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Grid3x3,
  Plus,
  RefreshCw,
  Sprout,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorBox,
  Field,
  Input,
  PlantingStatusBadge,
  Skeleton,
  Stat,
  useToast,
} from "@/components/ui";
import { PlantingFormModal, PlotFormModal } from "@/components/forms";
import { apiFetch, postJSON } from "@/lib/client";
import { useMe } from "@/lib/hooks";
import { areaLabel, type PlantingStatus } from "@/lib/labels";
import { formatDate, relativeDayLabel } from "@/lib/format";
import type { DashboardData } from "@/lib/types";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 10) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

export default function DashboardPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useMe();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardData>("/api/dashboard"),
  });

  const [plotModal, setPlotModal] = useState(false);
  const [plantingModal, setPlantingModal] = useState(false);
  const [farmName, setFarmName] = useState("");
  const [farmLocation, setFarmLocation] = useState("");
  const [farmError, setFarmError] = useState<string | null>(null);
  const [farmLoading, setFarmLoading] = useState(false);

  async function createFarm() {
    setFarmError(null);
    if (farmName.trim().length < 2) {
      setFarmError("Nama kebun minimal 2 karakter.");
      return;
    }
    setFarmLoading(true);
    try {
      const created = await postJSON<{ farm: { id: number } }>("/api/farms", {
        name: farmName.trim(),
        location: farmLocation.trim() || undefined,
      });
      await postJSON(`/api/farms/${created.farm.id}/activate`, {});
      await qc.invalidateQueries();
      toast({ title: "Kebun berhasil dibuat", description: "Sekarang tambahkan petak pertama Anda." });
    } catch (err) {
      setFarmError(err instanceof Error ? err.message : "Gagal membuat kebun.");
    } finally {
      setFarmLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorBox
        message={error instanceof Error ? error.message : "Gagal memuat dashboard."}
        onRetry={() => refetch()}
      />
    );
  }

  if (!data) return null;

  // Onboarding: belum ada kebun sama sekali.
  if (!data.farm) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="p-6">
          <h1 className="font-display text-2xl font-bold text-ink">Selamat datang di Rotanami 🌱</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Rotanami membantu Anda mengelola petak kebun, mencatat riwayat tanam, merencanakan rotasi,
            dan menyimpan hasil uji tanah. Mari mulai dengan membuat kebun pertama Anda.
          </p>
          <div className="mt-5 space-y-4">
            <Field label="Nama kebun" required>
              <Input
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder="cth. Kebun Belakang Rumah"
              />
            </Field>
            <Field label="Lokasi (opsional)">
              <Input
                value={farmLocation}
                onChange={(e) => setFarmLocation(e.target.value)}
                placeholder="cth. Bandung, Jawa Barat"
              />
            </Field>
            {farmError ? <p role="alert" className="text-sm font-medium text-danger-600">{farmError}</p> : null}
            <Button onClick={createFarm} loading={farmLoading} className="w-full">
              Buat kebun pertama
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const { farm, plots, counts, upcoming } = data;
  const firstName = farm.name;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-moss-700">
          {greeting()}{me?.user ? `, ${me.user.name.split(" ")[0]}` : ""} — selamat datang kembali
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {farm.name}
        </h1>
        {farm.location ? <p className="mt-1 text-sm text-ink-soft">{farm.location}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Jumlah petak" value={counts.plots} icon={<Grid3x3 aria-hidden className="h-5 w-5" />} tone="moss" />
        <Stat label="Sedang ditanam" value={counts.plantedNow} icon={<Sprout aria-hidden className="h-5 w-5" />} tone="moss" />
        <Stat label="Rencana rotasi aktif" value={counts.activePlans} icon={<RefreshCw aria-hidden className="h-5 w-5" />} tone="clay" />
        <Stat label="Perlu tindakan" value={counts.actionsNeeded} icon={<AlertTriangle aria-hidden className="h-5 w-5" />} tone={counts.actionsNeeded > 0 ? "danger" : "neutral"} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setPlotModal(true)}>
          <Plus aria-hidden className="h-4 w-4" /> Tambah petak
        </Button>
        <Button variant="secondary" onClick={() => setPlantingModal(true)}>
          <Sprout aria-hidden className="h-4 w-4" /> Catat tanaman
        </Button>
        <Link href="/perencana">
          <Button variant="secondary">
            <RefreshCw aria-hidden className="h-4 w-4" /> Buat rencana rotasi
          </Button>
        </Link>
      </div>

      <section aria-labelledby="plots-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="plots-heading" className="font-display text-lg font-semibold text-ink">Petak Anda</h2>
          <Link href="/petak" className="text-sm font-semibold text-moss-700 hover:underline">
            Lihat semua
          </Link>
        </div>
        {plots.length === 0 ? (
          <EmptyState
            icon={<Grid3x3 aria-hidden className="h-6 w-6" />}
            title="Belum ada petak"
            description="Petak adalah bagian kebun (bedeng, pot besar, atau lahan) yang riwayatnya ingin Anda catat."
            action={
              <Button onClick={() => setPlotModal(true)}>
                <Plus aria-hidden className="h-4 w-4" /> Tambah petak pertama
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {plots.map((plot) => (
              <li key={plot.id}>
                <Link
                  href={`/petak/${plot.id}`}
                  className="flex h-full items-center justify-between gap-3 rounded-xl border border-line bg-cream px-4 py-3.5 shadow-card transition-colors hover:border-moss-400"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{plot.name}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">{areaLabel(plot.size, plot.areaUnit)}</p>
                    {plot.lastPlanting ? (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <PlantingStatusBadge status={plot.lastPlanting.status as PlantingStatus} />
                        <span className="text-xs text-ink-soft">
                          {plot.lastPlanting.cropName}, {formatDate(plot.lastPlanting.plantDate)}
                        </span>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs font-medium text-ink-faint">Belum ada riwayat tanam</p>
                    )}
                  </div>
                  <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-ink-faint" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="upcoming-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="upcoming-heading" className="font-display text-lg font-semibold text-ink">
            Aktivitas berikutnya
          </h2>
          <Link href="/kalender" className="text-sm font-semibold text-moss-700 hover:underline">
            Buka kalender
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<CalendarDays aria-hidden className="h-6 w-6" />}
            title="Tidak ada agenda dekat-dekat ini"
            description="Buat pengingat atau rencana tanam agar jadwal Anda muncul di sini."
            action={
              <Link href="/kalender">
                <Button variant="secondary">Buat pengingat</Button>
              </Link>
            }
          />
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {upcoming.map((ev) => (
                <li key={ev.key} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-24 shrink-0">
                    <p className="text-sm font-bold text-ink">{formatDate(ev.date)}</p>
                    <p className="text-xs text-ink-faint">{relativeDayLabel(ev.date)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{ev.title}</p>
                    {ev.subtitle ? <p className="truncate text-xs text-ink-soft">{ev.subtitle}</p> : null}
                  </div>
                  <Badge tone={ev.kind === "reminder" ? "sun" : ev.kind === "plan" ? "clay" : "moss"}>
                    {ev.kind === "reminder" ? "Pengingat" : ev.kind === "plan" ? "Rotasi" : "Tanam"}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <PlotFormModal open={plotModal} onClose={() => setPlotModal(false)} />
      <PlantingFormModal open={plantingModal} onClose={() => setPlantingModal(false)} />
      <span className="sr-only">{firstName}</span>
    </div>
  );
}
