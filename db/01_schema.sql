-- ============================================================
-- CoworkSpace · analytics-service · esquema de base de datos
-- Generado desde prisma/schema.prisma con 'prisma migrate diff'.
-- Cada microservicio usa su propio schema de PostgreSQL (analytics).
-- Uso: psql "$DATABASE_URL" -f db/01_schema.sql -f db/02_seed.sql
-- ============================================================
CREATE SCHEMA IF NOT EXISTS "analytics";
SET search_path TO "analytics";

-- CreateTable
CREATE TABLE "occupancy_by_location" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "location_name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "weekday" INTEGER NOT NULL,
    "hour_slot" INTEGER NOT NULL,
    "booked_hours" DOUBLE PRECISION NOT NULL,
    "capacity_hours" DOUBLE PRECISION NOT NULL,
    "occupancy_rate" DOUBLE PRECISION NOT NULL,
    "bookings" INTEGER NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "occupancy_by_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_by_plan" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "plan_code" TEXT NOT NULL,
    "plan_name" TEXT NOT NULL,
    "membership_revenue" INTEGER NOT NULL,
    "extra_revenue" INTEGER NOT NULL,
    "total_revenue" INTEGER NOT NULL,
    "invoices" INTEGER NOT NULL,
    "paying_members" INTEGER NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_by_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_retention" (
    "id" TEXT NOT NULL,
    "cohort" TEXT NOT NULL,
    "members" INTEGER NOT NULL,
    "retained" INTEGER NOT NULL,
    "churned" INTEGER NOT NULL,
    "retention_rate" DOUBLE PRECISION NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_retention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etl_runs" (
    "id" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "rows" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "etl_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "occupancy_by_location_day_idx" ON "occupancy_by_location"("day");

-- CreateIndex
CREATE UNIQUE INDEX "occupancy_by_location_location_id_day_hour_slot_key" ON "occupancy_by_location"("location_id", "day", "hour_slot");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_by_plan_period_plan_code_key" ON "revenue_by_plan"("period", "plan_code");

-- CreateIndex
CREATE UNIQUE INDEX "member_retention_cohort_key" ON "member_retention"("cohort");

-- CreateIndex
CREATE INDEX "etl_runs_started_at_idx" ON "etl_runs"("started_at");
