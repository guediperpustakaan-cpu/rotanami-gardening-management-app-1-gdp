"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  Lightbulb,
  ListChecks,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Ban,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorBox,
  Field,
  Select,
  Skeleton,
  useToast,
} from "@/components/ui";
import { PlanFormModal, SeasonFormModal } from "@/components/forms";
import { apiFetch, patchJSON, postJSON, deleteReq } from "@/lib/client";
import { useMe } from "@/lib/hooks";
import { PLAN_STATUS_LABELS, type PlanStatus } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type { PlotSummary, RotationPlan, Season, SuggestionResponse } from "@/lib/types";

function PlannerInner() {
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useMe();
  const farmId = me?.activeFarm?.id ?? null;

  const plotsQ = useQuery({
    queryKey: ["plots", farmId],
    enabled: farmId !== null,
    queryFn: () => apiFetch<{ plots: PlotSummary[] }>(`/api/plots?farmId=${farmId}`),
  });
  const seasonsQ = useQuery({
    queryKey: ["seasons", farmId],
    enabled: farmId !== null,
    queryFn: () => apiFetch<{ seasons: Season[] }>(`/api/seasons?farmId=${farmId}`),
  });
  const plansQ = useQuery({
    queryKey: ["plans", farmId],
    enabled: farmId !== null,
    queryFn: () => apiFetch<{ plans: RotationPlan[] }>(`/api/rotation-plans?farmId=${farmId}`),
  });

  const initialPlot = (() => {
    const fromUrl = searchParams.get("petak");
    return fromUrl && /^\d+$/.test(fromUrl) ? fromUrl : "";
  })();
  const [plotId, setPlotId] = useState<string>(initialPlot);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestionResponse | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [planModal, setPlanModal] = useState(false);
  const [seasonModal, setSeasonModal] = useState(false);
  const [planDefaults, setPlanDefaults] = useState<{
    plotId?: number;
    cropId?: number;
    rationale: { source: string; context: string[]; reasons: string[]; disclaimer?: string } | null;
  }>({ rationale: null });
  const [deletePlan, setDeletePlan] = useState<RotationPlan | null>(null);

  async function requestSuggestion() {
    setSuggestError(null);
    setSuggestion(null);
    if (!plotId) {
      setSuggestError("Pilih petak terlebih dahulu.");
      return;
    }
    setSuggesting(true);
    try {
      const res = await postJSON<SuggestionResponse>("/api/rotation/suggest", {
        plotId: Number(plotId),
      });
      setSuggestion(res);
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "Gagal mengambil saran.");
    } finally {
      setSuggesting(false);
    }
  }

  function openPlanModal(opts: { cropId?: number; rationale: typeof planDefaults.rationale }) {
    setPlanDefaults({ plotId: Number(plotId), cropId: opts.cropId, rationale: opts.rationale });
    setPlanModal(true);
  }

  async function setPlanStatus(plan: RotationPlan, status: PlanStatus) {
    try {
      await patchJSON(`/api/rotation-plans/${plan.id}`, { status });
      toast({
        title: status === "selesai" ? "Rencana ditandai selesai" : "Rencana dibatalkan",
      });
      qc.invalidateQueries();
    } catch (err) {
      toast({ title: "Gagal memperbarui", description: err instanceof Error ? err.message : undefined, tone: "error" });
    }
  }

  async function removePlan(plan: RotationPlan) {
    try {
      await deleteReq(`/api/rotation-plans/${plan.id}`);
      toast({ title: "Rencana dihapus" });
      qc.invalidateQueries();
    } catch (err) {
      toast({ title: "Gagal menghapus", description: err instanceof Error ? err.message : undefined, tone: "error" });
    }
    setDeletePlan(null);
  }

  const plans = plansQ.data?.plans ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Perencana rotasi</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Pilih petak untuk mendapat saran tanaman berikutnya. Saran disusun dari aturan sederhana atas
          riwayat tanam dan data katalog — selalu tinjau alasannya dan sesuaikan dengan kondisi kebun Anda.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Minta saran tanaman berikutnya"
          description="Saran memakai riwayat tanam petak, keluarga botani, catatan hama/penyakit, dan kategori hara bila tersedia."
        />
        <div className="space-y-4 px-4 py-4 sm:px-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Petak yang ingin direncanakan" required>
              <Select value={plotId} onChange={(e) => { setPlotId(e.target.value); setSuggestion(null); }}>
                <option value="">Pilih petak…</option>
                {(plotsQ.data?.plots ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end">
              <Button onClick={requestSuggestion} loading={suggesting} className="w-full sm:w-auto">
                <Sparkles aria-hidden className="h-4 w-4" /> Minta saran
              </Button>
            </div>
          </div>
          {suggestError ? (
            <p role="alert" className="rounded-lg border border-danger-600/30 bg-danger-100 px-3 py-2 text-sm font-medium text-danger-700">
              {suggestError}
            </p>
          ) : null}

          {suggesting ? <Skeleton className="h-40 w-full" /> : null}

          {suggestion ? (
            <div className="space-y-4">
              <details className="rounded-lg border border-line bg-paper/60 px-3 py-2 text-sm">
                <summary className="cursor-pointer font-semibold text-ink">
                  Data yang dipakai untuk saran ini
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
                  {suggestion.context.map((c) => <li key={c}>{c}</li>)}
                </ul>
              </details>

              {suggestion.status === "insufficient" ? (
                <EmptyState
                  icon={<Lightbulb aria-hidden className="h-6 w-6" />}
                  title="Data belum cukup untuk saran yang lebih spesifik"
                  description={suggestion.message ?? undefined}
                  action={
                    <Button variant="secondary" onClick={() => openPlanModal({ rationale: null })}>
                      Pilih tanaman secara manual
                    </Button>
                  }
                />
              ) : (
                <>
                  {suggestion.message ? (
                    <p className="rounded-lg border border-sun-600/25 bg-sun-100 px-3 py-2 text-sm text-sun-700">
                      {suggestion.message}
                    </p>
                  ) : null}
                  {suggestion.primary ? (
                    <div className="rounded-xl border-2 border-moss-300 bg-moss-50 p-4">
                      <p className="text-xs font-bold tracking-wide text-moss-700 uppercase">Saran utama</p>
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-display text-xl font-bold text-ink">
                          {suggestion.primary.crop.name}
                        </h3>
                        <Button size="sm" onClick={() =>
                          openPlanModal({
                            cropId: suggestion.primary!.crop.id,
                            rationale: {
                              source: "saran-mesin",
                              context: suggestion.context,
                              reasons: suggestion.primary!.reasons,
                              disclaimer: suggestion.disclaimer,
                            },
                          })
                        }>
                          Simpan sebagai rencana
                        </Button>
                      </div>
                      {suggestion.primary.crop.familyName ? (
                        <p className="mt-0.5 text-sm text-ink-soft">
                          Keluarga {suggestion.primary.crop.familyName}
                          {suggestion.primary.crop.rotationGroup
                            ? ` · kelompok rotasi ${suggestion.primary.crop.rotationGroup}`
                            : ""}
                        </p>
                      ) : null}
                      <ul className="mt-3 space-y-1.5">
                        {suggestion.primary.reasons.map((r) => (
                          <li key={r} className="flex items-start gap-2 text-sm text-ink">
                            <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-moss-600" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {suggestion.alternatives.length > 0 ? (
                    <div>
                      <h3 className="mb-2 text-sm font-bold text-ink">Alternatif lain</h3>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {suggestion.alternatives.map((alt) => (
                          <Card key={alt.crop.id} className="p-3.5">
                            <p className="font-semibold text-ink">{alt.crop.name}</p>
                            {alt.crop.familyName ? (
                              <p className="text-xs text-ink-faint">{alt.crop.familyName}</p>
                            ) : null}
                            <ul className="mt-2 space-y-1">
                              {alt.reasons.slice(0, 2).map((r) => (
                                <li key={r} className="text-xs text-ink-soft">• {r}</li>
                              ))}
                            </ul>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="mt-3 w-full"
                              onClick={() =>
                                openPlanModal({
                                  cropId: alt.crop.id,
                                  rationale: {
                                    source: "saran-mesin-alternatif",
                                    context: suggestion.context,
                                    reasons: alt.reasons,
                                    disclaimer: suggestion.disclaimer,
                                  },
                                })
                              }
                            >
                              Pilih tanaman ini
                            </Button>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openPlanModal({ rationale: null })}>
                      Pilih tanaman sendiri secara manual
                    </Button>
                  </div>
                </>
              )}

              <p className="rounded-lg bg-paper px-3 py-2.5 text-xs text-ink-soft">
                {suggestion.disclaimer}
              </p>
            </div>
          ) : null}
        </div>
      </Card>

      <section aria-labelledby="plans-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="plans-heading" className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <ListChecks aria-hidden className="h-5 w-5 text-moss-700" /> Rencana rotasi tersimpan
          </h2>
          <div className="flex gap-2">
            {seasonsQ.data && seasonsQ.data.seasons.length === 0 ? (
              <Button size="sm" variant="ghost" onClick={() => setSeasonModal(true)}>
                <Plus aria-hidden className="h-4 w-4" /> Tambah musim
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" onClick={() => { setPlanDefaults({ rationale: null }); setPlanModal(true); }}>
              <Plus aria-hidden className="h-4 w-4" /> Rencana manual
            </Button>
          </div>
        </div>

        {plansQ.isLoading ? (
          <Skeleton className="h-28 w-full" />
        ) : plans.length === 0 ? (
          <EmptyState
            icon={<RefreshCw aria-hidden className="h-6 w-6" />}
            title="Belum ada rencana rotasi"
            description="Minta saran di atas atau buat rencana manual; rencana akan muncul juga di kalender."
          />
        ) : (
          <ul className="space-y-2.5">
            {plans.map((plan) => (
              <li key={plan.id}>
                <Card className="px-4 py-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-base font-semibold text-ink">
                          {plan.cropName ?? "Tanaman"}
                        </p>
                        <Badge tone={plan.status === "aktif" ? "moss" : plan.status === "selesai" ? "neutral" : "danger"}>
                          {PLAN_STATUS_LABELS[plan.status as PlanStatus]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-ink-soft">
                        {plan.plotName ?? "Petak terhapus"}
                        {plan.targetDate ? ` · target tanam ${formatDate(plan.targetDate)}` : " · belum ada tanggal target"}
                      </p>
                      {plan.notes ? <p className="mt-1 text-sm text-ink-soft">{plan.notes}</p> : null}
                      {plan.rationale && plan.rationale.reasons.length > 0 ? (
                        <details className="mt-2 text-sm">
                          <summary className="flex cursor-pointer items-center gap-1 font-semibold text-moss-700">
                            <ChevronDown aria-hidden className="h-4 w-4" /> Alasan rencana ini
                          </summary>
                          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-ink-soft">
                            {plan.rationale.reasons.map((r) => <li key={r}>{r}</li>)}
                          </ul>
                        </details>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      {plan.status === "aktif" ? (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => setPlanStatus(plan, "selesai")}>
                            Tandai selesai
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setPlanStatus(plan, "dibatalkan")}>
                            <Ban aria-hidden className="h-4 w-4" /> Batalkan
                          </Button>
                        </>
                      ) : null}
                      <button
                        aria-label={`Hapus rencana ${plan.cropName ?? ""}`}
                        onClick={() => setDeletePlan(plan)}
                        className="rounded-lg p-2 text-danger-600 hover:bg-danger-100"
                      >
                        <Trash2 aria-hidden className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PlanFormModal
        open={planModal}
        onClose={() => setPlanModal(false)}
        defaultPlotId={planDefaults.plotId}
        defaultCropId={planDefaults.cropId}
        rationale={planDefaults.rationale}
      />
      <SeasonFormModal open={seasonModal} onClose={() => setSeasonModal(false)} />
      <ConfirmDialog
        open={deletePlan !== null}
        onClose={() => setDeletePlan(null)}
        onConfirm={() => deletePlan && removePlan(deletePlan)}
        title="Hapus rencana rotasi?"
        message={deletePlan ? <>Rencana <strong>{deletePlan.cropName}</strong> untuk {deletePlan.plotName} akan dihapus.</> : null}
        confirmLabel="Hapus rencana"
      />
    </div>
  );
}

export default function PlannerPage() {
  return (
    <Suspense fallback={<Skeleton className="h-72 w-full" />}>
      <PlannerInner />
    </Suspense>
  );
}
