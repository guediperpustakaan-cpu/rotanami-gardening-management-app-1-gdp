CREATE TYPE "public"."member_role" AS ENUM('pemilik', 'pengelola', 'anggota');--> statement-breakpoint
CREATE TYPE "public"."nutrient_category" AS ENUM('heavy', 'light', 'giver');--> statement-breakpoint
CREATE TYPE "public"."obs_category" AS ENUM('hama', 'penyakit', 'pertumbuhan', 'cuaca', 'lainnya');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('aktif', 'selesai', 'dibatalkan');--> statement-breakpoint
CREATE TYPE "public"."planting_status" AS ENUM('direncanakan', 'ditanam', 'dipanen', 'dibatalkan');--> statement-breakpoint
CREATE TABLE "crops" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"scientific_name" text,
	"family_id" integer,
	"nutrient_category" "nutrient_category",
	"is_cover_crop" boolean DEFAULT false NOT NULL,
	"is_seed" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farm_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"farm_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" "member_role" DEFAULT 'anggota' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farms" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"timezone" text DEFAULT 'Asia/Jakarta' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observations" (
	"id" serial PRIMARY KEY NOT NULL,
	"plot_id" integer NOT NULL,
	"planting_id" integer,
	"category" "obs_category" NOT NULL,
	"obs_date" date NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_families" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rotation_group" text,
	"notes" text,
	CONSTRAINT "plant_families_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "plantings" (
	"id" serial PRIMARY KEY NOT NULL,
	"plot_id" integer NOT NULL,
	"crop_id" integer NOT NULL,
	"season_id" integer,
	"plant_date" date NOT NULL,
	"harvest_date" date,
	"status" "planting_status" DEFAULT 'direncanakan' NOT NULL,
	"yield_amount" numeric(12, 2),
	"yield_unit" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plots" (
	"id" serial PRIMARY KEY NOT NULL,
	"farm_id" integer NOT NULL,
	"name" text NOT NULL,
	"size" numeric(12, 2),
	"area_unit" text DEFAULT 'm2' NOT NULL,
	"soil_type" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"farm_id" integer NOT NULL,
	"plot_id" integer,
	"title" text NOT NULL,
	"due_date" date NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rotation_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"plot_id" integer NOT NULL,
	"season_id" integer,
	"crop_id" integer NOT NULL,
	"target_date" date,
	"status" "plan_status" DEFAULT 'aktif' NOT NULL,
	"rationale" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"farm_id" integer NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "soil_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"plot_id" integer NOT NULL,
	"test_date" date NOT NULL,
	"ph" numeric(4, 2),
	"nitrogen" numeric(10, 2),
	"phosphor" numeric(10, 2),
	"potassium" numeric(10, 2),
	"organic_matter" numeric(6, 2),
	"method" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "crops" ADD CONSTRAINT "crops_family_id_plant_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."plant_families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_members" ADD CONSTRAINT "farm_members_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_members" ADD CONSTRAINT "farm_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farms" ADD CONSTRAINT "farms_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_plot_id_plots_id_fk" FOREIGN KEY ("plot_id") REFERENCES "public"."plots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_planting_id_plantings_id_fk" FOREIGN KEY ("planting_id") REFERENCES "public"."plantings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_plot_id_plots_id_fk" FOREIGN KEY ("plot_id") REFERENCES "public"."plots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_crop_id_crops_id_fk" FOREIGN KEY ("crop_id") REFERENCES "public"."crops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plots" ADD CONSTRAINT "plots_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_plot_id_plots_id_fk" FOREIGN KEY ("plot_id") REFERENCES "public"."plots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rotation_plans" ADD CONSTRAINT "rotation_plans_plot_id_plots_id_fk" FOREIGN KEY ("plot_id") REFERENCES "public"."plots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rotation_plans" ADD CONSTRAINT "rotation_plans_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rotation_plans" ADD CONSTRAINT "rotation_plans_crop_id_crops_id_fk" FOREIGN KEY ("crop_id") REFERENCES "public"."crops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soil_tests" ADD CONSTRAINT "soil_tests_plot_id_plots_id_fk" FOREIGN KEY ("plot_id") REFERENCES "public"."plots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crops_family_idx" ON "crops" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "farm_members_farm_user_uq" ON "farm_members" USING btree ("farm_id","user_id");--> statement-breakpoint
CREATE INDEX "farm_members_user_idx" ON "farm_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "farms_owner_idx" ON "farms" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "observations_plot_idx" ON "observations" USING btree ("plot_id");--> statement-breakpoint
CREATE INDEX "observations_planting_idx" ON "observations" USING btree ("planting_id");--> statement-breakpoint
CREATE INDEX "plantings_plot_idx" ON "plantings" USING btree ("plot_id");--> statement-breakpoint
CREATE INDEX "plantings_crop_idx" ON "plantings" USING btree ("crop_id");--> statement-breakpoint
CREATE INDEX "plantings_date_idx" ON "plantings" USING btree ("plant_date");--> statement-breakpoint
CREATE INDEX "plots_farm_idx" ON "plots" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "reminders_farm_idx" ON "reminders" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "reminders_date_idx" ON "reminders" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "rotation_plans_plot_idx" ON "rotation_plans" USING btree ("plot_id");--> statement-breakpoint
CREATE INDEX "rotation_plans_crop_idx" ON "rotation_plans" USING btree ("crop_id");--> statement-breakpoint
CREATE INDEX "seasons_farm_idx" ON "seasons" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "soil_tests_plot_idx" ON "soil_tests" USING btree ("plot_id");