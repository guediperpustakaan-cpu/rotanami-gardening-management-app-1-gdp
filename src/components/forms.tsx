"use client";

import { useEffect, useState, useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { AlertTriangle } from "lucide-react";
import { Button, Dialog, Field, Input, Select, Textarea } from "./ui";
import { apiFetch, postJSON, patchJSON } from "@/lib/client";
import { useMe } from "@/lib/hooks";
import {
  cropCreateSchema,
  observationCreateSchema,
  plantingBaseSchema,
  plotCreateSchema,
  reminderCreateSchema,
  rotationPlanCreateSchema,
  seasonBaseSchema,
  soilTestCreateSchema,
} from "@/lib/schemas";
import type {
  Crop,
  Family,
  Observation,
  Planting,
  Plot,
  PlotSummary,
  Reminder,
  Season,
  SoilTest,
} from "@/lib/types";
import {
  NUTRIENT_LABELS,
  OBS_CATEGORY_LABELS,
  PLANTING_STATUS_LABELS,
  type ObsCategory,
  type PlantingStatus,
} from "@/lib/labels";
import { todayISO } from "@/lib/format";

/* ---------- pembantu ---------- */

function RootError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-danger-600/30 bg-danger-100 px-3 py-2 text-sm font-medium text-danger-700"
    >
      <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </p>
  );
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

function useFarmId(): number | null {
  const { data } = useMe();
  return data?.activeFarm?.id ?? null;
}

function usePlots(farmId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ["plots", farmId],
    enabled: enabled && farmId !== null,
    queryFn: () => apiFetch<{ plots: PlotSummary[] }>(`/api/plots?farmId=${farmId}`),
  });
}

function useCrops(enabled: boolean) {
  return useQuery({
    queryKey: ["crops-all"],
    enabled,
    queryFn: () => apiFetch<{ crops: Crop[] }>("/api/crops"),
  });
}

function useFamilies(enabled: boolean) {
  return useQuery({
    queryKey: ["families"],
    enabled,
    queryFn: () => apiFetch<{ families: Family[] }>("/api/crop-families"),
  });
}

/* ================= Petak ================= */

const plotFormSchema = plotCreateSchema.omit({ farmId: true });
type PlotFormInput = z.input<typeof plotFormSchema>;
type PlotFormOutput = z.output<typeof plotFormSchema>;

