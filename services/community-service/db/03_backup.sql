--
-- PostgreSQL database dump
--

\restrict iz9XjlppplgVhdCFqYuntgyC4ziVlVTbzkR1RoRcnO3vdfWUVEHMfi9FlBMixgf


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
-- Name: community; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA community;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: event_attendees; Type: TABLE; Schema: community; Owner: -
--

CREATE TABLE community.event_attendees (
    event_id text NOT NULL,
    member_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: events; Type: TABLE; Schema: community; Owner: -
--

CREATE TABLE community.events (
    id text NOT NULL,
    location_id text NOT NULL,
    title text NOT NULL,
    description text,
    scheduled_at timestamp(3) without time zone NOT NULL,
    duration_minutes integer DEFAULT 90 NOT NULL,
    capacity integer DEFAULT 30 NOT NULL,
    created_by text NOT NULL,
    cancelled boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: member_directory; Type: TABLE; Schema: community; Owner: -
--

CREATE TABLE community.member_directory (
    member_id text NOT NULL,
    display_name text NOT NULL,
    headline text,
    bio text,
    company text,
    skills text[] DEFAULT ARRAY[]::text[],
    location_id text,
    linkedin_url text,
    visible boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: community; Owner: -
--

CREATE TABLE community.messages (
    id text NOT NULL,
    sender_id text NOT NULL,
    recipient_id text NOT NULL,
    body text NOT NULL,
    read_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Data for Name: event_attendees; Type: TABLE DATA; Schema: community; Owner: -
--

INSERT INTO community.event_attendees VALUES ('97000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', '2026-10-27 20:14:02.958');
INSERT INTO community.event_attendees VALUES ('97000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', '2026-10-28 20:14:02.958');
INSERT INTO community.event_attendees VALUES ('97000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004', '2026-10-28 20:14:02.958');


--
-- Data for Name: events; Type: TABLE DATA; Schema: community; Owner: -
--

INSERT INTO community.events VALUES ('97000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Café de emprendedores', 'Presenta tu proyecto en 3 minutos y conoce a otros miembros.', '2026-11-01 23:00:00', 90, 30, 'a0000000-0000-4000-8000-000000000002', false, '2026-10-26 20:14:02.957');
INSERT INTO community.events VALUES ('97000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'Taller: facturación electrónica para independientes', NULL, '2026-11-04 14:00:00', 120, 20, 'a0000000-0000-4000-8000-000000000002', false, '2026-10-28 20:14:02.957');


--
-- Data for Name: member_directory; Type: TABLE DATA; Schema: community; Owner: -
--

INSERT INTO community.member_directory VALUES ('a0000000-0000-4000-8000-000000000003', 'Ana Gómez', 'Diseñadora UX', 'Diseño productos digitales para fintech. Siempre dispuesta a un café.', 'Estudio Sinú', '{UX,Figma,Research}', 'c0000000-0000-4000-8000-000000000001', NULL, true, '2026-08-10 20:14:02.955', '2026-10-24 20:14:02.955');
INSERT INTO community.member_directory VALUES ('a0000000-0000-4000-8000-000000000004', 'Carlos Ruiz', 'Desarrollador backend', NULL, 'Freelance', '{Node.js,PostgreSQL}', 'c0000000-0000-4000-8000-000000000002', NULL, true, '2026-09-09 20:14:02.955', '2026-10-27 20:14:02.955');


--
-- Data for Name: messages; Type: TABLE DATA; Schema: community; Owner: -
--

INSERT INTO community.messages VALUES ('98000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000003', 'Hola Ana, vi que haces UX. ¿Te interesa revisar la app que estoy construyendo?', '2026-10-29 00:14:02.959', '2026-10-28 20:14:02.959');
INSERT INTO community.messages VALUES ('98000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004', '¡Claro! Nos vemos en el Café de emprendedores.', NULL, '2026-10-29 02:14:02.959');


--
-- Name: event_attendees event_attendees_pkey; Type: CONSTRAINT; Schema: community; Owner: -
--

ALTER TABLE ONLY community.event_attendees
    ADD CONSTRAINT event_attendees_pkey PRIMARY KEY (event_id, member_id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: community; Owner: -
--

ALTER TABLE ONLY community.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: member_directory member_directory_pkey; Type: CONSTRAINT; Schema: community; Owner: -
--

ALTER TABLE ONLY community.member_directory
    ADD CONSTRAINT member_directory_pkey PRIMARY KEY (member_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: community; Owner: -
--

ALTER TABLE ONLY community.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: events_location_id_scheduled_at_idx; Type: INDEX; Schema: community; Owner: -
--

CREATE INDEX events_location_id_scheduled_at_idx ON community.events USING btree (location_id, scheduled_at);


--
-- Name: member_directory_visible_location_id_idx; Type: INDEX; Schema: community; Owner: -
--

CREATE INDEX member_directory_visible_location_id_idx ON community.member_directory USING btree (visible, location_id);


--
-- Name: messages_recipient_id_created_at_idx; Type: INDEX; Schema: community; Owner: -
--

CREATE INDEX messages_recipient_id_created_at_idx ON community.messages USING btree (recipient_id, created_at);


--
-- Name: messages_sender_id_created_at_idx; Type: INDEX; Schema: community; Owner: -
--

CREATE INDEX messages_sender_id_created_at_idx ON community.messages USING btree (sender_id, created_at);


--
-- Name: event_attendees event_attendees_event_id_fkey; Type: FK CONSTRAINT; Schema: community; Owner: -
--

ALTER TABLE ONLY community.event_attendees
    ADD CONSTRAINT event_attendees_event_id_fkey FOREIGN KEY (event_id) REFERENCES community.events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict iz9XjlppplgVhdCFqYuntgyC4ziVlVTbzkR1RoRcnO3vdfWUVEHMfi9FlBMixgf

