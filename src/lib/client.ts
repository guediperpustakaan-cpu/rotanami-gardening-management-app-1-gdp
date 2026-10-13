// Utilitas klien: fetch API + kunci query React Query.

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      ...init,
    });
  } catch {
    throw new ApiClientError(
      "Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.",
      0,
    );
  }
  if (!res.ok) {
    let message = "Terjadi kesalahan saat memproses permintaan.";
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // abaikan body yang tidak dapat dibaca
    }
    throw new ApiClientError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function postJSON<T>(path: string, data: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(data) });
}

export function patchJSON<T>(path: string, data: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteReq<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "DELETE" });
}

export const qk = {
  me: ["me"] as const,
  dashboard: ["dashboard"] as const,
  plots: (farmId: number) => ["plots", farmId] as const,
  plotDetail: (plotId: number) => ["plot-detail", plotId] as const,
  crops: (search: string, familyId: string, nutrient: string) =>
    ["crops", search, familyId, nutrient] as const,
  families: ["families"] as const,
  reminders: (farmId: number) => ["reminders", farmId] as const,
  plans: (farmId: number) => ["plans", farmId] as const,
  calendar: (farmId: number, month: string) => ["calendar", farmId, month] as const,
  plantings: (farmId: number) => ["plantings", farmId] as const,
};

/** Kunci query yang perlu disegarkan setelah perubahan data kebun. */
export function invalidateAll() {
  return ["me", "dashboard", "plots", "plot-detail", "crops", "families", "reminders", "plans", "calendar", "plantings"];
}
