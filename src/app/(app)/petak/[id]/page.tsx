"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ClipboardList,
  FlaskConical,
  Info,
  Pencil,
  Plus,
  Sprout,
  Trash2,
  Wheat,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorBox,
  PlantingStatusBadge,
  Skeleton,
  Tabs,
  useToast,
} from "@/components/ui";
import {
  ObservationFormModal,
  PlantingFormModal,
  PlotFormModal,
  SoilTestFormModal,
} from "@/components/forms";
import { apiFetch, deleteReq } from "@/lib/client";
import { areaLabel, OBS_CATEGORY_LABELS, type ObsCategory, type PlantingStatus } from "@/lib/labels";
import { formatDate, formatDateLong } from "@/lib/format";
import type { Planting, PlotDetail, SoilTest } from "@/lib/types";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TABS = [
  { id: "ringkasan", label: "Ringkasan", icon: <Info aria-hidden className="h-4 w-4" /> },
  { id: "riwayat", label: "Riwayat tanam", icon: <Sprout aria-hidden className="h-4 w-4" /> },
  { id: "tanah", label: "Kesehatan tanah", icon: <FlaskConical aria-hidden className="h-4 w-4" /> },
  { id: "observasi", label: "Observasi", icon: <ClipboardList aria-hidden className="h-4 w-4" /> },
];

