--
-- PostgreSQL database dump
--

\restrict C6Gs6vKZJuQGqYCfJ3dlXdnRL0JK1hBLKSGLhf28rVSGQ1zVYmQv3GNdQPhayJD


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
-- Name: access; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA access;


--
-- Name: CredentialKind; Type: TYPE; Schema: access; Owner: -
--

CREATE TYPE access."CredentialKind" AS ENUM (
    'QR',
    'NFC'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: access_credentials; Type: TABLE; Schema: access; Owner: -
--

CREATE TABLE access.access_credentials (
    id text NOT NULL,
    member_id text NOT NULL,
    member_email text,
    kind access."CredentialKind" DEFAULT 'QR'::access."CredentialKind" NOT NULL,
    credential_hash text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    issued_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    revoked_at timestamp(3) without time zone,
    revoked_reason text
);


--
-- Name: access_log; Type: TABLE; Schema: access; Owner: -
--

CREATE TABLE access.access_log (
    id text NOT NULL,
    member_id text,
    location_id text NOT NULL,
    credential_id text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    granted boolean NOT NULL,
    reason text NOT NULL,
    latency_ms integer NOT NULL
);


--
-- Name: member_access; Type: TABLE; Schema: access; Owner: -
--

CREATE TABLE access.member_access (
    member_id text NOT NULL,
    active boolean NOT NULL,
    plan_code text,
    renews_at timestamp(3) without time zone,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Data for Name: access_credentials; Type: TABLE DATA; Schema: access; Owner: -
--

INSERT INTO access.access_credentials VALUES ('95000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'ana@demo.co', 'NFC', 'c3820b18975cf95b995f5704daf70cc3f1274418af1f388bb03f6c08edad46d7', true, '2026-10-27 22:32:30.091', '2026-11-27 22:32:30.091', NULL, NULL);
INSERT INTO access.access_credentials VALUES ('95000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000005', 'mariana@demo.co', 'NFC', '0000000000000000000000000000000000000000000000000000000000000000', false, '2026-09-18 22:32:30.091', '2026-10-18 22:32:30.091', '2026-10-14 22:32:30.091', 'membership.expired');


--
-- Data for Name: access_log; Type: TABLE DATA; Schema: access; Owner: -
--

INSERT INTO access.access_log VALUES ('96000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000001', '2026-10-28 00:32:30.092', true, 'GRANTED', 4);
INSERT INTO access.access_log VALUES ('96000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000002', '95000000-0000-4000-8000-000000000002', '2026-10-16 22:32:30.092', false, 'REVOKED', 3);
INSERT INTO access.access_log VALUES ('96000000-0000-4000-8000-000000000003', NULL, 'c0000000-0000-4000-8000-000000000001', NULL, '2026-10-28 16:32:30.092', false, 'MALFORMED', 1);


--
-- Data for Name: member_access; Type: TABLE DATA; Schema: access; Owner: -
--

INSERT INTO access.member_access VALUES ('a0000000-0000-4000-8000-000000000003', true, 'FLEX_DESK', '2026-10-30 22:32:30.089', '2026-10-28 22:32:30.089');
INSERT INTO access.member_access VALUES ('a0000000-0000-4000-8000-000000000004', true, 'PRIVATE_OFFICE', '2026-10-30 22:32:30.089', '2026-10-28 22:32:30.089');
INSERT INTO access.member_access VALUES ('a0000000-0000-4000-8000-000000000005', false, 'MEETING_ROOMS_ONLY', '2026-10-14 22:32:30.089', '2026-10-28 22:32:30.089');


--
-- Name: access_credentials access_credentials_pkey; Type: CONSTRAINT; Schema: access; Owner: -
--

ALTER TABLE ONLY access.access_credentials
    ADD CONSTRAINT access_credentials_pkey PRIMARY KEY (id);


--
-- Name: access_log access_log_pkey; Type: CONSTRAINT; Schema: access; Owner: -
--

ALTER TABLE ONLY access.access_log
    ADD CONSTRAINT access_log_pkey PRIMARY KEY (id);


--
-- Name: member_access member_access_pkey; Type: CONSTRAINT; Schema: access; Owner: -
--

ALTER TABLE ONLY access.member_access
    ADD CONSTRAINT member_access_pkey PRIMARY KEY (member_id);


--
-- Name: access_credentials_member_id_is_active_idx; Type: INDEX; Schema: access; Owner: -
--

CREATE INDEX access_credentials_member_id_is_active_idx ON access.access_credentials USING btree (member_id, is_active);


--
-- Name: access_log_location_id_timestamp_idx; Type: INDEX; Schema: access; Owner: -
--

CREATE INDEX access_log_location_id_timestamp_idx ON access.access_log USING btree (location_id, "timestamp");


--
-- Name: access_log_member_id_timestamp_idx; Type: INDEX; Schema: access; Owner: -
--

CREATE INDEX access_log_member_id_timestamp_idx ON access.access_log USING btree (member_id, "timestamp");


--
-- Name: access_log access_log_credential_id_fkey; Type: FK CONSTRAINT; Schema: access; Owner: -
--

ALTER TABLE ONLY access.access_log
    ADD CONSTRAINT access_log_credential_id_fkey FOREIGN KEY (credential_id) REFERENCES access.access_credentials(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict C6Gs6vKZJuQGqYCfJ3dlXdnRL0JK1hBLKSGLhf28rVSGQ1zVYmQv3GNdQPhayJD

