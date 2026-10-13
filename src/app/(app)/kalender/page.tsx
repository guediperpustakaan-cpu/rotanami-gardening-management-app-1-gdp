"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, RefreshCw, Sprout, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorBox,
  Skeleton,
  useToast,
} from "@/components/ui";
import { ReminderFormModal } from "@/components/forms";
import { apiFetch, patchJSON, deleteReq } from "@/lib/client";
import { useMe } from "@/lib/hooks";
import { formatDate, formatMonthYear, monthNowISO, relativeDayLabel, shiftMonth, todayISO } from "@/lib/format";
import type { CalendarEvent, Reminder } from "@/lib/types";

function kindBadge(kind: CalendarEvent["kind"]) {
  if (kind === "reminder") return <Badge tone="sun" icon={<Bell aria-hidden className="h-3 w-3" />}>Pengingat</Badge>;
  if (kind === "plan") return <Badge tone="clay" icon={<RefreshCw aria-hidden className="h-3 w-3" />}>Rotasi</Badge>;
  return <Badge tone="moss" icon={<Sprout aria-hidden className="h-3 w-3" />}>Tanam</Badge>;
}

export default function CalendarPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useMe();
  const farmId = me?.activeFarm?.id ?? null;
  const [month, setMonth] = useState(monthNowISO());
  const [reminderModal, setReminderModal] = useState(false);
  const [editReminder, setEditReminder] = useState<Reminder | undefined>(undefined);
  const [deleteReminder, setDeleteReminder] = useState<Reminder | null>(null);

  const eventsQ = useQuery({
    queryKey: ["calendar", farmId, month],
    enabled: farmId !== null,
    queryFn: () =>
      apiFetch<{ events: CalendarEvent[] }>(`/api/calendar?farmId=${farmId}&month=${month}`),
  });

  const remindersQ = useQuery({
    queryKey: ["reminders", farmId],
    enabled: farmId !== null,
    queryFn: () => apiFetch<{ reminders: Reminder[] }>(`/api/reminders?farmId=${farmId}`),
  });

  async function toggleReminder(r: Reminder) {
    try {
      await patchJSON(`/api/reminders/${r.id}`, { done: !r.done });
      qc.invalidateQueries();
      toast({ title: r.done ? "Pengingat dibuka kembali" : "Pengingat ditandai selesai" });
    } catch (err) {
      toast({ title: "Gagal memperbarui", description: err instanceof Error ? err.message : undefined, tone: "error" });
    }
  }

  async function removeReminder(r: Reminder) {
    try {
      await deleteReq(`/api/reminders/${r.id}`);
      toast({ title: "Pengingat dihapus" });
      qc.invalidateQueries();
    } catch (err) {
      toast({ title: "Gagal menghapus", description: err instanceof Error ? err.message : undefined, tone: "error" });
    }
    setDeleteReminder(null);
  }

  const events = eventsQ.data?.events ?? [];
  const byDate = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const list = byDate.get(ev.date) ?? [];
    list.push(ev);
    byDate.set(ev.date, list);
  }
  const dates = Array.from(byDate.keys()).sort();

  const openReminders = (remindersQ.data?.reminders ?? []).filter((r) => !r.done);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Kalender kebun</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Rencana tanam, rencana rotasi, dan pengingat dalam satu tampilan.
          </p>
        </div>
        <Button onClick={() => { setEditReminder(undefined); setReminderModal(true); }}>
          <Plus aria-hidden className="h-4 w-4" /> Buat pengingat
        </Button>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <button
            aria-label="Bulan sebelumnya"
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="rounded-lg p-2 text-ink-soft hover:bg-paper hover:text-ink"
          >
            <ChevronLeft aria-hidden className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-base font-bold text-ink">{formatMonthYear(month)}</h2>
            {month !== monthNowISO() ? (
              <Button size="sm" variant="ghost" onClick={() => setMonth(monthNowISO())}>
                Hari ini
              </Button>
            ) : null}
          </div>
          <button
            aria-label="Bulan berikutnya"
            onClick={() => setMonth(shiftMonth(month, 1))}
            className="rounded-lg p-2 text-ink-soft hover:bg-paper hover:text-ink"
          >
            <ChevronRight aria-hidden className="h-5 w-5" />
          </button>
        </div>

        {farmId === null ? (
          <p className="px-4 py-6 text-sm text-ink-soft">Buat kebun terlebih dahulu dari halaman Beranda.</p>
        ) : eventsQ.isLoading ? (
          <div className="space-y-3 px-4 py-4">
            <Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" />
          </div>
        ) : eventsQ.isError ? (
          <div className="px-4 py-4">
            <ErrorBox message="Gagal memuat kalender." onRetry={() => eventsQ.refetch()} />
          </div>
        ) : dates.length === 0 ? (
          <div className="px-4 py-6">
            <EmptyState
              icon={<CalendarDays aria-hidden className="h-6 w-6" />}
              title={`Tidak ada agenda pada ${formatMonthYear(month)}`}
              description="Agenda muncul dari rencana tanam, rencana rotasi, dan pengingat yang Anda buat."
            />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {dates.map((date) => (
              <li key={date} className="px-4 py-3.5">
                <div className="flex items-baseline gap-2">
                  <p className="font-display text-sm font-bold text-ink">{formatDate(date)}</p>
                  {date === todayISO() ? (
                    <Badge tone="moss">Hari ini</Badge>
                  ) : (
                    <span className="text-xs text-ink-faint">{relativeDayLabel(date)}</span>
                  )}
                </div>
                <ul className="mt-2 space-y-1.5">
                  {(byDate.get(date) ?? []).map((ev) => (
                    <li key={ev.key} className="flex flex-wrap items-center gap-2">
                      {kindBadge(ev.kind)}
                      <span className="text-sm font-medium text-ink">{ev.title}</span>
                      {ev.subtitle ? <span className="text-xs text-ink-soft">{ev.subtitle}</span> : null}
                      {ev.done !== null ? (
                        <label className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                          <input
                            type="checkbox"
                            checked={ev.done}
                            onChange={() => {
                              const r = (remindersQ.data?.reminders ?? []).find((x) => x.id === ev.id);
                              if (r) toggleReminder(r);
                            }}
                            className="h-4 w-4 rounded border-line-strong accent-moss-700"
                          />
                          {ev.done ? "Selesai" : "Tandai selesai"}
                        </label>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <section aria-labelledby="reminders-heading">
        <h2 id="reminders-heading" className="mb-3 font-display text-lg font-semibold text-ink">
          Semua pengingat
        </h2>
        {(remindersQ.data?.reminders.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Bell aria-hidden className="h-6 w-6" />}
            title="Belum ada pengingat"
            description="Buat pengingat sederhana seperti jadwal semai, pemupukan, atau cek pH."
            action={
              <Button variant="secondary" onClick={() => { setEditReminder(undefined); setReminderModal(true); }}>
                <Plus aria-hidden className="h-4 w-4" /> Buat pengingat
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {(remindersQ.data?.reminders ?? []).map((r) => (
              <li key={r.id}>
                <Card className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Tandai "${r.title}" ${r.done ? "belum selesai" : "selesai"}`}
                    checked={r.done}
                    onChange={() => toggleReminder(r)}
                    className="h-5 w-5 rounded border-line-strong accent-moss-700"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={r.done ? "text-sm font-medium text-ink-faint line-through" : "text-sm font-semibold text-ink"}>
                      {r.title}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {formatDate(r.dueDate)} · {relativeDayLabel(r.dueDate)}
                      {r.plotName ? ` · ${r.plotName}` : ""}
                    </p>
                  </div>
                  {!r.done && r.dueDate < todayISO() ? <Badge tone="danger">Lewat</Badge> : null}
                  <div className="flex gap-0.5">
                    <button
                      aria-label={`Ubah pengingat "${r.title}"`}
                      onClick={() => { setEditReminder(r); setReminderModal(true); }}
                      className="rounded-lg p-2 text-ink-soft hover:bg-paper hover:text-ink"
                    >
                      <Pencil aria-hidden className="h-4 w-4" />
                    </button>
                    <button
                      aria-label={`Hapus pengingat "${r.title}"`}
                      onClick={() => setDeleteReminder(r)}
                      className="rounded-lg p-2 text-danger-600 hover:bg-danger-100"
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ReminderFormModal
        open={reminderModal}
        onClose={() => { setReminderModal(false); setEditReminder(undefined); }}
        reminder={editReminder}
      />
      <ConfirmDialog
        open={deleteReminder !== null}
        onClose={() => setDeleteReminder(null)}
        onConfirm={() => deleteReminder && removeReminder(deleteReminder)}
        title="Hapus pengingat?"
        message={deleteReminder ? <>Pengingat <strong>{deleteReminder.title}</strong> akan dihapus.</> : null}
        confirmLabel="Hapus pengingat"
      />
    </div>
  );
}
