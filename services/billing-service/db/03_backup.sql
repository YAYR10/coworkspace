--
-- PostgreSQL database dump
--

\restrict nhtAyn03WafT4t9iivVQ6L5Nh2QsbZw2k9aaySZqDdOv9uOtYNMe3wKgVqEJPu2


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: billing; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA billing;


--
-- Name: ChargeStatus; Type: TYPE; Schema: billing; Owner: -
--

CREATE TYPE billing."ChargeStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'VOIDED'
);


--
-- Name: InvoiceStatus; Type: TYPE; Schema: billing; Owner: -
--

CREATE TYPE billing."InvoiceStatus" AS ENUM (
    'PAID',
    'FAILED'
);


--
-- Name: PlanStatus; Type: TYPE; Schema: billing; Owner: -
--

CREATE TYPE billing."PlanStatus" AS ENUM (
    'ACTIVE',
    'EXPIRED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: extra_charges; Type: TABLE; Schema: billing; Owner: -
--

CREATE TABLE billing.extra_charges (
    id text NOT NULL,
    member_id text NOT NULL,
    booking_id text NOT NULL,
    amount integer NOT NULL,
    reason text NOT NULL,
    status billing."ChargeStatus" NOT NULL,
    failure_reason text,
    payment_reference text,
    transaction_id text,
    payment_method text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: invoices; Type: TABLE; Schema: billing; Owner: -
--

CREATE TABLE billing.invoices (
    id text NOT NULL,
    member_id text NOT NULL,
    subscription_id text NOT NULL,
    period text NOT NULL,
    amount integer NOT NULL,
    status billing."InvoiceStatus" NOT NULL,
    electronic_number text,
    failure_reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: member_plans; Type: TABLE; Schema: billing; Owner: -
--

CREATE TABLE billing.member_plans (
    member_id text NOT NULL,
    subscription_id text NOT NULL,
    plan_code text NOT NULL,
    plan_name text NOT NULL,
    price integer NOT NULL,
    resource_access text[],
    status billing."PlanStatus" NOT NULL,
    renews_at timestamp(3) without time zone NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Data for Name: extra_charges; Type: TABLE DATA; Schema: billing; Owner: -
--

INSERT INTO billing.extra_charges VALUES ('92000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000002', 100000, 'Uso de ROOM fuera del plan FLEX_DESK (2 h)', 'APPROVED', NULL, '92000000-0000-4000-8000-000000000001.demo', '12345-1700000000-00001', 'CARD', '2026-10-27 22:32:17.812', '2026-10-27 22:32:17.812');
INSERT INTO billing.extra_charges VALUES ('92000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000005', 250000, 'Uso de ROOM fuera del plan FLEX_DESK (5 h)', 'REJECTED', 'Supera el cupo aprobado', NULL, NULL, NULL, '2026-10-26 22:32:17.812', '2026-10-26 22:32:17.812');


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: billing; Owner: -
--

INSERT INTO billing.invoices VALUES ('91000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', '2026-08-01', 350000, 'PAID', 'FE-DEMO-000001', NULL, '2026-08-01 22:32:17.811');
INSERT INTO billing.invoices VALUES ('91000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', '2026-08-31', 350000, 'PAID', 'FE-DEMO-000002', NULL, '2026-08-31 22:32:17.811');
INSERT INTO billing.invoices VALUES ('91000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', '2026-09-30', 350000, 'PAID', 'FE-DEMO-000003', NULL, '2026-09-30 22:32:17.811');
INSERT INTO billing.invoices VALUES ('91000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', '2026-08-31', 1500000, 'PAID', 'FE-DEMO-000004', NULL, '2026-08-31 22:32:17.811');
INSERT INTO billing.invoices VALUES ('91000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', '2026-09-30', 1500000, 'PAID', 'FE-DEMO-000005', NULL, '2026-09-30 22:32:17.811');
INSERT INTO billing.invoices VALUES ('91000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000005', '2026-08-15', 250000, 'PAID', 'FE-DEMO-000006', NULL, '2026-08-15 22:32:17.811');
INSERT INTO billing.invoices VALUES ('91000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000005', '2026-09-14', 250000, 'FAILED', NULL, 'Tarjeta rechazada', '2026-09-14 22:32:17.811');


--
-- Data for Name: member_plans; Type: TABLE DATA; Schema: billing; Owner: -
--

INSERT INTO billing.member_plans VALUES ('a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'FLEX_DESK', 'Puesto flexible', 350000, '{DESK}', 'ACTIVE', '2026-10-30 22:32:17.809', '2026-10-28 22:32:17.809');
INSERT INTO billing.member_plans VALUES ('a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', 'PRIVATE_OFFICE', 'Oficina privada', 1500000, '{DESK,ROOM}', 'ACTIVE', '2026-10-30 22:32:17.809', '2026-10-28 22:32:17.809');
INSERT INTO billing.member_plans VALUES ('a0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000005', 'MEETING_ROOMS_ONLY', 'Solo salas de reunión', 250000, '{ROOM}', 'EXPIRED', '2026-10-14 22:32:17.809', '2026-10-28 22:32:17.809');


--
-- Name: extra_charges extra_charges_pkey; Type: CONSTRAINT; Schema: billing; Owner: -
--

ALTER TABLE ONLY billing.extra_charges
    ADD CONSTRAINT extra_charges_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: billing; Owner: -
--

ALTER TABLE ONLY billing.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: member_plans member_plans_pkey; Type: CONSTRAINT; Schema: billing; Owner: -
--

ALTER TABLE ONLY billing.member_plans
    ADD CONSTRAINT member_plans_pkey PRIMARY KEY (member_id);


--
-- Name: extra_charges_booking_id_key; Type: INDEX; Schema: billing; Owner: -
--

CREATE UNIQUE INDEX extra_charges_booking_id_key ON billing.extra_charges USING btree (booking_id);


--
-- Name: extra_charges_member_id_idx; Type: INDEX; Schema: billing; Owner: -
--

CREATE INDEX extra_charges_member_id_idx ON billing.extra_charges USING btree (member_id);


--
-- Name: invoices_electronic_number_key; Type: INDEX; Schema: billing; Owner: -
--

CREATE UNIQUE INDEX invoices_electronic_number_key ON billing.invoices USING btree (electronic_number);


--
-- Name: invoices_member_id_idx; Type: INDEX; Schema: billing; Owner: -
--

CREATE INDEX invoices_member_id_idx ON billing.invoices USING btree (member_id);


--
-- Name: invoices_subscription_id_period_key; Type: INDEX; Schema: billing; Owner: -
--

CREATE UNIQUE INDEX invoices_subscription_id_period_key ON billing.invoices USING btree (subscription_id, period);


--
-- PostgreSQL database dump complete
--

\unrestrict nhtAyn03WafT4t9iivVQ6L5Nh2QsbZw2k9aaySZqDdOv9uOtYNMe3wKgVqEJPu2

