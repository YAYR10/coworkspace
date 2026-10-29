--
-- PostgreSQL database dump
--

\restrict 7gozBeT6mCyQfK5GkekTe6LdINcwCtmaXNLpC2KFaSu0afYwcFi3CSdndcDhjME


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
-- Name: analytics; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA analytics;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: etl_runs; Type: TABLE; Schema: analytics; Owner: -
--

CREATE TABLE analytics.etl_runs (
    id text NOT NULL,
    trigger text NOT NULL,
    status text NOT NULL,
    started_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    finished_at timestamp(3) without time zone,
    duration_ms integer,
    rows integer DEFAULT 0 NOT NULL,
    error text
);


--
-- Name: member_retention; Type: TABLE; Schema: analytics; Owner: -
--

CREATE TABLE analytics.member_retention (
    id text NOT NULL,
    cohort text NOT NULL,
    members integer NOT NULL,
    retained integer NOT NULL,
    churned integer NOT NULL,
    retention_rate double precision NOT NULL,
    computed_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: occupancy_by_location; Type: TABLE; Schema: analytics; Owner: -
--

CREATE TABLE analytics.occupancy_by_location (
    id text NOT NULL,
    location_id text NOT NULL,
    location_name text NOT NULL,
    city text NOT NULL,
    day date NOT NULL,
    weekday integer NOT NULL,
    hour_slot integer NOT NULL,
    booked_hours double precision NOT NULL,
    capacity_hours double precision NOT NULL,
    occupancy_rate double precision NOT NULL,
    bookings integer NOT NULL,
    computed_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: revenue_by_plan; Type: TABLE; Schema: analytics; Owner: -
--

CREATE TABLE analytics.revenue_by_plan (
    id text NOT NULL,
    period text NOT NULL,
    plan_code text NOT NULL,
    plan_name text NOT NULL,
    membership_revenue integer NOT NULL,
    extra_revenue integer NOT NULL,
    total_revenue integer NOT NULL,
    invoices integer NOT NULL,
    paying_members integer NOT NULL,
    computed_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Data for Name: etl_runs; Type: TABLE DATA; Schema: analytics; Owner: -
--

INSERT INTO analytics.etl_runs VALUES ('99000000-0000-4000-8000-000000000001', 'manual', 'OK', '2026-10-29 19:14:09.677', '2026-10-29 19:14:09.857', 180, 0, NULL);
INSERT INTO analytics.etl_runs VALUES ('83855c95-dadf-4449-adf6-e2b0e9d20921', 'manual', 'OK', '2026-10-29 20:14:11.553', '2026-10-29 20:14:11.602', 47, 30, NULL);


--
-- Data for Name: member_retention; Type: TABLE DATA; Schema: analytics; Owner: -
--

INSERT INTO analytics.member_retention VALUES ('e4a5f210-bec6-4a6f-b1d8-d963b20c6b44', '2026-08', 2, 1, 1, 0.5, '2026-10-29 20:14:11.595');
INSERT INTO analytics.member_retention VALUES ('6bfc4d53-02f8-4a6b-8fa0-05735af4f0bf', '2026-09', 1, 1, 0, 1, '2026-10-29 20:14:11.595');


--
-- Data for Name: occupancy_by_location; Type: TABLE DATA; Schema: analytics; Owner: -
--

INSERT INTO analytics.occupancy_by_location VALUES ('988e3222-27a9-4ac4-9e3c-508e7118ae37', 'c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Montería', '2026-10-28', 3, 9, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.occupancy_by_location VALUES ('bd55dd61-b4e3-485c-ab0c-15dbbf9d792a', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-31', 6, 14, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.occupancy_by_location VALUES ('127c5bb9-a5cc-4594-81a4-d646320744cd', 'c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Montería', '2026-10-28', 3, 8, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.occupancy_by_location VALUES ('489471c9-ea78-497a-b55b-0c4f475ec12d', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-31', 6, 16, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.occupancy_by_location VALUES ('2bf11954-0529-4493-9efc-6ba91dd9c0ff', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-31', 6, 15, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.occupancy_by_location VALUES ('67a4e84b-30fd-462c-a301-e2b74d2cb819', 'c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Montería', '2026-10-28', 3, 14, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.occupancy_by_location VALUES ('f7d6a695-07c6-4741-8388-5082084ebf6a', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-27', 2, 11, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.occupancy_by_location VALUES ('6320b4ae-0982-4d1b-a07a-be50d6f185d9', 'c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Montería', '2026-10-28', 3, 13, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.occupancy_by_location VALUES ('3e99f363-15cd-4ec4-a1bf-d6f04e69d1ef', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-31', 6, 8, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.occupancy_by_location VALUES ('778fd516-1d95-4fcd-b90e-1142b4172b3e', 'c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Montería', '2026-10-28', 3, 15, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.occupancy_by_location VALUES ('c976d870-a74e-48c1-ab68-a6aa74a42e9a', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-31', 6, 11, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.occupancy_by_location VALUES ('77a61fac-17df-4978-8fc8-e05f872047e9', 'c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Montería', '2026-10-28', 3, 11, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.occupancy_by_location VALUES ('8fb0bb6f-80ac-47db-9e27-6090dd7babcb', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-31', 6, 10, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.occupancy_by_location VALUES ('6d860aa8-8e61-4795-a953-378310837f4c', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-31', 6, 13, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.occupancy_by_location VALUES ('c3e1169d-59d7-41c9-b34e-f569fb9af2a1', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-27', 2, 10, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.occupancy_by_location VALUES ('072d5c12-fb54-4778-8407-1606dfa27466', 'c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Montería', '2026-10-28', 3, 10, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.occupancy_by_location VALUES ('b625caef-ab96-4fa5-9b52-c163d500eaa9', 'c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Montería', '2026-10-30', 5, 15, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.occupancy_by_location VALUES ('5ebfc9dd-f93d-4aae-8c0d-929e155ba52a', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-31', 6, 12, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.occupancy_by_location VALUES ('eaa1b154-c5f4-4696-9f0b-0f8150c771d6', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-27', 2, 9, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.occupancy_by_location VALUES ('054bb93d-dda0-4a7a-b9db-5878cb8fb55a', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-31', 6, 9, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.occupancy_by_location VALUES ('3b61c9b5-9c6c-47f3-942d-66f6302c64a4', 'c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Montería', '2026-10-30', 5, 14, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.occupancy_by_location VALUES ('236531dc-012f-48a2-aabb-b8f3d358df55', 'c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Montería', '2026-10-28', 3, 12, 1, 2, 0.5, 1, '2026-10-29 20:14:11.595');


--
-- Data for Name: revenue_by_plan; Type: TABLE DATA; Schema: analytics; Owner: -
--

INSERT INTO analytics.revenue_by_plan VALUES ('eee10b9a-1f6f-4cee-b2cb-70bd95e1f8e5', '2026-08', 'FLEX_DESK', 'Puesto flexible', 350000, 0, 350000, 1, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.revenue_by_plan VALUES ('c26f28b2-7f0a-4836-b293-ff25128ff781', '2026-08', 'MEETING_ROOMS_ONLY', 'Solo salas de reunión', 250000, 0, 250000, 1, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.revenue_by_plan VALUES ('a029a876-a0e0-4835-87b2-9780e145e034', '2026-09', 'FLEX_DESK', 'Puesto flexible', 350000, 0, 350000, 1, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.revenue_by_plan VALUES ('819053cc-2069-4310-870a-3eea50c6b373', '2026-09', 'PRIVATE_OFFICE', 'Oficina privada', 1500000, 0, 1500000, 1, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.revenue_by_plan VALUES ('3ef426f8-9343-4599-9287-7d2598a7975e', '2026-10', 'FLEX_DESK', 'Puesto flexible', 350000, 100000, 450000, 1, 1, '2026-10-29 20:14:11.595');
INSERT INTO analytics.revenue_by_plan VALUES ('311803dd-584e-4ef4-8278-18e6df4077a2', '2026-10', 'PRIVATE_OFFICE', 'Oficina privada', 1500000, 0, 1500000, 1, 1, '2026-10-29 20:14:11.595');


--
-- Name: etl_runs etl_runs_pkey; Type: CONSTRAINT; Schema: analytics; Owner: -
--

ALTER TABLE ONLY analytics.etl_runs
    ADD CONSTRAINT etl_runs_pkey PRIMARY KEY (id);


--
-- Name: member_retention member_retention_pkey; Type: CONSTRAINT; Schema: analytics; Owner: -
--

ALTER TABLE ONLY analytics.member_retention
    ADD CONSTRAINT member_retention_pkey PRIMARY KEY (id);


--
-- Name: occupancy_by_location occupancy_by_location_pkey; Type: CONSTRAINT; Schema: analytics; Owner: -
--

ALTER TABLE ONLY analytics.occupancy_by_location
    ADD CONSTRAINT occupancy_by_location_pkey PRIMARY KEY (id);


--
-- Name: revenue_by_plan revenue_by_plan_pkey; Type: CONSTRAINT; Schema: analytics; Owner: -
--

ALTER TABLE ONLY analytics.revenue_by_plan
    ADD CONSTRAINT revenue_by_plan_pkey PRIMARY KEY (id);


--
-- Name: etl_runs_started_at_idx; Type: INDEX; Schema: analytics; Owner: -
--

CREATE INDEX etl_runs_started_at_idx ON analytics.etl_runs USING btree (started_at);


--
-- Name: member_retention_cohort_key; Type: INDEX; Schema: analytics; Owner: -
--

CREATE UNIQUE INDEX member_retention_cohort_key ON analytics.member_retention USING btree (cohort);


--
-- Name: occupancy_by_location_day_idx; Type: INDEX; Schema: analytics; Owner: -
--

CREATE INDEX occupancy_by_location_day_idx ON analytics.occupancy_by_location USING btree (day);


--
-- Name: occupancy_by_location_location_id_day_hour_slot_key; Type: INDEX; Schema: analytics; Owner: -
--

CREATE UNIQUE INDEX occupancy_by_location_location_id_day_hour_slot_key ON analytics.occupancy_by_location USING btree (location_id, day, hour_slot);


--
-- Name: revenue_by_plan_period_plan_code_key; Type: INDEX; Schema: analytics; Owner: -
--

CREATE UNIQUE INDEX revenue_by_plan_period_plan_code_key ON analytics.revenue_by_plan USING btree (period, plan_code);


--
-- PostgreSQL database dump complete
--

\unrestrict 7gozBeT6mCyQfK5GkekTe6LdINcwCtmaXNLpC2KFaSu0afYwcFi3CSdndcDhjME

