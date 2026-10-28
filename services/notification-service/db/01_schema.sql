-- ============================================================
-- CoworkSpace · notification-service · esquema de base de datos
-- Generado desde prisma/schema.prisma con 'prisma migrate diff'.
-- Cada microservicio usa su propio schema de PostgreSQL (notification).
-- Uso: psql "$DATABASE_URL" -f db/01_schema.sql -f db/02_seed.sql
-- ============================================================
CREATE SCHEMA IF NOT EXISTS "notification";
SET search_path TO "notification";

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'LOGGED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReminderKind" AS ENUM ('BOOKING_REMINDER', 'MEMBERSHIP_EXPIRING');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'CANCELLED');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "kind" "ReminderKind" NOT NULL,
    "ref_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "send_at" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_event_id_key" ON "notifications"("event_id");

-- CreateIndex
CREATE INDEX "notifications_member_id_created_at_idx" ON "notifications"("member_id", "created_at");

-- CreateIndex
CREATE INDEX "reminders_status_send_at_idx" ON "reminders"("status", "send_at");

-- CreateIndex
CREATE UNIQUE INDEX "reminders_kind_ref_id_key" ON "reminders"("kind", "ref_id");
