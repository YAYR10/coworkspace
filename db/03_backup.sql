--
-- PostgreSQL database dump
--

\restrict S9D2sgKUHiBwsW8gbaZxC6bcPCpNra2jZO5oCsezVX1M15udZyvlmOlT5mZfR5d


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
-- Name: membership; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA membership;


--
-- Name: Role; Type: TYPE; Schema: membership; Owner: -
--

CREATE TYPE membership."Role" AS ENUM (
    'MEMBER',
    'COORDINATOR',
    'ADMIN'
);


--
-- Name: SubscriptionStatus; Type: TYPE; Schema: membership; Owner: -
--

CREATE TYPE membership."SubscriptionStatus" AS ENUM (
    'ACTIVE',
    'EXPIRED',
    'CANCELLED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: members; Type: TABLE; Schema: membership; Owner: -
--

CREATE TABLE membership.members (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role membership."Role" DEFAULT 'MEMBER'::membership."Role" NOT NULL,
    phone text,
    country text,
    city text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: membership_plans; Type: TABLE; Schema: membership; Owner: -
--

CREATE TABLE membership.membership_plans (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    price integer NOT NULL,
    resource_access text[],
    description text
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: membership; Owner: -
--

CREATE TABLE membership.refresh_tokens (
    id text NOT NULL,
    member_id text NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    revoked_at timestamp(3) without time zone
);


--
-- Name: subscriptions; Type: TABLE; Schema: membership; Owner: -
--

CREATE TABLE membership.subscriptions (
    id text NOT NULL,
    member_id text NOT NULL,
    plan_id text NOT NULL,
    status membership."SubscriptionStatus" DEFAULT 'ACTIVE'::membership."SubscriptionStatus" NOT NULL,
    auto_renew boolean DEFAULT true NOT NULL,
    started_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    renews_at timestamp(3) without time zone NOT NULL
);


--
-- Data for Name: members; Type: TABLE DATA; Schema: membership; Owner: -
--

INSERT INTO membership.members VALUES ('a0000000-0000-4000-8000-000000000001', 'Admin Demo', 'admin.demo@coworkspace.co', '$2a$10$szHiCP/sWYZ3k4YXcGbCIe.pVBZ7ADx4vcNi2qklbGLmZF49bPuci', 'ADMIN', NULL, 'Colombia', 'Montería', '2026-06-30 22:32:00.661');
INSERT INTO membership.members VALUES ('a0000000-0000-4000-8000-000000000002', 'Luis Peña', 'coordinador@coworkspace.co', '$2a$10$szHiCP/sWYZ3k4YXcGbCIe.pVBZ7ADx4vcNi2qklbGLmZF49bPuci', 'COORDINATOR', '+57 301 000 0002', 'Colombia', 'Bogotá', '2026-07-10 22:32:00.661');
INSERT INTO membership.members VALUES ('a0000000-0000-4000-8000-000000000003', 'Ana Gómez', 'ana@demo.co', '$2a$10$szHiCP/sWYZ3k4YXcGbCIe.pVBZ7ADx4vcNi2qklbGLmZF49bPuci', 'MEMBER', '+57 300 123 4567', 'Colombia', 'Montería', '2026-07-30 22:32:00.661');
INSERT INTO membership.members VALUES ('a0000000-0000-4000-8000-000000000004', 'Carlos Ruiz', 'carlos@demo.co', '$2a$10$szHiCP/sWYZ3k4YXcGbCIe.pVBZ7ADx4vcNi2qklbGLmZF49bPuci', 'MEMBER', NULL, 'Colombia', 'Bogotá', '2026-08-29 22:32:00.661');
INSERT INTO membership.members VALUES ('a0000000-0000-4000-8000-000000000005', 'Mariana López', 'mariana@demo.co', '$2a$10$szHiCP/sWYZ3k4YXcGbCIe.pVBZ7ADx4vcNi2qklbGLmZF49bPuci', 'MEMBER', NULL, 'Colombia', 'Bogotá', '2026-08-14 22:32:00.661');


--
-- Data for Name: membership_plans; Type: TABLE DATA; Schema: membership; Owner: -
--

INSERT INTO membership.membership_plans VALUES ('90000000-0000-4000-8000-000000000001', 'FLEX_DESK', 'Puesto flexible', 350000, '{DESK}', 'Cualquier puesto libre de la red');
INSERT INTO membership.membership_plans VALUES ('90000000-0000-4000-8000-000000000002', 'DEDICATED_DESK', 'Escritorio dedicado', 600000, '{DESK}', 'Escritorio fijo en una sede');
INSERT INTO membership.membership_plans VALUES ('90000000-0000-4000-8000-000000000003', 'PRIVATE_OFFICE', 'Oficina privada', 1500000, '{DESK,ROOM}', 'Oficina privada con salas incluidas');
INSERT INTO membership.membership_plans VALUES ('90000000-0000-4000-8000-000000000004', 'MEETING_ROOMS_ONLY', 'Solo salas de reunión', 250000, '{ROOM}', 'Acceso únicamente a salas');


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: membership; Owner: -
--



--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: membership; Owner: -
--

INSERT INTO membership.subscriptions VALUES ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-000000000001', 'ACTIVE', true, '2026-08-01 22:32:00.662', '2026-10-30 22:32:00.662');
INSERT INTO membership.subscriptions VALUES ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', '90000000-0000-4000-8000-000000000003', 'ACTIVE', true, '2026-08-31 22:32:00.662', '2026-10-30 22:32:00.662');
INSERT INTO membership.subscriptions VALUES ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000005', '90000000-0000-4000-8000-000000000004', 'EXPIRED', false, '2026-08-15 22:32:00.662', '2026-10-14 22:32:00.662');


--
-- Name: members members_pkey; Type: CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (id);


--
-- Name: membership_plans membership_plans_pkey; Type: CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.membership_plans
    ADD CONSTRAINT membership_plans_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: members_email_key; Type: INDEX; Schema: membership; Owner: -
--

CREATE UNIQUE INDEX members_email_key ON membership.members USING btree (email);


--
-- Name: membership_plans_code_key; Type: INDEX; Schema: membership; Owner: -
--

CREATE UNIQUE INDEX membership_plans_code_key ON membership.membership_plans USING btree (code);


--
-- Name: subscriptions_member_id_status_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX subscriptions_member_id_status_idx ON membership.subscriptions USING btree (member_id, status);


--
-- Name: subscriptions_status_renews_at_idx; Type: INDEX; Schema: membership; Owner: -
--

CREATE INDEX subscriptions_status_renews_at_idx ON membership.subscriptions USING btree (status, renews_at);


--
-- Name: refresh_tokens refresh_tokens_member_id_fkey; Type: FK CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.refresh_tokens
    ADD CONSTRAINT refresh_tokens_member_id_fkey FOREIGN KEY (member_id) REFERENCES membership.members(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_member_id_fkey; Type: FK CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.subscriptions
    ADD CONSTRAINT subscriptions_member_id_fkey FOREIGN KEY (member_id) REFERENCES membership.members(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: subscriptions subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: membership; Owner: -
--

ALTER TABLE ONLY membership.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES membership.membership_plans(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict S9D2sgKUHiBwsW8gbaZxC6bcPCpNra2jZO5oCsezVX1M15udZyvlmOlT5mZfR5d

