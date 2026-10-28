-- ============================================================
-- CoworkSpace · community-service · esquema de base de datos
-- Generado desde prisma/schema.prisma con 'prisma migrate diff'.
-- Cada microservicio usa su propio schema de PostgreSQL (community).
-- Uso: psql "$DATABASE_URL" -f db/01_schema.sql -f db/02_seed.sql
-- ============================================================
CREATE SCHEMA IF NOT EXISTS "community";
SET search_path TO "community";

-- CreateTable
CREATE TABLE "member_directory" (
    "member_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "company" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "location_id" TEXT,
    "linkedin_url" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_directory_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 90,
    "capacity" INTEGER NOT NULL DEFAULT 30,
    "created_by" TEXT NOT NULL,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attendees" (
    "event_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_attendees_pkey" PRIMARY KEY ("event_id","member_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_directory_visible_location_id_idx" ON "member_directory"("visible", "location_id");

-- CreateIndex
CREATE INDEX "events_location_id_scheduled_at_idx" ON "events"("location_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "messages_recipient_id_created_at_idx" ON "messages"("recipient_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_sender_id_created_at_idx" ON "messages"("sender_id", "created_at");

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
