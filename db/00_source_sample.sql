-- Muestra de las bases de origen (Membership, Space, Booking y Billing) para correr Analytics solo.
-- Analytics las lee en SOLO LECTURA; en producción, SOURCE_DATABASE_URL apunta a la réplica de lectura.

-- ===== membership-service/db/01_schema.sql =====
-- ============================================================
-- CoworkSpace · membership-service · esquema de base de datos
-- Generado desde prisma/schema.prisma con 'prisma migrate diff'.
-- Cada microservicio usa su propio schema de PostgreSQL (membership).
-- Uso: psql "$DATABASE_URL" -f db/01_schema.sql -f db/02_seed.sql
-- ============================================================
CREATE SCHEMA IF NOT EXISTS "membership";
SET search_path TO "membership";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MEMBER', 'COORDINATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "phone" TEXT,
    "country" TEXT,
    "city" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "resource_access" TEXT[],
    "description" TEXT,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renews_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "membership_plans_code_key" ON "membership_plans"("code");

-- CreateIndex
CREATE INDEX "subscriptions_member_id_status_idx" ON "subscriptions"("member_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_status_renews_at_idx" ON "subscriptions"("status", "renews_at");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===== membership-service/db/02_seed.sql =====
-- Datos de ejemplo del Membership Service (idempotente: se puede ejecutar varias veces).
-- Contraseña de todos los usuarios de ejemplo: Demo12345!
SET search_path TO membership;

INSERT INTO membership_plans (id, code, name, price, resource_access, description) VALUES
  ('90000000-0000-4000-8000-000000000001', 'FLEX_DESK', 'Puesto flexible', 350000, '{DESK}', 'Cualquier puesto libre de la red'),
  ('90000000-0000-4000-8000-000000000002', 'DEDICATED_DESK', 'Escritorio dedicado', 600000, '{DESK}', 'Escritorio fijo en una sede'),
  ('90000000-0000-4000-8000-000000000003', 'PRIVATE_OFFICE', 'Oficina privada', 1500000, '{DESK,ROOM}', 'Oficina privada con salas incluidas'),
  ('90000000-0000-4000-8000-000000000004', 'MEETING_ROOMS_ONLY', 'Solo salas de reunión', 250000, '{ROOM}', 'Acceso únicamente a salas')
ON CONFLICT (code) DO NOTHING;

INSERT INTO members (id, name, email, password_hash, role, phone, country, city, created_at) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Admin Demo', 'admin.demo@coworkspace.co', '$2a$10$szHiCP/sWYZ3k4YXcGbCIe.pVBZ7ADx4vcNi2qklbGLmZF49bPuci', 'ADMIN', NULL, 'Colombia', 'Montería', now() - interval '120 days'),
  ('a0000000-0000-4000-8000-000000000002', 'Luis Peña', 'coordinador@coworkspace.co', '$2a$10$szHiCP/sWYZ3k4YXcGbCIe.pVBZ7ADx4vcNi2qklbGLmZF49bPuci', 'COORDINATOR', '+57 301 000 0002', 'Colombia', 'Bogotá', now() - interval '110 days'),
  ('a0000000-0000-4000-8000-000000000003', 'Ana Gómez', 'ana@demo.co', '$2a$10$szHiCP/sWYZ3k4YXcGbCIe.pVBZ7ADx4vcNi2qklbGLmZF49bPuci', 'MEMBER', '+57 300 123 4567', 'Colombia', 'Montería', now() - interval '90 days'),
  ('a0000000-0000-4000-8000-000000000004', 'Carlos Ruiz', 'carlos@demo.co', '$2a$10$szHiCP/sWYZ3k4YXcGbCIe.pVBZ7ADx4vcNi2qklbGLmZF49bPuci', 'MEMBER', NULL, 'Colombia', 'Bogotá', now() - interval '60 days'),
  ('a0000000-0000-4000-8000-000000000005', 'Mariana López', 'mariana@demo.co', '$2a$10$szHiCP/sWYZ3k4YXcGbCIe.pVBZ7ADx4vcNi2qklbGLmZF49bPuci', 'MEMBER', NULL, 'Colombia', 'Bogotá', now() - interval '75 days')
ON CONFLICT (email) DO NOTHING;

-- Ana y Carlos con plan vigente; Mariana con plan vencido (sirve para probar la revocación de acceso)
INSERT INTO subscriptions (id, member_id, plan_id, status, auto_renew, started_at, renews_at) VALUES
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', (SELECT id FROM membership_plans WHERE code = 'FLEX_DESK'), 'ACTIVE', true, now() - interval '88 days', now() + interval '2 days'),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', (SELECT id FROM membership_plans WHERE code = 'PRIVATE_OFFICE'), 'ACTIVE', true, now() - interval '58 days', now() + interval '2 days'),
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000005', (SELECT id FROM membership_plans WHERE code = 'MEETING_ROOMS_ONLY'), 'EXPIRED', false, now() - interval '74 days', now() - interval '14 days')
ON CONFLICT (id) DO NOTHING;

