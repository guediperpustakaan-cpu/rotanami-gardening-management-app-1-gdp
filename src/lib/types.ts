// Tipe data bersama untuk klien (bentuk payload API).

import type {
  NutrientCategory,
  ObsCategory,
  PlanStatus,
  PlantingStatus,
} from "./labels";

export type { NutrientCategory, ObsCategory, PlanStatus, PlantingStatus };

export interface UserMe {
  id: number;
  name: string;
  email: string;
}

export interface Farm {
  id: number;
  ownerId: number;
  name: string;
  location: string | null;
  timezone: string;
  createdAt: string;
}

export interface Plot {
  id: number;
  farmId: number;
  name: string;
  size: string | null;
  areaUnit: string;
  soilType: string | null;
  notes: string | null;
  createdAt: string;
}

export interface PlotSummary extends Plot {
  lastPlanting: {
    cropName: string;
    plantDate: string;
    status: PlantingStatus;
  } | null;
  plantingCount: number;
}

export interface Family {
  id: number;
  name: string;
  rotationGroup: string | null;
}

export interface Crop {
  id: number;
  name: string;
  scientificName: string | null;
  familyId: number | null;
  familyName: string | null;
  rotationGroup: string | null;
  nutrientCategory: NutrientCategory | null;
  isCoverCrop: boolean;
  isSeed: boolean;
  notes: string | null;
}

export interface Planting {
  id: number;
  plotId: number;
  cropId: number;
  cropName: string;
  seasonId: number | null;
  plantDate: string;
  harvestDate: string | null;
  status: PlantingStatus;
  yieldAmount: string | null;
  yieldUnit: string | null;
  notes: string | null;
  createdAt: string;
}

export interface SoilTest {
  id: number;
  plotId: number;
  testDate: string;
  ph: string | null;
  nitrogen: string | null;
  phosphor: string | null;
  potassium: string | null;
  organicMatter: string | null;
  method: string | null;
  notes: string | null;
}

export interface Observation {
  id: number;
  plotId: number;
  plantingId: number | null;
  category: ObsCategory;
  obsDate: string;
  description: string;
  plantingCropName: string | null;
}

export interface RotationRationale {
  source: string;
  context: string[];
  reasons: string[];
  disclaimer?: string;
}

export interface RotationPlan {
  id: number;
  plotId: number;
  plotName: string | null;
  cropId: number;
  cropName: string | null;
  seasonId: number | null;
  targetDate: string | null;
  status: PlanStatus;
  rationale: RotationRationale | null;
  notes: string | null;
  createdAt: string;
}

export interface Reminder {
  id: number;
  farmId: number;
  plotId: number | null;
  plotName: string | null;
  title: string;
  dueDate: string;
  done: boolean;
  notes: string | null;
}

export interface Season {
  id: number;
  farmId: number;
  name: string;
  startDate: string;
  endDate: string;
}

export interface CalendarEvent {
  key: string;
  kind: "reminder" | "planting" | "plan";
  id: number;
  date: string;
  title: string;
  subtitle: string | null;
  done: boolean | null; // null = bukan tugas yang bisa dicentang
}

export interface DashboardData {
  farm: Farm;
  farms: Farm[];
  plots: PlotSummary[];
  counts: {
    plots: number;
    activePlans: number;
    plantedNow: number;
    planned: number;
    actionsNeeded: number;
  };
  upcoming: CalendarEvent[];
}

export interface PlotDetail {
  plot: Plot;
  farm: Farm;
  plantings: Planting[];
  soilTests: SoilTest[];
  observations: Observation[];
  crops: Crop[];
  seasons: Season[];
}

export interface SuggestionCrop {
  id: number;
  name: string;
  familyName: string | null;
  rotationGroup: string | null;
  nutrientCategory: NutrientCategory | null;
  isCoverCrop: boolean;
}

export interface SuggestionItem {
  crop: SuggestionCrop;
  score: number;
  reasons: string[];
}

export interface SuggestionResponse {
  status: "ok" | "insufficient";
  message: string | null;
  context: string[];
  primary: SuggestionItem | null;
  alternatives: SuggestionItem[];
  disclaimer: string;
}
