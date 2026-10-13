import {
  pgEnum,
  pgTable,
  serial,
  integer,
  text,
  date,
  numeric,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------- Enums ----------

export const plantingStatusEnum = pgEnum("planting_status", [
  "direncanakan",
  "ditanam",
  "dipanen",
  "dibatalkan",
]);

export const nutrientCategoryEnum = pgEnum("nutrient_category", [
  "heavy", // penguras berat
  "light", // penguras ringan
  "giver", // penyumbang hara (legum)
]);

export const obsCategoryEnum = pgEnum("obs_category", [
  "hama",
  "penyakit",
  "pertumbuhan",
  "cuaca",
  "lainnya",
]);

export const planStatusEnum = pgEnum("plan_status", [
  "aktif",
  "selesai",
  "dibatalkan",
]);

export const memberRoleEnum = pgEnum("member_role", [
  "pemilik",
  "pengelola",
  "anggota",
]);

// ---------- Pengguna & autentikasi ----------

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

// ---------- Kebun & anggota ----------

export const farms = pgTable(
  "farms",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    location: text("location"),
    timezone: text("timezone").notNull().default("Asia/Jakarta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("farms_owner_idx").on(t.ownerId)],
);

export const farmMembers = pgTable(
  "farm_members",
  {
    id: serial("id").primaryKey(),
    farmId: integer("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("anggota"),
  },
  (t) => [
    uniqueIndex("farm_members_farm_user_uq").on(t.farmId, t.userId),
    index("farm_members_user_idx").on(t.userId),
  ],
);

// ---------- Petak ----------

export const plots = pgTable(
  "plots",
  {
    id: serial("id").primaryKey(),
    farmId: integer("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    size: numeric("size", { precision: 12, scale: 2 }),
    areaUnit: text("area_unit").notNull().default("m2"),
    soilType: text("soil_type"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("plots_farm_idx").on(t.farmId)],
);

// ---------- Katalog tanaman ----------

export const plantFamilies = pgTable("plant_families", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  rotationGroup: text("rotation_group"),
  notes: text("notes"),
});

export const crops = pgTable(
  "crops",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    scientificName: text("scientific_name"),
    familyId: integer("family_id").references(() => plantFamilies.id, {
      onDelete: "set null",
    }),
    nutrientCategory: nutrientCategoryEnum("nutrient_category"),
    isCoverCrop: boolean("is_cover_crop").notNull().default(false),
    isSeed: boolean("is_seed").notNull().default(false), // data contoh bawaan
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("crops_family_idx").on(t.familyId)],
);

// ---------- Musim ----------

export const seasons = pgTable(
  "seasons",
  {
    id: serial("id").primaryKey(),
    farmId: integer("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
  },
  (t) => [index("seasons_farm_idx").on(t.farmId)],
);

// ---------- Riwayat penanaman ----------

export const plantings = pgTable(
  "plantings",
  {
    id: serial("id").primaryKey(),
    plotId: integer("plot_id")
      .notNull()
      .references(() => plots.id, { onDelete: "cascade" }),
    cropId: integer("crop_id")
      .notNull()
      .references(() => crops.id, { onDelete: "restrict" }),
    seasonId: integer("season_id").references(() => seasons.id, {
      onDelete: "set null",
    }),
    plantDate: date("plant_date").notNull(),
    harvestDate: date("harvest_date"),
    status: plantingStatusEnum("status").notNull().default("direncanakan"),
    yieldAmount: numeric("yield_amount", { precision: 12, scale: 2 }),
    yieldUnit: text("yield_unit"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("plantings_plot_idx").on(t.plotId),
    index("plantings_crop_idx").on(t.cropId),
    index("plantings_date_idx").on(t.plantDate),
  ],
);

// ---------- Uji tanah ----------

export const soilTests = pgTable(
  "soil_tests",
  {
    id: serial("id").primaryKey(),
    plotId: integer("plot_id")
      .notNull()
      .references(() => plots.id, { onDelete: "cascade" }),
    testDate: date("test_date").notNull(),
    ph: numeric("ph", { precision: 4, scale: 2 }),
    nitrogen: numeric("nitrogen", { precision: 10, scale: 2 }),
    phosphor: numeric("phosphor", { precision: 10, scale: 2 }),
    potassium: numeric("potassium", { precision: 10, scale: 2 }),
    organicMatter: numeric("organic_matter", { precision: 6, scale: 2 }),
    method: text("method"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("soil_tests_plot_idx").on(t.plotId)],
);

// ---------- Observasi ----------

export const observations = pgTable(
  "observations",
  {
    id: serial("id").primaryKey(),
    plotId: integer("plot_id")
      .notNull()
      .references(() => plots.id, { onDelete: "cascade" }),
    plantingId: integer("planting_id").references(() => plantings.id, {
      onDelete: "set null",
    }),
    category: obsCategoryEnum("category").notNull(),
    obsDate: date("obs_date").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("observations_plot_idx").on(t.plotId),
    index("observations_planting_idx").on(t.plantingId),
  ],
);

// ---------- Rencana rotasi ----------

export const rotationPlans = pgTable(
  "rotation_plans",
  {
    id: serial("id").primaryKey(),
    plotId: integer("plot_id")
      .notNull()
      .references(() => plots.id, { onDelete: "cascade" }),
    seasonId: integer("season_id").references(() => seasons.id, {
      onDelete: "set null",
    }),
    cropId: integer("crop_id")
      .notNull()
      .references(() => crops.id, { onDelete: "restrict" }),
    targetDate: date("target_date"),
    status: planStatusEnum("status").notNull().default("aktif"),
    rationale: jsonb("rationale"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("rotation_plans_plot_idx").on(t.plotId),
    index("rotation_plans_crop_idx").on(t.cropId),
  ],
);

// ---------- Pengingat ----------

export const reminders = pgTable(
  "reminders",
  {
    id: serial("id").primaryKey(),
    farmId: integer("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    plotId: integer("plot_id").references(() => plots.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    dueDate: date("due_date").notNull(),
    done: boolean("done").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("reminders_farm_idx").on(t.farmId),
    index("reminders_date_idx").on(t.dueDate),
  ],
);