-- ===== space-service/db/01_schema.sql =====
-- ============================================================
-- CoworkSpace · space-service · esquema de base de datos
-- Generado desde prisma/schema.prisma con 'prisma migrate diff'.
-- Cada microservicio usa su propio schema de PostgreSQL (space).
-- Uso: psql "$DATABASE_URL" -f db/01_schema.sql -f db/02_seed.sql
-- ============================================================
CREATE SCHEMA IF NOT EXISTS "space";
SET search_path TO "space";

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Colombia',
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "description" TEXT,
    "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "photo_url" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "equipment" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desks" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_dedicated" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "desks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_photos" (
    "location_id" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_photos_pkey" PRIMARY KEY ("location_id")
);

-- CreateIndex
CREATE INDEX "locations_country_city_idx" ON "locations"("country", "city");

-- CreateIndex
CREATE INDEX "locations_city_idx" ON "locations"("city");

-- CreateIndex
CREATE INDEX "rooms_location_id_idx" ON "rooms"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "desks_location_id_code_key" ON "desks"("location_id", "code");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desks" ADD CONSTRAINT "desks_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_photos" ADD CONSTRAINT "location_photos_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===== space-service/db/02_seed.sql =====
-- Datos de ejemplo del Space Service: 2 sedes, 2 salas y 2 puestos.
SET search_path TO space;

