"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, LogOut, Plus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  Field,
  Input,
  Select,
  useToast,
} from "@/components/ui";
import { apiFetch, deleteReq, patchJSON, postJSON } from "@/lib/client";
import { useMe } from "@/lib/hooks";

const TIMEZONES = [
  { value: "Asia/Jakarta", label: "WIB — Asia/Jakarta" },
  { value: "Asia/Makassar", label: "WITA — Asia/Makassar" },
  { value: "Asia/Jayapura", label: "WIT — Asia/Jayapura" },
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useMe();

  const [name, setName] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newFarmName, setNewFarmName] = useState("");
  const [newFarmLocation, setNewFarmLocation] = useState("");
  const [creatingFarm, setCreatingFarm] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  if (!me) return null;
  const farm = me.activeFarm;
  const farmName = name ?? farm?.name ?? "";
  const farmLocation = location ?? farm?.location ?? "";
  const farmTimezone = timezone ?? farm?.timezone ?? "Asia/Jakarta";

  async function saveFarm() {
    if (!farm) return;
    setSaving(true);
    try {
      await patchJSON(`/api/farms/${farm.id}`, {
        name: farmName.trim(),
        location: farmLocation.trim() || undefined,
        timezone: farmTimezone,
      });
      toast({ title: "Profil kebun disimpan" });
      qc.invalidateQueries();
    } catch (err) {
      toast({ title: "Gagal menyimpan", description: err instanceof Error ? err.message : undefined, tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function activateFarm(id: number) {
    try {
      await postJSON(`/api/farms/${id}/activate`, {});
      toast({ title: "Kebun aktif diganti" });
      qc.invalidateQueries();
    } catch (err) {
      toast({ title: "Gagal mengganti kebun", description: err instanceof Error ? err.message : undefined, tone: "error" });
    }
  }

  async function createFarm() {
    setCreatingFarm(true);
    try {
      const created = await postJSON<{ farm: { id: number } }>("/api/farms", {
        name: newFarmName.trim(),
        location: newFarmLocation.trim() || undefined,
      });
      await postJSON(`/api/farms/${created.farm.id}/activate`, {});
      setNewFarmName("");
      setNewFarmLocation("");
      toast({ title: "Kebun baru dibuat", description: "Kebun baru kini menjadi kebun aktif." });
      qc.invalidateQueries();
    } catch (err) {
      toast({ title: "Gagal membuat kebun", description: err instanceof Error ? err.message : undefined, tone: "error" });
    } finally {
      setCreatingFarm(false);
    }
  }

  async function deleteFarm() {
    if (!farm) return;
    setDeleteLoading(true);
    try {
      await deleteReq(`/api/farms/${farm.id}`);
      toast({ title: "Kebun dihapus", description: `“${farm.name}” dan seluruh datanya telah dihapus.` });
      setDeleteOpen(false);
      qc.invalidateQueries();
    } catch (err) {
      toast({ title: "Gagal menghapus", description: err instanceof Error ? err.message : undefined, tone: "error" });
      setDeleteLoading(false);
    }
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Pengaturan</h1>
        <p className="mt-1 text-sm text-ink-soft">Profil akun, kebun aktif, ekspor data, dan zona bahaya.</p>
      </div>

      <Card>
        <CardHeader title="Akun" description="Data login Anda." />
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div>
            <p className="font-semibold text-ink">{me.user.name}</p>
            <p className="text-sm text-ink-soft">{me.user.email}</p>
          </div>
          <Button variant="danger" onClick={logout} loading={loggingOut}>
            <LogOut aria-hidden className="h-4 w-4" /> Keluar
          </Button>
        </div>
      </Card>

      {farm ? (
        <Card>
          <CardHeader title="Profil kebun aktif" description={`Mengubah profil “${farm.name}”.`} />
          <div className="space-y-4 px-4 py-4 sm:px-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama kebun" required>
                <Input value={farmName} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Lokasi (teks bebas)">
                <Input value={farmLocation} onChange={(e) => setLocation(e.target.value)} placeholder="cth. Lembang, Jawa Barat" />
              </Field>
            </div>
            <Field label="Zona waktu" hint="Dipakai sebagai referensi penanggalan kebun Anda.">
              <Select value={farmTimezone} onChange={(e) => setTimezone(e.target.value)}>
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </Select>
            </Field>
            <Button onClick={saveFarm} loading={saving}>Simpan profil kebun</Button>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Kebun Anda" description="Pilih kebun aktif atau buat kebun baru." />
        <div className="px-4 py-4 sm:px-5">
          {me.farms.length === 0 ? (
            <p className="text-sm text-ink-soft">Belum ada kebun. Buat di bawah.</p>
          ) : (
            <ul className="space-y-2">
              {me.farms.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink">{f.name}</p>
                    {f.id === farm?.id ? <Badge tone="moss">Aktif</Badge> : null}
                    {f.ownerId === me.user.id ? <Badge tone="neutral">Pemilik</Badge> : <Badge tone="sun">Anggota</Badge>}
                  </div>
                  {f.id !== farm?.id ? (
                    <Button size="sm" variant="secondary" onClick={() => activateFarm(f.id)}>
                      Jadikan aktif
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 grid gap-3 rounded-lg border border-dashed border-line-strong bg-paper/50 p-3 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="Nama kebun baru">
              <Input value={newFarmName} onChange={(e) => setNewFarmName(e.target.value)} placeholder="cth. Kebun Atap" />
            </Field>
            <Field label="Lokasi (opsional)">
              <Input value={newFarmLocation} onChange={(e) => setNewFarmLocation(e.target.value)} />
            </Field>
            <div className="flex items-end">
              <Button variant="secondary" onClick={createFarm} loading={creatingFarm} disabled={newFarmName.trim().length < 2}>
                <Plus aria-hidden className="h-4 w-4" /> Buat kebun
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {farm ? (
        <>
          <Card>
            <CardHeader
              title="Ekspor data"
              description="Unduh data Anda dalam format CSV yang bisa dibuka di Excel atau spreadsheet lain."
            />
            <div className="flex flex-wrap gap-2 px-4 py-4 sm:px-5">
              <a href={`/api/export/plantings?farmId=${farm.id}`}>
                <Button variant="secondary">
                  <Download aria-hidden className="h-4 w-4" /> Riwayat tanam (CSV)
                </Button>
              </a>
              <a href={`/api/export/soil-tests?farmId=${farm.id}`}>
                <Button variant="secondary">
                  <Download aria-hidden className="h-4 w-4" /> Hasil uji tanah (CSV)
                </Button>
              </a>
            </div>
          </Card>

          <Card className="border-danger-600/30">
            <CardHeader
              title="Zona bahaya"
              description="Menghapus kebun akan menghapus seluruh petak, riwayat tanam, uji tanah, observasi, rencana, dan pengingatnya."
            />
            <div className="px-4 py-4 sm:px-5">
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                Hapus kebun “{farm.name}”
              </Button>
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-5 text-sm text-ink-soft">
          Belum ada kebun aktif. Buat kebun pertama Anda — bisa juga dari halaman{" "}
          <Link href="/" className="font-semibold text-moss-700 hover:underline">Beranda</Link>.
        </Card>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteFarm}
        loading={deleteLoading}
        title="Hapus kebun dan seluruh datanya?"
        requireText={farm?.name}
        confirmLabel="Hapus kebun"
        message={
          <>
            Seluruh data kebun <strong>{farm?.name}</strong> (petak, riwayat tanam, uji tanah, observasi,
            rencana rotasi, dan pengingat) akan dihapus permanen.
          </>
        }
      />
    </div>
  );
}