export function PlotFormModal({
  open,
  onClose,
  plot,
}: {
  open: boolean;
  onClose: () => void;
  plot?: Plot;
}) {
  const farmId = useFarmId();
  const invalidate = useInvalidate();
  const [rootError, setRootError] = useState<string | null>(null);
  const formId = useId();

  const { register, handleSubmit, reset, formState } = useForm<
    PlotFormInput,
    unknown,
    PlotFormOutput
  >({
    resolver: zodResolver(plotFormSchema),
    defaultValues: { name: "", areaUnit: "m2" },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: plot?.name ?? "",
        size: plot?.size ?? undefined,
        areaUnit: (plot?.areaUnit as "m2" | "are" | "hektar") ?? "m2",
        soilType: plot?.soilType ?? undefined,
        notes: plot?.notes ?? undefined,
      });
    }
  }, [open, plot, reset]);

  function handleClose() {
    setRootError(null);
    onClose();
  }

  async function submit(values: PlotFormOutput) {
    setRootError(null);
    try {
      if (plot) {
        await patchJSON(`/api/plots/${plot.id}`, values);
      } else {
        if (farmId === null) throw new Error("Kebun aktif belum tersedia.");
        await postJSON("/api/plots", { ...values, farmId });
      }
      invalidate();
      onClose();
    } catch (err) {
      setRootError(err instanceof Error ? err.message : "Gagal menyimpan petak.");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={plot ? "Ubah petak" : "Tambah petak"}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Batal</Button>
          <Button type="submit" form={formId} loading={formState.isSubmitting}>
            {plot ? "Simpan perubahan" : "Tambah petak"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <RootError message={rootError} />
        <Field label="Nama petak" required error={formState.errors.name?.message}>
          <Input placeholder="cth. Bedeng A" {...register("name")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ukuran" error={formState.errors.size?.message}>
            <Input type="number" inputMode="decimal" min="0" step="any" placeholder="cth. 12" {...register("size")} />
          </Field>
          <Field label="Satuan luas" error={formState.errors.areaUnit?.message}>
            <Select {...register("areaUnit")}>
              <option value="m2">m²</option>
              <option value="are">are</option>
              <option value="hektar">hektar</option>
            </Select>
          </Field>
        </div>
        <Field label="Jenis tanah (bila diketahui)" error={formState.errors.soilType?.message}>
          <Input placeholder="cth. Lempung berpasir" {...register("soilType")} />
        </Field>
        <Field label="Catatan" error={formState.errors.notes?.message}>
          <Textarea placeholder="Catatan tentang petak ini…" {...register("notes")} />
        </Field>
      </form>
    </Dialog>
  );
}

/* ================= Penanaman ================= */

const plantingFormSchema = plantingBaseSchema
  .omit({ plotId: true, cropId: true })
  .extend({
    plotId: z.coerce.number().int().positive("Pilih petak terlebih dahulu."),
    cropId: z.coerce.number().int().positive("Pilih tanaman terlebih dahulu."),
  })
  .refine(
    (v) => !v.harvestDate || v.harvestDate >= v.plantDate,
    "Tanggal panen tidak boleh sebelum tanggal tanam.",
  );
type PlantingFormInput = z.input<typeof plantingFormSchema>;
type PlantingFormOutput = z.output<typeof plantingFormSchema>;

export function PlantingFormModal({
  open,
  onClose,
  fixedPlotId,
  planting,
}: {
  open: boolean;
  onClose: () => void;
  fixedPlotId?: number;
  planting?: Planting;
}) {
  const farmId = useFarmId();
  const invalidate = useInvalidate();
  const [rootError, setRootError] = useState<string | null>(null);
  const formId = useId();
  const plotsQ = usePlots(farmId, open);
  const cropsQ = useCrops(open);

  const { register, handleSubmit, reset, formState, watch } = useForm<
    PlantingFormInput,
    unknown,
    PlantingFormOutput
  >({
    resolver: zodResolver(plantingFormSchema),
    defaultValues: {
      plotId: 0,
      cropId: 0,
      plantDate: todayISO(),
      status: "direncanakan",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        plotId: planting?.plotId ?? fixedPlotId ?? 0,
        cropId: planting?.cropId ?? 0,
        seasonId: planting?.seasonId ?? undefined,
        plantDate: planting?.plantDate ?? todayISO(),
        harvestDate: planting?.harvestDate ?? undefined,
        status: planting?.status ?? "direncanakan",
        yieldAmount: planting?.yieldAmount ?? undefined,
        yieldUnit: planting?.yieldUnit ?? undefined,
        notes: planting?.notes ?? undefined,
      });
    }
  }, [open, planting, fixedPlotId, reset]);

  function handleClose() {
    setRootError(null);
    onClose();
  }

  const status = watch("status");

  async function submit(values: PlantingFormOutput) {
    setRootError(null);
    try {
      if (planting) {
        const { plotId: _pid, ...rest } = values;
        await patchJSON(`/api/plantings/${planting.id}`, rest);
      } else {
        await postJSON("/api/plantings", values);
      }
      invalidate();
      onClose();
    } catch (err) {
      setRootError(err instanceof Error ? err.message : "Gagal menyimpan catatan tanam.");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={planting ? "Ubah catatan tanam" : "Catat tanaman"}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Batal</Button>
          <Button type="submit" form={formId} loading={formState.isSubmitting}>
            {planting ? "Simpan perubahan" : "Simpan catatan"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <RootError message={rootError} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Petak" required error={formState.errors.plotId?.message}>
            <Select {...register("plotId")} disabled={fixedPlotId !== undefined}>
              <option value={0}>Pilih petak…</option>
              {(plotsQ.data?.plots ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tanaman" required error={formState.errors.cropId?.message}>
            <Select {...register("cropId")}>
              <option value={0}>Pilih tanaman…</option>
              {(cropsQ.data?.crops ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.familyName ? ` — ${c.familyName}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal tanam" required error={formState.errors.plantDate?.message}>
            <Input type="date" {...register("plantDate")} />
          </Field>
          <Field label="Status" required error={formState.errors.status?.message}>
            <Select {...register("status")}>
              {(Object.keys(PLANTING_STATUS_LABELS) as PlantingStatus[]).map((s) => (
                <option key={s} value={s}>{PLANTING_STATUS_LABELS[s]}</option>
              ))}
            </Select>
          </Field>
          <Field
            label="Tanggal panen (bila sudah)"
            hint={status === "dipanen" ? "Status dipanen sebaiknya disertai tanggal panen." : undefined}
            error={formState.errors.harvestDate?.message}
          >
            <Input type="date" {...register("harvestDate")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hasil panen" error={formState.errors.yieldAmount?.message}>
              <Input type="number" inputMode="decimal" min="0" step="any" placeholder="cth. 14" {...register("yieldAmount")} />
            </Field>
            <Field label="Satuan" error={formState.errors.yieldUnit?.message}>
              <Input placeholder="cth. kg" {...register("yieldUnit")} />
            </Field>
          </div>
        </div>
        <Field label="Catatan" error={formState.errors.notes?.message}>
          <Textarea placeholder="cth. Bibit dari semaian sendiri…" {...register("notes")} />
        </Field>
      </form>
    </Dialog>
  );
}

/* ================= Uji tanah ================= */

const soilFormSchema = soilTestCreateSchema.omit({ plotId: true });
type SoilFormInput = z.input<typeof soilFormSchema>;
type SoilFormOutput = z.output<typeof soilFormSchema>;

export function SoilTestFormModal({
  open,
  onClose,
  plotId,
  test,
}: {
  open: boolean;
  onClose: () => void;
  plotId: number;
  test?: SoilTest;
}) {
  const invalidate = useInvalidate();
  const [rootError, setRootError] = useState<string | null>(null);
  const formId = useId();

  const { register, handleSubmit, reset, formState } = useForm<
    SoilFormInput,
    unknown,
    SoilFormOutput
  >({
    resolver: zodResolver(soilFormSchema),
    defaultValues: { testDate: todayISO() },
  });

  useEffect(() => {
    if (open) {
      reset({
        testDate: test?.testDate ?? todayISO(),
        ph: test?.ph ?? undefined,
        nitrogen: test?.nitrogen ?? undefined,
        phosphor: test?.phosphor ?? undefined,
        potassium: test?.potassium ?? undefined,
        organicMatter: test?.organicMatter ?? undefined,
        method: test?.method ?? undefined,
        notes: test?.notes ?? undefined,
      });
    }
  }, [open, test, reset]);

  function handleClose() {
    setRootError(null);
    onClose();
  }

  async function submit(values: SoilFormOutput) {
    setRootError(null);
    try {
      if (test) {
        await patchJSON(`/api/soil-tests/${test.id}`, values);
      } else {
        await postJSON("/api/soil-tests", { ...values, plotId });
      }
      invalidate();
      onClose();
    } catch (err) {
      setRootError(err instanceof Error ? err.message : "Gagal menyimpan hasil uji tanah.");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={test ? "Ubah hasil uji tanah" : "Catat hasil uji tanah"}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Batal</Button>
          <Button type="submit" form={formId} loading={formState.isSubmitting}>
            {test ? "Simpan perubahan" : "Simpan hasil uji"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <RootError message={rootError} />
        <p className="rounded-lg bg-paper px-3 py-2 text-xs text-ink-soft">
          Hanya tanggal tes yang wajib. Kosongkan nilai yang tidak Anda ketahui — aplikasi tidak akan
          mengarang nilai.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Tanggal tes" required error={formState.errors.testDate?.message}>
            <Input type="date" {...register("testDate")} />
          </Field>
          <Field label="pH" error={formState.errors.ph?.message}>
            <Input type="number" inputMode="decimal" step="any" placeholder="cth. 6.5" {...register("ph")} />
          </Field>
          <Field label="Nitrogen (N)" error={formState.errors.nitrogen?.message}>
            <Input type="number" inputMode="decimal" step="any" {...register("nitrogen")} />
          </Field>
          <Field label="Fosfor (P)" error={formState.errors.phosphor?.message}>
            <Input type="number" inputMode="decimal" step="any" {...register("phosphor")} />
          </Field>
          <Field label="Kalium (K)" error={formState.errors.potassium?.message}>
            <Input type="number" inputMode="decimal" step="any" {...register("potassium")} />
          </Field>
          <Field label="Bahan organik (%)" error={formState.errors.organicMatter?.message}>
            <Input type="number" inputMode="decimal" step="any" {...register("organicMatter")} />
          </Field>
        </div>
        <Field label="Metode / sumber tes" error={formState.errors.method?.message}>
          <Input placeholder="cth. Kit uji cepat, lab daerah…" {...register("method")} />
        </Field>
        <Field label="Catatan" error={formState.errors.notes?.message}>
          <Textarea {...register("notes")} />
        </Field>
      </form>
    </Dialog>
  );
}

/* ================= Observasi ================= */

const obsFormSchema = observationCreateSchema.omit({ plotId: true });
type ObsFormInput = z.input<typeof obsFormSchema>;
type ObsFormOutput = z.output<typeof obsFormSchema>;

export function ObservationFormModal({
  open,
  onClose,
  plotId,
  plantings,
  observation,
}: {
  open: boolean;
  onClose: () => void;
  plotId: number;
  plantings: Planting[];
  observation?: Observation;
}) {
  const invalidate = useInvalidate();
  const [rootError, setRootError] = useState<string | null>(null);
  const formId = useId();

  const { register, handleSubmit, reset, formState } = useForm<
    ObsFormInput,
    unknown,
    ObsFormOutput
  >({
    resolver: zodResolver(obsFormSchema),
    defaultValues: { category: "lainnya", obsDate: todayISO(), description: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        category: observation?.category ?? "lainnya",
        obsDate: observation?.obsDate ?? todayISO(),
        description: observation?.description ?? "",
        plantingId: observation?.plantingId ?? null,
      });
    }
  }, [open, observation, reset]);

  function handleClose() {
    setRootError(null);
    onClose();
  }

  async function submit(values: ObsFormOutput) {
    setRootError(null);
    try {
      if (observation) {
        await patchJSON(`/api/observations/${observation.id}`, values);
      } else {
        await postJSON("/api/observations", { ...values, plotId });
      }
      invalidate();
      onClose();
    } catch (err) {
      setRootError(err instanceof Error ? err.message : "Gagal menyimpan observasi.");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={observation ? "Ubah observasi" : "Catat observasi"}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Batal</Button>
          <Button type="submit" form={formId} loading={formState.isSubmitting}>
            {observation ? "Simpan perubahan" : "Simpan observasi"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <RootError message={rootError} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jenis observasi" required error={formState.errors.category?.message}>
            <Select {...register("category")}>
              {(Object.keys(OBS_CATEGORY_LABELS) as ObsCategory[]).map((c) => (
                <option key={c} value={c}>{OBS_CATEGORY_LABELS[c]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal" required error={formState.errors.obsDate?.message}>
            <Input type="date" {...register("obsDate")} />
          </Field>
        </div>
        <Field
          label="Siklus tanam terkait (opsional)"
          hint="Hubungkan observasi dengan penanaman tertentu bila relevan."
          error={formState.errors.plantingId?.message}
        >
          <Select {...register("plantingId")}>
            <option value="">Tidak terkait siklus tertentu</option>
            {plantings.map((p) => (
              <option key={p.id} value={p.id}>
                {p.cropName} — tanam {p.plantDate}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Deskripsi" required error={formState.errors.description?.message}>
          <Textarea placeholder="cth. Daun menguning di beberapa tanaman…" {...register("description")} />
        </Field>
      </form>
    </Dialog>
  );
}

/* ================= Pengingat ================= */

const reminderFormSchema = reminderCreateSchema.omit({ farmId: true });
type ReminderFormInput = z.input<typeof reminderFormSchema>;
type ReminderFormOutput = z.output<typeof reminderFormSchema>;

export function ReminderFormModal({
  open,
  onClose,
  reminder,
}: {
  open: boolean;
  onClose: () => void;
  reminder?: Reminder;
}) {
  const farmId = useFarmId();
  const invalidate = useInvalidate();
  const [rootError, setRootError] = useState<string | null>(null);
  const formId = useId();
  const plotsQ = usePlots(farmId, open);

  const { register, handleSubmit, reset, formState } = useForm<
    ReminderFormInput,
    unknown,
    ReminderFormOutput
  >({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: { title: "", dueDate: todayISO() },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: reminder?.title ?? "",
        dueDate: reminder?.dueDate ?? todayISO(),
        plotId: reminder?.plotId ?? null,
        notes: reminder?.notes ?? undefined,
      });
    }
  }, [open, reminder, reset]);

  function handleClose() {
    setRootError(null);
    onClose();
  }

  async function submit(values: ReminderFormOutput) {
    setRootError(null);
    try {
      if (reminder) {
        await patchJSON(`/api/reminders/${reminder.id}`, values);
      } else {
        if (farmId === null) throw new Error("Kebun aktif belum tersedia.");
        await postJSON("/api/reminders", { ...values, farmId });
      }
      invalidate();
      onClose();
    } catch (err) {
      setRootError(err instanceof Error ? err.message : "Gagal menyimpan pengingat.");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={reminder ? "Ubah pengingat" : "Buat pengingat"}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Batal</Button>
          <Button type="submit" form={formId} loading={formState.isSubmitting}>
            {reminder ? "Simpan perubahan" : "Simpan pengingat"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <RootError message={rootError} />
        <Field label="Judul" required error={formState.errors.title?.message}>
          <Input placeholder="cth. Semai benih kubis" {...register("title")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal" required error={formState.errors.dueDate?.message}>
            <Input type="date" {...register("dueDate")} />
          </Field>
          <Field label="Petak terkait" error={formState.errors.plotId?.message}>
            <Select {...register("plotId")}>
              <option value="">Seluruh kebun</option>
              {(plotsQ.data?.plots ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Catatan" error={formState.errors.notes?.message}>
          <Textarea {...register("notes")} />
        </Field>
        <p className="text-xs text-ink-faint">
          Pengingat ditampilkan di dalam aplikasi (dashboard & kalender); belum mengirim email atau
          notifikasi push.
        </p>
      </form>
    </Dialog>
  );
}

/* ================= Tanaman katalog ================= */

const cropFormSchema = cropCreateSchema;
type CropFormInput = z.input<typeof cropFormSchema>;
type CropFormOutput = z.output<typeof cropFormSchema>;

export function CropFormModal({
  open,
  onClose,
  crop,
}: {
  open: boolean;
  onClose: () => void;
  crop?: Crop;
}) {
  const invalidate = useInvalidate();
  const [rootError, setRootError] = useState<string | null>(null);
  const [newFamilyMode, setNewFamilyMode] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [newFamilyGroup, setNewFamilyGroup] = useState("");
  const formId = useId();
  const familiesQ = useFamilies(open);

  const { register, handleSubmit, reset, formState } = useForm<
    CropFormInput,
    unknown,
    CropFormOutput
  >({
    resolver: zodResolver(cropFormSchema),
    defaultValues: { name: "", isCoverCrop: false },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: crop?.name ?? "",
        scientificName: crop?.scientificName ?? undefined,
        familyId: crop?.familyId ?? null,
        nutrientCategory: crop?.nutrientCategory ?? null,
        isCoverCrop: crop?.isCoverCrop ?? false,
        notes: crop?.notes ?? undefined,
      });
    }
  }, [open, crop, reset]);

  function handleClose() {
    setRootError(null);
    setNewFamilyMode(false);
    setNewFamilyName("");
    setNewFamilyGroup("");
    onClose();
  }

  async function submit(values: CropFormOutput) {
    setRootError(null);
    try {
      let familyId = values.familyId;
      if (newFamilyMode && newFamilyName.trim()) {
        const created = await postJSON<{ family: Family }>("/api/crop-families", {
          name: newFamilyName.trim(),
          rotationGroup: newFamilyGroup.trim() || undefined,
        });
        familyId = created.family.id;
      }
      const payload = { ...values, familyId };
      if (crop) {
        await patchJSON(`/api/crops/${crop.id}`, payload);
      } else {
        await postJSON("/api/crops", payload);
      }
      invalidate();
      onClose();
    } catch (err) {
      setRootError(err instanceof Error ? err.message : "Gagal menyimpan tanaman.");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={crop ? "Ubah tanaman" : "Tambah tanaman ke katalog"}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Batal</Button>
          <Button type="submit" form={formId} loading={formState.isSubmitting}>
            {crop ? "Simpan perubahan" : "Tambah tanaman"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <RootError message={rootError} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama umum (Indonesia)" required error={formState.errors.name?.message}>
            <Input placeholder="cth. Tomat" {...register("name")} />
          </Field>
          <Field label="Nama ilmiah (opsional)" error={formState.errors.scientificName?.message}>
            <Input placeholder="cth. Solanum lycopersicum" {...register("scientificName")} />
          </Field>
        </div>
        {!newFamilyMode ? (
          <div>
            <Field label="Keluarga botani / kelompok rotasi" error={formState.errors.familyId?.message}>
              <Select {...register("familyId")}>
                <option value="">Belum tahu / tidak diisi</option>
                {(familiesQ.data?.families ?? []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}{f.rotationGroup ? ` — ${f.rotationGroup}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <button
              type="button"
              onClick={() => setNewFamilyMode(true)}
              className="mt-1.5 text-sm font-semibold text-moss-700 hover:underline"
            >
              + Tambah keluarga baru
            </button>
          </div>
        ) : (
          <div className="grid gap-3 rounded-lg border border-line bg-paper/60 p-3 sm:grid-cols-2">
            <Field label="Nama keluarga baru" required>
              <Input value={newFamilyName} onChange={(e) => setNewFamilyName(e.target.value)} placeholder="cth. Zingiberaceae" />
            </Field>
            <Field label="Kelompok rotasi (opsional)">
              <Input value={newFamilyGroup} onChange={(e) => setNewFamilyGroup(e.target.value)} placeholder="cth. Jahe-jahean" />
            </Field>
            <button
              type="button"
              onClick={() => setNewFamilyMode(false)}
              className="text-sm font-semibold text-ink-soft hover:underline sm:col-span-2"
            >
              Batal, pilih dari daftar
            </button>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Kategori kebutuhan hara"
            hint="Isi hanya bila Anda yakin; saran rotasi memakai data ini bila tersedia."
            error={formState.errors.nutrientCategory?.message}
          >
            <Select {...register("nutrientCategory")}>
              <option value="">Belum diketahui</option>
              <option value="heavy">{NUTRIENT_LABELS.heavy}</option>
              <option value="light">{NUTRIENT_LABELS.light}</option>
              <option value="giver">{NUTRIENT_LABELS.giver}</option>
            </Select>
          </Field>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2.5 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-line-strong accent-moss-700"
                {...register("isCoverCrop")}
              />
              Dapat dipakai sebagai tanaman penutup tanah
            </label>
          </div>
        </div>
        <Field label="Catatan panduan umum" error={formState.errors.notes?.message}>
          <Textarea placeholder="Panduan singkat untuk tanaman ini…" {...register("notes")} />
        </Field>
      </form>
    </Dialog>
  );
}

/* ================= Musim ================= */

const seasonFormSchema = seasonBaseSchema.omit({ farmId: true }).refine(
  (v) => v.endDate >= v.startDate,
  "Tanggal selesai harus setelah tanggal mulai.",
);
type SeasonFormInput = z.input<typeof seasonFormSchema>;
type SeasonFormOutput = z.output<typeof seasonFormSchema>;

export function SeasonFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const farmId = useFarmId();
  const invalidate = useInvalidate();
  const [rootError, setRootError] = useState<string | null>(null);
  const formId = useId();

  const { register, handleSubmit, reset, formState } = useForm<
    SeasonFormInput,
    unknown,
    SeasonFormOutput
  >({
    resolver: zodResolver(seasonFormSchema),
    defaultValues: { name: "", startDate: todayISO(), endDate: todayISO() },
  });

  useEffect(() => {
    if (open) {
      reset({ name: "", startDate: todayISO(), endDate: todayISO() });
    }
  }, [open, reset]);

  function handleClose() {
    setRootError(null);
    onClose();
  }

  async function submit(values: SeasonFormOutput) {
    setRootError(null);
    try {
      if (farmId === null) throw new Error("Kebun aktif belum tersedia.");
      await postJSON("/api/seasons", { ...values, farmId });
      invalidate();
      onClose();
    } catch (err) {
      setRootError(err instanceof Error ? err.message : "Gagal menyimpan musim.");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Tambah musim tanam"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Batal</Button>
          <Button type="submit" form={formId} loading={formState.isSubmitting}>Simpan musim</Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <RootError message={rootError} />
        <Field label="Nama musim" required error={formState.errors.name?.message}>
          <Input placeholder="cth. Musim Hujan 2026" {...register("name")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mulai" required error={formState.errors.startDate?.message}>
            <Input type="date" {...register("startDate")} />
          </Field>
          <Field label="Selesai" required error={formState.errors.endDate?.message}>
            <Input type="date" {...register("endDate")} />
          </Field>
        </div>
      </form>
    </Dialog>
  );
}

/* ================= Rencana rotasi ================= */

const planFormSchema = rotationPlanCreateSchema.omit({ plotId: true, cropId: true }).extend({
  plotId: z.coerce.number().int().positive("Pilih petak terlebih dahulu."),
  cropId: z.coerce.number().int().positive("Pilih tanaman terlebih dahulu."),
});
type PlanFormInput = z.input<typeof planFormSchema>;
type PlanFormOutput = z.output<typeof planFormSchema>;

export function PlanFormModal({
  open,
  onClose,
  defaultPlotId,
  defaultCropId,
  rationale,
}: {
  open: boolean;
  onClose: () => void;
  defaultPlotId?: number;
  defaultCropId?: number;
  rationale?: { source: string; context: string[]; reasons: string[]; disclaimer?: string } | null;
}) {
  const farmId = useFarmId();
  const invalidate = useInvalidate();
  const [rootError, setRootError] = useState<string | null>(null);
  const formId = useId();
  const plotsQ = usePlots(farmId, open);
  const cropsQ = useCrops(open);
  const seasonsQ = useQuery({
    queryKey: ["seasons", farmId],
    enabled: open && farmId !== null,
    queryFn: () => apiFetch<{ seasons: Season[] }>(`/api/seasons?farmId=${farmId}`),
  });

  const { register, handleSubmit, reset, formState } = useForm<
    PlanFormInput,
    unknown,
    PlanFormOutput
  >({
    resolver: zodResolver(planFormSchema),
    defaultValues: { status: "aktif" },
  });

  useEffect(() => {
    if (open) {
      reset({
        plotId: defaultPlotId ?? 0,
        cropId: defaultCropId ?? 0,
        seasonId: null,
        targetDate: undefined,
        status: "aktif",
        notes: undefined,
      });
    }
  }, [open, defaultPlotId, defaultCropId, reset]);

  function handleClose() {
    setRootError(null);
    onClose();
  }

  async function submit(values: PlanFormOutput) {
    setRootError(null);
    try {
      await postJSON("/api/rotation-plans", { ...values, rationale: rationale ?? null });
      invalidate();
      onClose();
    } catch (err) {
      setRootError(err instanceof Error ? err.message : "Gagal menyimpan rencana rotasi.");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Simpan rencana rotasi"
      wide
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Batal</Button>
          <Button type="submit" form={formId} loading={formState.isSubmitting}>Simpan rencana</Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <RootError message={rootError} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Petak" required error={formState.errors.plotId?.message}>
            <Select {...register("plotId")}>
              <option value={0}>Pilih petak…</option>
              {(plotsQ.data?.plots ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tanaman berikutnya" required error={formState.errors.cropId?.message}>
            <Select {...register("cropId")}>
              <option value={0}>Pilih tanaman…</option>
              {(cropsQ.data?.crops ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.familyName ? ` — ${c.familyName}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal target tanam" error={formState.errors.targetDate?.message}>
            <Input type="date" {...register("targetDate")} />
          </Field>
          <Field label="Musim (opsional)" error={formState.errors.seasonId?.message}>
            <Select {...register("seasonId")}>
              <option value="">Tanpa musim</option>
              {(seasonsQ.data?.seasons ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Catatan" error={formState.errors.notes?.message}>
          <Textarea placeholder="cth. Tunggu bedeng kering dulu…" {...register("notes")} />
        </Field>
        {rationale ? (
          <p className="rounded-lg bg-moss-50 px-3 py-2 text-xs text-moss-800">
            Alasan saran mesin akan ikut tersimpan bersama rencana ini agar dapat ditinjau kembali.
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
