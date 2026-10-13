"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch, qk } from "./client";
import type { Farm, UserMe } from "./types";

export interface MeResponse {
  user: UserMe;
  activeFarm: Farm | null;
  farms: Farm[];
}

/** Ambil pengguna masuk + kebun aktif. */
export function useMe() {
  return useQuery({
    queryKey: qk.me,
    queryFn: () => apiFetch<MeResponse>("/api/me"),
  });
}
