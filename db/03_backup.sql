--
-- PostgreSQL database dump
--

\restrict WpGPFNcvoITaAcdc329f1MBI31trGCUPsbKxtf5VvcdNOyyJEg60ppEtFWZLBZj


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

INSERT INTO analytics.etl_runs VALUES ('99000000-0000-4000-8000-000000000001', 'manual', 'OK', '2026-10-28 21:32:42.09', '2026-10-28 21:32:42.27', 180, 0, NULL);
INSERT INTO analytics.etl_runs VALUES ('ebd4ffd3-06f9-4772-90a8-7e1e23b234e5', 'manual', 'OK', '2026-10-28 22:32:43.783', '2026-10-28 22:32:43.829', 43, 29, NULL);


--
-- Data for Name: member_retention; Type: TABLE DATA; Schema: analytics; Owner: -
--

INSERT INTO analytics.member_retention VALUES ('b64d5ecb-ee85-4d23-b114-8cafc021bb31', '2026-08', 3, 2, 1, 0.6667, '2026-10-28 22:32:43.821');


--
-- Data for Name: occupancy_by_location; Type: TABLE DATA; Schema: analytics; Owner: -
--

INSERT INTO analytics.occupancy_by_location VALUES ('5e72b4e9-ec66-4bcf-9ead-e14cb606ea85', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-30', 5, 12, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.occupancy_by_location VALUES ('1bc93f01-5f3f-48f5-942e-7ad8aa452a1c', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-30', 5, 9, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.occupancy_by_location VALUES ('ef8a0818-86f3-477a-b85e-f14ce758bb87', 'c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Montería', '2026-10-27', 2, 9, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.occupancy_by_location VALUES ('9be2843d-727e-4b96-a809-aadc0ce7ffe3', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-30', 5, 8, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.occupancy_by_location VALUES ('22a060c5-10a0-4c07-bd64-5d006daf3b50', 'c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Montería', '2026-10-27', 2, 8, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.occupancy_by_location VALUES ('9c9ad443-20a7-4a66-808c-9fb310e1a05f', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-30', 5, 11, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.occupancy_by_location VALUES ('180fcc39-8d27-4a47-b668-e6150220142e', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-26', 1, 9, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.occupancy_by_location VALUES ('5683e5ac-3d0d-49ba-9251-b9bcd5289884', 'c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Montería', '2026-10-27', 2, 10, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.occupancy_by_location VALUES ('264319fa-7d4c-4234-8e69-a5b784c25ce3', 'c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Montería', '2026-10-29', 4, 14, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.occupancy_by_location VALUES ('788c6b9b-d4ca-421e-a7a4-ae91db4ba8f2', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-26', 1, 10, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.occupancy_by_location VALUES ('32f556ad-e92f-424c-994e-5335e9c4907b', 'c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Montería', '2026-10-27', 2, 11, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.occupancy_by_location VALUES ('b1a9e2a2-9156-49c6-86c1-9e0044ae47d2', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-26', 1, 11, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.occupancy_by_location VALUES ('82c55a50-f4d0-4c69-8d33-523e95dd41e9', 'c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Montería', '2026-10-27', 2, 12, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.occupancy_by_location VALUES ('42027680-422d-474d-a84e-5276d7796855', 'c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Montería', '2026-10-29', 4, 15, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.occupancy_by_location VALUES ('548ef6ac-aea0-43cc-8378-5a7898375235', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-30', 5, 14, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.occupancy_by_location VALUES ('d98bbf80-8ff9-448d-81a9-6394253ac102', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-30', 5, 13, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.occupancy_by_location VALUES ('c4aed318-65c0-4d8e-9398-61a9e316e52d', 'c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Montería', '2026-10-27', 2, 15, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.occupancy_by_location VALUES ('c09a6533-99bb-4a57-9d67-8477772c2df2', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-30', 5, 10, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.occupancy_by_location VALUES ('31a0f62e-ec36-413c-a4d5-8d9518e538ae', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-30', 5, 16, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.occupancy_by_location VALUES ('f5dbd19a-3fb8-48aa-9415-22e9d7046096', 'c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Bogotá', '2026-10-30', 5, 15, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.occupancy_by_location VALUES ('e73525db-39eb-4e91-ab91-9a6626c4b7c2', 'c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Montería', '2026-10-27', 2, 14, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.occupancy_by_location VALUES ('52506b38-5fc1-4e13-a0ae-b6b3e0e58407', 'c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Montería', '2026-10-27', 2, 13, 1, 2, 0.5, 1, '2026-10-28 22:32:43.821');


--
-- Data for Name: revenue_by_plan; Type: TABLE DATA; Schema: analytics; Owner: -
--

INSERT INTO analytics.revenue_by_plan VALUES ('44b6c412-212f-401a-9132-1d9d216200a7', '2026-08', 'FLEX_DESK', 'Puesto flexible', 700000, 0, 700000, 2, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.revenue_by_plan VALUES ('7d42eb95-2f78-4579-a07a-3611cf2048e1', '2026-08', 'MEETING_ROOMS_ONLY', 'Solo salas de reunión', 250000, 0, 250000, 1, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.revenue_by_plan VALUES ('c1c74cda-90a0-4cd0-93b5-47f389d34317', '2026-08', 'PRIVATE_OFFICE', 'Oficina privada', 1500000, 0, 1500000, 1, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.revenue_by_plan VALUES ('c8169cb1-4c76-4073-9782-339bc3066b89', '2026-09', 'FLEX_DESK', 'Puesto flexible', 350000, 0, 350000, 1, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.revenue_by_plan VALUES ('fc5691b7-e89e-41f7-9317-f9f5bdca7379', '2026-09', 'PRIVATE_OFFICE', 'Oficina privada', 1500000, 0, 1500000, 1, 1, '2026-10-28 22:32:43.821');
INSERT INTO analytics.revenue_by_plan VALUES ('d534e03b-2daa-406b-85a6-77f3be6ac187', '2026-10', 'FLEX_DESK', 'Puesto flexible', 0, 100000, 100000, 0, 0, '2026-10-28 22:32:43.821');


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

\unrestrict WpGPFNcvoITaAcdc329f1MBI31trGCUPsbKxtf5VvcdNOyyJEg60ppEtFWZLBZj

