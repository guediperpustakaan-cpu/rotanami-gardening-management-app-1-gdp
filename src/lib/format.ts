// Utilitas tanggal & format berbahasa Indonesia (aman di server maupun klien).

const DATE_SHORT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DATE_LONG = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const MONTH_YEAR = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
});

/** Menerima 'YYYY-MM-DD' dan menampilkan format pendek lokal (tanpa geser zona). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE_SHORT.format(d);
}

export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE_LONG.format(d);
}

export function formatMonthYear(monthIso: string): string {
  // monthIso: 'YYYY-MM'
  const d = new Date(`${monthIso}-01T00:00:00`);
  if (Number.isNaN(d.getTime())) return monthIso;
  return MONTH_YEAR.format(d);
}

/** Tanggal hari ini sebagai 'YYYY-MM-DD' (waktu lokal). */
export function todayISO(): string {
  const d = new Date();
  return toISODate(d);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function monthNowISO(): string {
  return todayISO().slice(0, 7);
}

export function shiftMonth(monthIso: string, delta: number): string {
  const [y, m] = monthIso.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Selisih hari antara tanggal target dan hari ini (positif = akan datang). */
export function daysFromToday(iso: string): number {
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
  const now = new Date(`${todayISO()}T00:00:00`).getTime();
  return Math.round((target - now) / 86_400_000);
}

/** Label relatif sederhana berbahasa Indonesia. */
export function relativeDayLabel(iso: string): string {
  const diff = daysFromToday(iso);
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Besok";
  if (diff === -1) return "Kemarin";
  if (diff > 1) return `${diff} hari lagi`;
  return `${Math.abs(diff)} hari lalu`;
}

/** Escape nilai untuk CSV. */
export function csvEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
