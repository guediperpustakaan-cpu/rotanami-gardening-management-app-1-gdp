"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Info,
  LoaderCircle,
  Sprout,
  Wheat,
  X,
} from "lucide-react";
import { PLANTING_STATUS_LABELS, type PlantingStatus } from "@/lib/labels";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ---------- Spinner & Skeleton ---------- */

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle aria-hidden className={cn("animate-spin", className ?? "h-4 w-4")} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-line/60", className)} />;
}

/* ---------- Button ---------- */

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-moss-700 text-cream hover:bg-moss-800 active:bg-moss-900",
  secondary:
    "border border-line-strong bg-cream text-ink hover:border-moss-400 hover:bg-moss-50",
  danger: "bg-danger-600 text-cream hover:bg-danger-700",
  ghost: "text-moss-700 hover:bg-moss-100/70",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-base gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-55",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner aria-hidden /> : null}
      {children}
    </button>
  );
}

/* ---------- Form controls ---------- */

const controlBase =
  "w-full rounded-lg border border-line-strong bg-cream px-3 text-[15px] text-ink placeholder:text-ink-faint transition-colors hover:border-moss-400 focus:border-moss-500 disabled:opacity-60";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlBase, "h-11", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlBase, "min-h-24 py-2.5", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlBase, "h-11 appearance-none pr-9", className)} {...rest}>
      {children}
    </select>
  );
}

export interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, required, hint, error, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {required ? <span aria-hidden className="text-danger-600"> *</span> : null}
      </span>
      {children}
      {hint && !error ? <span className="mt-1.5 block text-xs text-ink-soft">{hint}</span> : null}
      {error ? (
        <span role="alert" className="mt-1.5 block text-sm font-medium text-danger-600">
          {error}
        </span>
      ) : null}
    </label>
  );
}

/* ---------- Card ---------- */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-line bg-cream shadow-card", className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
      <div>
        <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-ink-soft">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ---------- Badge ---------- */

type BadgeTone = "neutral" | "moss" | "sun" | "danger" | "clay";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "border-line-strong bg-paper text-ink-soft",
  moss: "border-moss-200 bg-moss-100 text-moss-800",
  sun: "border-sun-600/25 bg-sun-100 text-sun-700",
  danger: "border-danger-600/25 bg-danger-100 text-danger-700",
  clay: "border-clay-500/30 bg-clay-100 text-clay-700",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        badgeTones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

const plantingStatusConfig: Record<
  PlantingStatus,
  { tone: BadgeTone; Icon: typeof Clock }
> = {
  direncanakan: { tone: "sun", Icon: Clock },
  ditanam: { tone: "moss", Icon: Sprout },
  dipanen: { tone: "clay", Icon: Wheat },
  dibatalkan: { tone: "danger", Icon: Ban },
};

/** Badge status penanaman: ikon + label, tidak mengandalkan warna saja. */
export function PlantingStatusBadge({ status }: { status: PlantingStatus }) {
  const cfg = plantingStatusConfig[status];
  return (
    <Badge tone={cfg.tone} icon={<cfg.Icon aria-hidden className="h-3.5 w-3.5" />}>
      {PLANTING_STATUS_LABELS[status]}
    </Badge>
  );
}

/* ---------- Dialog ---------- */

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Tutup dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/45 backdrop-blur-[2px]"
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-cream shadow-xl sm:rounded-2xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg p-1.5 text-ink-soft hover:bg-paper hover:text-ink"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-paper/60 px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Hapus",
  requireText,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  /** Ketik teks ini untuk mengonfirmasi penghapusan penting. */
  requireText?: string;
  loading?: boolean;
}) {
  const [typed, setTyped] = useState("");
  const blocked = Boolean(requireText) && typed !== requireText;

  function handleClose() {
    setTyped("");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={blocked} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-ink-soft">
        <div>{message}</div>
        {requireText ? (
          <Field
            label={`Ketik "${requireText}" untuk melanjutkan`}
            hint="Perlindungan agar penghapusan tidak terjadi tanpa sengaja."
          >
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requireText}
              autoComplete="off"
            />
          </Field>
        ) : null}
      </div>
    </Dialog>
  );
}

/* ---------- Toast ---------- */

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (t: { title: string; description?: string; tone?: ToastTone }) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => undefined });

export function useToast() {
  return useContext(ToastContext);
}

const toastIcons: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0 text-moss-600" />,
  error: <AlertTriangle aria-hidden className="h-5 w-5 shrink-0 text-danger-600" />,
  info: <Info aria-hidden className="h-5 w-5 shrink-0 text-sun-600" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const toast = useCallback<ToastContextValue["toast"]>(({ title, description, tone = "success" }) => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, title, description, tone }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-20 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:items-end"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border border-line bg-cream px-4 py-3 shadow-card"
          >
            {toastIcons[t.tone]}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{t.title}</p>
              {t.description ? <p className="mt-0.5 text-xs text-ink-soft">{t.description}</p> : null}
            </div>
            <button
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
              aria-label="Tutup notifikasi"
              className="rounded p-1 text-ink-faint hover:bg-paper hover:text-ink"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ---------- Empty state ---------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed border-line-strong bg-cream/60 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-moss-100 text-moss-700">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-ink-soft">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* ---------- Tabs ---------- */

export interface TabDef {
  id: string;
  label: string;
  icon?: ReactNode;
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="tablist" aria-label="Bagian halaman" className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-paper p-1">
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold transition-colors",
              selected ? "bg-cream text-moss-800 shadow-card" : "text-ink-soft hover:text-ink",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Page header & stat ---------- */

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle ? <div className="mt-1 text-sm text-ink-soft">{subtitle}</div> : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <Card className="flex items-center gap-3 px-4 py-3.5">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
          badgeTones[tone],
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold tracking-wide text-ink-soft uppercase">{label}</p>
        <p className="font-display text-xl font-bold text-ink">{value}</p>
      </div>
    </Card>
  );
}

/* ---------- Error box ---------- */

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger-600/30 bg-danger-100 px-4 py-3"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-danger-700">
        <AlertTriangle aria-hidden className="h-5 w-5 shrink-0" />
        {message}
      </div>
      {onRetry ? (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Coba lagi
        </Button>
      ) : null}
    </div>
  );
}
