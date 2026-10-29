--
-- PostgreSQL database dump
--

\restrict TGOzEqf4ZO1AazXE9I36RphaDr2g4Ro6ZaiGazhueXPDgdKytrIF50xh6vIlgbb


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
-- Name: space; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA space;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: desks; Type: TABLE; Schema: space; Owner: -
--

CREATE TABLE space.desks (
    id text NOT NULL,
    location_id text NOT NULL,
    code text NOT NULL,
    is_dedicated boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: location_photos; Type: TABLE; Schema: space; Owner: -
--

CREATE TABLE space.location_photos (
    location_id text NOT NULL,
    mime text NOT NULL,
    data bytea NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: locations; Type: TABLE; Schema: space; Owner: -
--

CREATE TABLE space.locations (
    id text NOT NULL,
    name text NOT NULL,
    country text DEFAULT 'Colombia'::text NOT NULL,
    city text NOT NULL,
    address text NOT NULL,
    description text,
    services text[] DEFAULT ARRAY[]::text[],
    is_published boolean DEFAULT true NOT NULL,
    photo_url text,
    latitude double precision,
    longitude double precision,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: rooms; Type: TABLE; Schema: space; Owner: -
--

CREATE TABLE space.rooms (
    id text NOT NULL,
    location_id text NOT NULL,
    name text NOT NULL,
    capacity integer NOT NULL,
    equipment jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Data for Name: desks; Type: TABLE DATA; Schema: space; Owner: -
--

INSERT INTO space.desks VALUES ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'A-01', false, true);
INSERT INTO space.desks VALUES ('e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'B-01', true, true);


--
-- Data for Name: location_photos; Type: TABLE DATA; Schema: space; Owner: -
--



--
-- Data for Name: locations; Type: TABLE DATA; Schema: space; Owner: -
--

INSERT INTO space.locations VALUES ('c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Colombia', 'Montería', 'Cra 3 # 27-10', 'A dos cuadras de la Ronda del Sinú, con terraza.', '{"WiFi de alta velocidad","Café y agua",Recepción,Parqueadero,Lockers}', true, NULL, 8.7575, -75.889, '2026-07-01 20:13:32.08');
INSERT INTO space.locations VALUES ('c0000000-0000-4000-8000-000000000002', 'Sede Chicó', 'Colombia', 'Bogotá', 'Cl 93 # 11-26', 'Frente al Parque de la 93.', '{"WiFi de alta velocidad","Acceso 24/7","Cabinas telefónicas"}', true, NULL, 4.6767, -74.0483, '2026-07-21 20:13:32.08');


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: space; Owner: -
--

INSERT INTO space.rooms VALUES ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Sala Sinú', 8, '{"projector": true, "whiteboard": true}', true);
INSERT INTO space.rooms VALUES ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'Sala Monserrate', 12, '{"projector": true, "videoconference": true}', true);


--
-- Name: desks desks_pkey; Type: CONSTRAINT; Schema: space; Owner: -
--

ALTER TABLE ONLY space.desks
    ADD CONSTRAINT desks_pkey PRIMARY KEY (id);


--
-- Name: location_photos location_photos_pkey; Type: CONSTRAINT; Schema: space; Owner: -
--

ALTER TABLE ONLY space.location_photos
    ADD CONSTRAINT location_photos_pkey PRIMARY KEY (location_id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: space; Owner: -
--

ALTER TABLE ONLY space.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: space; Owner: -
--

ALTER TABLE ONLY space.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: desks_location_id_code_key; Type: INDEX; Schema: space; Owner: -
--

CREATE UNIQUE INDEX desks_location_id_code_key ON space.desks USING btree (location_id, code);


--
-- Name: locations_city_idx; Type: INDEX; Schema: space; Owner: -
--

CREATE INDEX locations_city_idx ON space.locations USING btree (city);


--
-- Name: locations_country_city_idx; Type: INDEX; Schema: space; Owner: -
--

CREATE INDEX locations_country_city_idx ON space.locations USING btree (country, city);


--
-- Name: rooms_location_id_idx; Type: INDEX; Schema: space; Owner: -
--

CREATE INDEX rooms_location_id_idx ON space.rooms USING btree (location_id);


--
-- Name: desks desks_location_id_fkey; Type: FK CONSTRAINT; Schema: space; Owner: -
--

ALTER TABLE ONLY space.desks
    ADD CONSTRAINT desks_location_id_fkey FOREIGN KEY (location_id) REFERENCES space.locations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: location_photos location_photos_location_id_fkey; Type: FK CONSTRAINT; Schema: space; Owner: -
--

ALTER TABLE ONLY space.location_photos
    ADD CONSTRAINT location_photos_location_id_fkey FOREIGN KEY (location_id) REFERENCES space.locations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: rooms rooms_location_id_fkey; Type: FK CONSTRAINT; Schema: space; Owner: -
--

ALTER TABLE ONLY space.rooms
    ADD CONSTRAINT rooms_location_id_fkey FOREIGN KEY (location_id) REFERENCES space.locations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict TGOzEqf4ZO1AazXE9I36RphaDr2g4Ro6ZaiGazhueXPDgdKytrIF50xh6vIlgbb

