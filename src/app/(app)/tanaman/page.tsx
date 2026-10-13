"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Leaf, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorBox,
  Field,
  Input,
  Select,
  Skeleton,
  useToast,
} from "@/components/ui";
import { CropFormModal } from "@/components/forms";
import { apiFetch, deleteReq } from "@/lib/client";
import { NUTRIENT_LABELS, NUTRIENT_HINTS } from "@/lib/labels";
import type { Crop, Family } from "@/lib/types";

export default function CropsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [familyId, setFamilyId] = useState("");
  const [nutrient, setNutrient] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editCrop, setEditCrop] = useState<Crop | undefined>(undefined);
  const [deleteCrop, setDeleteCrop] = useState<Crop | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const familiesQ = useQuery({
    queryKey: ["families"],
    queryFn: () => apiFetch<{ families: Family[] }>("/api/crop-families"),
  });

  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (familyId) params.set("familyId", familyId);
  if (nutrient) params.set("nutrient", nutrient);
  const qs = params.toString();

  const cropsQ = useQuery({
    queryKey: ["crops", search, familyId, nutrient],
    queryFn: () => apiFetch<{ crops: Crop[] }>(`/api/crops${qs ? `?${qs}` : ""}`),
  });

  async function doDelete(crop: Crop) {
    setDeleteLoading(true);
    try {
      await deleteReq(`/api/crops/${crop.id}`);
      toast({ title: "Tanaman dihapus", description: `${crop.name} dihapus dari katalog.` });
      qc.invalidateQueries();
    } catch (err) {
      toast({
        title: "Tidak dapat menghapus",
        description: err instanceof Error ? err.message : undefined,
        tone: "error",
      });
    } finally {
      setDeleteLoading(false);
      setDeleteCrop(null);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Katalog tanaman</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Tanaman yang dapat dipilih untuk catatan tanam dan rencana rotasi.
          </p>
        </div>
        <Button onClick={() => { setEditCrop(undefined); setModalOpen(true); }}>
          <Plus aria-hidden className="h-4 w-4" /> Tambah tanaman
        </Button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <label className="relative block">
          <span className="sr-only">Cari tanaman</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input
            className="pl-9"
            placeholder="Cari nama tanaman…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div>
          <label className="sr-only" htmlFor="filter-family">Filter keluarga botani</label>
          <Select id="filter-family" value={familyId} onChange={(e) => setFamilyId(e.target.value)}>
            <option value="">Semua keluarga</option>
            {(familiesQ.data?.families ?? []).map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="sr-only" htmlFor="filter-nutrient">Filter kategori hara</label>
          <Select id="filter-nutrient" value={nutrient} onChange={(e) => setNutrient(e.target.value)}>
            <option value="">Semua kategori hara</option>
            <option value="heavy">{NUTRIENT_LABELS.heavy}</option>
            <option value="light">{NUTRIENT_LABELS.light}</option>
            <option value="giver">{NUTRIENT_LABELS.giver}</option>
          </Select>
        </div>
      </div>

      {cropsQ.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : cropsQ.isError ? (
        <ErrorBox message="Gagal memuat katalog." onRetry={() => cropsQ.refetch()} />
      ) : (cropsQ.data?.crops.length ?? 0) === 0 ? (
        <EmptyState
          icon={<Leaf aria-hidden className="h-6 w-6" />}
          title="Tidak ada tanaman yang cocok"
          description={search || familyId || nutrient ? "Coba ubah kata kunci atau filter." : "Tambahkan tanaman pertama ke katalog."}
          action={
            <Button onClick={() => { setEditCrop(undefined); setModalOpen(true); }}>
              <Plus aria-hidden className="h-4 w-4" /> Tambah tanaman
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(cropsQ.data?.crops ?? []).map((crop) => (
            <li key={crop.id}>
              <Card className="flex h-full flex-col px-4 py-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-base font-semibold text-ink">{crop.name}</p>
                    {crop.scientificName ? (
                      <p className="truncate text-xs text-ink-faint italic">{crop.scientificName}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      aria-label={`Ubah ${crop.name}`}
                      onClick={() => { setEditCrop(crop); setModalOpen(true); }}
                      className="rounded-lg p-2 text-ink-soft hover:bg-paper hover:text-ink"
                    >
                      <Pencil aria-hidden className="h-4 w-4" />
                    </button>
                    <button
                      aria-label={`Hapus ${crop.name}`}
                      onClick={() => setDeleteCrop(crop)}
                      className="rounded-lg p-2 text-danger-600 hover:bg-danger-100"
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {crop.isSeed ? <Badge tone="neutral">Data contoh</Badge> : null}
                  {crop.familyName ? <Badge tone="moss">{crop.familyName}</Badge> : null}
                  {crop.nutrientCategory ? (
                    <Badge tone="clay" className="cursor-help" >
                      <span title={NUTRIENT_HINTS[crop.nutrientCategory]}>
                        {NUTRIENT_LABELS[crop.nutrientCategory]}
                      </span>
                    </Badge>
                  ) : null}
                  {crop.isCoverCrop ? <Badge tone="sun">Penutup tanah</Badge> : null}
                </div>
                {crop.rotationGroup ? (
                  <p className="mt-2 text-xs text-ink-soft">Kelompok rotasi: {crop.rotationGroup}</p>
                ) : null}
                {crop.notes ? (
                  <p className="mt-2 line-clamp-3 text-xs text-ink-soft">{crop.notes}</p>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <CropFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditCrop(undefined); }} crop={editCrop} />
      <ConfirmDialog
        open={deleteCrop !== null}
        onClose={() => setDeleteCrop(null)}
        onConfirm={() => deleteCrop && doDelete(deleteCrop)}
        loading={deleteLoading}
        title="Hapus tanaman dari katalog?"
        message={
          deleteCrop ? (
            <>
              <strong>{deleteCrop.name}</strong> akan dihapus dari katalog. Tanaman yang sudah dipakai
              pada riwayat tanam atau rencana tidak dapat dihapus.
            </>
          ) : null
        }
        confirmLabel="Hapus tanaman"
      />
    </div>
  );
}
