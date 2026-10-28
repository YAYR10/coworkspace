-- ============================================================
-- CoworkSpace · access-control-service · esquema de base de datos
-- Generado desde prisma/schema.prisma con 'prisma migrate diff'.
-- Cada microservicio usa su propio schema de PostgreSQL (access).
-- Uso: psql "$DATABASE_URL" -f db/01_schema.sql -f db/02_seed.sql
-- ============================================================
CREATE SCHEMA IF NOT EXISTS "access";
SET search_path TO "access";

-- CreateEnum
CREATE TYPE "CredentialKind" AS ENUM ('QR', 'NFC');

-- CreateTable
CREATE TABLE "access_credentials" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "member_email" TEXT,
    "kind" "CredentialKind" NOT NULL DEFAULT 'QR',
    "credential_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,

    CONSTRAINT "access_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_log" (
    "id" TEXT NOT NULL,
    "member_id" TEXT,
    "location_id" TEXT NOT NULL,
    "credential_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "latency_ms" INTEGER NOT NULL,

    CONSTRAINT "access_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_access" (
    "member_id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL,
    "plan_code" TEXT,
    "renews_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_access_pkey" PRIMARY KEY ("member_id")
);

-- CreateIndex
CREATE INDEX "access_credentials_member_id_is_active_idx" ON "access_credentials"("member_id", "is_active");

-- CreateIndex
CREATE INDEX "access_log_location_id_timestamp_idx" ON "access_log"("location_id", "timestamp");

-- CreateIndex
CREATE INDEX "access_log_member_id_timestamp_idx" ON "access_log"("member_id", "timestamp");

-- AddForeignKey
ALTER TABLE "access_log" ADD CONSTRAINT "access_log_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "access_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