INSERT INTO locations (id, name, country, city, address, description, services, is_published, latitude, longitude, created_at) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Colombia', 'Montería', 'Cra 3 # 27-10', 'A dos cuadras de la Ronda del Sinú, con terraza.',
   '{"WiFi de alta velocidad","Café y agua",Recepción,Parqueadero,Lockers}', true, 8.7575, -75.889, now() - interval '120 days'),
  ('c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Colombia', 'Bogotá', 'Cl 93 # 11-26', 'Frente al Parque de la 93.',
   '{"WiFi de alta velocidad","Acceso 24/7","Cabinas telefónicas"}', true, 4.6767, -74.0483, now() - interval '100 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO rooms (id, location_id, name, capacity, equipment, is_active) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Sala Sinú', 8, '{"projector": true, "whiteboard": true}', true),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'Sala Monserrate', 12, '{"projector": true, "videoconference": true}', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO desks (id, location_id, code, is_dedicated, is_active) VALUES
  ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'A-01', false, true),
  ('e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'B-01', true, true)
ON CONFLICT (id) DO NOTHING;

-- ===== booking-service/db/01_schema.sql =====
-- ============================================================
-- CoworkSpace · booking-service · esquema de base de datos
-- Generado desde prisma/schema.prisma con 'prisma migrate diff'.
-- Cada microservicio usa su propio schema de PostgreSQL (booking).
-- Uso: psql "$DATABASE_URL" -f db/01_schema.sql -f db/02_seed.sql
-- ============================================================
CREATE SCHEMA IF NOT EXISTS "booking";
SET search_path TO "booking";

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('ROOM', 'DESK');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'PROMOTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "resource_type" "ResourceType" NOT NULL,
    "location_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_locks" (
    "resource_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "resource_locks_pkey" PRIMARY KEY ("resource_id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "resource_type" "ResourceType" NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "booking_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookings_resource_id_start_time_idx" ON "bookings"("resource_id", "start_time");

-- CreateIndex
CREATE INDEX "bookings_member_id_idx" ON "bookings"("member_id");

-- CreateIndex
CREATE INDEX "bookings_status_created_at_idx" ON "bookings"("status", "created_at");

-- CreateIndex
CREATE INDEX "waitlist_entries_resource_id_status_start_time_idx" ON "waitlist_entries"("resource_id", "status", "start_time");

-- ===== booking-service/db/02_seed.sql =====
-- Datos de ejemplo del Booking Service. Las fechas son relativas a hoy (UTC; Colombia = UTC-5).
SET search_path TO booking;

INSERT INTO bookings (id, member_id, resource_id, resource_type, location_id, start_time, end_time, status, cancel_reason, created_at, updated_at) VALUES
  -- Ana: puesto ayer (incluido en su plan) y sala mañana (cobro adicional aprobado)
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000001', 'DESK', 'c0000000-0000-4000-8000-000000000001',
   date_trunc('day', now() AT TIME ZONE 'UTC') - interval '1 day' + interval '13 hours', date_trunc('day', now() AT TIME ZONE 'UTC') - interval '1 day' + interval '21 hours', 'CONFIRMED', NULL, now() - interval '3 days', now() - interval '3 days'),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'ROOM', 'c0000000-0000-4000-8000-000000000001',
   date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day' + interval '19 hours', date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day' + interval '21 hours', 'CONFIRMED', NULL, now() - interval '1 day', now() - interval '1 day'),
  -- Carlos: sala en Bogotá (su plan la incluye)
  ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000002', 'ROOM', 'c0000000-0000-4000-8000-000000000002',
   date_trunc('day', now() AT TIME ZONE 'UTC') - interval '2 days' + interval '14 hours', date_trunc('day', now() AT TIME ZONE 'UTC') - interval '2 days' + interval '17 hours', 'CONFIRMED', NULL, now() - interval '4 days', now() - interval '4 days'),
  ('f0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000002', 'DESK', 'c0000000-0000-4000-8000-000000000002',
   date_trunc('day', now() AT TIME ZONE 'UTC') + interval '2 days' + interval '13 hours', date_trunc('day', now() AT TIME ZONE 'UTC') + interval '2 days' + interval '22 hours', 'CONFIRMED', NULL, now() - interval '1 day', now() - interval '1 day'),
  -- Compensación de la saga: cobro rechazado -> reserva cancelada
  ('f0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002', 'ROOM', 'c0000000-0000-4000-8000-000000000002',
   date_trunc('day', now() AT TIME ZONE 'UTC') + interval '3 days' + interval '13 hours', date_trunc('day', now() AT TIME ZONE 'UTC') + interval '3 days' + interval '18 hours', 'CANCELLED', 'PAYMENT_REJECTED', now() - interval '2 days', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- Versiones del bloqueo optimista por recurso
INSERT INTO resource_locks (resource_id, version) VALUES
  ('e0000000-0000-4000-8000-000000000001', 1),
  ('d0000000-0000-4000-8000-000000000001', 1),
  ('d0000000-0000-4000-8000-000000000002', 2),
  ('e0000000-0000-4000-8000-000000000002', 1)
ON CONFLICT (resource_id) DO NOTHING;

-- Mariana en lista de espera de la sala de Bogotá
INSERT INTO waitlist_entries (id, member_id, resource_id, resource_type, start_time, end_time, status, created_at) VALUES
  ('f1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000002', 'ROOM',
   date_trunc('day', now() AT TIME ZONE 'UTC') - interval '2 days' + interval '14 hours', date_trunc('day', now() AT TIME ZONE 'UTC') - interval '2 days' + interval '16 hours', 'EXPIRED', now() - interval '5 days')
ON CONFLICT (id) DO NOTHING;

-- ===== billing-service/db/01_schema.sql =====
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

-- ===== billing-service/db/02_seed.sql =====
-- Datos de ejemplo del Billing Service: plan vigente por miembro, facturas electrónicas y cargos adicionales.
SET search_path TO billing;

INSERT INTO member_plans (member_id, subscription_id, plan_code, plan_name, price, resource_access, status, renews_at, updated_at) VALUES
  ('a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'FLEX_DESK', 'Puesto flexible', 350000, '{DESK}', 'ACTIVE', now() + interval '2 days', now()),
  ('a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', 'PRIVATE_OFFICE', 'Oficina privada', 1500000, '{DESK,ROOM}', 'ACTIVE', now() + interval '2 days', now()),
  ('a0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000005', 'MEETING_ROOMS_ONLY', 'Solo salas de reunión', 250000, '{ROOM}', 'EXPIRED', now() - interval '14 days', now())
ON CONFLICT (member_id) DO NOTHING;

INSERT INTO invoices (id, member_id, subscription_id, period, amount, status, electronic_number, failure_reason, created_at) VALUES
  ('91000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', to_char(now() - interval '88 days', 'YYYY-MM-DD'), 350000, 'PAID', 'FE-DEMO-000001', NULL, now() - interval '88 days'),
  ('91000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', to_char(now() - interval '58 days', 'YYYY-MM-DD'), 350000, 'PAID', 'FE-DEMO-000002', NULL, now() - interval '58 days'),
  ('91000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', to_char(now() - interval '28 days', 'YYYY-MM-DD'), 350000, 'PAID', 'FE-DEMO-000003', NULL, now() - interval '28 days'),
  ('91000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', to_char(now() - interval '58 days', 'YYYY-MM-DD'), 1500000, 'PAID', 'FE-DEMO-000004', NULL, now() - interval '58 days'),
  ('91000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', to_char(now() - interval '28 days', 'YYYY-MM-DD'), 1500000, 'PAID', 'FE-DEMO-000005', NULL, now() - interval '28 days'),
  ('91000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000005', to_char(now() - interval '74 days', 'YYYY-MM-DD'), 250000, 'PAID', 'FE-DEMO-000006', NULL, now() - interval '74 days'),
  ('91000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000005', to_char(now() - interval '44 days', 'YYYY-MM-DD'), 250000, 'FAILED', NULL, 'Tarjeta rechazada', now() - interval '44 days')
ON CONFLICT (id) DO NOTHING;

-- Cargos adicionales de reservas fuera del plan (saga Booking/Billing)
INSERT INTO extra_charges (id, member_id, booking_id, amount, reason, status, failure_reason, payment_reference, transaction_id, payment_method, created_at, updated_at) VALUES
  ('92000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000002', 100000, 'Uso de ROOM fuera del plan FLEX_DESK (2 h)', 'APPROVED', NULL,
   '92000000-0000-4000-8000-000000000001.demo', '12345-1700000000-00001', 'CARD', now() - interval '1 day', now() - interval '1 day'),
  ('92000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000005', 250000, 'Uso de ROOM fuera del plan FLEX_DESK (5 h)', 'REJECTED', 'Supera el cupo aprobado', NULL, NULL, NULL, now() - interval '2 days', now() - interval '2 days')
ON CONFLICT (booking_id) DO NOTHING;
