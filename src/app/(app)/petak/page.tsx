"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Grid3x3, Plus } from "lucide-react";
import {
  Button,
  EmptyState,
  ErrorBox,
  PlantingStatusBadge,
  Skeleton,
} from "@/components/ui";
import { PlotFormModal } from "@/components/forms";
import { apiFetch } from "@/lib/client";
import { useMe } from "@/lib/hooks";
import { areaLabel, type PlantingStatus } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type { PlotSummary } from "@/lib/types";

export default function PlotsPage() {
  const { data: me } = useMe();
  const farmId = me?.activeFarm?.id ?? null;
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["plots", farmId],
    enabled: farmId !== null,
    queryFn: () => apiFetch<{ plots: PlotSummary[] }>(`/api/plots?farmId=${farmId}`),
  });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Petak kebun</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Semua petak pada kebun aktif{me?.activeFarm ? ` “${me.activeFarm.name}”` : ""}.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus aria-hidden className="h-4 w-4" /> Tambah petak
        </Button>
      </div>

      {farmId === null ? (
        <EmptyState
          icon={<Grid3x3 aria-hidden className="h-6 w-6" />}
          title="Belum ada kebun aktif"
          description="Buat kebun terlebih dahulu dari halaman Beranda, lalu tambahkan petak di sini."
        />
      ) : isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : isError ? (
        <ErrorBox message={error instanceof Error ? error.message : "Gagal memuat petak."} onRetry={() => refetch()} />
      ) : (data?.plots.length ?? 0) === 0 ? (
        <EmptyState
          icon={<Grid3x3 aria-hidden className="h-6 w-6" />}
          title="Belum ada petak"
          description="Tambahkan bedeng atau area tanam pertama Anda untuk mulai mencatat."
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus aria-hidden className="h-4 w-4" /> Tambah petak pertama
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {(data?.plots ?? []).map((plot) => (
            <li key={plot.id}>
              <Link
                href={`/petak/${plot.id}`}
                className="flex h-full items-center justify-between gap-3 rounded-xl border border-line bg-cream px-4 py-4 shadow-card transition-colors hover:border-moss-400"
              >
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-semibold text-ink">{plot.name}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {areaLabel(plot.size, plot.areaUnit)}
                    {plot.soilType ? ` · ${plot.soilType}` : ""}
                  </p>
                  {plot.lastPlanting ? (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <PlantingStatusBadge status={plot.lastPlanting.status as PlantingStatus} />
                      <span className="text-xs text-ink-soft">
                        {plot.lastPlanting.cropName}, {formatDate(plot.lastPlanting.plantDate)}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-2.5 text-xs font-medium text-ink-faint">Belum ada riwayat tanam</p>
                  )}
                  <p className="mt-1.5 text-xs text-ink-faint">{plot.plantingCount} catatan tanam</p>
                </div>
                <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-ink-faint" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <PlotFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