export default function PlotDetailPage() {
  const params = useParams<{ id: string }>();
  const plotId = Number(params.id);
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [tab, setTab] = useState("ringkasan");
  const [plotModal, setPlotModal] = useState(false);
  const [deletePlotOpen, setDeletePlotOpen] = useState(false);
  const [deletePlotLoading, setDeletePlotLoading] = useState(false);
  const [plantingModal, setPlantingModal] = useState(false);
  const [editPlanting, setEditPlanting] = useState<Planting | undefined>(undefined);
  const [deletePlanting, setDeletePlanting] = useState<Planting | null>(null);
  const [soilModal, setSoilModal] = useState(false);
  const [editTest, setEditTest] = useState<SoilTest | undefined>(undefined);
  const [deleteTest, setDeleteTest] = useState<SoilTest | null>(null);
  const [obsModal, setObsModal] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["plot-detail", plotId],
    enabled: Number.isInteger(plotId) && plotId > 0,
    queryFn: () => apiFetch<PlotDetail>(`/api/plots/${plotId}`),
  });

  async function deletePlot() {
    if (!data) return;
    setDeletePlotLoading(true);
    try {
      await deleteReq(`/api/plots/${data.plot.id}`);
      toast({ title: "Petak dihapus", description: `“${data.plot.name}” beserta datanya telah dihapus.` });
      qc.invalidateQueries();
      router.push("/petak");
    } catch (err) {
      toast({ title: "Gagal menghapus", description: err instanceof Error ? err.message : undefined, tone: "error" });
      setDeletePlotLoading(false);
    }
  }

  async function deletePlantingRow(p: Planting) {
    try {
      await deleteReq(`/api/plantings/${p.id}`);
      toast({ title: "Catatan tanam dihapus" });
      qc.invalidateQueries();
    } catch (err) {
      toast({ title: "Gagal menghapus", description: err instanceof Error ? err.message : undefined, tone: "error" });
    }
    setDeletePlanting(null);
  }

  async function deleteSoilTest(t: SoilTest) {
    try {
      await deleteReq(`/api/soil-tests/${t.id}`);
      toast({ title: "Hasil uji tanah dihapus" });
      qc.invalidateQueries();
    } catch (err) {
      toast({ title: "Gagal menghapus", description: err instanceof Error ? err.message : undefined, tone: "error" });
    }
    setDeleteTest(null);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (isError) {
    return (
      <ErrorBox message={error instanceof Error ? error.message : "Gagal memuat petak."} onRetry={() => refetch()} />
    );
  }
  if (!data) return null;

  const { plot, plantings, soilTests, observations } = data;
  const chartData = soilTests.map((t) => ({
    tanggal: formatDate(t.testDate),
    pH: t.ph !== null ? Number(t.ph) : null,
    N: t.nitrogen !== null ? Number(t.nitrogen) : null,
    P: t.phosphor !== null ? Number(t.phosphor) : null,
    K: t.potassium !== null ? Number(t.potassium) : null,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-ink-faint uppercase">
            <Link href="/petak" className="hover:underline">Petak</Link> · {data.farm.name}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">{plot.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {areaLabel(plot.size, plot.areaUnit)}
            {plot.soilType ? ` · Jenis tanah: ${plot.soilType}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setPlotModal(true)}>
            <Pencil aria-hidden className="h-4 w-4" /> Ubah
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeletePlotOpen(true)}>
            <Trash2 aria-hidden className="h-4 w-4" /> Hapus
          </Button>
        </div>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "ringkasan" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Sekilas petak" />
            <div className="space-y-3 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-soft">Catatan tanam</span>
                <span className="font-bold text-ink">{plantings.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-soft">Hasil uji tanah</span>
                <span className="font-bold text-ink">{soilTests.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-soft">Observasi</span>
                <span className="font-bold text-ink">{observations.length}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink-soft">Tanaman terakhir</span>
                {plantings[0] ? (
                  <span className="flex items-center gap-1.5 font-semibold text-ink">
                    {plantings[0].cropName}
                    <PlantingStatusBadge status={plantings[0].status as PlantingStatus} />
                  </span>
                ) : (
                  <span className="text-ink-faint">Belum ada riwayat</span>
                )}
              </div>
              {plot.notes ? (
                <p className="rounded-lg bg-paper px-3 py-2 text-sm text-ink-soft">{plot.notes}</p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" onClick={() => { setEditPlanting(undefined); setPlantingModal(true); }}>
                  <Plus aria-hidden className="h-4 w-4" /> Catat tanaman
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setEditTest(undefined); setSoilModal(true); }}>
                  <FlaskConical aria-hidden className="h-4 w-4" /> Catat uji tanah
                </Button>
                <Link href={`/perencana?petak=${plot.id}`}>
                  <Button size="sm" variant="secondary">
                    <Sprout aria-hidden className="h-4 w-4" /> Rencanakan rotasi
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Observasi terbaru" />
            {observations.length === 0 ? (
              <p className="px-4 py-5 text-sm text-ink-soft sm:px-5">
                Belum ada observasi. Catat temuan hama, penyakit, atau pertumbuhan dari tab Observasi.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {observations.slice(0, 4).map((o) => (
                  <li key={o.id} className="px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-2">
                      <Badge tone={o.category === "hama" || o.category === "penyakit" ? "danger" : "moss"}>
                        {OBS_CATEGORY_LABELS[o.category as ObsCategory]}
                      </Badge>
                      <span className="text-xs text-ink-faint">{formatDate(o.obsDate)}</span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm text-ink">{o.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}

      {tab === "riwayat" ? (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditPlanting(undefined); setPlantingModal(true); }}>
              <Plus aria-hidden className="h-4 w-4" /> Catat tanaman
            </Button>
          </div>
          {plantings.length === 0 ? (
            <EmptyState
              icon={<Sprout aria-hidden className="h-6 w-6" />}
              title="Belum ada riwayat tanam"
              description="Catat penanaman pertama di petak ini; riwayat membantu saran rotasi."
              action={
                <Button onClick={() => { setEditPlanting(undefined); setPlantingModal(true); }}>
                  Catat tanaman pertama
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2.5">
              {plantings.map((p) => (
                <li key={p.id}>
                  <Card className="px-4 py-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-base font-semibold text-ink">{p.cropName}</p>
                          <PlantingStatusBadge status={p.status as PlantingStatus} />
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
                          <CalendarDays aria-hidden className="h-3.5 w-3.5" />
                          Tanam {formatDate(p.plantDate)}
                          {p.harvestDate ? <> · Panen {formatDate(p.harvestDate)}</> : null}
                          {p.yieldAmount ? (
                            <> · <Wheat aria-hidden className="h-3.5 w-3.5" /> Hasil {p.yieldAmount}{p.yieldUnit ? ` ${p.yieldUnit}` : ""}</>
                          ) : null}
                        </p>
                        {p.notes ? <p className="mt-1.5 text-sm text-ink-soft">{p.notes}</p> : null}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          aria-label={`Ubah catatan ${p.cropName}`}
                          onClick={() => { setEditPlanting(p); setPlantingModal(true); }}
                          className="rounded-lg p-2 text-ink-soft hover:bg-paper hover:text-ink"
                        >
                          <Pencil aria-hidden className="h-4 w-4" />
                        </button>
                        <button
                          aria-label={`Hapus catatan ${p.cropName}`}
                          onClick={() => setDeletePlanting(p)}
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
        </div>
      ) : null}

      {tab === "tanah" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditTest(undefined); setSoilModal(true); }}>
              <Plus aria-hidden className="h-4 w-4" /> Catat hasil uji
            </Button>
          </div>
          <p className="rounded-lg border border-line bg-cream px-3 py-2.5 text-xs text-ink-soft">
            Nilai ditampilkan apa adanya sesuai input Anda; aplikasi tidak mengisi nilai yang hilang dan
            tidak memberikan diagnosis atau rekomendasi pemupukan presisi. Uji ulang secara berkala untuk
            melihat tren yang lebih jelas.
          </p>
          {soilTests.length === 0 ? (
            <EmptyState
              icon={<FlaskConical aria-hidden className="h-6 w-6" />}
              title="Belum ada hasil uji tanah"
              description="Simpan hasil tes pH, N, P, K, atau bahan organik kapan pun tersedia."
              action={
                <Button onClick={() => { setEditTest(undefined); setSoilModal(true); }}>
                  Catat uji tanah pertama
                </Button>
              }
            />
          ) : (
            <>
              {chartData.length >= 2 ? (
                <Card className="px-2 py-4">
                  <h3 className="px-3 font-display text-sm font-semibold text-ink">Tren hasil uji</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 12, right: 16, left: -8, bottom: 0 }}>
                        <CartesianGrid stroke="#e0dbc8" strokeDasharray="3 3" />
                        <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: "#5b6150" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#5b6150" }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="pH" stroke="#425a27" strokeWidth={2} connectNulls dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="N" stroke="#a97a12" strokeWidth={2} connectNulls dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="P" stroke="#bf5f33" strokeWidth={2} connectNulls dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="K" stroke="#7a5c44" strokeWidth={2} connectNulls dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              ) : null}
              <ul className="space-y-2.5">
                {soilTests.map((t) => (
                  <li key={t.id}>
                    <Card className="px-4 py-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-ink">{formatDateLong(t.testDate)}</p>
                          <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
                            {t.ph !== null ? <div><dt className="inline font-semibold">pH:</dt> {t.ph}</div> : null}
                            {t.nitrogen !== null ? <div><dt className="inline font-semibold">N:</dt> {t.nitrogen}</div> : null}
                            {t.phosphor !== null ? <div><dt className="inline font-semibold">P:</dt> {t.phosphor}</div> : null}
                            {t.potassium !== null ? <div><dt className="inline font-semibold">K:</dt> {t.potassium}</div> : null}
                            {t.organicMatter !== null ? <div><dt className="inline font-semibold">Bahan organik:</dt> {t.organicMatter}%</div> : null}
                          </dl>
                          {t.method ? <p className="mt-1 text-xs text-ink-faint">Metode: {t.method}</p> : null}
                          {t.notes ? <p className="mt-1 text-sm text-ink-soft">{t.notes}</p> : null}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            aria-label={`Ubah uji tanah ${formatDate(t.testDate)}`}
                            onClick={() => { setEditTest(t); setSoilModal(true); }}
                            className="rounded-lg p-2 text-ink-soft hover:bg-paper hover:text-ink"
                          >
                            <Pencil aria-hidden className="h-4 w-4" />
                          </button>
                          <button
                            aria-label={`Hapus uji tanah ${formatDate(t.testDate)}`}
                            onClick={() => setDeleteTest(t)}
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
            </>
          )}
        </div>
      ) : null}

      {tab === "observasi" ? (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setObsModal(true)}>
              <Plus aria-hidden className="h-4 w-4" /> Catat observasi
            </Button>
          </div>
          {observations.length === 0 ? (
            <EmptyState
              icon={<ClipboardList aria-hidden className="h-6 w-6" />}
              title="Belum ada observasi"
              description="Catat hama, penyakit, pertumbuhan, atau cuaca untuk membantu keputusan rotasi."
              action={<Button onClick={() => setObsModal(true)}>Catat observasi pertama</Button>}
            />
          ) : (
            <ul className="space-y-2.5">
              {observations.map((o) => (
                <li key={o.id}>
                  <Card className="px-4 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={o.category === "hama" || o.category === "penyakit" ? "danger" : o.category === "cuaca" ? "sun" : "moss"}>
                        {OBS_CATEGORY_LABELS[o.category as ObsCategory]}
                      </Badge>
                      <span className="text-xs text-ink-faint">{formatDate(o.obsDate)}</span>
                      {o.plantingCropName ? (
                        <span className="text-xs text-ink-faint">· Siklus: {o.plantingCropName}</span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-ink">{o.description}</p>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {/* Modals */}
      <PlotFormModal open={plotModal} onClose={() => setPlotModal(false)} plot={plot} />
      <PlantingFormModal
        open={plantingModal}
        onClose={() => { setPlantingModal(false); setEditPlanting(undefined); }}
        fixedPlotId={plot.id}
        planting={editPlanting}
      />
      <SoilTestFormModal
        open={soilModal}
        onClose={() => { setSoilModal(false); setEditTest(undefined); }}
        plotId={plot.id}
        test={editTest}
      />
      <ObservationFormModal
        open={obsModal}
        onClose={() => setObsModal(false)}
        plotId={plot.id}
        plantings={plantings}
      />
      <ConfirmDialog
        open={deletePlotOpen}
        onClose={() => setDeletePlotOpen(false)}
        onConfirm={deletePlot}
        loading={deletePlotLoading}
        title="Hapus petak?"
        requireText={plot.name}
        message={
          <>
            Petak <strong>{plot.name}</strong> akan dihapus bersama {plantings.length} catatan tanam,{" "}
            {soilTests.length} hasil uji tanah, dan {observations.length} observasi. Tindakan ini tidak
            bisa dibatalkan.
          </>
        }
        confirmLabel="Hapus petak"
      />
      <ConfirmDialog
        open={deletePlanting !== null}
        onClose={() => setDeletePlanting(null)}
        onConfirm={() => deletePlanting && deletePlantingRow(deletePlanting)}
        title="Hapus catatan tanam?"
        message={
          deletePlanting ? (
            <>Catatan <strong>{deletePlanting.cropName}</strong> (tanam {formatDate(deletePlanting.plantDate)}) akan dihapus.</>
          ) : null
        }
        confirmLabel="Hapus catatan"
      />
      <ConfirmDialog
        open={deleteTest !== null}
        onClose={() => setDeleteTest(null)}
        onConfirm={() => deleteTest && deleteSoilTest(deleteTest)}
        title="Hapus hasil uji tanah?"
        message={
          deleteTest ? <>Hasil uji tanggal <strong>{formatDate(deleteTest.testDate)}</strong> akan dihapus.</> : null
        }
        confirmLabel="Hapus hasil uji"
      />
    </div>
  );
}
