-- ============================================================
-- CoworkSpace · billing-service · esquema de base de datos
-- Generado desde prisma/schema.prisma con 'prisma migrate diff'.
-- Cada microservicio usa su propio schema de PostgreSQL (billing).
-- Uso: psql "$DATABASE_URL" -f db/01_schema.sql -f db/02_seed.sql
-- ============================================================
CREATE SCHEMA IF NOT EXISTS "billing";
SET search_path TO "billing";

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'VOIDED');

-- CreateTable
CREATE TABLE "member_plans" (
    "member_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "plan_code" TEXT NOT NULL,
    "plan_name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "resource_access" TEXT[],
    "status" "PlanStatus" NOT NULL,
    "renews_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_plans_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "electronic_number" TEXT,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extra_charges" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ChargeStatus" NOT NULL,
    "failure_reason" TEXT,
    "payment_reference" TEXT,
    "transaction_id" TEXT,
    "payment_method" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extra_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_payments" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "plan_code" TEXT NOT NULL,
    "plan_name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "transaction_id" TEXT,
    "payment_method" TEXT,
    "failure_reason" TEXT,
    "activated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_electronic_number_key" ON "invoices"("electronic_number");

-- CreateIndex
CREATE INDEX "invoices_member_id_idx" ON "invoices"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_subscription_id_period_key" ON "invoices"("subscription_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "extra_charges_booking_id_key" ON "extra_charges"("booking_id");

-- CreateIndex
CREATE INDEX "extra_charges_member_id_idx" ON "extra_charges"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_payments_reference_key" ON "plan_payments"("reference");

-- CreateIndex
CREATE INDEX "plan_payments_member_id_created_at_idx" ON "plan_payments"("member_id", "created_at");
