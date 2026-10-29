--
-- PostgreSQL database dump
--

\restrict EkR5ceoB3APeoz3f15eFuNy7S60IV0rRjyd1rUIAfdco2vWo0LciRmLQjcBo8dU


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
-- Name: booking; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA booking;


--
-- Name: BookingStatus; Type: TYPE; Schema: booking; Owner: -
--

CREATE TYPE booking."BookingStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CANCELLED'
);


--
-- Name: ResourceType; Type: TYPE; Schema: booking; Owner: -
--

CREATE TYPE booking."ResourceType" AS ENUM (
    'ROOM',
    'DESK'
);


--
-- Name: WaitlistStatus; Type: TYPE; Schema: booking; Owner: -
--

CREATE TYPE booking."WaitlistStatus" AS ENUM (
    'WAITING',
    'PROMOTED',
    'EXPIRED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bookings; Type: TABLE; Schema: booking; Owner: -
--

CREATE TABLE booking.bookings (
    id text NOT NULL,
    member_id text NOT NULL,
    resource_id text NOT NULL,
    resource_type booking."ResourceType" NOT NULL,
    location_id text NOT NULL,
    start_time timestamp(3) without time zone NOT NULL,
    end_time timestamp(3) without time zone NOT NULL,
    status booking."BookingStatus" DEFAULT 'PENDING'::booking."BookingStatus" NOT NULL,
    cancel_reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: resource_locks; Type: TABLE; Schema: booking; Owner: -
--

CREATE TABLE booking.resource_locks (
    resource_id text NOT NULL,
    version integer DEFAULT 0 NOT NULL
);


--
-- Name: waitlist_entries; Type: TABLE; Schema: booking; Owner: -
--

CREATE TABLE booking.waitlist_entries (
    id text NOT NULL,
    member_id text NOT NULL,
    resource_id text NOT NULL,
    resource_type booking."ResourceType" NOT NULL,
    start_time timestamp(3) without time zone NOT NULL,
    end_time timestamp(3) without time zone NOT NULL,
    status booking."WaitlistStatus" DEFAULT 'WAITING'::booking."WaitlistStatus" NOT NULL,
    booking_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: booking; Owner: -
--

INSERT INTO booking.bookings VALUES ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000001', 'DESK', 'c0000000-0000-4000-8000-000000000001', '2026-10-28 13:00:00', '2026-10-28 21:00:00', 'CONFIRMED', NULL, '2026-10-26 20:13:38.191', '2026-10-26 20:13:38.191');
INSERT INTO booking.bookings VALUES ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'ROOM', 'c0000000-0000-4000-8000-000000000001', '2026-10-30 19:00:00', '2026-10-30 21:00:00', 'CONFIRMED', NULL, '2026-10-28 20:13:38.191', '2026-10-28 20:13:38.191');
INSERT INTO booking.bookings VALUES ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000002', 'ROOM', 'c0000000-0000-4000-8000-000000000002', '2026-10-27 14:00:00', '2026-10-27 17:00:00', 'CONFIRMED', NULL, '2026-10-25 20:13:38.191', '2026-10-25 20:13:38.191');
INSERT INTO booking.bookings VALUES ('f0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000002', 'DESK', 'c0000000-0000-4000-8000-000000000002', '2026-10-31 13:00:00', '2026-10-31 22:00:00', 'CONFIRMED', NULL, '2026-10-28 20:13:38.191', '2026-10-28 20:13:38.191');
INSERT INTO booking.bookings VALUES ('f0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002', 'ROOM', 'c0000000-0000-4000-8000-000000000002', '2026-11-01 13:00:00', '2026-11-01 18:00:00', 'CANCELLED', 'PAYMENT_REJECTED', '2026-10-27 20:13:38.191', '2026-10-27 20:13:38.191');


--
-- Data for Name: resource_locks; Type: TABLE DATA; Schema: booking; Owner: -
--

INSERT INTO booking.resource_locks VALUES ('e0000000-0000-4000-8000-000000000001', 1);
INSERT INTO booking.resource_locks VALUES ('d0000000-0000-4000-8000-000000000001', 1);
INSERT INTO booking.resource_locks VALUES ('d0000000-0000-4000-8000-000000000002', 2);
INSERT INTO booking.resource_locks VALUES ('e0000000-0000-4000-8000-000000000002', 1);


--
-- Data for Name: waitlist_entries; Type: TABLE DATA; Schema: booking; Owner: -
--

INSERT INTO booking.waitlist_entries VALUES ('f1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000002', 'ROOM', '2026-10-27 14:00:00', '2026-10-27 16:00:00', 'EXPIRED', NULL, '2026-10-24 20:13:38.194');


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: booking; Owner: -
--

ALTER TABLE ONLY booking.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: resource_locks resource_locks_pkey; Type: CONSTRAINT; Schema: booking; Owner: -
--

ALTER TABLE ONLY booking.resource_locks
    ADD CONSTRAINT resource_locks_pkey PRIMARY KEY (resource_id);


--
-- Name: waitlist_entries waitlist_entries_pkey; Type: CONSTRAINT; Schema: booking; Owner: -
--

ALTER TABLE ONLY booking.waitlist_entries
    ADD CONSTRAINT waitlist_entries_pkey PRIMARY KEY (id);


--
-- Name: bookings_member_id_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX bookings_member_id_idx ON booking.bookings USING btree (member_id);


--
-- Name: bookings_resource_id_start_time_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX bookings_resource_id_start_time_idx ON booking.bookings USING btree (resource_id, start_time);


--
-- Name: bookings_status_created_at_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX bookings_status_created_at_idx ON booking.bookings USING btree (status, created_at);


--
-- Name: waitlist_entries_resource_id_status_start_time_idx; Type: INDEX; Schema: booking; Owner: -
--

CREATE INDEX waitlist_entries_resource_id_status_start_time_idx ON booking.waitlist_entries USING btree (resource_id, status, start_time);


--
-- PostgreSQL database dump complete
--

\unrestrict EkR5ceoB3APeoz3f15eFuNy7S60IV0rRjyd1rUIAfdco2vWo0LciRmLQjcBo8dU

