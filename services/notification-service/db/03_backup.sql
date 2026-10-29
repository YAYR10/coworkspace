--
-- PostgreSQL database dump
--

\restrict 1LfXOFBK3l6rfDzZ56iTpse5uH08KOT82meCSfU1K7kG9K3sSR4R1tIVZRdUn9N


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
-- Name: notification; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA notification;


--
-- Name: NotificationStatus; Type: TYPE; Schema: notification; Owner: -
--

CREATE TYPE notification."NotificationStatus" AS ENUM (
    'SENT',
    'LOGGED',
    'FAILED'
);


--
-- Name: ReminderKind; Type: TYPE; Schema: notification; Owner: -
--

CREATE TYPE notification."ReminderKind" AS ENUM (
    'BOOKING_REMINDER',
    'MEMBERSHIP_EXPIRING'
);


--
-- Name: ReminderStatus; Type: TYPE; Schema: notification; Owner: -
--

CREATE TYPE notification."ReminderStatus" AS ENUM (
    'PENDING',
    'SENT',
    'CANCELLED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: notifications; Type: TABLE; Schema: notification; Owner: -
--

CREATE TABLE notification.notifications (
    id text NOT NULL,
    event_id text NOT NULL,
    event_type text NOT NULL,
    member_id text NOT NULL,
    email text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    status notification."NotificationStatus" NOT NULL,
    error text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: reminders; Type: TABLE; Schema: notification; Owner: -
--

CREATE TABLE notification.reminders (
    id text NOT NULL,
    kind notification."ReminderKind" NOT NULL,
    ref_id text NOT NULL,
    member_id text NOT NULL,
    send_at timestamp(3) without time zone NOT NULL,
    payload jsonb NOT NULL,
    status notification."ReminderStatus" DEFAULT 'PENDING'::notification."ReminderStatus" NOT NULL,
    sent_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: notification; Owner: -
--

INSERT INTO notification.notifications VALUES ('93000000-0000-4000-8000-000000000001', 'demo-evt-0001', 'membership.activated', 'a0000000-0000-4000-8000-000000000003', 'ana@demo.co', 'Bienvenido a CoworkSpace: plan Puesto flexible', 'Hola Ana,

tu plan Puesto flexible ya está activo. Ya puedes reservar desde la aplicación.', 'LOGGED', NULL, '2026-08-02 20:13:50.454');
INSERT INTO notification.notifications VALUES ('93000000-0000-4000-8000-000000000002', 'demo-evt-0002', 'booking.confirmed', 'a0000000-0000-4000-8000-000000000003', 'ana@demo.co', 'Reserva confirmada: Sala Sinú', 'Hola Ana,

tu reserva de Sala Sinú en Sede Centro está confirmada.

Como tu plan no incluye este espacio, se cobró un adicional de $ 100.000.', 'LOGGED', NULL, '2026-10-28 20:13:50.454');
INSERT INTO notification.notifications VALUES ('93000000-0000-4000-8000-000000000003', 'demo-evt-0003', 'booking.cancelled', 'a0000000-0000-4000-8000-000000000003', 'ana@demo.co', 'Tu reserva de Sala Monserrate fue cancelada', 'Hola Ana,

tu reserva quedó cancelada.

No pudimos aprobar el cobro adicional, así que la reserva se canceló y el horario quedó libre.', 'LOGGED', NULL, '2026-10-27 20:13:50.454');
INSERT INTO notification.notifications VALUES ('93000000-0000-4000-8000-000000000004', 'demo-evt-0004', 'membership.expired', 'a0000000-0000-4000-8000-000000000005', 'mariana@demo.co', 'Tu plan venció', 'Hola Mariana,

tu plan llegó a su fin y no se renovó.', 'LOGGED', NULL, '2026-10-15 20:13:50.454');


--
-- Data for Name: reminders; Type: TABLE DATA; Schema: notification; Owner: -
--

INSERT INTO notification.reminders VALUES ('94000000-0000-4000-8000-000000000001', 'BOOKING_REMINDER', 'f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', '2026-10-30 18:00:00', '{"endTime": "2026-10-30T21:00:00.000Z", "memberId": "a0000000-0000-4000-8000-000000000003", "bookingId": "f0000000-0000-4000-8000-000000000002", "startTime": "2026-10-30T19:00:00.000Z", "locationId": "c0000000-0000-4000-8000-000000000001", "resourceId": "d0000000-0000-4000-8000-000000000001", "resourceType": "ROOM"}', 'PENDING', NULL, '2026-10-28 20:13:50.456');


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: notification; Owner: -
--

ALTER TABLE ONLY notification.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: reminders reminders_pkey; Type: CONSTRAINT; Schema: notification; Owner: -
--

ALTER TABLE ONLY notification.reminders
    ADD CONSTRAINT reminders_pkey PRIMARY KEY (id);


--
-- Name: notifications_event_id_key; Type: INDEX; Schema: notification; Owner: -
--

CREATE UNIQUE INDEX notifications_event_id_key ON notification.notifications USING btree (event_id);


--
-- Name: notifications_member_id_created_at_idx; Type: INDEX; Schema: notification; Owner: -
--

CREATE INDEX notifications_member_id_created_at_idx ON notification.notifications USING btree (member_id, created_at);


--
-- Name: reminders_kind_ref_id_key; Type: INDEX; Schema: notification; Owner: -
--

CREATE UNIQUE INDEX reminders_kind_ref_id_key ON notification.reminders USING btree (kind, ref_id);


--
-- Name: reminders_status_send_at_idx; Type: INDEX; Schema: notification; Owner: -
--

CREATE INDEX reminders_status_send_at_idx ON notification.reminders USING btree (status, send_at);


--
-- PostgreSQL database dump complete
--

\unrestrict 1LfXOFBK3l6rfDzZ56iTpse5uH08KOT82meCSfU1K7kG9K3sSR4R1tIVZRdUn9N

