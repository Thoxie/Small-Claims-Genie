--
-- PostgreSQL database dump
--

\restrict 9Svb33I4S0KWaQAZefAuqtHek7VYENBSKs1StiKEGYoP8le4dgwS3m0CAZZGG2t

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

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

ALTER TABLE IF EXISTS ONLY stripe.tax_ids DROP CONSTRAINT IF EXISTS fk_tax_ids_account;
ALTER TABLE IF EXISTS ONLY stripe._sync_status DROP CONSTRAINT IF EXISTS fk_sync_status_account;
ALTER TABLE IF EXISTS ONLY stripe.subscriptions DROP CONSTRAINT IF EXISTS fk_subscriptions_account;
ALTER TABLE IF EXISTS ONLY stripe.subscription_schedules DROP CONSTRAINT IF EXISTS fk_subscription_schedules_account;
ALTER TABLE IF EXISTS ONLY stripe.subscription_items DROP CONSTRAINT IF EXISTS fk_subscription_items_account;
ALTER TABLE IF EXISTS ONLY stripe.setup_intents DROP CONSTRAINT IF EXISTS fk_setup_intents_account;
ALTER TABLE IF EXISTS ONLY stripe.reviews DROP CONSTRAINT IF EXISTS fk_reviews_account;
ALTER TABLE IF EXISTS ONLY stripe.refunds DROP CONSTRAINT IF EXISTS fk_refunds_account;
ALTER TABLE IF EXISTS ONLY stripe.products DROP CONSTRAINT IF EXISTS fk_products_account;
ALTER TABLE IF EXISTS ONLY stripe.prices DROP CONSTRAINT IF EXISTS fk_prices_account;
ALTER TABLE IF EXISTS ONLY stripe.plans DROP CONSTRAINT IF EXISTS fk_plans_account;
ALTER TABLE IF EXISTS ONLY stripe.payment_methods DROP CONSTRAINT IF EXISTS fk_payment_methods_account;
ALTER TABLE IF EXISTS ONLY stripe.payment_intents DROP CONSTRAINT IF EXISTS fk_payment_intents_account;
ALTER TABLE IF EXISTS ONLY stripe._managed_webhooks DROP CONSTRAINT IF EXISTS fk_managed_webhooks_account;
ALTER TABLE IF EXISTS ONLY stripe.invoices DROP CONSTRAINT IF EXISTS fk_invoices_account;
ALTER TABLE IF EXISTS ONLY stripe.features DROP CONSTRAINT IF EXISTS fk_features_account;
ALTER TABLE IF EXISTS ONLY stripe.early_fraud_warnings DROP CONSTRAINT IF EXISTS fk_early_fraud_warnings_account;
ALTER TABLE IF EXISTS ONLY stripe.disputes DROP CONSTRAINT IF EXISTS fk_disputes_account;
ALTER TABLE IF EXISTS ONLY stripe.customers DROP CONSTRAINT IF EXISTS fk_customers_account;
ALTER TABLE IF EXISTS ONLY stripe.credit_notes DROP CONSTRAINT IF EXISTS fk_credit_notes_account;
ALTER TABLE IF EXISTS ONLY stripe.checkout_sessions DROP CONSTRAINT IF EXISTS fk_checkout_sessions_account;
ALTER TABLE IF EXISTS ONLY stripe.checkout_session_line_items DROP CONSTRAINT IF EXISTS fk_checkout_session_line_items_account;
ALTER TABLE IF EXISTS ONLY stripe.charges DROP CONSTRAINT IF EXISTS fk_charges_account;
ALTER TABLE IF EXISTS ONLY stripe.active_entitlements DROP CONSTRAINT IF EXISTS fk_active_entitlements_account;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_conversation_id_conversations_id_fk;
ALTER TABLE IF EXISTS ONLY public.documents DROP CONSTRAINT IF EXISTS documents_case_id_cases_id_fk;
ALTER TABLE IF EXISTS ONLY public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_case_id_cases_id_fk;
DROP TRIGGER IF EXISTS handle_updated_at ON stripe.subscriptions;
DROP TRIGGER IF EXISTS handle_updated_at ON stripe.reviews;
DROP TRIGGER IF EXISTS handle_updated_at ON stripe.refunds;
DROP TRIGGER IF EXISTS handle_updated_at ON stripe.products;
DROP TRIGGER IF EXISTS handle_updated_at ON stripe.prices;
DROP TRIGGER IF EXISTS handle_updated_at ON stripe.plans;
DROP TRIGGER IF EXISTS handle_updated_at ON stripe.payouts;
DROP TRIGGER IF EXISTS handle_updated_at ON stripe.invoices;
DROP TRIGGER IF EXISTS handle_updated_at ON stripe.features;
DROP TRIGGER IF EXISTS handle_updated_at ON stripe.events;
DROP TRIGGER IF EXISTS handle_updated_at ON stripe.early_fraud_warnings;
DROP TRIGGER IF EXISTS handle_updated_at ON stripe.disputes;
DROP TRIGGER IF EXISTS handle_updated_at ON stripe.customers;
DROP TRIGGER IF EXISTS handle_updated_at ON stripe.coupons;
DROP TRIGGER IF EXISTS handle_updated_at ON stripe.checkout_sessions;
DROP TRIGGER IF EXISTS handle_updated_at ON stripe.checkout_session_line_items;
DROP TRIGGER IF EXISTS handle_updated_at ON stripe.charges;
DROP TRIGGER IF EXISTS handle_updated_at ON stripe.active_entitlements;
DROP TRIGGER IF EXISTS handle_updated_at ON stripe.accounts;
DROP TRIGGER IF EXISTS handle_updated_at ON stripe._sync_status;
DROP TRIGGER IF EXISTS handle_updated_at ON stripe._managed_webhooks;
DROP INDEX IF EXISTS stripe.stripe_tax_ids_customer_idx;
DROP INDEX IF EXISTS stripe.stripe_setup_intents_customer_idx;
DROP INDEX IF EXISTS stripe.stripe_reviews_payment_intent_idx;
DROP INDEX IF EXISTS stripe.stripe_reviews_charge_idx;
DROP INDEX IF EXISTS stripe.stripe_refunds_payment_intent_idx;
DROP INDEX IF EXISTS stripe.stripe_refunds_charge_idx;
DROP INDEX IF EXISTS stripe.stripe_payment_methods_customer_idx;
DROP INDEX IF EXISTS stripe.stripe_payment_intents_invoice_idx;
DROP INDEX IF EXISTS stripe.stripe_payment_intents_customer_idx;
DROP INDEX IF EXISTS stripe.stripe_managed_webhooks_status_idx;
DROP INDEX IF EXISTS stripe.stripe_managed_webhooks_enabled_idx;
DROP INDEX IF EXISTS stripe.stripe_invoices_subscription_idx;
DROP INDEX IF EXISTS stripe.stripe_invoices_customer_idx;
DROP INDEX IF EXISTS stripe.stripe_early_fraud_warnings_payment_intent_idx;
DROP INDEX IF EXISTS stripe.stripe_early_fraud_warnings_charge_idx;
DROP INDEX IF EXISTS stripe.stripe_dispute_created_idx;
DROP INDEX IF EXISTS stripe.stripe_credit_notes_invoice_idx;
DROP INDEX IF EXISTS stripe.stripe_credit_notes_customer_idx;
DROP INDEX IF EXISTS stripe.stripe_checkout_sessions_subscription_idx;
DROP INDEX IF EXISTS stripe.stripe_checkout_sessions_payment_intent_idx;
DROP INDEX IF EXISTS stripe.stripe_checkout_sessions_invoice_idx;
DROP INDEX IF EXISTS stripe.stripe_checkout_sessions_customer_idx;
DROP INDEX IF EXISTS stripe.stripe_checkout_session_line_items_session_idx;
DROP INDEX IF EXISTS stripe.stripe_checkout_session_line_items_price_idx;
DROP INDEX IF EXISTS stripe.stripe_active_entitlements_feature_idx;
DROP INDEX IF EXISTS stripe.stripe_active_entitlements_customer_idx;
DROP INDEX IF EXISTS stripe.idx_sync_status_resource_account;
DROP INDEX IF EXISTS stripe.idx_accounts_business_name;
DROP INDEX IF EXISTS stripe.idx_accounts_api_key_hashes;
DROP INDEX IF EXISTS stripe.features_lookup_key_key;
DROP INDEX IF EXISTS stripe.active_entitlements_lookup_key_key;
DROP INDEX IF EXISTS public.purchases_user_id_idx;
DROP INDEX IF EXISTS public.efile_submissions_user_id_idx;
DROP INDEX IF EXISTS public.efile_submissions_envelope_id_idx;
DROP INDEX IF EXISTS public.efile_submissions_case_id_idx;
DROP INDEX IF EXISTS public.efile_court_locations_state_idx;
DROP INDEX IF EXISTS public.efile_court_locations_courthouse_idx;
DROP INDEX IF EXISTS public.efile_court_locations_cli_state_uidx;
DROP INDEX IF EXISTS public.documents_ocr_status_idx;
DROP INDEX IF EXISTS public.documents_case_id_idx;
DROP INDEX IF EXISTS public.chat_messages_case_id_idx;
DROP INDEX IF EXISTS public.cases_user_id_idx;
DROP INDEX IF EXISTS public.cases_intake_complete_idx;
DROP INDEX IF EXISTS public.cases_hearing_date_idx;
DROP INDEX IF EXISTS public.cases_confirmation_email_sent_idx;
ALTER TABLE IF EXISTS ONLY stripe.tax_ids DROP CONSTRAINT IF EXISTS tax_ids_pkey;
ALTER TABLE IF EXISTS ONLY stripe.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_pkey;
ALTER TABLE IF EXISTS ONLY stripe.subscription_schedules DROP CONSTRAINT IF EXISTS subscription_schedules_pkey;
ALTER TABLE IF EXISTS ONLY stripe.subscription_items DROP CONSTRAINT IF EXISTS subscription_items_pkey;
ALTER TABLE IF EXISTS ONLY stripe.setup_intents DROP CONSTRAINT IF EXISTS setup_intents_pkey;
ALTER TABLE IF EXISTS ONLY stripe.reviews DROP CONSTRAINT IF EXISTS reviews_pkey;
ALTER TABLE IF EXISTS ONLY stripe.refunds DROP CONSTRAINT IF EXISTS refunds_pkey;
ALTER TABLE IF EXISTS ONLY stripe.products DROP CONSTRAINT IF EXISTS products_pkey;
ALTER TABLE IF EXISTS ONLY stripe.prices DROP CONSTRAINT IF EXISTS prices_pkey;
ALTER TABLE IF EXISTS ONLY stripe.plans DROP CONSTRAINT IF EXISTS plans_pkey;
ALTER TABLE IF EXISTS ONLY stripe.payouts DROP CONSTRAINT IF EXISTS payouts_pkey;
ALTER TABLE IF EXISTS ONLY stripe.payment_methods DROP CONSTRAINT IF EXISTS payment_methods_pkey;
ALTER TABLE IF EXISTS ONLY stripe.payment_intents DROP CONSTRAINT IF EXISTS payment_intents_pkey;
ALTER TABLE IF EXISTS ONLY stripe._managed_webhooks DROP CONSTRAINT IF EXISTS managed_webhooks_url_account_unique;
ALTER TABLE IF EXISTS ONLY stripe._managed_webhooks DROP CONSTRAINT IF EXISTS managed_webhooks_pkey;
ALTER TABLE IF EXISTS ONLY stripe.invoices DROP CONSTRAINT IF EXISTS invoices_pkey;
ALTER TABLE IF EXISTS ONLY stripe.features DROP CONSTRAINT IF EXISTS features_pkey;
ALTER TABLE IF EXISTS ONLY stripe.events DROP CONSTRAINT IF EXISTS events_pkey;
ALTER TABLE IF EXISTS ONLY stripe.early_fraud_warnings DROP CONSTRAINT IF EXISTS early_fraud_warnings_pkey;
ALTER TABLE IF EXISTS ONLY stripe.disputes DROP CONSTRAINT IF EXISTS disputes_pkey;
ALTER TABLE IF EXISTS ONLY stripe.customers DROP CONSTRAINT IF EXISTS customers_pkey;
ALTER TABLE IF EXISTS ONLY stripe.credit_notes DROP CONSTRAINT IF EXISTS credit_notes_pkey;
ALTER TABLE IF EXISTS ONLY stripe.coupons DROP CONSTRAINT IF EXISTS coupons_pkey;
ALTER TABLE IF EXISTS ONLY stripe.checkout_sessions DROP CONSTRAINT IF EXISTS checkout_sessions_pkey;
ALTER TABLE IF EXISTS ONLY stripe.checkout_session_line_items DROP CONSTRAINT IF EXISTS checkout_session_line_items_pkey;
ALTER TABLE IF EXISTS ONLY stripe.charges DROP CONSTRAINT IF EXISTS charges_pkey;
ALTER TABLE IF EXISTS ONLY stripe.active_entitlements DROP CONSTRAINT IF EXISTS active_entitlements_pkey;
ALTER TABLE IF EXISTS ONLY stripe.accounts DROP CONSTRAINT IF EXISTS accounts_pkey;
ALTER TABLE IF EXISTS ONLY stripe._sync_status DROP CONSTRAINT IF EXISTS _sync_status_resource_account_key;
ALTER TABLE IF EXISTS ONLY stripe._sync_status DROP CONSTRAINT IF EXISTS _sync_status_pkey;
ALTER TABLE IF EXISTS ONLY stripe._migrations DROP CONSTRAINT IF EXISTS _migrations_pkey;
ALTER TABLE IF EXISTS ONLY stripe._migrations DROP CONSTRAINT IF EXISTS _migrations_name_key;
ALTER TABLE IF EXISTS ONLY public.purchases DROP CONSTRAINT IF EXISTS purchases_stripe_session_id_unique;
ALTER TABLE IF EXISTS ONLY public.purchases DROP CONSTRAINT IF EXISTS purchases_pkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY public.genie_conversions DROP CONSTRAINT IF EXISTS genie_conversions_pkey;
ALTER TABLE IF EXISTS ONLY public.efile_submissions DROP CONSTRAINT IF EXISTS efile_submissions_pkey;
ALTER TABLE IF EXISTS ONLY public.efile_court_locations DROP CONSTRAINT IF EXISTS efile_court_locations_pkey;
ALTER TABLE IF EXISTS ONLY public.download_tokens DROP CONSTRAINT IF EXISTS download_tokens_pkey;
ALTER TABLE IF EXISTS ONLY public.documents DROP CONSTRAINT IF EXISTS documents_pkey;
ALTER TABLE IF EXISTS ONLY public.conversations DROP CONSTRAINT IF EXISTS conversations_pkey;
ALTER TABLE IF EXISTS ONLY public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_pkey;
ALTER TABLE IF EXISTS ONLY public.cases DROP CONSTRAINT IF EXISTS cases_pkey;
ALTER TABLE IF EXISTS ONLY public.beta_access DROP CONSTRAINT IF EXISTS beta_access_user_id_unique;
ALTER TABLE IF EXISTS ONLY public.beta_access DROP CONSTRAINT IF EXISTS beta_access_pkey;
ALTER TABLE IF EXISTS ONLY public.ai_rate_limits DROP CONSTRAINT IF EXISTS ai_rate_limits_pkey;
ALTER TABLE IF EXISTS stripe._sync_status ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.messages ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.efile_submissions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.efile_court_locations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.documents ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.conversations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.chat_messages ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.cases ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS stripe.tax_ids;
DROP TABLE IF EXISTS stripe.subscriptions;
DROP TABLE IF EXISTS stripe.subscription_schedules;
DROP TABLE IF EXISTS stripe.subscription_items;
DROP TABLE IF EXISTS stripe.setup_intents;
DROP TABLE IF EXISTS stripe.reviews;
DROP TABLE IF EXISTS stripe.refunds;
DROP TABLE IF EXISTS stripe.products;
DROP TABLE IF EXISTS stripe.prices;
DROP TABLE IF EXISTS stripe.plans;
DROP TABLE IF EXISTS stripe.payouts;
DROP TABLE IF EXISTS stripe.payment_methods;
DROP TABLE IF EXISTS stripe.payment_intents;
DROP TABLE IF EXISTS stripe.invoices;
DROP TABLE IF EXISTS stripe.features;
DROP TABLE IF EXISTS stripe.events;
DROP TABLE IF EXISTS stripe.early_fraud_warnings;
DROP TABLE IF EXISTS stripe.disputes;
DROP TABLE IF EXISTS stripe.customers;
DROP TABLE IF EXISTS stripe.credit_notes;
DROP TABLE IF EXISTS stripe.coupons;
DROP TABLE IF EXISTS stripe.checkout_sessions;
DROP TABLE IF EXISTS stripe.checkout_session_line_items;
DROP TABLE IF EXISTS stripe.charges;
DROP TABLE IF EXISTS stripe.active_entitlements;
DROP TABLE IF EXISTS stripe.accounts;
DROP SEQUENCE IF EXISTS stripe._sync_status_id_seq;
DROP TABLE IF EXISTS stripe._sync_status;
DROP TABLE IF EXISTS stripe._migrations;
DROP TABLE IF EXISTS stripe._managed_webhooks;
DROP TABLE IF EXISTS public.purchases;
DROP SEQUENCE IF EXISTS public.messages_id_seq;
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.genie_conversions;
DROP SEQUENCE IF EXISTS public.efile_submissions_id_seq;
DROP TABLE IF EXISTS public.efile_submissions;
DROP SEQUENCE IF EXISTS public.efile_court_locations_id_seq;
DROP TABLE IF EXISTS public.efile_court_locations;
DROP TABLE IF EXISTS public.download_tokens;
DROP SEQUENCE IF EXISTS public.documents_id_seq;
DROP TABLE IF EXISTS public.documents;
DROP SEQUENCE IF EXISTS public.conversations_id_seq;
DROP TABLE IF EXISTS public.conversations;
DROP SEQUENCE IF EXISTS public.chat_messages_id_seq;
DROP TABLE IF EXISTS public.chat_messages;
DROP SEQUENCE IF EXISTS public.cases_id_seq;
DROP TABLE IF EXISTS public.cases;
DROP TABLE IF EXISTS public.beta_access;
DROP TABLE IF EXISTS public.ai_rate_limits;
DROP FUNCTION IF EXISTS public.set_updated_at_metadata();
DROP FUNCTION IF EXISTS public.set_updated_at();
DROP TYPE IF EXISTS stripe.subscription_status;
DROP TYPE IF EXISTS stripe.subscription_schedule_status;
DROP TYPE IF EXISTS stripe.pricing_type;
DROP TYPE IF EXISTS stripe.pricing_tiers;
DROP TYPE IF EXISTS stripe.invoice_status;
DROP SCHEMA IF EXISTS stripe;
--
-- Name: stripe; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA stripe;


ALTER SCHEMA stripe OWNER TO postgres;

--
-- Name: invoice_status; Type: TYPE; Schema: stripe; Owner: postgres
--

CREATE TYPE stripe.invoice_status AS ENUM (
    'draft',
    'open',
    'paid',
    'uncollectible',
    'void',
    'deleted'
);


ALTER TYPE stripe.invoice_status OWNER TO postgres;

--
-- Name: pricing_tiers; Type: TYPE; Schema: stripe; Owner: postgres
--

CREATE TYPE stripe.pricing_tiers AS ENUM (
    'graduated',
    'volume'
);


ALTER TYPE stripe.pricing_tiers OWNER TO postgres;

--
-- Name: pricing_type; Type: TYPE; Schema: stripe; Owner: postgres
--

CREATE TYPE stripe.pricing_type AS ENUM (
    'one_time',
    'recurring'
);


ALTER TYPE stripe.pricing_type OWNER TO postgres;

--
-- Name: subscription_schedule_status; Type: TYPE; Schema: stripe; Owner: postgres
--

CREATE TYPE stripe.subscription_schedule_status AS ENUM (
    'not_started',
    'active',
    'completed',
    'released',
    'canceled'
);


ALTER TYPE stripe.subscription_schedule_status OWNER TO postgres;

--
-- Name: subscription_status; Type: TYPE; Schema: stripe; Owner: postgres
--

CREATE TYPE stripe.subscription_status AS ENUM (
    'trialing',
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'unpaid',
    'paused'
);


ALTER TYPE stripe.subscription_status OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new._updated_at = now();
  return NEW;
end;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: set_updated_at_metadata(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at_metadata() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return NEW;
end;
$$;


ALTER FUNCTION public.set_updated_at_metadata() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_rate_limits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_rate_limits (
    user_id text NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    reset_at timestamp with time zone NOT NULL
);


ALTER TABLE public.ai_rate_limits OWNER TO postgres;

--
-- Name: beta_access; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.beta_access (
    id integer NOT NULL,
    user_id text NOT NULL,
    email text,
    claimed_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.beta_access OWNER TO postgres;

--
-- Name: beta_access_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.beta_access ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.beta_access_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cases (
    id integer NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    county_id text,
    claim_amount real,
    claim_type text,
    plaintiff_name text,
    plaintiff_phone text,
    plaintiff_address text,
    plaintiff_city text,
    plaintiff_state text DEFAULT 'CA'::text,
    plaintiff_zip text,
    plaintiff_email text,
    defendant_name text,
    defendant_phone text,
    defendant_address text,
    defendant_city text,
    defendant_state text DEFAULT 'CA'::text,
    defendant_zip text,
    defendant_is_business_or_entity boolean DEFAULT false,
    defendant_agent_name text,
    claim_description text,
    incident_date text,
    how_amount_calculated text,
    prior_demand_made boolean,
    prior_demand_description text,
    venue_reason text,
    venue_basis text,
    is_suing_public_entity boolean DEFAULT false,
    public_entity_claim_filed_date text,
    is_atty_fee_dispute boolean DEFAULT false,
    filed_more_than_12_claims boolean DEFAULT false,
    claim_over_2500 boolean DEFAULT false,
    intake_step integer DEFAULT 1,
    intake_complete boolean DEFAULT false,
    document_count integer DEFAULT 0,
    readiness_score integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    courthouse_id text,
    user_id text,
    demand_letter_text text,
    demand_letter_tone text,
    courthouse_name text,
    courthouse_address text,
    courthouse_city text,
    courthouse_zip text,
    courthouse_phone text,
    courthouse_website text,
    filing_fee integer,
    evidence_checklist jsonb,
    case_number text,
    hearing_date text,
    hearing_time text,
    hearing_judge text,
    hearing_courtroom text,
    hearing_notes text,
    reminder_14_day_sent boolean DEFAULT false,
    reminder_3_day_sent boolean DEFAULT false,
    reminder_no_hearing_date_sent boolean DEFAULT false,
    courthouse_clerk_email text,
    confirmation_email_sent boolean DEFAULT false,
    weekly_reminder_last_sent timestamp with time zone,
    reminder_30_day_sent boolean DEFAULT false,
    reminder_7_day_sent boolean DEFAULT false,
    reminder_1_day_sent boolean DEFAULT false,
    settlement_letter_text text,
    settlement_letter_tone text,
    settlement_agreement_text text,
    plaintiff_is_business boolean DEFAULT false,
    plaintiff_title text,
    second_plaintiff_name text,
    plaintiff_mailing_address text,
    plaintiff_mailing_city text,
    plaintiff_mailing_state text,
    plaintiff_mailing_zip text,
    second_plaintiff_phone text,
    second_plaintiff_address text,
    second_plaintiff_city text,
    second_plaintiff_state text,
    second_plaintiff_zip text,
    second_plaintiff_email text,
    second_plaintiff_mailing_address text,
    second_plaintiff_mailing_city text,
    second_plaintiff_mailing_state text,
    second_plaintiff_mailing_zip text,
    defendant_mailing_address text,
    defendant_mailing_city text,
    defendant_mailing_state text,
    defendant_mailing_zip text,
    defendant_agent_title text,
    defendant_agent_street text,
    defendant_agent_city text,
    defendant_agent_state text,
    defendant_agent_zip text,
    prior_demand_why_not text,
    had_arbitration boolean DEFAULT false,
    mc030_declaration_title text,
    demand_letter_text_formal text,
    demand_letter_text_firm text,
    demand_letter_text_friendly text,
    has_additional_plaintiff boolean DEFAULT false,
    additional_plaintiff_name text,
    additional_plaintiff_is_fictitious boolean DEFAULT false,
    more_than_four_plaintiffs boolean DEFAULT false,
    more_than_two_defendants boolean DEFAULT false,
    mc030_exhibit_doc_ids jsonb,
    sc104_data jsonb,
    notify_method text,
    prior_demand_date text,
    prior_demand_method text,
    statement_text text,
    no_show_statement_text text,
    plaintiff_is_fictitious boolean DEFAULT false,
    plaintiff_dba_name text,
    plaintiff_dba_address text,
    plaintiff_dba_city text,
    plaintiff_dba_state text,
    plaintiff_dba_zip text,
    plaintiff_dba_mailing_address text,
    plaintiff_business_type text,
    plaintiff_business_type_other text,
    plaintiff_fbn_number text,
    plaintiff_fbn_expiry text,
    plaintiff_fbn_sign_date text,
    second_plaintiff_dba_name text,
    second_plaintiff_dba_address text,
    second_plaintiff_dba_city text,
    second_plaintiff_dba_state text,
    second_plaintiff_dba_zip text,
    second_plaintiff_dba_mailing_address text,
    second_plaintiff_business_type text,
    second_plaintiff_business_type_other text,
    second_plaintiff_fbn_number text,
    second_plaintiff_fbn_expiry text,
    second_plaintiff_fbn_sign_date text,
    second_plaintiff_title text,
    plaintiff_fbn_county text,
    second_plaintiff_fbn_county text,
    mc030_declaration_text text,
    jurisdiction_state text DEFAULT 'CA'::text NOT NULL,
    efiling_eligible boolean,
    efiling_status text,
    efiling_envelope_id text,
    guided_intake_data jsonb
);


ALTER TABLE public.cases OWNER TO postgres;

--
-- Name: cases_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cases_id_seq OWNER TO postgres;

--
-- Name: cases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cases_id_seq OWNED BY public.cases.id;


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    id integer NOT NULL,
    case_id integer NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- Name: chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chat_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chat_messages_id_seq OWNER TO postgres;

--
-- Name: chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chat_messages_id_seq OWNED BY public.chat_messages.id;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id integer NOT NULL,
    title text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conversations_id_seq OWNER TO postgres;

--
-- Name: conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    case_id integer NOT NULL,
    filename text NOT NULL,
    original_name text NOT NULL,
    label text,
    mime_type text NOT NULL,
    file_size integer NOT NULL,
    file_data text,
    ocr_text text,
    ocr_status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    storage_object_path text,
    description text
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: download_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.download_tokens (
    token text NOT NULL,
    case_id integer NOT NULL,
    user_id text NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


ALTER TABLE public.download_tokens OWNER TO postgres;

--
-- Name: efile_court_locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.efile_court_locations (
    id integer NOT NULL,
    cli_code text NOT NULL,
    jurisdiction_state text NOT NULL,
    courthouse_id text,
    court_name text,
    filing_fee_amount integer,
    supports_small_claims boolean DEFAULT true,
    toga_url text,
    review_tool_url text,
    last_refreshed timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.efile_court_locations OWNER TO postgres;

--
-- Name: efile_court_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.efile_court_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.efile_court_locations_id_seq OWNER TO postgres;

--
-- Name: efile_court_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.efile_court_locations_id_seq OWNED BY public.efile_court_locations.id;


--
-- Name: efile_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.efile_submissions (
    id integer NOT NULL,
    case_id integer NOT NULL,
    user_id text NOT NULL,
    jurisdiction_state text NOT NULL,
    court_cli text,
    envelope_id text,
    status text DEFAULT 'submitted'::text NOT NULL,
    fees_charged integer,
    court_fee_amount integer,
    convenience_fee_amount integer,
    stripe_payment_intent_id text,
    rejection_reason text,
    submitted_at timestamp with time zone,
    accepted_at timestamp with time zone,
    rejected_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.efile_submissions OWNER TO postgres;

--
-- Name: efile_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.efile_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.efile_submissions_id_seq OWNER TO postgres;

--
-- Name: efile_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.efile_submissions_id_seq OWNED BY public.efile_submissions.id;


--
-- Name: genie_conversions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.genie_conversions (
    id integer NOT NULL,
    question text NOT NULL,
    answer_snippet text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.genie_conversions OWNER TO postgres;

--
-- Name: genie_conversions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.genie_conversions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.genie_conversions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    conversation_id integer NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: purchases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchases (
    id integer NOT NULL,
    user_id text NOT NULL,
    stripe_session_id text NOT NULL,
    stripe_price_id text,
    stripe_product_id text,
    plan_key text,
    amount_total integer,
    currency text,
    status text DEFAULT 'complete'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.purchases OWNER TO postgres;

--
-- Name: purchases_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.purchases ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.purchases_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: _managed_webhooks; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe._managed_webhooks (
    id text NOT NULL,
    object text,
    url text NOT NULL,
    enabled_events jsonb NOT NULL,
    description text,
    enabled boolean,
    livemode boolean,
    metadata jsonb,
    secret text NOT NULL,
    status text,
    api_version text,
    created integer,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_synced_at timestamp with time zone,
    account_id text NOT NULL
);


ALTER TABLE stripe._managed_webhooks OWNER TO postgres;

--
-- Name: _migrations; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe._migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE stripe._migrations OWNER TO postgres;

--
-- Name: _sync_status; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe._sync_status (
    id integer NOT NULL,
    resource text NOT NULL,
    status text DEFAULT 'idle'::text,
    last_synced_at timestamp with time zone DEFAULT now(),
    last_incremental_cursor timestamp with time zone,
    error_message text,
    updated_at timestamp with time zone DEFAULT now(),
    account_id text NOT NULL,
    CONSTRAINT _sync_status_status_check CHECK ((status = ANY (ARRAY['idle'::text, 'running'::text, 'complete'::text, 'error'::text])))
);


ALTER TABLE stripe._sync_status OWNER TO postgres;

--
-- Name: _sync_status_id_seq; Type: SEQUENCE; Schema: stripe; Owner: postgres
--

CREATE SEQUENCE stripe._sync_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE stripe._sync_status_id_seq OWNER TO postgres;

--
-- Name: _sync_status_id_seq; Type: SEQUENCE OWNED BY; Schema: stripe; Owner: postgres
--

ALTER SEQUENCE stripe._sync_status_id_seq OWNED BY stripe._sync_status.id;


--
-- Name: accounts; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.accounts (
    _raw_data jsonb NOT NULL,
    first_synced_at timestamp with time zone DEFAULT now() NOT NULL,
    _last_synced_at timestamp with time zone DEFAULT now() NOT NULL,
    _updated_at timestamp with time zone DEFAULT now() NOT NULL,
    business_name text GENERATED ALWAYS AS (((_raw_data -> 'business_profile'::text) ->> 'name'::text)) STORED,
    email text GENERATED ALWAYS AS ((_raw_data ->> 'email'::text)) STORED,
    type text GENERATED ALWAYS AS ((_raw_data ->> 'type'::text)) STORED,
    charges_enabled boolean GENERATED ALWAYS AS (((_raw_data ->> 'charges_enabled'::text))::boolean) STORED,
    payouts_enabled boolean GENERATED ALWAYS AS (((_raw_data ->> 'payouts_enabled'::text))::boolean) STORED,
    details_submitted boolean GENERATED ALWAYS AS (((_raw_data ->> 'details_submitted'::text))::boolean) STORED,
    country text GENERATED ALWAYS AS ((_raw_data ->> 'country'::text)) STORED,
    default_currency text GENERATED ALWAYS AS ((_raw_data ->> 'default_currency'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    api_key_hashes text[] DEFAULT '{}'::text[],
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.accounts OWNER TO postgres;

--
-- Name: active_entitlements; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.active_entitlements (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    feature text GENERATED ALWAYS AS ((_raw_data ->> 'feature'::text)) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    lookup_key text GENERATED ALWAYS AS ((_raw_data ->> 'lookup_key'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.active_entitlements OWNER TO postgres;

--
-- Name: charges; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.charges (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    paid boolean GENERATED ALWAYS AS (((_raw_data ->> 'paid'::text))::boolean) STORED,
    "order" text GENERATED ALWAYS AS ((_raw_data ->> 'order'::text)) STORED,
    amount bigint GENERATED ALWAYS AS (((_raw_data ->> 'amount'::text))::bigint) STORED,
    review text GENERATED ALWAYS AS ((_raw_data ->> 'review'::text)) STORED,
    source jsonb GENERATED ALWAYS AS ((_raw_data -> 'source'::text)) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    dispute text GENERATED ALWAYS AS ((_raw_data ->> 'dispute'::text)) STORED,
    invoice text GENERATED ALWAYS AS ((_raw_data ->> 'invoice'::text)) STORED,
    outcome jsonb GENERATED ALWAYS AS ((_raw_data -> 'outcome'::text)) STORED,
    refunds jsonb GENERATED ALWAYS AS ((_raw_data -> 'refunds'::text)) STORED,
    updated integer GENERATED ALWAYS AS (((_raw_data ->> 'updated'::text))::integer) STORED,
    captured boolean GENERATED ALWAYS AS (((_raw_data ->> 'captured'::text))::boolean) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    refunded boolean GENERATED ALWAYS AS (((_raw_data ->> 'refunded'::text))::boolean) STORED,
    shipping jsonb GENERATED ALWAYS AS ((_raw_data -> 'shipping'::text)) STORED,
    application text GENERATED ALWAYS AS ((_raw_data ->> 'application'::text)) STORED,
    description text GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
    destination text GENERATED ALWAYS AS ((_raw_data ->> 'destination'::text)) STORED,
    failure_code text GENERATED ALWAYS AS ((_raw_data ->> 'failure_code'::text)) STORED,
    on_behalf_of text GENERATED ALWAYS AS ((_raw_data ->> 'on_behalf_of'::text)) STORED,
    fraud_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'fraud_details'::text)) STORED,
    receipt_email text GENERATED ALWAYS AS ((_raw_data ->> 'receipt_email'::text)) STORED,
    payment_intent text GENERATED ALWAYS AS ((_raw_data ->> 'payment_intent'::text)) STORED,
    receipt_number text GENERATED ALWAYS AS ((_raw_data ->> 'receipt_number'::text)) STORED,
    transfer_group text GENERATED ALWAYS AS ((_raw_data ->> 'transfer_group'::text)) STORED,
    amount_refunded bigint GENERATED ALWAYS AS (((_raw_data ->> 'amount_refunded'::text))::bigint) STORED,
    application_fee text GENERATED ALWAYS AS ((_raw_data ->> 'application_fee'::text)) STORED,
    failure_message text GENERATED ALWAYS AS ((_raw_data ->> 'failure_message'::text)) STORED,
    source_transfer text GENERATED ALWAYS AS ((_raw_data ->> 'source_transfer'::text)) STORED,
    balance_transaction text GENERATED ALWAYS AS ((_raw_data ->> 'balance_transaction'::text)) STORED,
    statement_descriptor text GENERATED ALWAYS AS ((_raw_data ->> 'statement_descriptor'::text)) STORED,
    payment_method_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'payment_method_details'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.charges OWNER TO postgres;

--
-- Name: checkout_session_line_items; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.checkout_session_line_items (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    amount_discount integer GENERATED ALWAYS AS (((_raw_data ->> 'amount_discount'::text))::integer) STORED,
    amount_subtotal integer GENERATED ALWAYS AS (((_raw_data ->> 'amount_subtotal'::text))::integer) STORED,
    amount_tax integer GENERATED ALWAYS AS (((_raw_data ->> 'amount_tax'::text))::integer) STORED,
    amount_total integer GENERATED ALWAYS AS (((_raw_data ->> 'amount_total'::text))::integer) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    description text GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
    price text GENERATED ALWAYS AS ((_raw_data ->> 'price'::text)) STORED,
    quantity integer GENERATED ALWAYS AS (((_raw_data ->> 'quantity'::text))::integer) STORED,
    checkout_session text GENERATED ALWAYS AS ((_raw_data ->> 'checkout_session'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.checkout_session_line_items OWNER TO postgres;

--
-- Name: checkout_sessions; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.checkout_sessions (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    adaptive_pricing jsonb GENERATED ALWAYS AS ((_raw_data -> 'adaptive_pricing'::text)) STORED,
    after_expiration jsonb GENERATED ALWAYS AS ((_raw_data -> 'after_expiration'::text)) STORED,
    allow_promotion_codes boolean GENERATED ALWAYS AS (((_raw_data ->> 'allow_promotion_codes'::text))::boolean) STORED,
    amount_subtotal integer GENERATED ALWAYS AS (((_raw_data ->> 'amount_subtotal'::text))::integer) STORED,
    amount_total integer GENERATED ALWAYS AS (((_raw_data ->> 'amount_total'::text))::integer) STORED,
    automatic_tax jsonb GENERATED ALWAYS AS ((_raw_data -> 'automatic_tax'::text)) STORED,
    billing_address_collection text GENERATED ALWAYS AS ((_raw_data ->> 'billing_address_collection'::text)) STORED,
    cancel_url text GENERATED ALWAYS AS ((_raw_data ->> 'cancel_url'::text)) STORED,
    client_reference_id text GENERATED ALWAYS AS ((_raw_data ->> 'client_reference_id'::text)) STORED,
    client_secret text GENERATED ALWAYS AS ((_raw_data ->> 'client_secret'::text)) STORED,
    collected_information jsonb GENERATED ALWAYS AS ((_raw_data -> 'collected_information'::text)) STORED,
    consent jsonb GENERATED ALWAYS AS ((_raw_data -> 'consent'::text)) STORED,
    consent_collection jsonb GENERATED ALWAYS AS ((_raw_data -> 'consent_collection'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    currency_conversion jsonb GENERATED ALWAYS AS ((_raw_data -> 'currency_conversion'::text)) STORED,
    custom_fields jsonb GENERATED ALWAYS AS ((_raw_data -> 'custom_fields'::text)) STORED,
    custom_text jsonb GENERATED ALWAYS AS ((_raw_data -> 'custom_text'::text)) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    customer_creation text GENERATED ALWAYS AS ((_raw_data ->> 'customer_creation'::text)) STORED,
    customer_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'customer_details'::text)) STORED,
    customer_email text GENERATED ALWAYS AS ((_raw_data ->> 'customer_email'::text)) STORED,
    discounts jsonb GENERATED ALWAYS AS ((_raw_data -> 'discounts'::text)) STORED,
    expires_at integer GENERATED ALWAYS AS (((_raw_data ->> 'expires_at'::text))::integer) STORED,
    invoice text GENERATED ALWAYS AS ((_raw_data ->> 'invoice'::text)) STORED,
    invoice_creation jsonb GENERATED ALWAYS AS ((_raw_data -> 'invoice_creation'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    locale text GENERATED ALWAYS AS ((_raw_data ->> 'locale'::text)) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    mode text GENERATED ALWAYS AS ((_raw_data ->> 'mode'::text)) STORED,
    optional_items jsonb GENERATED ALWAYS AS ((_raw_data -> 'optional_items'::text)) STORED,
    payment_intent text GENERATED ALWAYS AS ((_raw_data ->> 'payment_intent'::text)) STORED,
    payment_link text GENERATED ALWAYS AS ((_raw_data ->> 'payment_link'::text)) STORED,
    payment_method_collection text GENERATED ALWAYS AS ((_raw_data ->> 'payment_method_collection'::text)) STORED,
    payment_method_configuration_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'payment_method_configuration_details'::text)) STORED,
    payment_method_options jsonb GENERATED ALWAYS AS ((_raw_data -> 'payment_method_options'::text)) STORED,
    payment_method_types jsonb GENERATED ALWAYS AS ((_raw_data -> 'payment_method_types'::text)) STORED,
    payment_status text GENERATED ALWAYS AS ((_raw_data ->> 'payment_status'::text)) STORED,
    permissions jsonb GENERATED ALWAYS AS ((_raw_data -> 'permissions'::text)) STORED,
    phone_number_collection jsonb GENERATED ALWAYS AS ((_raw_data -> 'phone_number_collection'::text)) STORED,
    presentment_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'presentment_details'::text)) STORED,
    recovered_from text GENERATED ALWAYS AS ((_raw_data ->> 'recovered_from'::text)) STORED,
    redirect_on_completion text GENERATED ALWAYS AS ((_raw_data ->> 'redirect_on_completion'::text)) STORED,
    return_url text GENERATED ALWAYS AS ((_raw_data ->> 'return_url'::text)) STORED,
    saved_payment_method_options jsonb GENERATED ALWAYS AS ((_raw_data -> 'saved_payment_method_options'::text)) STORED,
    setup_intent text GENERATED ALWAYS AS ((_raw_data ->> 'setup_intent'::text)) STORED,
    shipping_address_collection jsonb GENERATED ALWAYS AS ((_raw_data -> 'shipping_address_collection'::text)) STORED,
    shipping_cost jsonb GENERATED ALWAYS AS ((_raw_data -> 'shipping_cost'::text)) STORED,
    shipping_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'shipping_details'::text)) STORED,
    shipping_options jsonb GENERATED ALWAYS AS ((_raw_data -> 'shipping_options'::text)) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    submit_type text GENERATED ALWAYS AS ((_raw_data ->> 'submit_type'::text)) STORED,
    subscription text GENERATED ALWAYS AS ((_raw_data ->> 'subscription'::text)) STORED,
    success_url text GENERATED ALWAYS AS ((_raw_data ->> 'success_url'::text)) STORED,
    tax_id_collection jsonb GENERATED ALWAYS AS ((_raw_data -> 'tax_id_collection'::text)) STORED,
    total_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'total_details'::text)) STORED,
    ui_mode text GENERATED ALWAYS AS ((_raw_data ->> 'ui_mode'::text)) STORED,
    url text GENERATED ALWAYS AS ((_raw_data ->> 'url'::text)) STORED,
    wallet_options jsonb GENERATED ALWAYS AS ((_raw_data -> 'wallet_options'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.checkout_sessions OWNER TO postgres;

--
-- Name: coupons; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.coupons (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    name text GENERATED ALWAYS AS ((_raw_data ->> 'name'::text)) STORED,
    valid boolean GENERATED ALWAYS AS (((_raw_data ->> 'valid'::text))::boolean) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    updated integer GENERATED ALWAYS AS (((_raw_data ->> 'updated'::text))::integer) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    duration text GENERATED ALWAYS AS ((_raw_data ->> 'duration'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    redeem_by integer GENERATED ALWAYS AS (((_raw_data ->> 'redeem_by'::text))::integer) STORED,
    amount_off bigint GENERATED ALWAYS AS (((_raw_data ->> 'amount_off'::text))::bigint) STORED,
    percent_off double precision GENERATED ALWAYS AS (((_raw_data ->> 'percent_off'::text))::double precision) STORED,
    times_redeemed bigint GENERATED ALWAYS AS (((_raw_data ->> 'times_redeemed'::text))::bigint) STORED,
    max_redemptions bigint GENERATED ALWAYS AS (((_raw_data ->> 'max_redemptions'::text))::bigint) STORED,
    duration_in_months bigint GENERATED ALWAYS AS (((_raw_data ->> 'duration_in_months'::text))::bigint) STORED,
    percent_off_precise double precision GENERATED ALWAYS AS (((_raw_data ->> 'percent_off_precise'::text))::double precision) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.coupons OWNER TO postgres;

--
-- Name: credit_notes; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.credit_notes (
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    amount integer GENERATED ALWAYS AS (((_raw_data ->> 'amount'::text))::integer) STORED,
    amount_shipping integer GENERATED ALWAYS AS (((_raw_data ->> 'amount_shipping'::text))::integer) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    customer_balance_transaction text GENERATED ALWAYS AS ((_raw_data ->> 'customer_balance_transaction'::text)) STORED,
    discount_amount integer GENERATED ALWAYS AS (((_raw_data ->> 'discount_amount'::text))::integer) STORED,
    discount_amounts jsonb GENERATED ALWAYS AS ((_raw_data -> 'discount_amounts'::text)) STORED,
    invoice text GENERATED ALWAYS AS ((_raw_data ->> 'invoice'::text)) STORED,
    lines jsonb GENERATED ALWAYS AS ((_raw_data -> 'lines'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    memo text GENERATED ALWAYS AS ((_raw_data ->> 'memo'::text)) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    number text GENERATED ALWAYS AS ((_raw_data ->> 'number'::text)) STORED,
    out_of_band_amount integer GENERATED ALWAYS AS (((_raw_data ->> 'out_of_band_amount'::text))::integer) STORED,
    pdf text GENERATED ALWAYS AS ((_raw_data ->> 'pdf'::text)) STORED,
    reason text GENERATED ALWAYS AS ((_raw_data ->> 'reason'::text)) STORED,
    refund text GENERATED ALWAYS AS ((_raw_data ->> 'refund'::text)) STORED,
    shipping_cost jsonb GENERATED ALWAYS AS ((_raw_data -> 'shipping_cost'::text)) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    subtotal integer GENERATED ALWAYS AS (((_raw_data ->> 'subtotal'::text))::integer) STORED,
    subtotal_excluding_tax integer GENERATED ALWAYS AS (((_raw_data ->> 'subtotal_excluding_tax'::text))::integer) STORED,
    tax_amounts jsonb GENERATED ALWAYS AS ((_raw_data -> 'tax_amounts'::text)) STORED,
    total integer GENERATED ALWAYS AS (((_raw_data ->> 'total'::text))::integer) STORED,
    total_excluding_tax integer GENERATED ALWAYS AS (((_raw_data ->> 'total_excluding_tax'::text))::integer) STORED,
    type text GENERATED ALWAYS AS ((_raw_data ->> 'type'::text)) STORED,
    voided_at text GENERATED ALWAYS AS ((_raw_data ->> 'voided_at'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.credit_notes OWNER TO postgres;

--
-- Name: customers; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.customers (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    address jsonb GENERATED ALWAYS AS ((_raw_data -> 'address'::text)) STORED,
    description text GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
    email text GENERATED ALWAYS AS ((_raw_data ->> 'email'::text)) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    name text GENERATED ALWAYS AS ((_raw_data ->> 'name'::text)) STORED,
    phone text GENERATED ALWAYS AS ((_raw_data ->> 'phone'::text)) STORED,
    shipping jsonb GENERATED ALWAYS AS ((_raw_data -> 'shipping'::text)) STORED,
    balance integer GENERATED ALWAYS AS (((_raw_data ->> 'balance'::text))::integer) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    default_source text GENERATED ALWAYS AS ((_raw_data ->> 'default_source'::text)) STORED,
    delinquent boolean GENERATED ALWAYS AS (((_raw_data ->> 'delinquent'::text))::boolean) STORED,
    discount jsonb GENERATED ALWAYS AS ((_raw_data -> 'discount'::text)) STORED,
    invoice_prefix text GENERATED ALWAYS AS ((_raw_data ->> 'invoice_prefix'::text)) STORED,
    invoice_settings jsonb GENERATED ALWAYS AS ((_raw_data -> 'invoice_settings'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    next_invoice_sequence integer GENERATED ALWAYS AS (((_raw_data ->> 'next_invoice_sequence'::text))::integer) STORED,
    preferred_locales jsonb GENERATED ALWAYS AS ((_raw_data -> 'preferred_locales'::text)) STORED,
    tax_exempt text GENERATED ALWAYS AS ((_raw_data ->> 'tax_exempt'::text)) STORED,
    deleted boolean GENERATED ALWAYS AS (((_raw_data ->> 'deleted'::text))::boolean) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.customers OWNER TO postgres;

--
-- Name: disputes; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.disputes (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    amount bigint GENERATED ALWAYS AS (((_raw_data ->> 'amount'::text))::bigint) STORED,
    charge text GENERATED ALWAYS AS ((_raw_data ->> 'charge'::text)) STORED,
    reason text GENERATED ALWAYS AS ((_raw_data ->> 'reason'::text)) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    updated integer GENERATED ALWAYS AS (((_raw_data ->> 'updated'::text))::integer) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    evidence jsonb GENERATED ALWAYS AS ((_raw_data -> 'evidence'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    evidence_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'evidence_details'::text)) STORED,
    balance_transactions jsonb GENERATED ALWAYS AS ((_raw_data -> 'balance_transactions'::text)) STORED,
    is_charge_refundable boolean GENERATED ALWAYS AS (((_raw_data ->> 'is_charge_refundable'::text))::boolean) STORED,
    payment_intent text GENERATED ALWAYS AS ((_raw_data ->> 'payment_intent'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.disputes OWNER TO postgres;

--
-- Name: early_fraud_warnings; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.early_fraud_warnings (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    actionable boolean GENERATED ALWAYS AS (((_raw_data ->> 'actionable'::text))::boolean) STORED,
    charge text GENERATED ALWAYS AS ((_raw_data ->> 'charge'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    fraud_type text GENERATED ALWAYS AS ((_raw_data ->> 'fraud_type'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    payment_intent text GENERATED ALWAYS AS ((_raw_data ->> 'payment_intent'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.early_fraud_warnings OWNER TO postgres;

--
-- Name: events; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.events (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    data jsonb GENERATED ALWAYS AS ((_raw_data -> 'data'::text)) STORED,
    type text GENERATED ALWAYS AS ((_raw_data ->> 'type'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    request text GENERATED ALWAYS AS ((_raw_data ->> 'request'::text)) STORED,
    updated integer GENERATED ALWAYS AS (((_raw_data ->> 'updated'::text))::integer) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    api_version text GENERATED ALWAYS AS ((_raw_data ->> 'api_version'::text)) STORED,
    pending_webhooks bigint GENERATED ALWAYS AS (((_raw_data ->> 'pending_webhooks'::text))::bigint) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.events OWNER TO postgres;

--
-- Name: features; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.features (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    name text GENERATED ALWAYS AS ((_raw_data ->> 'name'::text)) STORED,
    lookup_key text GENERATED ALWAYS AS ((_raw_data ->> 'lookup_key'::text)) STORED,
    active boolean GENERATED ALWAYS AS (((_raw_data ->> 'active'::text))::boolean) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.features OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.invoices (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    auto_advance boolean GENERATED ALWAYS AS (((_raw_data ->> 'auto_advance'::text))::boolean) STORED,
    collection_method text GENERATED ALWAYS AS ((_raw_data ->> 'collection_method'::text)) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    description text GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
    hosted_invoice_url text GENERATED ALWAYS AS ((_raw_data ->> 'hosted_invoice_url'::text)) STORED,
    lines jsonb GENERATED ALWAYS AS ((_raw_data -> 'lines'::text)) STORED,
    period_end integer GENERATED ALWAYS AS (((_raw_data ->> 'period_end'::text))::integer) STORED,
    period_start integer GENERATED ALWAYS AS (((_raw_data ->> 'period_start'::text))::integer) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    total bigint GENERATED ALWAYS AS (((_raw_data ->> 'total'::text))::bigint) STORED,
    account_country text GENERATED ALWAYS AS ((_raw_data ->> 'account_country'::text)) STORED,
    account_name text GENERATED ALWAYS AS ((_raw_data ->> 'account_name'::text)) STORED,
    account_tax_ids jsonb GENERATED ALWAYS AS ((_raw_data -> 'account_tax_ids'::text)) STORED,
    amount_due bigint GENERATED ALWAYS AS (((_raw_data ->> 'amount_due'::text))::bigint) STORED,
    amount_paid bigint GENERATED ALWAYS AS (((_raw_data ->> 'amount_paid'::text))::bigint) STORED,
    amount_remaining bigint GENERATED ALWAYS AS (((_raw_data ->> 'amount_remaining'::text))::bigint) STORED,
    application_fee_amount bigint GENERATED ALWAYS AS (((_raw_data ->> 'application_fee_amount'::text))::bigint) STORED,
    attempt_count integer GENERATED ALWAYS AS (((_raw_data ->> 'attempt_count'::text))::integer) STORED,
    attempted boolean GENERATED ALWAYS AS (((_raw_data ->> 'attempted'::text))::boolean) STORED,
    billing_reason text GENERATED ALWAYS AS ((_raw_data ->> 'billing_reason'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    custom_fields jsonb GENERATED ALWAYS AS ((_raw_data -> 'custom_fields'::text)) STORED,
    customer_address jsonb GENERATED ALWAYS AS ((_raw_data -> 'customer_address'::text)) STORED,
    customer_email text GENERATED ALWAYS AS ((_raw_data ->> 'customer_email'::text)) STORED,
    customer_name text GENERATED ALWAYS AS ((_raw_data ->> 'customer_name'::text)) STORED,
    customer_phone text GENERATED ALWAYS AS ((_raw_data ->> 'customer_phone'::text)) STORED,
    customer_shipping jsonb GENERATED ALWAYS AS ((_raw_data -> 'customer_shipping'::text)) STORED,
    customer_tax_exempt text GENERATED ALWAYS AS ((_raw_data ->> 'customer_tax_exempt'::text)) STORED,
    customer_tax_ids jsonb GENERATED ALWAYS AS ((_raw_data -> 'customer_tax_ids'::text)) STORED,
    default_tax_rates jsonb GENERATED ALWAYS AS ((_raw_data -> 'default_tax_rates'::text)) STORED,
    discount jsonb GENERATED ALWAYS AS ((_raw_data -> 'discount'::text)) STORED,
    discounts jsonb GENERATED ALWAYS AS ((_raw_data -> 'discounts'::text)) STORED,
    due_date integer GENERATED ALWAYS AS (((_raw_data ->> 'due_date'::text))::integer) STORED,
    ending_balance integer GENERATED ALWAYS AS (((_raw_data ->> 'ending_balance'::text))::integer) STORED,
    footer text GENERATED ALWAYS AS ((_raw_data ->> 'footer'::text)) STORED,
    invoice_pdf text GENERATED ALWAYS AS ((_raw_data ->> 'invoice_pdf'::text)) STORED,
    last_finalization_error jsonb GENERATED ALWAYS AS ((_raw_data -> 'last_finalization_error'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    next_payment_attempt integer GENERATED ALWAYS AS (((_raw_data ->> 'next_payment_attempt'::text))::integer) STORED,
    number text GENERATED ALWAYS AS ((_raw_data ->> 'number'::text)) STORED,
    paid boolean GENERATED ALWAYS AS (((_raw_data ->> 'paid'::text))::boolean) STORED,
    payment_settings jsonb GENERATED ALWAYS AS ((_raw_data -> 'payment_settings'::text)) STORED,
    post_payment_credit_notes_amount integer GENERATED ALWAYS AS (((_raw_data ->> 'post_payment_credit_notes_amount'::text))::integer) STORED,
    pre_payment_credit_notes_amount integer GENERATED ALWAYS AS (((_raw_data ->> 'pre_payment_credit_notes_amount'::text))::integer) STORED,
    receipt_number text GENERATED ALWAYS AS ((_raw_data ->> 'receipt_number'::text)) STORED,
    starting_balance integer GENERATED ALWAYS AS (((_raw_data ->> 'starting_balance'::text))::integer) STORED,
    statement_descriptor text GENERATED ALWAYS AS ((_raw_data ->> 'statement_descriptor'::text)) STORED,
    status_transitions jsonb GENERATED ALWAYS AS ((_raw_data -> 'status_transitions'::text)) STORED,
    subtotal integer GENERATED ALWAYS AS (((_raw_data ->> 'subtotal'::text))::integer) STORED,
    tax integer GENERATED ALWAYS AS (((_raw_data ->> 'tax'::text))::integer) STORED,
    total_discount_amounts jsonb GENERATED ALWAYS AS ((_raw_data -> 'total_discount_amounts'::text)) STORED,
    total_tax_amounts jsonb GENERATED ALWAYS AS ((_raw_data -> 'total_tax_amounts'::text)) STORED,
    transfer_data jsonb GENERATED ALWAYS AS ((_raw_data -> 'transfer_data'::text)) STORED,
    webhooks_delivered_at integer GENERATED ALWAYS AS (((_raw_data ->> 'webhooks_delivered_at'::text))::integer) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    subscription text GENERATED ALWAYS AS ((_raw_data ->> 'subscription'::text)) STORED,
    payment_intent text GENERATED ALWAYS AS ((_raw_data ->> 'payment_intent'::text)) STORED,
    default_payment_method text GENERATED ALWAYS AS ((_raw_data ->> 'default_payment_method'::text)) STORED,
    default_source text GENERATED ALWAYS AS ((_raw_data ->> 'default_source'::text)) STORED,
    on_behalf_of text GENERATED ALWAYS AS ((_raw_data ->> 'on_behalf_of'::text)) STORED,
    charge text GENERATED ALWAYS AS ((_raw_data ->> 'charge'::text)) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.invoices OWNER TO postgres;

--
-- Name: payment_intents; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.payment_intents (
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    amount integer GENERATED ALWAYS AS (((_raw_data ->> 'amount'::text))::integer) STORED,
    amount_capturable integer GENERATED ALWAYS AS (((_raw_data ->> 'amount_capturable'::text))::integer) STORED,
    amount_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'amount_details'::text)) STORED,
    amount_received integer GENERATED ALWAYS AS (((_raw_data ->> 'amount_received'::text))::integer) STORED,
    application text GENERATED ALWAYS AS ((_raw_data ->> 'application'::text)) STORED,
    application_fee_amount integer GENERATED ALWAYS AS (((_raw_data ->> 'application_fee_amount'::text))::integer) STORED,
    automatic_payment_methods text GENERATED ALWAYS AS ((_raw_data ->> 'automatic_payment_methods'::text)) STORED,
    canceled_at integer GENERATED ALWAYS AS (((_raw_data ->> 'canceled_at'::text))::integer) STORED,
    cancellation_reason text GENERATED ALWAYS AS ((_raw_data ->> 'cancellation_reason'::text)) STORED,
    capture_method text GENERATED ALWAYS AS ((_raw_data ->> 'capture_method'::text)) STORED,
    client_secret text GENERATED ALWAYS AS ((_raw_data ->> 'client_secret'::text)) STORED,
    confirmation_method text GENERATED ALWAYS AS ((_raw_data ->> 'confirmation_method'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    description text GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
    invoice text GENERATED ALWAYS AS ((_raw_data ->> 'invoice'::text)) STORED,
    last_payment_error text GENERATED ALWAYS AS ((_raw_data ->> 'last_payment_error'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    next_action text GENERATED ALWAYS AS ((_raw_data ->> 'next_action'::text)) STORED,
    on_behalf_of text GENERATED ALWAYS AS ((_raw_data ->> 'on_behalf_of'::text)) STORED,
    payment_method text GENERATED ALWAYS AS ((_raw_data ->> 'payment_method'::text)) STORED,
    payment_method_options jsonb GENERATED ALWAYS AS ((_raw_data -> 'payment_method_options'::text)) STORED,
    payment_method_types jsonb GENERATED ALWAYS AS ((_raw_data -> 'payment_method_types'::text)) STORED,
    processing text GENERATED ALWAYS AS ((_raw_data ->> 'processing'::text)) STORED,
    receipt_email text GENERATED ALWAYS AS ((_raw_data ->> 'receipt_email'::text)) STORED,
    review text GENERATED ALWAYS AS ((_raw_data ->> 'review'::text)) STORED,
    setup_future_usage text GENERATED ALWAYS AS ((_raw_data ->> 'setup_future_usage'::text)) STORED,
    shipping jsonb GENERATED ALWAYS AS ((_raw_data -> 'shipping'::text)) STORED,
    statement_descriptor text GENERATED ALWAYS AS ((_raw_data ->> 'statement_descriptor'::text)) STORED,
    statement_descriptor_suffix text GENERATED ALWAYS AS ((_raw_data ->> 'statement_descriptor_suffix'::text)) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    transfer_data jsonb GENERATED ALWAYS AS ((_raw_data -> 'transfer_data'::text)) STORED,
    transfer_group text GENERATED ALWAYS AS ((_raw_data ->> 'transfer_group'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.payment_intents OWNER TO postgres;

--
-- Name: payment_methods; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.payment_methods (
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    type text GENERATED ALWAYS AS ((_raw_data ->> 'type'::text)) STORED,
    billing_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'billing_details'::text)) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    card jsonb GENERATED ALWAYS AS ((_raw_data -> 'card'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.payment_methods OWNER TO postgres;

--
-- Name: payouts; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.payouts (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    date text GENERATED ALWAYS AS ((_raw_data ->> 'date'::text)) STORED,
    type text GENERATED ALWAYS AS ((_raw_data ->> 'type'::text)) STORED,
    amount bigint GENERATED ALWAYS AS (((_raw_data ->> 'amount'::text))::bigint) STORED,
    method text GENERATED ALWAYS AS ((_raw_data ->> 'method'::text)) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    updated integer GENERATED ALWAYS AS (((_raw_data ->> 'updated'::text))::integer) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    automatic boolean GENERATED ALWAYS AS (((_raw_data ->> 'automatic'::text))::boolean) STORED,
    recipient text GENERATED ALWAYS AS ((_raw_data ->> 'recipient'::text)) STORED,
    description text GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
    destination text GENERATED ALWAYS AS ((_raw_data ->> 'destination'::text)) STORED,
    source_type text GENERATED ALWAYS AS ((_raw_data ->> 'source_type'::text)) STORED,
    arrival_date text GENERATED ALWAYS AS ((_raw_data ->> 'arrival_date'::text)) STORED,
    bank_account jsonb GENERATED ALWAYS AS ((_raw_data -> 'bank_account'::text)) STORED,
    failure_code text GENERATED ALWAYS AS ((_raw_data ->> 'failure_code'::text)) STORED,
    transfer_group text GENERATED ALWAYS AS ((_raw_data ->> 'transfer_group'::text)) STORED,
    amount_reversed bigint GENERATED ALWAYS AS (((_raw_data ->> 'amount_reversed'::text))::bigint) STORED,
    failure_message text GENERATED ALWAYS AS ((_raw_data ->> 'failure_message'::text)) STORED,
    source_transaction text GENERATED ALWAYS AS ((_raw_data ->> 'source_transaction'::text)) STORED,
    balance_transaction text GENERATED ALWAYS AS ((_raw_data ->> 'balance_transaction'::text)) STORED,
    statement_descriptor text GENERATED ALWAYS AS ((_raw_data ->> 'statement_descriptor'::text)) STORED,
    statement_description text GENERATED ALWAYS AS ((_raw_data ->> 'statement_description'::text)) STORED,
    failure_balance_transaction text GENERATED ALWAYS AS ((_raw_data ->> 'failure_balance_transaction'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.payouts OWNER TO postgres;

--
-- Name: plans; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.plans (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    name text GENERATED ALWAYS AS ((_raw_data ->> 'name'::text)) STORED,
    tiers jsonb GENERATED ALWAYS AS ((_raw_data -> 'tiers'::text)) STORED,
    active boolean GENERATED ALWAYS AS (((_raw_data ->> 'active'::text))::boolean) STORED,
    amount bigint GENERATED ALWAYS AS (((_raw_data ->> 'amount'::text))::bigint) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    product text GENERATED ALWAYS AS ((_raw_data ->> 'product'::text)) STORED,
    updated integer GENERATED ALWAYS AS (((_raw_data ->> 'updated'::text))::integer) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    "interval" text GENERATED ALWAYS AS ((_raw_data ->> 'interval'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    nickname text GENERATED ALWAYS AS ((_raw_data ->> 'nickname'::text)) STORED,
    tiers_mode text GENERATED ALWAYS AS ((_raw_data ->> 'tiers_mode'::text)) STORED,
    usage_type text GENERATED ALWAYS AS ((_raw_data ->> 'usage_type'::text)) STORED,
    billing_scheme text GENERATED ALWAYS AS ((_raw_data ->> 'billing_scheme'::text)) STORED,
    interval_count bigint GENERATED ALWAYS AS (((_raw_data ->> 'interval_count'::text))::bigint) STORED,
    aggregate_usage text GENERATED ALWAYS AS ((_raw_data ->> 'aggregate_usage'::text)) STORED,
    transform_usage text GENERATED ALWAYS AS ((_raw_data ->> 'transform_usage'::text)) STORED,
    trial_period_days bigint GENERATED ALWAYS AS (((_raw_data ->> 'trial_period_days'::text))::bigint) STORED,
    statement_descriptor text GENERATED ALWAYS AS ((_raw_data ->> 'statement_descriptor'::text)) STORED,
    statement_description text GENERATED ALWAYS AS ((_raw_data ->> 'statement_description'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.plans OWNER TO postgres;

--
-- Name: prices; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.prices (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    active boolean GENERATED ALWAYS AS (((_raw_data ->> 'active'::text))::boolean) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    nickname text GENERATED ALWAYS AS ((_raw_data ->> 'nickname'::text)) STORED,
    recurring jsonb GENERATED ALWAYS AS ((_raw_data -> 'recurring'::text)) STORED,
    type text GENERATED ALWAYS AS ((_raw_data ->> 'type'::text)) STORED,
    unit_amount integer GENERATED ALWAYS AS (((_raw_data ->> 'unit_amount'::text))::integer) STORED,
    billing_scheme text GENERATED ALWAYS AS ((_raw_data ->> 'billing_scheme'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    lookup_key text GENERATED ALWAYS AS ((_raw_data ->> 'lookup_key'::text)) STORED,
    tiers_mode text GENERATED ALWAYS AS ((_raw_data ->> 'tiers_mode'::text)) STORED,
    transform_quantity jsonb GENERATED ALWAYS AS ((_raw_data -> 'transform_quantity'::text)) STORED,
    unit_amount_decimal text GENERATED ALWAYS AS ((_raw_data ->> 'unit_amount_decimal'::text)) STORED,
    product text GENERATED ALWAYS AS ((_raw_data ->> 'product'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.prices OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.products (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    active boolean GENERATED ALWAYS AS (((_raw_data ->> 'active'::text))::boolean) STORED,
    default_price text GENERATED ALWAYS AS ((_raw_data ->> 'default_price'::text)) STORED,
    description text GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    name text GENERATED ALWAYS AS ((_raw_data ->> 'name'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    images jsonb GENERATED ALWAYS AS ((_raw_data -> 'images'::text)) STORED,
    marketing_features jsonb GENERATED ALWAYS AS ((_raw_data -> 'marketing_features'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    package_dimensions jsonb GENERATED ALWAYS AS ((_raw_data -> 'package_dimensions'::text)) STORED,
    shippable boolean GENERATED ALWAYS AS (((_raw_data ->> 'shippable'::text))::boolean) STORED,
    statement_descriptor text GENERATED ALWAYS AS ((_raw_data ->> 'statement_descriptor'::text)) STORED,
    unit_label text GENERATED ALWAYS AS ((_raw_data ->> 'unit_label'::text)) STORED,
    updated integer GENERATED ALWAYS AS (((_raw_data ->> 'updated'::text))::integer) STORED,
    url text GENERATED ALWAYS AS ((_raw_data ->> 'url'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.products OWNER TO postgres;

--
-- Name: refunds; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.refunds (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    amount integer GENERATED ALWAYS AS (((_raw_data ->> 'amount'::text))::integer) STORED,
    balance_transaction text GENERATED ALWAYS AS ((_raw_data ->> 'balance_transaction'::text)) STORED,
    charge text GENERATED ALWAYS AS ((_raw_data ->> 'charge'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    currency text GENERATED ALWAYS AS ((_raw_data ->> 'currency'::text)) STORED,
    destination_details jsonb GENERATED ALWAYS AS ((_raw_data -> 'destination_details'::text)) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    payment_intent text GENERATED ALWAYS AS ((_raw_data ->> 'payment_intent'::text)) STORED,
    reason text GENERATED ALWAYS AS ((_raw_data ->> 'reason'::text)) STORED,
    receipt_number text GENERATED ALWAYS AS ((_raw_data ->> 'receipt_number'::text)) STORED,
    source_transfer_reversal text GENERATED ALWAYS AS ((_raw_data ->> 'source_transfer_reversal'::text)) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    transfer_reversal text GENERATED ALWAYS AS ((_raw_data ->> 'transfer_reversal'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.refunds OWNER TO postgres;

--
-- Name: reviews; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.reviews (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    billing_zip text GENERATED ALWAYS AS ((_raw_data ->> 'billing_zip'::text)) STORED,
    charge text GENERATED ALWAYS AS ((_raw_data ->> 'charge'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    closed_reason text GENERATED ALWAYS AS ((_raw_data ->> 'closed_reason'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    ip_address text GENERATED ALWAYS AS ((_raw_data ->> 'ip_address'::text)) STORED,
    ip_address_location jsonb GENERATED ALWAYS AS ((_raw_data -> 'ip_address_location'::text)) STORED,
    open boolean GENERATED ALWAYS AS (((_raw_data ->> 'open'::text))::boolean) STORED,
    opened_reason text GENERATED ALWAYS AS ((_raw_data ->> 'opened_reason'::text)) STORED,
    payment_intent text GENERATED ALWAYS AS ((_raw_data ->> 'payment_intent'::text)) STORED,
    reason text GENERATED ALWAYS AS ((_raw_data ->> 'reason'::text)) STORED,
    session text GENERATED ALWAYS AS ((_raw_data ->> 'session'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.reviews OWNER TO postgres;

--
-- Name: setup_intents; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.setup_intents (
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    description text GENERATED ALWAYS AS ((_raw_data ->> 'description'::text)) STORED,
    payment_method text GENERATED ALWAYS AS ((_raw_data ->> 'payment_method'::text)) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    usage text GENERATED ALWAYS AS ((_raw_data ->> 'usage'::text)) STORED,
    cancellation_reason text GENERATED ALWAYS AS ((_raw_data ->> 'cancellation_reason'::text)) STORED,
    latest_attempt text GENERATED ALWAYS AS ((_raw_data ->> 'latest_attempt'::text)) STORED,
    mandate text GENERATED ALWAYS AS ((_raw_data ->> 'mandate'::text)) STORED,
    single_use_mandate text GENERATED ALWAYS AS ((_raw_data ->> 'single_use_mandate'::text)) STORED,
    on_behalf_of text GENERATED ALWAYS AS ((_raw_data ->> 'on_behalf_of'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.setup_intents OWNER TO postgres;

--
-- Name: subscription_items; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.subscription_items (
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    billing_thresholds jsonb GENERATED ALWAYS AS ((_raw_data -> 'billing_thresholds'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    deleted boolean GENERATED ALWAYS AS (((_raw_data ->> 'deleted'::text))::boolean) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    quantity integer GENERATED ALWAYS AS (((_raw_data ->> 'quantity'::text))::integer) STORED,
    price text GENERATED ALWAYS AS ((_raw_data ->> 'price'::text)) STORED,
    subscription text GENERATED ALWAYS AS ((_raw_data ->> 'subscription'::text)) STORED,
    tax_rates jsonb GENERATED ALWAYS AS ((_raw_data -> 'tax_rates'::text)) STORED,
    current_period_end integer GENERATED ALWAYS AS (((_raw_data ->> 'current_period_end'::text))::integer) STORED,
    current_period_start integer GENERATED ALWAYS AS (((_raw_data ->> 'current_period_start'::text))::integer) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.subscription_items OWNER TO postgres;

--
-- Name: subscription_schedules; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.subscription_schedules (
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    application text GENERATED ALWAYS AS ((_raw_data ->> 'application'::text)) STORED,
    canceled_at integer GENERATED ALWAYS AS (((_raw_data ->> 'canceled_at'::text))::integer) STORED,
    completed_at integer GENERATED ALWAYS AS (((_raw_data ->> 'completed_at'::text))::integer) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    current_phase jsonb GENERATED ALWAYS AS ((_raw_data -> 'current_phase'::text)) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    default_settings jsonb GENERATED ALWAYS AS ((_raw_data -> 'default_settings'::text)) STORED,
    end_behavior text GENERATED ALWAYS AS ((_raw_data ->> 'end_behavior'::text)) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    phases jsonb GENERATED ALWAYS AS ((_raw_data -> 'phases'::text)) STORED,
    released_at integer GENERATED ALWAYS AS (((_raw_data ->> 'released_at'::text))::integer) STORED,
    released_subscription text GENERATED ALWAYS AS ((_raw_data ->> 'released_subscription'::text)) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    subscription text GENERATED ALWAYS AS ((_raw_data ->> 'subscription'::text)) STORED,
    test_clock text GENERATED ALWAYS AS ((_raw_data ->> 'test_clock'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.subscription_schedules OWNER TO postgres;

--
-- Name: subscriptions; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.subscriptions (
    _updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    cancel_at_period_end boolean GENERATED ALWAYS AS (((_raw_data ->> 'cancel_at_period_end'::text))::boolean) STORED,
    current_period_end integer GENERATED ALWAYS AS (((_raw_data ->> 'current_period_end'::text))::integer) STORED,
    current_period_start integer GENERATED ALWAYS AS (((_raw_data ->> 'current_period_start'::text))::integer) STORED,
    default_payment_method text GENERATED ALWAYS AS ((_raw_data ->> 'default_payment_method'::text)) STORED,
    items jsonb GENERATED ALWAYS AS ((_raw_data -> 'items'::text)) STORED,
    metadata jsonb GENERATED ALWAYS AS ((_raw_data -> 'metadata'::text)) STORED,
    pending_setup_intent text GENERATED ALWAYS AS ((_raw_data ->> 'pending_setup_intent'::text)) STORED,
    pending_update jsonb GENERATED ALWAYS AS ((_raw_data -> 'pending_update'::text)) STORED,
    status text GENERATED ALWAYS AS ((_raw_data ->> 'status'::text)) STORED,
    application_fee_percent double precision GENERATED ALWAYS AS (((_raw_data ->> 'application_fee_percent'::text))::double precision) STORED,
    billing_cycle_anchor integer GENERATED ALWAYS AS (((_raw_data ->> 'billing_cycle_anchor'::text))::integer) STORED,
    billing_thresholds jsonb GENERATED ALWAYS AS ((_raw_data -> 'billing_thresholds'::text)) STORED,
    cancel_at integer GENERATED ALWAYS AS (((_raw_data ->> 'cancel_at'::text))::integer) STORED,
    canceled_at integer GENERATED ALWAYS AS (((_raw_data ->> 'canceled_at'::text))::integer) STORED,
    collection_method text GENERATED ALWAYS AS ((_raw_data ->> 'collection_method'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    days_until_due integer GENERATED ALWAYS AS (((_raw_data ->> 'days_until_due'::text))::integer) STORED,
    default_source text GENERATED ALWAYS AS ((_raw_data ->> 'default_source'::text)) STORED,
    default_tax_rates jsonb GENERATED ALWAYS AS ((_raw_data -> 'default_tax_rates'::text)) STORED,
    discount jsonb GENERATED ALWAYS AS ((_raw_data -> 'discount'::text)) STORED,
    ended_at integer GENERATED ALWAYS AS (((_raw_data ->> 'ended_at'::text))::integer) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    next_pending_invoice_item_invoice integer GENERATED ALWAYS AS (((_raw_data ->> 'next_pending_invoice_item_invoice'::text))::integer) STORED,
    pause_collection jsonb GENERATED ALWAYS AS ((_raw_data -> 'pause_collection'::text)) STORED,
    pending_invoice_item_interval jsonb GENERATED ALWAYS AS ((_raw_data -> 'pending_invoice_item_interval'::text)) STORED,
    start_date integer GENERATED ALWAYS AS (((_raw_data ->> 'start_date'::text))::integer) STORED,
    transfer_data jsonb GENERATED ALWAYS AS ((_raw_data -> 'transfer_data'::text)) STORED,
    trial_end jsonb GENERATED ALWAYS AS ((_raw_data -> 'trial_end'::text)) STORED,
    trial_start jsonb GENERATED ALWAYS AS ((_raw_data -> 'trial_start'::text)) STORED,
    schedule text GENERATED ALWAYS AS ((_raw_data ->> 'schedule'::text)) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    latest_invoice text GENERATED ALWAYS AS ((_raw_data ->> 'latest_invoice'::text)) STORED,
    plan text GENERATED ALWAYS AS ((_raw_data ->> 'plan'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.subscriptions OWNER TO postgres;

--
-- Name: tax_ids; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.tax_ids (
    _last_synced_at timestamp with time zone,
    _raw_data jsonb,
    _account_id text NOT NULL,
    object text GENERATED ALWAYS AS ((_raw_data ->> 'object'::text)) STORED,
    country text GENERATED ALWAYS AS ((_raw_data ->> 'country'::text)) STORED,
    customer text GENERATED ALWAYS AS ((_raw_data ->> 'customer'::text)) STORED,
    type text GENERATED ALWAYS AS ((_raw_data ->> 'type'::text)) STORED,
    value text GENERATED ALWAYS AS ((_raw_data ->> 'value'::text)) STORED,
    created integer GENERATED ALWAYS AS (((_raw_data ->> 'created'::text))::integer) STORED,
    livemode boolean GENERATED ALWAYS AS (((_raw_data ->> 'livemode'::text))::boolean) STORED,
    owner jsonb GENERATED ALWAYS AS ((_raw_data -> 'owner'::text)) STORED,
    id text GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED NOT NULL
);


ALTER TABLE stripe.tax_ids OWNER TO postgres;

--
-- Name: cases id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases ALTER COLUMN id SET DEFAULT nextval('public.cases_id_seq'::regclass);


--
-- Name: chat_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages ALTER COLUMN id SET DEFAULT nextval('public.chat_messages_id_seq'::regclass);


--
-- Name: conversations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations ALTER COLUMN id SET DEFAULT nextval('public.conversations_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: efile_court_locations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.efile_court_locations ALTER COLUMN id SET DEFAULT nextval('public.efile_court_locations_id_seq'::regclass);


--
-- Name: efile_submissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.efile_submissions ALTER COLUMN id SET DEFAULT nextval('public.efile_submissions_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: _sync_status id; Type: DEFAULT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe._sync_status ALTER COLUMN id SET DEFAULT nextval('stripe._sync_status_id_seq'::regclass);


--
-- Data for Name: ai_rate_limits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_rate_limits (user_id, count, reset_at) FROM stdin;
ip:::ffff:127.0.0.1	3	2026-05-13 16:03:54.232+00
ip:127.0.0.1	28	2026-07-06 02:06:08.225+00
\.


--
-- Data for Name: beta_access; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.beta_access (id, user_id, email, claimed_at) FROM stdin;
1	user_3BoJEKLMEnNE7gBJq3aar3LkTx2	\N	2026-05-19 16:17:13.966733+00
\.


--
-- Data for Name: cases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cases (id, title, status, county_id, claim_amount, claim_type, plaintiff_name, plaintiff_phone, plaintiff_address, plaintiff_city, plaintiff_state, plaintiff_zip, plaintiff_email, defendant_name, defendant_phone, defendant_address, defendant_city, defendant_state, defendant_zip, defendant_is_business_or_entity, defendant_agent_name, claim_description, incident_date, how_amount_calculated, prior_demand_made, prior_demand_description, venue_reason, venue_basis, is_suing_public_entity, public_entity_claim_filed_date, is_atty_fee_dispute, filed_more_than_12_claims, claim_over_2500, intake_step, intake_complete, document_count, readiness_score, created_at, updated_at, courthouse_id, user_id, demand_letter_text, demand_letter_tone, courthouse_name, courthouse_address, courthouse_city, courthouse_zip, courthouse_phone, courthouse_website, filing_fee, evidence_checklist, case_number, hearing_date, hearing_time, hearing_judge, hearing_courtroom, hearing_notes, reminder_14_day_sent, reminder_3_day_sent, reminder_no_hearing_date_sent, courthouse_clerk_email, confirmation_email_sent, weekly_reminder_last_sent, reminder_30_day_sent, reminder_7_day_sent, reminder_1_day_sent, settlement_letter_text, settlement_letter_tone, settlement_agreement_text, plaintiff_is_business, plaintiff_title, second_plaintiff_name, plaintiff_mailing_address, plaintiff_mailing_city, plaintiff_mailing_state, plaintiff_mailing_zip, second_plaintiff_phone, second_plaintiff_address, second_plaintiff_city, second_plaintiff_state, second_plaintiff_zip, second_plaintiff_email, second_plaintiff_mailing_address, second_plaintiff_mailing_city, second_plaintiff_mailing_state, second_plaintiff_mailing_zip, defendant_mailing_address, defendant_mailing_city, defendant_mailing_state, defendant_mailing_zip, defendant_agent_title, defendant_agent_street, defendant_agent_city, defendant_agent_state, defendant_agent_zip, prior_demand_why_not, had_arbitration, mc030_declaration_title, demand_letter_text_formal, demand_letter_text_firm, demand_letter_text_friendly, has_additional_plaintiff, additional_plaintiff_name, additional_plaintiff_is_fictitious, more_than_four_plaintiffs, more_than_two_defendants, mc030_exhibit_doc_ids, sc104_data, notify_method, prior_demand_date, prior_demand_method, statement_text, no_show_statement_text, plaintiff_is_fictitious, plaintiff_dba_name, plaintiff_dba_address, plaintiff_dba_city, plaintiff_dba_state, plaintiff_dba_zip, plaintiff_dba_mailing_address, plaintiff_business_type, plaintiff_business_type_other, plaintiff_fbn_number, plaintiff_fbn_expiry, plaintiff_fbn_sign_date, second_plaintiff_dba_name, second_plaintiff_dba_address, second_plaintiff_dba_city, second_plaintiff_dba_state, second_plaintiff_dba_zip, second_plaintiff_dba_mailing_address, second_plaintiff_business_type, second_plaintiff_business_type_other, second_plaintiff_fbn_number, second_plaintiff_fbn_expiry, second_plaintiff_fbn_sign_date, second_plaintiff_title, plaintiff_fbn_county, second_plaintiff_fbn_county, mc030_declaration_text, jurisdiction_state, efiling_eligible, efiling_status, efiling_envelope_id, guided_intake_data) FROM stdin;
6	unpaid	intake_complete	mariposa	5000	Money Owed	Paul AAAAA	(213) 643-3670	3020 Bridgeway	Sausalito	CA	94965-1439		Jeff Everson	(650) 322-4328	Alternative HVAC	San Carlos	CA	94070	t		Mock Small Claims Case Summary\nTenant security deposit dispute - test upload packet\nThis mock file is designed for system testing. All names, dates, amounts, addresses, and events below are fictional.\nCase Field\tDetails\nCourt / Case Number\tMaricopa County Justice Court - SC-25-10482\nPlaintiff (Tenant)\tMaya Thompson\nDefendant (Landlord)\tDaniel Ruiz\nRental Property\t2148 East Willow Street, Unit 3, Mesa, Arizona 85203\nLease Term\tFebruary 1, 2024 through January 31, 2025\nMonthly Rent\t$1,850\nDeposits Paid\t$2,200 security + $300 pet\nMove-Out Date\tJanuary 31, 2025\nClaimed Deductions\t$1,450 without receipts\nAmount Tenant Seeks\t$2,693 including filing/service costs\nCase Description\nMaya Thompson rented 2148 East Willow Street, Unit 3, Mesa, Arizona 85203 from Daniel Ruiz under a one-year written lease. At move-in, the tenant paid first month's rent, a $2,200 security deposit, and a separate $300 refundable pet deposit.\nThe tenant gave written notice of non-renewal on December 29, 2024 and surrendered the unit on January 31, 2025 after a final cleaning. She returned all keys, provided a forwarding address, and requested the deposit refund in writing.\nUnder the mock facts, the landlord did not send a timely itemized statement or refund by February 14, 2025. On February 28, 2025, he emailed that he intended to keep $1,450 for repainting, carpet treatment, and miscellaneous cleaning, but he did not attach invoices, photographs, or a lawful accounting.\nThe tenant contends the apartment was left in substantially the same condition, minus normal wear and tear, and that repainting and carpet refresh were routine turnover costs.\nAfter sending a formal demand letter dated March 5, 2025 and receiving no payment, the tenant filed a small claims action on April 9, 2025 seeking return of the deposits, court costs, and service fees.\nChronology\nDate\tEvent\nFebruary 1, 2024\tLease begins. Tenant pays deposits and takes possession.\nDecember 29, 2024\tTenant emails written notice of non-renewal and requests move-out instructions.\nJanuary 31, 2025\tTenant vacates, returns keys, and provides forwarding address.\nFebruary 14, 2025\tMock statutory deadline passes without refund or proper accounting.\nFebruary 28, 2025\tLandlord claims deductions by email but provides no receipts.\nMarch 5, 2025\tTenant sends demand letter requesting return of deposits within 10 days.\nApril 9, 2025\tSmall claims complaint filed.\nRequested Upload Items for Testing\n• Case summary document (this file)\n• Sample residential lease\n• Detailed case narrative PDF (2-3 pages)\n• Demand letter from tenant to landlord\n• Move-out condition checklist\nTheory of the Claim\nThe tenant's theory is that the landlord wrongfully withheld the refundable deposits, failed to provide a timely and adequate itemization, and attempted to charge ordinary turnover expenses as tenant-caused damage.\nDamages Breakdown\nClaim Component\tAmount\nSecurity deposit refund sought\t$2,200\nPet deposit refund sought\t$300\nEstimated filing fee\t$129\nEstimated service cost\t$64\nTotal sought\t$2,693\n\n	03/30/2026 – 03/30/2026	from LEASE and cancelled check	t	demand letter		where_defendant_lives	f	\N	f	f	f	3	t	7	70	2026-04-02 20:21:59.87046+00	2026-06-19 23:37:34.102+00		user_3BoJEKLMEnNE7gBJq3aar3LkTx2	Paul AAAAA  \n3020 Bridgeway  \nSausalito, CA 94965-1439  \n(213) 643-3670  \n\nApril 3, 2026  \n\nJeff Everson  \nAlternative HVAC  \nSan Carlos, CA 94070  \n\nRE: Demand for Payment — Money Owed in the Amount of $5,000 (Incident Date: March 30, 2026)  \n\nYou owe me $5,000, and this is my final demand for payment before filing in court. This letter concerns the unpaid amount due as of March 30, 2026.\n\nThe factual basis for this claim is as follows: Maya Thompson rented 2148 East Willow Street, Unit 3, Mesa, Arizona 85203 from Daniel Ruiz under a one-year written lease for the term February 1, 2024 through January 31, 2025 at $1,850 per month. At move-in, the tenant paid a $2,200 security deposit and a separate $300 refundable pet deposit, then gave written notice of non-renewal on December 29, 2024 and surrendered the unit on January 31, 2025 after a final cleaning, returning all keys and providing a forwarding address. No timely itemized statement or refund was sent by February 14, 2025, and on February 28, 2025 the landlord emailed that he intended to keep $1,450 for repainting, carpet treatment, and miscellaneous cleaning, but did not attach invoices, photographs, or a lawful accounting. A formal demand letter dated March 5, 2025 requested return of the deposits within 10 days; no payment was made, and a small claims action was filed on April 9, 2025 seeking return of the deposits, court costs, and service fees.\n\nI demand payment in the total amount of $5,000.00. You have until April 17, 2026 to remit payment in full.\n\nFailure to pay by this date will result in a court action filed against you in Mariposa County Small Claims Court. I will seek the full amount owed, plus court filing fees, service costs, and any other relief the court deems appropriate. I am prepared to file immediately upon expiration of this deadline.\n\nSincerely,  \n\nPaul AAAAA	firm	Mariposa County Superior Court	5088 Bullion St	Mariposa	95338	(209) 966-2005	https://www.mariposa.courts.ca.gov	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	f	\N	f	f	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	CA	\N	\N	\N	\N
8	Brought my car to ACME auto Repair because of an engine noise when I picked the car and drove off I noticed the noise still existed when I returned to the dealership for the repair to be fixed they refused to do anymore work or or refund my money I took the car to another mechanic and received an estimate of the same amount $5000	intake_complete	san-diego	1542.42	Money Owed	Paul Andrew	(555) 555-5555	1 Main Street	Corte Madera	CA	94925	paul.innit.street.wear@gmail.com	ACME AUTO REPAIR	(560) 555-5555	1 Main Street	SAN DIEGO	CA	94965	t	JOE JOE MCJOE	I am the plaintiff, Paul Andrew. Defendant ACME AUTO REPAIR is an auto repair business. On April 1, 2026, I brought my 2021 Mercedes-Benz CLA (VIN W1K5J4GB7MN123456) to ACME AUTO REPAIR for diagnosis and engine work to correct an engine “lifter noise.” ACME AUTO REPAIR agreed to perform the work and represented the engine noise would be fixed as part of the repair.\n\nOn April 1, 2026, ACME AUTO REPAIR told me the work was completed and released the vehicle to me. Immediately after leaving, I could still hear the same engine noise. About two hours later, I returned to ACME AUTO REPAIR with a witness who heard the noise, and I told them the problem was not fixed. I asked ACME AUTO REPAIR to complete the repair or refund my payment, but they refused to do any further work and refused to refund me.\n\nI am asking for $1,542.42, which is the amount I paid ACME AUTO REPAIR for the diagnosis and engine work that did not fix the engine noise. I demanded that ACME AUTO REPAIR repair the vehicle or refund me by returning to the shop on April 1, 2026, and by email on April 2, 2026, but ACME AUTO REPAIR did not provide a repair or refund.	04/01/2026 – 04/01/2026	 $1,542.42 FROM CONTRACT AND CANCELLED CHECK	t	EMAIL AND VISIT BACK T SITE ON 4-1-26		where_contract_made_broken	f	\N	f	f	f	4	t	4	100	2026-04-05 14:18:40.066557+00	2026-05-21 16:57:39.094+00	sd-chula-vista	user_3Bti2v3Lju4bFfnrNdXfnq83Q3J	Paul Andrew  \n1 Main Street  \nCorte Madera, CA 94925  \npaul.innit.street.wear@gmail.com | (555) 555-5555  \n\nApril 6, 2026  \n\nACME AUTO REPAIR  \n1 Main Street  \nSausalito, CA 94965  \n\nRE: Demand for Payment — 2021 Mercedes-Benz CLA (VIN W1K5J4GB7MN123456) / Engine “Lifter Noise” Repair  \n\nYou owe me $5,000.00 due to your failure to correct the engine “lifter noise” you represented would be fixed, and your refusal to complete the repair or refund my payment. This letter is my final demand before filing in court.  \n\nI am the plaintiff, Paul Andrew. I paid Acme Auto Body, located at 100 Main Street, Menlo Park, California 94025, $1,542.42 to diagnose and perform engine work to repair an engine “lifter noise” on my 2021 Mercedes-Benz CLA (VIN W1K5J4GB7MN123456), and Acme represented that it would fix the engine noise as part of the work. On April 1, 2026, I picked up my vehicle after the shop stated the work was completed, but immediately after leaving I could still hear the same engine noise; I returned to Acme about two hours later, spoke with the manager, John Doe, and demanded that Acme finish the repair or refund my money, and he refused to do either. A few days later, I took the vehicle to ABC Auto Body Repair for a second opinion and an estimate to correct the same engine noise, and ABC quoted $5,000.00 (Invoice No. ABC-040626-208 dated April 6, 2026) for corrective engine repair after verifying the noise remained.  \n\nDemand is hereby made for payment in the total amount of $5,000.00, representing the reasonable cost quoted/charged by ABC Auto Body Repair to repair the problem that remained after Acme’s work. You have until April 20, 2026 to remit payment in full.  \n\nFailure to pay by this date will result in a court action filed against you in San-Diego County Small Claims Court. I will seek the full amount owed, plus court filing fees, service costs, and any other relief the court deems appropriate. I am prepared to file immediately upon expiration of this deadline.  \n\nSincerely,  \n\nPaul Andrew	firm	South County Division — Chula Vista Courthouse	500 3rd Ave	Chula Vista	91910	(619) 746-6060	https://www.sdcourt.ca.gov	\N	[{"id": "e1", "item": "Written repair authorization / estimate you approved", "description": "Shows what Acme agreed to do and that you authorized it (paper form, email, text, or e-sign). Include anything describing the engine noise complaint and the promised fix."}, {"id": "e2", "item": "Proof the noise remained right after pickup", "description": "Same-day audio/video of the engine noise, dashcam clip, or a written statement from a passenger/witness who heard it when you drove away and when you returned."}, {"id": "e3", "item": "Any texts/emails/call logs with Acme about refusing to fix or refund", "description": "Helps show you promptly reported the problem and they refused. Include messages with the manager/service writer and any notes you wrote down with dates/times of in-person conversations."}, {"id": "e4", "item": "Independent mechanic report tying the problem to the same issue", "description": "A written diagnosis from the second shop stating the same engine lifter noise was still present and what repair is needed (not just a price)."}, {"id": "e5", "item": "Itemized quote (or receipt if you paid) for the follow-up repair", "description": "Shows the reasonable cost to correct what wasn’t fixed. Best if it lists labor hours, parts, and a clear description of the work."}, {"id": "e6", "item": "Vehicle history showing the noise wasn’t fixed by Acme", "description": "Any maintenance/repair history around that time (service records, dealer notes, or OBD scan reports) that supports the noise existed before Acme, remained immediately after, and was later diagnosed as needing further work."}]		2026-05-17	09:00				t	t	f	\N	t	\N	f	t	t	Paul Andrew  \n1 Main Street  \nCorte Madera, CA 94925  \npaul.innit.street.wear@gmail.com  \n(555) 555-5555  \n\nApril 6, 2026  \n\nACME AUTO REPAIR  \n1 Main Street  \nSausalito, CA 94965  \n\nRE: Settlement Offer — $1,156.82  \n\nI am Paul Andrew. I have a money-owed dispute with ACME AUTO REPAIR and I have filed (or am ready to file) this matter in California small claims court. I am making this settlement offer to resolve the dispute without a hearing as a practical business decision to avoid the time and cost of court. My hearing is currently scheduled for Friday, April 17, 2026.  \n\nOn April 1, 2026, I brought my 2021 Mercedes-Benz CLA (VIN W1K5J4GB7MN123456) to ACME AUTO REPAIR for diagnosis and engine work to correct an engine “lifter noise.” ACME AUTO REPAIR agreed to perform the work and represented the engine noise would be fixed as part of the repair. Later that day, ACME AUTO REPAIR told me the work was completed and released the vehicle to me, but the same engine noise was still present immediately after leaving. About two hours later, I returned with a witness who heard the noise and asked ACME AUTO REPAIR to complete the repair or refund my payment, but ACME AUTO REPAIR refused. I am claiming $1,542.42, the amount I paid for the diagnosis and engine work that did not fix the engine noise, and I previously made a written demand (including by email on April 2, 2026) that was not resolved. This settlement offer is for less than my full claim amount to close the matter efficiently.  \n\nI will settle this dispute for $1,156.82, payable in 4 equal monthly installments of $289.20 each, with the first payment due within 30 days of your written acceptance and the remaining payments due monthly after that until paid in full. To accept, please send written confirmation by April 20, 2026 that you agree to the payment terms and the date you will make the first payment.  \n\nIf you do not accept, I will continue to pursue the full amount of my claim of $1,542.42 in my small claims case and proceed toward the scheduled hearing on Friday, April 17, 2026. If I do not receive a response by April 20, 2026, I will proceed with my court case.  \n\nSincerely,  \n\nPaul Andrew	firm	## 1. TITLE  \n**SETTLEMENT AGREEMENT AND MUTUAL RELEASE**\n\n---\n\n## 2. PREAMBLE  \nThis Settlement Agreement and Mutual Release (“**Agreement**”) is entered into as of **April 6, 2026** (“**Effective Date**”), by and between **Paul Andrew** (“**Plaintiff**” or “**Claimant**”), whose address is **1 Main Street, Corte Madera, CA 94925**, and **ACME AUTO REPAIR** (“**Defendant**” or “**Respondent**”), whose address is **1 Main Street, San Diego, CA 94965**. Plaintiff and Defendant may be referred to individually as a “**Party**” and collectively as the “**Parties**.”\n\nThe purpose of this Agreement is to fully and finally resolve and settle all claims and disputes between the Parties arising out of or relating to the events described below and the pending or threatened California small claims action.\n\n---\n\n## 3. RECITALS  \nA. Plaintiff contends that on or about **April 1, 2026**, Plaintiff brought a **2021 Mercedes-Benz CLA**, VIN **W1K5J4GB7MN123456** (the “Vehicle”), to Defendant, an auto repair business, for diagnosis and engine work to correct an engine “lifter noise.” Plaintiff contends Defendant agreed to perform work and represented the engine noise would be fixed as part of the repair.\n\nB. Plaintiff contends that Defendant advised the work was completed on or about **April 1, 2026** and released the Vehicle to Plaintiff; Plaintiff contends the same engine noise remained immediately upon leaving, and Plaintiff returned to Defendant approximately two (2) hours later with a witness who also heard the noise. Plaintiff contends Plaintiff requested completion of the repair or a refund, and Defendant refused to do further work and refused to refund.\n\nC. Plaintiff contends Plaintiff paid Defendant **$1,542.42** for the diagnosis and engine work and demanded repair or refund on April 1, 2026 and by email on April 2, 2026, without satisfactory resolution.\n\nD. A dispute exists between the Parties. Plaintiff has filed or threatened a claim in **California Small Claims Court**, **San Diego County Small Claims Court**, regarding “money owed,” related to the above events, with a scheduled hearing date of **Friday, April 17, 2026** (the “Action”). Case number: **[BLANK]**.\n\nE. The Parties desire to compromise and settle all disputes between them arising out of or relating to the above-described events and the Action, without further litigation, and with the understanding that this settlement is a compromise of disputed claims.\n\nTherefore, in consideration of the mutual promises and covenants contained in this Agreement, the Parties agree as follows:\n\n---\n\n## 4. SETTLEMENT PAYMENT  \n4.1 **Settlement Amount.** Defendant shall pay Plaintiff a total settlement amount of **One Thousand One Hundred Fifty-Six Dollars and Eighty-Two Cents ($1,156.82)** (“**Settlement Amount**”).\n\n4.2 **Installment Schedule.** The Settlement Amount shall be paid in **four (4) equal monthly installments** of **Two Hundred Eighty-Nine Dollars and Twenty Cents ($289.20)** each (the “Installment Payments”), due and payable as follows:\n\n- **1st Installment:** $289.20 due **within thirty (30) days after execution** of this Agreement (the “Execution Date”).  \n- **2nd Installment:** $289.20 due on the **same day-of-month** as the 1st Installment in the following month.  \n- **3rd Installment:** $289.20 due on the **same day-of-month** as the 1st Installment in the second following month.  \n- **4th Installment:** $289.20 due on the **same day-of-month** as the 1st Installment in the third following month.\n\nIf a due date falls on a weekend or court holiday, payment shall be due the next business day.\n\n4.3 **Method and Address for Payment.** All Installment Payments shall be made by **check** payable to **Paul Andrew** and delivered to: **Paul Andrew, 1 Main Street, Corte Madera, CA 94925**, or to such other address as Plaintiff designates in writing.\n\n4.4 **Application of Payments.** Payments shall be credited upon receipt. Plaintiff may provide a written receipt upon request, but failure to provide a receipt does not affect the validity of payment.\n\n4.5 **Late Payments; Notice and Cure.** An Installment Payment is late if not received within **five (5) calendar days** after its due date. If a payment is late, Plaintiff shall provide written notice of default to Defendant (email and/or mail acceptable; notice address in Section 12). Defendant shall have **ten (10) calendar days** after Defendant’s receipt of the notice to cure by delivering the overdue amount.\n\n4.6 **Acceleration Upon Uncured Default.** If Defendant fails to cure an installment default within the cure period, then (i) the remaining unpaid balance of the Settlement Amount shall become **immediately due and payable** upon written demand, and (ii) Plaintiff may pursue any lawful remedies, including seeking entry/enforcement of judgment in the Action to the extent permitted by law and consistent with this Agreement, and/or enforcement of this Agreement.\n\n4.7 **No Setoff.** Defendant shall make payments without offset, deduction, counterclaim, or recoupment.\n\n---\n\n## 5. MUTUAL RELEASE OF ALL CLAIMS  \n5.1 **Plaintiff’s Release of Defendant.** Upon Plaintiff’s receipt of the full Settlement Amount (i.e., all four Installment Payments have been received and cleared), Plaintiff, on behalf of Plaintiff and Plaintiff’s heirs, executors, administrators, representatives, successors, and assigns, fully and forever releases and discharges Defendant and Defendant’s past, present, and future owners, members, managers, officers, directors, shareholders, employees, agents, representatives, insurers, attorneys, predecessors, successors, and assigns (collectively, “**Defendant Released Parties**”) from any and all claims, demands, causes of action, obligations, damages, losses, costs, expenses, and liabilities of every kind and nature, whether known or unknown, suspected or unsuspected, asserted or unasserted, that arise out of or relate to: (a) the Vehicle, (b) the April 1, 2026 diagnosis and engine work, (c) any communications, invoices, estimates, representations, or services related thereto, and (d) the Action (collectively, the “**Released Matters**”).\n\n5.2 **Defendant’s Release of Plaintiff.** Upon Plaintiff’s receipt of the full Settlement Amount, Defendant, on behalf of Defendant and Defendant’s past, present, and future owners, members, managers, officers, directors, shareholders, employees, agents, representatives, insurers, attorneys, predecessors, successors, and assigns, fully and forever releases and discharges Plaintiff and Plaintiff’s heirs, executors, administrators, representatives, successors, and assigns (collectively, “**Plaintiff Released Parties**”) from any and all claims, demands, causes of action, obligations, damages, losses, costs, expenses, and liabilities of every kind and nature, whether known or unknown, suspected or unsuspected, asserted or unasserted, arising out of or relating to the Released Matters and/or the Action.\n\n5.3 **California Civil Code Section 1542 Waiver.** Upon Plaintiff’s receipt of the full Settlement Amount, each Party expressly waives and relinquishes any and all rights and benefits under **California Civil Code section 1542**, which provides:\n\n> “A GENERAL RELEASE DOES NOT EXTEND TO CLAIMS THAT THE CREDITOR OR RELEASING PARTY DOES NOT KNOW OR SUSPECT TO EXIST IN HIS OR HER FAVOR AT THE TIME OF EXECUTING THE RELEASE AND THAT, IF KNOWN BY HIM OR HER, WOULD HAVE MATERIALLY AFFECTED HIS OR HER SETTLEMENT WITH THE DEBTOR OR RELEASED PARTY.”\n\nEach Party acknowledges that it may discover facts different from or in addition to those now known or believed to be true with respect to the Released Matters, but it is the intention of the Parties that the releases given in this Agreement shall be and remain effective in all respects notwithstanding such different or additional facts.\n\n5.4 **Scope; No Release of Unrelated Matters.** The releases in this Agreement are intended to cover the Released Matters. Claims wholly unrelated to the Released Matters are not released.\n\n5.5 **Condition Precedent.** The releases in this Section 5 are expressly conditioned upon Plaintiff’s receipt of the full Settlement Amount.\n\n---\n\n## 6. DISMISSAL  \n6.1 **Dismissal Upon Full Payment.** Within **five (5) court days** after Plaintiff’s receipt and clearance of the final Installment Payment (i.e., full payment of the Settlement Amount), Plaintiff shall file a request to dismiss the Action **with prejudice**, with each Party to bear its own costs and fees, except as otherwise provided by this Agreement.\n\n6.2 **If a Dismissal Form Is Required.** The Parties agree to reasonably cooperate in executing any additional court forms necessary to effectuate dismissal, including any request/dismissal form required by the Small Claims Court.\n\n6.3 **No Obligation to Dismiss Before Full Payment.** Plaintiff is not required to dismiss the Action unless and until the Settlement Amount has been paid in full and cleared.\n\n---\n\n## 7. NO ADMISSION OF LIABILITY  \nThis Agreement is a compromise of disputed claims. Neither this Agreement nor any consideration paid under it shall be construed as, or deemed to be, an admission of liability, fault, or wrongdoing by any Party or any released party. Defendant expressly denies liability.\n\n---\n\n## 8. ENTIRE AGREEMENT  \nThis Agreement constitutes the entire agreement between the Parties regarding the subject matter hereof and supersedes all prior and contemporaneous negotiations, discussions, understandings, or agreements, whether oral or written. Any amendment or modification must be in writing and signed by both Parties.\n\n---\n\n## 9. CONFIDENTIALITY  \n9.1 **Confidential Settlement Terms.** The Parties agree that the existence of this Agreement, the Settlement Amount, the payment terms, and all non-public negotiations and communications leading to this Agreement (“**Confidential Information**”) shall be kept confidential and shall not be disclosed to any person or entity except as permitted below.\n\n9.2 **Permitted Disclosures.** Confidential Information may be disclosed only: (a) to a Party’s spouse or domestic partner, attorneys, accountants, tax advisors, or other professional advisors who have a need to know and who are informed of and agree to maintain confidentiality; (b) as required by court order, subpoena, or applicable law (provided the disclosing Party, to the extent lawful, gives prompt notice to the other Party and reasonably cooperates to seek confidential treatment); (c) to enforce this Agreement; (d) to the Small Claims Court as reasonably necessary to effectuate dismissal and/or respond to court inquiries; (e) to Defendant’s insurer (if any) related to the Released Matters; and (f) as otherwise agreed in writing by the Parties.\n\n9.3 **No Publicity.** The Parties agree not to issue public statements, press releases, online postings, or advertisements regarding the Released Matters or the settlement terms.\n\n---\n\n## 10. GOVERNING LAW  \nThis Agreement shall be governed by and construed in accordance with the laws of the **State of California**, without regard to conflict-of-law principles. Venue for any action to enforce or interpret this Agreement shall be in a court of competent jurisdiction in **San Diego County, California**, unless the Parties agree otherwise in writing.\n\n---\n\n## 11. COUNTERPARTS  \nThis Agreement may be executed in counterparts, each of which is deemed an original, and all of which together constitute one and the same instrument. Signatures transmitted by PDF/email or other electronic means shall be treated as original signatures to the fullest extent permitted by law.\n\n---\n\n## SIGNATURE BLOCK\n\n**PLAINTIFF / CLAIMANT:**  \n\nSignature: _______________________________  \nPrinted Name: **Paul Andrew**  \nDate: ___________________  \nAddress: **1 Main Street, Corte Madera, CA 94925**  \n\n---\n\n**DEFENDANT / RESPONDENT:** **ACME AUTO REPAIR**  \n\nBy (Signature): ___________________________  \nPrinted Name: ____________________________ [BLANK]  \nTitle/Capacity (e.g., Owner/Manager/Authorized Agent): ____________________ [BLANK]  \nDate: ___________________  \nAddress: **1 Main Street, San Diego, CA 94965**  \n\n---\n\n**NOTICE INFORMATION (for Section 4.5 default notice and other notices):**  \nPlaintiff notice email (optional): ____________________ [BLANK]  \nDefendant notice email (optional): ____________________ [BLANK]  \nAdditional/alternate notice address (if any): ____________________ [BLANK]	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	CA	\N	\N	\N	\N
1	MONEY OWED FOR CAR RENTALS	intake_complete	sonoma	12000	Other	JON DOE	5555555555	1000 MAIN ST	MARIN	CA	94965		JANE DOE		666 EVIL ST	MENLO PAR	CA	94063	f		During a family law case court order required the defendant to allow me to use a vehicle I incurred a lot of rental charges because she hid the car and kept it from me	01/01/2026	my actual expenses were calculated di....f of rental sites where I rented cars	f			where_damage_happened	f		f	f	f	7	t	3	90	2026-04-01 16:36:44.201884+00	2026-04-02 14:05:58.682+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	f	\N	f	f	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	CA	\N	\N	\N	\N
2	recurit deposit not returned	intake_complete	ventura	5000	Other	Paul ffff	2136433670	1 main	Sausalito	CA	94965-1439		log girl	5555555	 Hobart St	Menlo Park	CA	94025	f		LANDLORD DID NOT RETURN SECURITY DEPOSIT OR GIVE REASON	O1/012025	5000 WAS ON LEASE	t	EMAIL  LAST WEEK		where_defendant_lives	f		f	f	f	7	t	0	0	2026-04-02 14:30:14.302875+00	2026-04-02 15:30:20.563+00		\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	f	\N	f	f	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	CA	\N	\N	\N	\N
407	FL Miami-Dade CLK-CT-333 Signed Test Case (auto-cleanup)	draft	fl-miami-dade	2400	goods	Maria Gonzalez	305-555-0101	1234 Brickell Ave	Miami	FL	33131	maria.gonzalez@example.com	South Florida Contractors LLC	305-555-0202	9876 SW 8th St	Miami	FL	33144	f	\N	Defendant failed to complete the contracted renovation work despite receiving full payment. Plaintiff made multiple requests for completion or refund, all of which were ignored.	\N	\N	\N	\N	\N	\N	f	\N	f	f	f	1	f	0	0	2026-06-29 20:24:17.210696+00	2026-06-29 20:24:17.210696+00	\N	test-fl-clkct333-signed-e2e	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	f	\N	f	f	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	CA	\N	\N	\N	\N
93	IL SMC Complaint E2E Test	draft	il-cook	3500	services	Jane Smith	(312) 555-1234	123 Main St	Chicago	IL	60601	jane@example.com	ABC Hardware LLC	\N	456 Oak Ave	Chicago	IL	60602	f	\N	Defendant failed to complete contracted home repair work and refused to refund the deposit paid.	\N	Deposit paid was $3,500 which was never refunded.	\N	\N	\N	\N	f	\N	f	f	f	1	f	0	0	2026-06-23 18:00:13.730027+00	2026-06-23 18:00:13.730027+00	\N	test-il-smc-complaint-e2e	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	f	\N	f	f	f	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	IL	\N	\N	\N	\N
\.


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chat_messages (id, case_id, role, content, created_at) FROM stdin;
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversations (id, title, created_at) FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documents (id, case_id, filename, original_name, label, mime_type, file_size, file_data, ocr_text, ocr_status, created_at, storage_object_path, description) FROM stdin;
\.


--
-- Data for Name: download_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.download_tokens (token, case_id, user_id, expires_at) FROM stdin;
test-mc030-1777041427	1	test-user-1	2026-04-24 14:47:07.554814+00
0f4f7316-00f6-4375-adba-dc802bf58a46	62	test-fl-soc-hillsborough-signed-e2e	2026-06-22 23:42:39.207+00
d6e004e5-6f84-4b51-a138-cabcea78de4d	61	test-fl-cl219-volusia-signed-e2e	2026-06-22 23:42:39.209+00
79a3cccc-0ad2-456c-a72f-56fe889d9a69	60	test-fl-clkct333-signed-e2e	2026-06-22 23:42:39.216+00
17c4842e-ccc9-40e1-97cc-f907e6fedce9	63	test-fl-plain-soc-orange-signed-e2e	2026-06-22 23:42:39.218+00
test-sc100a-signed2-1777043812	6	user_3BoJEKLMEnNE7gBJq3aar3LkTx2	2026-04-24 15:26:52.708561+00
test-sc100a-signed3-1777043867	6	user_3BoJEKLMEnNE7gBJq3aar3LkTx2	2026-04-24 15:27:47.825793+00
69af9111-434e-4a23-a86d-2b1a74ae5cdb	137	test-fl-plain-soc-orange-signed-e2e	2026-06-24 04:10:26.189+00
ae9f706b-1ed1-4a74-98d2-43ae1661ca76	71	test-fl-clkct333-signed-e2e	2026-06-23 01:32:59.207+00
d54364e1-3757-4b25-81ea-e444ec24fb46	70	test-fl-soc-hillsborough-signed-e2e	2026-06-23 01:32:59.21+00
d9cc969d-867b-4ef4-8bc5-f6b96153ae8a	69	test-fl-plain-soc-orange-signed-e2e	2026-06-23 01:32:59.211+00
25c206ed-48de-4c97-9479-31ab4724cf37	72	test-fl-cl219-volusia-signed-e2e	2026-06-23 01:32:59.21+00
9825559d-b7d9-48cd-9208-70ce1f0291a6	75	test-fl-clkct333-signed-e2e	2026-06-23 12:49:23.753+00
f6a4fdf4-83ed-4ccd-b107-bf8b71023c43	13	test-fl-soc-hillsborough-signed-e2e	2026-06-22 13:20:26.967+00
717667a0-259e-4cd0-9ce4-afdeefcd009f	12	test-fl-plain-soc-orange-signed-e2e	2026-06-22 13:20:26.978+00
57068e86-013b-4313-a1e5-3a8e81c9d3d8	14	test-fl-clkct333-signed-e2e	2026-06-22 13:20:26.978+00
416002e3-624b-45e4-b358-8796f99d0680	11	test-fl-cl219-volusia-signed-e2e	2026-06-22 13:20:26.979+00
427c820c-438d-4f6b-9d3c-1d955b06ea54	16	test-fl-clkct333-signed-e2e	2026-06-22 17:42:42.578+00
97a8639a-b709-470e-ad0e-7daec0e664f2	15	test-fl-cl219-volusia-signed-e2e	2026-06-22 17:42:42.593+00
1d4ae0a0-dba1-46e2-af18-dbe3d26410a1	17	test-fl-soc-hillsborough-signed-e2e	2026-06-22 17:42:42.595+00
1032e7b5-8355-4c60-9023-a3256d65bddd	18	test-fl-plain-soc-orange-signed-e2e	2026-06-22 17:42:42.596+00
5fefcb2b-5eda-4b86-9695-8cc0542628b4	76	test-fl-soc-hillsborough-signed-e2e	2026-06-23 12:49:23.764+00
ec5d1331-27a6-4216-b79a-88f5d1e57f03	74	test-fl-cl219-volusia-signed-e2e	2026-06-23 12:49:23.763+00
63167dc6-53bc-4b8e-a40a-aef24c4d78a0	73	test-fl-plain-soc-orange-signed-e2e	2026-06-23 12:49:23.766+00
8a3b9098-0f6d-494b-ad3c-142ce50527c9	80	test-fl-clkct333-signed-e2e	2026-06-23 13:50:25.041+00
58551951-5c53-40c5-9e51-2450d25ae98c	77	test-fl-cl219-volusia-signed-e2e	2026-06-23 13:50:25.043+00
7b350e45-e248-45cd-866b-78a3f001a626	78	test-fl-plain-soc-orange-signed-e2e	2026-06-23 13:50:25.041+00
a28d87f8-e478-4b22-9243-58251631b19d	79	test-fl-soc-hillsborough-signed-e2e	2026-06-23 13:50:25.054+00
dc777d4c-392a-4bb7-a221-f8b50a494294	82	test-il-smc-complaint-e2e	2026-06-23 17:39:47.531+00
df39bfe7-166f-4067-9816-4f13824bf906	138	test-fl-soc-hillsborough-signed-e2e	2026-06-24 04:10:26.198+00
3b91d18a-7b06-4c0d-98b2-df096001ab96	140	test-fl-clkct333-signed-e2e	2026-06-24 04:10:26.295+00
c3d23743-7b69-4426-952b-10544ab7bb4b	139	test-fl-cl219-volusia-signed-e2e	2026-06-24 04:10:26.308+00
d4ce4b30-bf88-4ce9-a7bc-8702813e5160	170	test-fl-cl219-volusia-signed-e2e	2026-06-24 13:31:51.108+00
6897f498-858e-4d77-a578-21662f4ac2ef	171	test-fl-soc-hillsborough-signed-e2e	2026-06-24 13:31:51.117+00
088689be-0bc9-44f6-85aa-a5a03f009dd9	172	test-fl-plain-soc-orange-signed-e2e	2026-06-24 13:31:51.12+00
2d2e8beb-db34-4ee6-b6da-00c54285e780	173	test-fl-clkct333-signed-e2e	2026-06-24 13:31:51.565+00
6e44ff17-e0dc-4e64-ac33-54ae87997411	230	test-fl-soc-hillsborough-signed-e2e	2026-06-25 13:23:19.167+00
e23817b3-1934-4806-bcd5-f7f2fbc5b0c6	229	test-fl-plain-soc-orange-signed-e2e	2026-06-25 13:23:19.167+00
b5c37ad9-5709-4398-a74d-5f5276fc577d	231	test-fl-cl219-volusia-signed-e2e	2026-06-25 13:23:19.218+00
0196f2cd-558c-4855-9970-979616007ddf	232	test-fl-clkct333-signed-e2e	2026-06-25 13:23:19.243+00
553b5597-baf4-4dac-aff3-a2b9f39a69f5	289	test-fl-soc-hillsborough-signed-e2e	2026-06-25 19:23:13.97+00
a4b24c89-2c1a-49f1-9dd6-d6821d072744	287	test-fl-clkct333-signed-e2e	2026-06-25 19:23:14.019+00
4c5a0593-b4c7-48d2-a6dd-7eb8eae977f7	288	test-fl-plain-soc-orange-signed-e2e	2026-06-25 19:23:14.031+00
68b2d6e0-1820-4d31-b8d6-000824abcb4f	286	test-fl-cl219-volusia-signed-e2e	2026-06-25 19:23:14.043+00
6d012d68-a65f-49a3-a524-1d8fd9ff5e20	100	test-fl-soc-hillsborough-signed-e2e	2026-06-23 19:50:31.723+00
41d2f0f4-935c-4002-83f1-4975b6b2d188	98	test-fl-cl219-volusia-signed-e2e	2026-06-23 19:50:31.728+00
bb27c605-6021-4e32-95bf-08ee309afa75	99	test-fl-clkct333-signed-e2e	2026-06-23 19:50:31.722+00
f6787e50-ade9-4440-9c89-28bdaf3030b5	101	test-fl-plain-soc-orange-signed-e2e	2026-06-23 19:50:31.722+00
8e3335ff-5e9f-4525-8923-a068918232ee	182	test-il-summons-e2e	2026-06-24 17:41:54.644+00
3c0963b9-3574-4684-8479-2f9733d933cf	185	test-il-summons-e2e	2026-06-24 17:42:43.928+00
b0a325c7-96ea-44c9-bcfc-a22fab1a808e	112	test-il-summons-e2e	2026-06-23 21:08:29.466+00
513552da-465a-4933-b3c9-c251ba715a95	305	test-fl-cl219-volusia-signed-e2e	2026-06-26 01:23:28.222+00
8246a79e-43b1-4b56-801f-36669b6ac6da	303	test-fl-soc-hillsborough-signed-e2e	2026-06-26 01:23:28.239+00
b7294f59-55e0-46c1-b290-1f4af5d1490b	115	test-il-summons-e2e	2026-06-23 21:10:14.777+00
f0017a07-0a7d-4a83-a57d-b003417ffaab	304	test-fl-clkct333-signed-e2e	2026-06-26 01:23:28.251+00
a70e5154-01fe-483e-82ca-1fd9ac33b406	302	test-fl-plain-soc-orange-signed-e2e	2026-06-26 01:23:28.267+00
bc2b7188-f74b-4f64-a804-4cd9441a0e4a	307	test-fl-fee-waiver-coord-check	2026-06-26 01:27:57.253+00
f8294869-63fd-423c-8134-3806d80d9cc8	322	test-fl-cl219-volusia-signed-e2e	2026-06-26 12:22:46.295+00
8c9f6ecb-70fd-4810-82e5-0b4b2aab3ced	319	test-fl-clkct333-signed-e2e	2026-06-26 12:22:46.296+00
9fdcbbe5-f0b9-4d7f-849f-4569bd5797d2	129	test-tx-citation-e2e	2026-06-23 21:32:19.939+00
b9cbb740-8b74-44d0-bde5-c3173a5c5784	129	test-tx-citation-e2e	2026-06-23 21:32:20.047+00
3d62d71b-9ff8-4d54-87d9-effc0e8da09e	320	test-fl-plain-soc-orange-signed-e2e	2026-06-26 12:22:46.299+00
c4ec85b2-1a62-4738-aad2-285c193e0ca0	321	test-fl-soc-hillsborough-signed-e2e	2026-06-26 12:22:46.302+00
5062a2e8-6728-4c44-8fa7-3d1722946797	324	test-fl-clkct333-signed-e2e	2026-06-26 13:12:04.185+00
b2f8ed7e-dafa-4bfb-8c51-e8091301d0a2	325	test-fl-plain-soc-orange-signed-e2e	2026-06-26 13:12:04.189+00
fa77e137-e714-493e-86bf-9c6b7917fbcc	323	test-fl-soc-hillsborough-signed-e2e	2026-06-26 13:12:04.193+00
d6ae4f47-0001-4fbc-a778-acdd3bc79d24	217	test-fl-clkct333-signed-e2e	2026-06-24 19:31:47.357+00
b115d1cf-71e4-497e-9abc-cb048f48ae91	214	test-fl-cl219-volusia-signed-e2e	2026-06-24 19:31:47.363+00
504c5a00-b5f3-4ea5-839c-6810605ba577	216	test-fl-soc-hillsborough-signed-e2e	2026-06-24 19:31:47.36+00
148b9e7c-ab94-463e-9de5-121a5a4b6c80	215	test-fl-plain-soc-orange-signed-e2e	2026-06-24 19:31:47.091+00
a844d434-63ab-4d16-af26-439377dae95d	326	test-fl-cl219-volusia-signed-e2e	2026-06-26 13:12:04.196+00
58f6d974-72e3-4456-b7a5-f22b8e0baf54	330	test-fl-plain-soc-orange-signed-e2e	2026-06-26 17:37:41.692+00
1b6aa587-93df-46c1-ac02-60244a0f69ca	327	test-fl-soc-hillsborough-signed-e2e	2026-06-26 17:37:41.672+00
6b22e5d0-8c41-4cbc-b1a6-c178f328c9b4	328	test-fl-clkct333-signed-e2e	2026-06-26 17:37:41.704+00
23317b22-3e5b-4651-8768-8fa5d55e6948	329	test-fl-cl219-volusia-signed-e2e	2026-06-26 17:37:41.707+00
a2853ee1-14e2-4d52-b894-b9af3eb4d305	332	test-fl-clkct333-signed-e2e	2026-06-27 12:59:46.11+00
e5cd63a6-7e41-4891-89bd-ced904349bf9	331	test-fl-cl219-volusia-signed-e2e	2026-06-27 12:59:46.102+00
62912b34-8966-4ad3-8887-ac84f1df26be	333	test-fl-plain-soc-orange-signed-e2e	2026-06-27 12:59:46.086+00
fb8c2e03-f99f-4a01-a97d-d6ae77782712	334	test-fl-soc-hillsborough-signed-e2e	2026-06-27 12:59:46.153+00
2dcd7568-a887-4a18-8576-945f9bb9b887	337	test-fl-cl219-volusia-signed-e2e	2026-06-27 13:49:22.108+00
4a3ea9aa-3205-4a19-a266-38e37cf95f68	338	test-fl-plain-soc-orange-signed-e2e	2026-06-27 13:49:22.111+00
48fd26a8-9f06-4d28-b069-f7895959dcb3	336	test-fl-soc-hillsborough-signed-e2e	2026-06-27 13:49:22.127+00
321696d5-c43b-4f36-a97c-8d70b3299d9a	335	test-fl-clkct333-signed-e2e	2026-06-27 13:49:22.129+00
bfbfe2bf-e0b7-4d7a-a6a9-626a519718fa	339	test-fl-cl219-volusia-signed-e2e	2026-06-27 14:42:59.23+00
a717c1f2-e499-4d70-99a6-e866617eec86	340	test-fl-clkct333-signed-e2e	2026-06-27 14:42:59.237+00
45683b11-17b1-4081-82d3-e6efb7c051ff	342	test-fl-plain-soc-orange-signed-e2e	2026-06-27 14:42:59.24+00
7c80b20b-0f4a-46de-bcb2-dbb7d61f1e91	341	test-fl-soc-hillsborough-signed-e2e	2026-06-27 14:42:59.238+00
f8d0cc5e-099e-47c5-95e2-5576ce4ef197	344	test-fl-soc-hillsborough-signed-e2e	2026-06-27 15:13:23.73+00
34634174-c28e-4271-96da-3c4a19a0e97d	346	test-fl-cl219-volusia-signed-e2e	2026-06-27 15:13:23.729+00
10e54c0f-6f04-4e1b-a835-b6893a8d0e82	345	test-fl-plain-soc-orange-signed-e2e	2026-06-27 15:13:23.745+00
569a61f4-cb29-43f9-8d0b-90fa4c98212b	343	test-fl-clkct333-signed-e2e	2026-06-27 15:13:23.744+00
c76637c9-d373-4880-9edc-5366b4f969af	348	test-fl-clkct333-signed-e2e	2026-06-27 15:58:28.823+00
68ea69f7-d91d-45aa-8d98-143e1a527116	349	test-fl-plain-soc-orange-signed-e2e	2026-06-27 15:58:28.92+00
6ee95f6d-94d0-4f42-a113-edac1d0853fd	347	test-fl-cl219-volusia-signed-e2e	2026-06-27 15:58:28.925+00
16b9b36f-3b26-4a78-b998-4d4d2f5f707c	350	test-fl-soc-hillsborough-signed-e2e	2026-06-27 15:58:28.931+00
562f3108-4428-4cad-b96a-2e59fdce0ba0	354	test-fl-clkct333-signed-e2e	2026-06-27 21:58:31.026+00
760e9dc1-d20c-4ec0-ba2b-e49b0e16c6e7	351	test-fl-plain-soc-orange-signed-e2e	2026-06-27 21:58:31.035+00
01980db6-b706-4f67-ac12-364c3d4068c7	353	test-fl-soc-hillsborough-signed-e2e	2026-06-27 21:58:31.039+00
caf1a00a-d2c9-4470-ab4f-d1c2e63b9887	352	test-fl-cl219-volusia-signed-e2e	2026-06-27 21:58:31.038+00
04fd2fb0-e9d1-4303-8fe0-721d38f0c9f8	355	test-fl-cl219-volusia-signed-e2e	2026-06-28 15:47:38.982+00
c853d584-7566-4272-aa7c-7cfc0e565cdd	357	test-fl-soc-hillsborough-signed-e2e	2026-06-28 15:47:38.993+00
eb159a62-5da5-44ca-843c-e7255a0247d6	358	test-fl-plain-soc-orange-signed-e2e	2026-06-28 15:47:38.996+00
8c19b116-0bcb-4bcc-87fd-d94d69a67261	356	test-fl-clkct333-signed-e2e	2026-06-28 15:47:39.008+00
b705737a-3bb6-4556-88e3-e149e9e6b865	697	test-fl-soc-hillsborough-signed-e2e	2026-07-06 02:47:39.275+00
b2d78dc3-7543-4126-af0f-70f4ac0ce2a5	698	test-fl-plain-soc-orange-signed-e2e	2026-07-06 13:17:54.331+00
880f3ee1-9489-47bf-9c69-a94c3e041f94	373	test-fl-clkct333-signed-e2e	2026-06-28 17:15:14.524+00
c4232b88-5876-4b1d-9870-39341c8a5cdb	374	test-fl-cl219-volusia-signed-e2e	2026-06-28 17:15:14.532+00
a9802f6e-4fcc-42de-8908-c06fa6d864ec	372	test-fl-plain-soc-orange-signed-e2e	2026-06-28 17:15:14.542+00
0aab84ee-cfae-4fb9-96ba-702607797561	371	test-fl-soc-hillsborough-signed-e2e	2026-06-28 17:15:14.552+00
4543daee-9279-4c3e-ab38-44b9fa013d1b	375	test-fl-plain-soc-orange-signed-e2e	2026-06-28 18:28:11.762+00
8f32e164-5dd7-4713-a29e-0db41bb58fb9	376	test-fl-soc-hillsborough-signed-e2e	2026-06-28 18:28:11.779+00
140bb126-0376-4e5b-ba23-688da65cc4d9	377	test-fl-clkct333-signed-e2e	2026-06-28 18:28:11.782+00
2e98dfbc-f02c-4ec5-b2cc-4731b086a0d0	378	test-fl-cl219-volusia-signed-e2e	2026-06-28 18:28:11.798+00
2d309469-0827-47d0-8980-07e8a204f1dd	560	test-fl-cl219-volusia-signed-e2e	2026-07-04 13:55:23.012+00
3f993674-f9e5-4191-972a-909e50300c77	570	test-fl-clkct333-signed-e2e	2026-07-05 14:53:05.392+00
3d8b5d6e-d66b-4eed-8808-218898a9aabe	392	test-fl-cl219-volusia-signed-e2e	2026-06-28 22:57:53.275+00
83bf54a1-3047-4b36-9ed1-7a99cfff67a5	391	test-fl-plain-soc-orange-signed-e2e	2026-06-28 22:57:53.286+00
b494b62a-a147-46e9-b0c2-804343513f55	393	test-fl-soc-hillsborough-signed-e2e	2026-06-28 22:57:53.289+00
61ad0ba3-bc84-409f-b127-15071e668dfa	394	test-fl-clkct333-signed-e2e	2026-06-28 22:57:53.292+00
cadc694f-740c-4ba6-9078-e2cc55f02377	396	test-fl-clkct333-signed-e2e	2026-06-29 05:14:02.923+00
cca8aa2c-8e29-4998-b44f-ad60aa8da947	398	test-fl-cl219-volusia-signed-e2e	2026-06-29 05:14:03.115+00
06a0f950-7be0-4f37-a4f9-1bff03177ec4	395	test-fl-plain-soc-orange-signed-e2e	2026-06-29 05:14:03.113+00
ca334ec4-4fd9-45fe-96c5-25153e97d397	397	test-fl-soc-hillsborough-signed-e2e	2026-06-29 05:14:03.11+00
26133277-6983-407b-86fd-1d2ea1df65a0	399	test-fl-cl219-volusia-signed-e2e	2026-06-29 14:21:18.063+00
bc0618c1-4733-4d86-a676-a138d11aec23	400	test-fl-soc-hillsborough-signed-e2e	2026-06-29 14:21:18.057+00
ae774316-f197-4111-8d9b-f2691f108755	402	test-fl-plain-soc-orange-signed-e2e	2026-06-29 14:21:18.097+00
4ea9f1b1-7255-443c-b634-da28096a661c	401	test-fl-clkct333-signed-e2e	2026-06-29 14:21:18.095+00
3011b55f-db9e-418c-9cab-604cd3d17e13	403	test-fl-plain-soc-orange-signed-e2e	2026-06-29 20:15:18.193+00
92aa7770-9bd4-4893-a213-fd87c0c45070	404	test-fl-clkct333-signed-e2e	2026-06-29 20:15:18.204+00
fe8336f7-eb21-4669-bcbf-e2f76b5f1337	406	test-fl-cl219-volusia-signed-e2e	2026-06-29 20:15:18.208+00
d31e5b95-e064-4218-b41b-c44de6408f05	405	test-fl-soc-hillsborough-signed-e2e	2026-06-29 20:15:18.21+00
ed06542c-eeb6-4734-be5c-dee8a2f46725	418	test-fl-clkct333-signed-e2e	2026-06-30 02:15:23.259+00
8192348b-463d-46b9-a71e-1d1b32127da8	419	test-fl-cl219-volusia-signed-e2e	2026-06-30 02:15:23.263+00
c6111221-58eb-4c8e-be6b-c2dc960e80c9	417	test-fl-soc-hillsborough-signed-e2e	2026-06-30 02:15:23.266+00
2c35e4ea-00a9-42f2-8848-296083ff0d60	420	test-fl-plain-soc-orange-signed-e2e	2026-06-30 02:15:23.266+00
7d868a82-76c2-410a-82f0-9e58410f60f0	424	test-fl-plain-soc-orange-signed-e2e	2026-06-30 12:44:11.8+00
8c7e9340-8bf7-4cc3-b2bd-898e27ca6028	422	test-fl-soc-hillsborough-signed-e2e	2026-06-30 12:44:11.796+00
bd2e7e74-fff8-4dc8-beb4-c155331c5dcc	423	test-fl-cl219-volusia-signed-e2e	2026-06-30 12:44:11.734+00
38be1540-eafc-4ae5-91fc-dc5ad2ce7c0a	421	test-fl-clkct333-signed-e2e	2026-06-30 12:44:11.808+00
aca1aec4-b524-419c-a8ec-e296b4f5b1bb	695	test-fl-cl219-volusia-signed-e2e	2026-07-06 02:47:39.203+00
edcd72f7-6a15-4994-b7a0-df0b55b1c152	700	test-fl-clkct333-signed-e2e	2026-07-06 13:17:54.3+00
d062671d-8354-42d0-863f-9511a8423c50	705	test-fl-plain-soc-orange-signed-e2e	2026-07-06 14:37:45.546+00
f0fef8ae-84b1-4772-a564-254f945f1e2f	702	test-fl-soc-hillsborough-signed-e2e	2026-07-06 14:37:45.557+00
845bf2c4-b9e4-4bc4-9a76-74d03ac380c7	562	test-fl-clkct333-signed-e2e	2026-07-04 13:55:23.013+00
dd98a49f-d0e5-41e1-8dfa-65181b49e03c	569	test-fl-plain-soc-orange-signed-e2e	2026-07-05 14:53:05.379+00
bc6a2477-a12c-4b69-a263-84e3794e7cc3	770	test-fl-soc-hillsborough-signed-e2e	2026-07-06 20:37:57.666+00
cd62477b-08b3-4571-897e-dcbb6f7d48ba	792	test-fl-soc-hillsborough-signed-e2e	2026-07-07 02:37:53.561+00
789d32a5-8bdf-4dd1-89c5-584cfc4b4063	794	test-fl-plain-soc-orange-signed-e2e	2026-07-07 13:43:01.464+00
9345902e-7060-4be5-be1d-668c0aff0d70	821	test-fl-cl219-volusia-signed-e2e	2026-07-07 16:59:17.585+00
4e1d48fa-9c3f-4d54-872a-6e022a4652b2	826	test-fl-cl219-volusia-signed-e2e	2026-07-07 22:59:23.685+00
086ca81f-4ad6-4a43-9fb1-9836025f4ada	833	test-fl-clkct333-signed-e2e	2026-07-08 06:05:43.471+00
c7ec04b1-4c72-4faa-8ae1-dcc01d0b322f	863	test-fl-clkct333-signed-e2e	2026-07-08 13:45:31.33+00
bd8100d6-ff60-4243-97d4-f1b3cac6b9a3	869	test-fl-clkct333-signed-e2e	2026-07-08 14:05:06.526+00
80556dbf-7997-4df4-bc41-9aad250e0e3f	694	test-fl-plain-soc-orange-signed-e2e	2026-07-06 02:47:39.206+00
40cb3145-ad07-4dd7-9a42-94b731920e6c	699	test-fl-cl219-volusia-signed-e2e	2026-07-06 13:17:54.328+00
0a722c35-b244-4262-b5e6-b1aec780c964	703	test-fl-cl219-volusia-signed-e2e	2026-07-06 14:37:45.549+00
558aae3c-69cd-4517-8556-5583de1b0ecc	563	test-fl-soc-hillsborough-signed-e2e	2026-07-04 13:55:23.079+00
aa007b5e-8c78-4069-9500-fa0f7d4d0ede	568	test-fl-soc-hillsborough-signed-e2e	2026-07-05 14:53:05.384+00
c0669be9-0aa2-4473-ac36-3a7ec84c5ece	769	test-fl-clkct333-signed-e2e	2026-07-06 20:37:57.636+00
c38d83c7-8d9a-498a-9ef6-598f3ccb91d6	772	test-fl-plain-soc-orange-signed-e2e	2026-07-06 20:37:57.668+00
769240d0-7451-4b09-87c7-dcab0bab759c	778	test-agent-fields-verify	2026-07-06 22:41:18.317+00
b59c15df-bafe-42fc-b441-a209516e3d60	779	test-agent-fields-verify	2026-07-06 22:41:18.399+00
8dd4c19f-3bf8-4fa8-8232-4d42d67fa5db	780	test-agent-fields-verify	2026-07-06 22:41:18.424+00
73770616-adfc-4a7d-857d-95fb19f6b97f	781	test-agent-fields-verify	2026-07-06 22:41:18.443+00
3d7320a9-a1a8-4680-b9d2-c11fb0291557	782	test-agent-fields-verify	2026-07-06 22:41:18.47+00
b0ffad91-f790-4687-a6a7-3817a2b6c45a	783	test-agent-fields-verify	2026-07-06 22:41:18.725+00
fb332774-5f6d-48c1-a365-d4b82874b4a9	791	test-fl-plain-soc-orange-signed-e2e	2026-07-07 02:37:53.55+00
a3da1e28-f584-45d7-8785-4ec9c93fa88a	793	test-fl-cl219-volusia-signed-e2e	2026-07-07 02:37:53.563+00
ff1140a8-abbf-47d3-bac9-b973a70dba60	796	test-fl-soc-hillsborough-signed-e2e	2026-07-07 13:43:01.447+00
c831efd1-9aed-41fa-85eb-48c5f4926a62	795	test-fl-clkct333-signed-e2e	2026-07-07 13:43:01.471+00
99f12727-10c0-4c0c-837d-ce4b9f0a1394	818	test-fl-clkct333-signed-e2e	2026-07-07 16:59:17.58+00
ae889892-8bec-4fa8-a553-f46e2e91bfb9	819	test-fl-plain-soc-orange-signed-e2e	2026-07-07 16:59:17.586+00
cb314479-4884-4841-a3a0-a064a192b0ff	828	test-fl-plain-soc-orange-signed-e2e	2026-07-07 22:59:23.574+00
5722d95e-3043-4217-9f53-7122debffccf	829	test-fl-clkct333-signed-e2e	2026-07-07 22:59:23.698+00
3239e179-0eb4-4aa7-ac64-325b874d5ba6	830	test-fl-soc-hillsborough-signed-e2e	2026-07-08 06:05:43.067+00
59ede112-99f4-45a9-897f-0923fe042e09	832	test-fl-cl219-volusia-signed-e2e	2026-07-08 06:05:43.469+00
fe69f74e-8999-44dc-bd09-cc8093a04205	864	test-fl-soc-hillsborough-signed-e2e	2026-07-08 13:45:31.33+00
ae49ee8e-4eb7-4f79-b6dc-7f5364b67ac8	865	test-fl-plain-soc-orange-signed-e2e	2026-07-08 13:45:31.333+00
bb2e081c-ff2d-4665-bfa2-d14454af7b7f	868	test-fl-cl219-volusia-signed-e2e	2026-07-08 14:05:06.473+00
561a9084-bd07-4e68-8c9a-c76ec0ebb390	870	test-fl-plain-soc-orange-signed-e2e	2026-07-08 14:05:06.533+00
bb90209d-66b0-4801-b321-174999a6bf47	883	form-visual-check	2026-07-08 15:02:50.135+00
b3e2fef1-db79-4b56-9157-f8a25730ddc9	600	test-nj-wa-forms-e2e	2026-07-05 18:49:00.359+00
b13bf3ae-958d-4b48-86c3-bd4ca50eaf0f	601	test-nj-wa-forms-e2e	2026-07-05 18:49:00.499+00
2e1cb8f0-b073-467a-808f-a7fc8e8ca37a	601	test-nj-wa-forms-e2e	2026-07-05 18:49:00.641+00
cab9e1e2-d2ff-44ca-a28f-6e50510f9d2a	435	test-fl-soc-hillsborough-signed-e2e	2026-06-30 18:44:05.848+00
6e61eda3-2b3f-453a-ad8d-1f4efa4941c9	433	test-fl-clkct333-signed-e2e	2026-06-30 18:44:05.872+00
9d449f68-711a-4a12-8def-ea8527aa9997	436	test-fl-plain-soc-orange-signed-e2e	2026-06-30 18:44:05.878+00
bf5c3e5a-7391-4fad-b3d4-f486d3702e56	434	test-fl-cl219-volusia-signed-e2e	2026-06-30 18:44:05.875+00
dbb5b099-c73f-4d14-9784-9eab69d267ba	696	test-fl-clkct333-signed-e2e	2026-07-06 02:47:39.215+00
2b8a453e-9acc-466e-98ee-13a5576b9eea	701	test-fl-soc-hillsborough-signed-e2e	2026-07-06 13:17:54.329+00
07e90473-e53d-47e4-9aa6-b2089faed387	704	test-fl-clkct333-signed-e2e	2026-07-06 14:37:45.546+00
307bf258-3ba7-4ce0-9ca3-3ff1bad87929	448	test-fl-plain-soc-orange-signed-e2e	2026-07-01 12:53:46.588+00
37d654fa-cfb5-4b86-bfe8-74dbfebe20f9	447	test-fl-clkct333-signed-e2e	2026-07-01 12:53:46.604+00
a40f8a13-f55a-465b-b258-1308df1d20e7	446	test-fl-soc-hillsborough-signed-e2e	2026-07-01 12:53:46.589+00
0f7191ce-e5f4-4a04-b3aa-5c878c66b325	445	test-fl-cl219-volusia-signed-e2e	2026-07-01 12:53:46.617+00
6e818fd2-4783-455c-b285-9fda02491373	452	test-fl-cl219-volusia-signed-e2e	2026-07-02 00:06:24.994+00
235087e1-463a-4df8-9892-1c033c677b84	450	test-fl-clkct333-signed-e2e	2026-07-02 00:06:25.017+00
c51283bb-f271-48ff-9d32-b0c370b95ea9	451	test-fl-soc-hillsborough-signed-e2e	2026-07-02 00:06:25.036+00
0cb05899-3f19-4324-b57d-2d76d4a9a7c4	449	test-fl-plain-soc-orange-signed-e2e	2026-07-02 00:06:25.038+00
47c6096d-0d04-429d-b2f6-547963985bf8	453	test-fl-plain-soc-orange-signed-e2e	2026-07-02 00:27:04.513+00
ad6bc7c9-a719-4e03-b1af-60816229147f	455	test-fl-clkct333-signed-e2e	2026-07-02 00:27:04.527+00
8d83d2c5-6fe9-42ca-b49a-0c859cca2662	456	test-fl-cl219-volusia-signed-e2e	2026-07-02 00:27:04.53+00
39cc5a94-053a-40a1-8e93-8046cdbe068a	454	test-fl-soc-hillsborough-signed-e2e	2026-07-02 00:27:04.553+00
0aa8add4-41a2-4f33-8078-59e36199e601	460	test-fl-clkct333-signed-e2e	2026-07-02 12:37:51.701+00
068b9579-f151-4469-b881-cfddd65ed704	459	test-fl-plain-soc-orange-signed-e2e	2026-07-02 12:37:51.703+00
34dc4eaf-4fdd-4335-9861-5ceacbe04f03	457	test-fl-cl219-volusia-signed-e2e	2026-07-02 12:37:51.71+00
1062bdab-c4e6-43db-bd9d-0ee9b921d67c	458	test-fl-soc-hillsborough-signed-e2e	2026-07-02 12:37:51.713+00
71ea309d-56ad-4ae0-8c3f-5b4b3aacfb24	462	test-fl-plain-soc-orange-signed-e2e	2026-07-02 20:13:20.943+00
575a71fb-9bcd-4885-adf8-bcf08f12f1b1	464	test-fl-clkct333-signed-e2e	2026-07-02 20:13:20.96+00
36e4d010-5a01-4446-beab-3df0dd3c196a	463	test-fl-soc-hillsborough-signed-e2e	2026-07-02 20:13:20.962+00
5abaa7ba-d096-46a3-9ca4-21f6c3974a8f	461	test-fl-cl219-volusia-signed-e2e	2026-07-02 20:13:20.959+00
6fa1ab6a-3160-4aa6-b4ab-995440ae65c0	467	test-fl-clkct333-signed-e2e	2026-07-03 01:04:43.088+00
03242f1e-deef-4de6-af92-6b4762a96edf	468	test-fl-soc-hillsborough-signed-e2e	2026-07-03 01:04:43.098+00
03a386f6-e814-4210-8cf2-4f2533c210e1	466	test-fl-plain-soc-orange-signed-e2e	2026-07-03 01:04:43.099+00
24aa662d-f0fc-44cf-ab9f-08866cdde156	465	test-fl-cl219-volusia-signed-e2e	2026-07-03 01:04:43.097+00
816a2c18-f4d7-4acd-9bbf-43e310f1c8d2	469	test-fl-cl219-volusia-signed-e2e	2026-07-03 13:02:51.63+00
5766e67d-7942-40b6-b7ce-9906bef4f9ea	471	test-fl-clkct333-signed-e2e	2026-07-03 13:02:51.643+00
2c7e4bc6-777d-424a-9e12-c0bfccf5377b	470	test-fl-soc-hillsborough-signed-e2e	2026-07-03 13:02:51.656+00
83cae704-2086-4789-a2db-de3f19c22a52	472	test-fl-plain-soc-orange-signed-e2e	2026-07-03 13:02:51.66+00
475cec2c-185b-4b2d-81fe-92c9ee65e5c7	561	test-fl-plain-soc-orange-signed-e2e	2026-07-04 13:55:22.959+00
8cf847a2-95e5-4276-8574-06167a28012e	571	test-fl-cl219-volusia-signed-e2e	2026-07-05 14:53:05.376+00
347ff192-4ba7-4a62-850d-f4100efbcef1	771	test-fl-cl219-volusia-signed-e2e	2026-07-06 20:37:57.661+00
33126270-5178-4909-8279-85a4b0fea3c1	790	test-fl-clkct333-signed-e2e	2026-07-07 02:37:53.55+00
7154c56c-e504-4a30-aeca-b843b888c95d	797	test-fl-cl219-volusia-signed-e2e	2026-07-07 13:43:01.462+00
d7d9ed34-cb0d-4bc1-b78e-7bdc57708caa	820	test-fl-soc-hillsborough-signed-e2e	2026-07-07 16:59:17.584+00
4d5609bd-058d-4efb-970f-bf91abf6cd64	827	test-fl-soc-hillsborough-signed-e2e	2026-07-07 22:59:23.684+00
25392ab6-9b10-4662-95aa-d675843edd3f	831	test-fl-plain-soc-orange-signed-e2e	2026-07-08 06:05:43.335+00
bd8f7ac8-2446-4c32-aa37-284446977c3e	866	test-fl-cl219-volusia-signed-e2e	2026-07-08 13:45:31.341+00
7d71e7f7-7fbd-48bf-a541-c2fa52b36b6d	867	test-fl-soc-hillsborough-signed-e2e	2026-07-08 14:05:06.522+00
\.


--
-- Data for Name: efile_court_locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.efile_court_locations (id, cli_code, jurisdiction_state, courthouse_id, court_name, filing_fee_amount, supports_small_claims, toga_url, review_tool_url, last_refreshed, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: efile_submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.efile_submissions (id, case_id, user_id, jurisdiction_state, court_cli, envelope_id, status, fees_charged, court_fee_amount, convenience_fee_amount, stripe_payment_intent_id, rejection_reason, submitted_at, accepted_at, rejected_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: genie_conversions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.genie_conversions (id, question, answer_snippet, created_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, conversation_id, role, content, created_at) FROM stdin;
\.


--
-- Data for Name: purchases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchases (id, user_id, stripe_session_id, stripe_price_id, stripe_product_id, plan_key, amount_total, currency, status, created_at) FROM stdin;
\.


--
-- Data for Name: _managed_webhooks; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe._managed_webhooks (id, object, url, enabled_events, description, enabled, livemode, metadata, secret, status, api_version, created, updated_at, last_synced_at, account_id) FROM stdin;
we_1TWIz6GsJamlGRz5aMh9PenS	webhook_endpoint	https://37b18f57-bb89-46f0-8f3e-61d410712d33-00-i3kbn43k3c01.worf.replit.dev/api/stripe/webhook	["charge.captured", "charge.dispute.closed", "charge.dispute.created", "charge.dispute.funds_reinstated", "charge.dispute.funds_withdrawn", "charge.dispute.updated", "charge.expired", "charge.failed", "charge.pending", "charge.refund.updated", "charge.refunded", "charge.succeeded", "charge.updated", "checkout.session.async_payment_failed", "checkout.session.async_payment_succeeded", "checkout.session.completed", "checkout.session.expired", "credit_note.created", "credit_note.updated", "credit_note.voided", "customer.created", "customer.deleted", "customer.subscription.created", "customer.subscription.deleted", "customer.subscription.paused", "customer.subscription.pending_update_applied", "customer.subscription.pending_update_expired", "customer.subscription.resumed", "customer.subscription.trial_will_end", "customer.subscription.updated", "customer.tax_id.created", "customer.tax_id.deleted", "customer.tax_id.updated", "customer.updated", "entitlements.active_entitlement_summary.updated", "invoice.created", "invoice.deleted", "invoice.finalization_failed", "invoice.finalized", "invoice.marked_uncollectible", "invoice.paid", "invoice.payment_action_required", "invoice.payment_failed", "invoice.payment_succeeded", "invoice.sent", "invoice.upcoming", "invoice.updated", "invoice.voided", "payment_intent.amount_capturable_updated", "payment_intent.canceled", "payment_intent.created", "payment_intent.partially_funded", "payment_intent.payment_failed", "payment_intent.processing", "payment_intent.requires_action", "payment_intent.succeeded", "payment_method.attached", "payment_method.automatically_updated", "payment_method.card_automatically_updated", "payment_method.detached", "payment_method.updated", "plan.created", "plan.deleted", "plan.updated", "price.created", "price.deleted", "price.updated", "product.created", "product.deleted", "product.updated", "radar.early_fraud_warning.created", "radar.early_fraud_warning.updated", "refund.created", "refund.failed", "refund.updated", "review.closed", "review.opened", "setup_intent.canceled", "setup_intent.created", "setup_intent.requires_action", "setup_intent.setup_failed", "setup_intent.succeeded", "subscription_schedule.aborted", "subscription_schedule.canceled", "subscription_schedule.completed", "subscription_schedule.created", "subscription_schedule.expiring", "subscription_schedule.released", "subscription_schedule.updated"]	\N	\N	f	{"managed_by": "stripe-sync"}	whsec_iuUmzuwSpLKrHi5T20cjy5OSyPPDvq7m	enabled	\N	1778602600	2026-05-12 16:16:40.492545+00	2026-05-12 16:16:40.491+00	acct_1TSm0mGsJamlGRz5
we_1TqviYGjdBAJdeVn9CExYx2I	webhook_endpoint	https://37b18f57-bb89-46f0-8f3e-61d410712d33-00-i3kbn43k3c01.worf.replit.dev/api/stripe/webhook	["charge.captured", "charge.dispute.closed", "charge.dispute.created", "charge.dispute.funds_reinstated", "charge.dispute.funds_withdrawn", "charge.dispute.updated", "charge.expired", "charge.failed", "charge.pending", "charge.refund.updated", "charge.refunded", "charge.succeeded", "charge.updated", "checkout.session.async_payment_failed", "checkout.session.async_payment_succeeded", "checkout.session.completed", "checkout.session.expired", "credit_note.created", "credit_note.updated", "credit_note.voided", "customer.created", "customer.deleted", "customer.subscription.created", "customer.subscription.deleted", "customer.subscription.paused", "customer.subscription.pending_update_applied", "customer.subscription.pending_update_expired", "customer.subscription.resumed", "customer.subscription.trial_will_end", "customer.subscription.updated", "customer.tax_id.created", "customer.tax_id.deleted", "customer.tax_id.updated", "customer.updated", "entitlements.active_entitlement_summary.updated", "invoice.created", "invoice.deleted", "invoice.finalization_failed", "invoice.finalized", "invoice.marked_uncollectible", "invoice.paid", "invoice.payment_action_required", "invoice.payment_failed", "invoice.payment_succeeded", "invoice.sent", "invoice.upcoming", "invoice.updated", "invoice.voided", "payment_intent.amount_capturable_updated", "payment_intent.canceled", "payment_intent.created", "payment_intent.partially_funded", "payment_intent.payment_failed", "payment_intent.processing", "payment_intent.requires_action", "payment_intent.succeeded", "payment_method.attached", "payment_method.automatically_updated", "payment_method.card_automatically_updated", "payment_method.detached", "payment_method.updated", "plan.created", "plan.deleted", "plan.updated", "price.created", "price.deleted", "price.updated", "product.created", "product.deleted", "product.updated", "radar.early_fraud_warning.created", "radar.early_fraud_warning.updated", "refund.created", "refund.failed", "refund.updated", "review.closed", "review.opened", "setup_intent.canceled", "setup_intent.created", "setup_intent.requires_action", "setup_intent.setup_failed", "setup_intent.succeeded", "subscription_schedule.aborted", "subscription_schedule.canceled", "subscription_schedule.completed", "subscription_schedule.created", "subscription_schedule.expiring", "subscription_schedule.released", "subscription_schedule.updated"]	\N	\N	t	{"managed_by": "stripe-sync"}	whsec_PckwmJXYAQVtayhEvo9covV4sucPUp3t	enabled	\N	1783518050	2026-07-08 13:40:50.850737+00	2026-07-08 13:40:50.849+00	acct_1TSm0YGjdBAJdeVn
\.


--
-- Data for Name: _migrations; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe._migrations (id, name, hash, executed_at) FROM stdin;
0	initial_migration	c18983eedaa79cc2f6d92727d70c4f772256ef3d	2026-05-02 22:53:00.233937
1	products	b99ffc23df668166b94156f438bfa41818d4e80c	2026-05-02 22:53:00.239832
2	customers	33e481247ddc217f4e27ad10dfe5430097981670	2026-05-02 22:53:00.251168
3	prices	7d5ff35640651606cc24cec8a73ff7c02492ecdf	2026-05-02 22:53:00.265035
4	subscriptions	2cc6121a943c2a623c604e5ab12118a57a6c329a	2026-05-02 22:53:00.289005
5	invoices	7fbb4ccb4ed76a830552520739aaa163559771b1	2026-05-02 22:53:00.300166
6	charges	fb284ed969f033f5ce19f479b7a7e27871bddf09	2026-05-02 22:53:00.312121
7	coupons	7ed6ec4133f120675fd7888c0477b6281743fede	2026-05-02 22:53:00.324263
8	disputes	29bdb083725efe84252647f043f5f91cd0dabf43	2026-05-02 22:53:00.336395
9	events	b28cb55b5b69a9f52ef519260210cd76eea3c84e	2026-05-02 22:53:00.346089
10	payouts	69d1050b88bba1024cea4a671f9633ce7bfe25ff	2026-05-02 22:53:00.364124
11	plans	fc1ae945e86d1222a59cbcd3ae7e81a3a282a60c	2026-05-02 22:53:00.374837
12	add_updated_at	1d80945ef050a17a26e35e9983a58178262470f2	2026-05-02 22:53:00.385731
13	add_subscription_items	2aa63409bfe910add833155ad7468cdab844e0f1	2026-05-02 22:53:00.398097
14	migrate_subscription_items	8c2a798b44a8a0d83ede6f50ea7113064ecc1807	2026-05-02 22:53:00.414621
15	add_customer_deleted	6886ddfd8c129d3c4b39b59519f92618b397b395	2026-05-02 22:53:00.423673
16	add_invoice_indexes	d6bb9a09d5bdf580986ed14f55db71227a4d356d	2026-05-02 22:53:00.427901
17	drop_charges_unavailable_columns	61cd5adec4ae2c308d2c33d1b0ed203c7d074d6a	2026-05-02 22:53:00.439049
18	setup_intents	1d45d0fa47fc145f636c9e3c1ea692417fbb870d	2026-05-02 22:53:00.449141
19	payment_methods	705bdb15b50f1a97260b4f243008b8a34d23fb09	2026-05-02 22:53:00.466556
20	disputes_payment_intent_created_idx	18b2cecd7c097a7ea3b3f125f228e8790288d5ca	2026-05-02 22:53:00.482549
21	payment_intent	b1f194ff521b373c4c7cf220c0feadc253ebff0b	2026-05-02 22:53:00.491546
22	adjust_plans	e4eae536b0bc98ee14d78e818003952636ee877c	2026-05-02 22:53:00.510143
23	invoice_deleted	78e864c3146174fee7d08f05226b02d931d5b2ae	2026-05-02 22:53:00.519251
24	subscription_schedules	85fa6adb3815619bb17e1dafb00956ff548f7332	2026-05-02 22:53:00.527109
25	tax_ids	3f9a1163533f9e60a53d61dae5e451ab937584d9	2026-05-02 22:53:00.540768
26	credit_notes	e099b6b04ee607ee868d82af5193373c3fc266d2	2026-05-02 22:53:00.558436
27	add_marketing_features_to_products	6ed1774b0a9606c5937b2385d61057408193e8a7	2026-05-02 22:53:00.577183
28	early_fraud_warning	e615b0b73fa13d3b0508a1956d496d516f0ebf40	2026-05-02 22:53:00.581861
29	reviews	dd3f914139725a7934dc1062de4cc05aece77aea	2026-05-02 22:53:00.600013
30	refunds	f76c4e273eccdc96616424d73967a9bea3baac4e	2026-05-02 22:53:00.618265
31	add_default_price	6d10566a68bc632831fa25332727d8ff842caec5	2026-05-02 22:53:00.637135
32	update_subscription_items	e894858d46840ba4be5ea093cdc150728bd1d66f	2026-05-02 22:53:00.642911
33	add_last_synced_at	43124eb65b18b70c54d57d2b4fcd5dae718a200f	2026-05-02 22:53:00.647712
34	remove_foreign_keys	e72ec19f3232cf6e6b7308ebab80341c2341745f	2026-05-02 22:53:00.655825
35	checkout_sessions	dc294f5bb1a4d613be695160b38a714986800a75	2026-05-02 22:53:00.662747
36	checkout_session_line_items	82c8cfce86d68db63a9fa8de973bfe60c91342dd	2026-05-02 22:53:00.688119
37	add_features	c68a2c2b7e3808eed28c8828b2ffd3a2c9bf2bd4	2026-05-02 22:53:00.706918
38	active_entitlement	5b3858e7a52212b01e7f338cf08e29767ab362af	2026-05-02 22:53:00.726257
39	add_paused_to_subscription_status	09012b5d128f6ba25b0c8f69a1203546cf1c9f10	2026-05-02 22:53:00.751069
40	managed_webhooks	1d453dfd0e27ff0c2de97955c4ec03919af0af7f	2026-05-02 22:53:00.756894
41	rename_managed_webhooks	ad7cd1e4971a50790bf997cd157f3403d294484f	2026-05-02 22:53:00.785073
42	convert_to_jsonb_generated_columns	e0703a0e5cd9d97db53d773ada1983553e37813c	2026-05-02 22:53:00.790754
43	add_account_id	9a6beffdd0972e3657b7118b2c5001be1f815faf	2026-05-02 22:53:05.702693
44	make_account_id_required	05c1e9145220e905e0c1ca5329851acaf7e9e506	2026-05-02 22:53:05.756422
45	sync_status	2f88c4883fa885a6eaa23b8b02da958ca77a1c21	2026-05-02 22:53:05.792459
46	sync_status_per_account	b1f1f3d4fdb4b4cf4e489d4b195c7f0f97f9f27c	2026-05-02 22:53:05.82489
47	api_key_hashes	8046e4c57544b8eae277b057d201a28a4529ffe3	2026-05-02 22:53:05.890046
48	rename_reserved_columns	e32290f655550ed308a7f2dcb5b0114e49a0558e	2026-05-02 22:53:05.896283
49	remove_redundant_underscores_from_metadata_tables	96d6f3a54e17d8e19abd022a030a95a6161bf73e	2026-05-02 22:53:11.317422
50	rename_id_to_match_stripe_api	c5300c5a10081c033dab9961f4e3cd6a2440c2b6	2026-05-02 22:53:11.334061
51	remove_webhook_uuid	289bee08167858dbf4d04ca184f42681660ebb66	2026-05-02 22:53:11.690676
52	webhook_url_uniqueness	d02aec1815ce3a108b8a1def1ff24e865b26db70	2026-05-02 22:53:11.697706
\.


--
-- Data for Name: _sync_status; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe._sync_status (id, resource, status, last_synced_at, last_incremental_cursor, error_message, updated_at, account_id) FROM stdin;
\.


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.accounts (_raw_data, first_synced_at, _last_synced_at, _updated_at, api_key_hashes) FROM stdin;
{"id": "acct_1TSm0mGsJamlGRz5", "type": "standard", "email": "paul@thoxie.com", "object": "account", "country": "US", "settings": {"payouts": {"schedule": {"interval": "daily", "delay_days": 2}, "statement_descriptor": null, "debit_negative_balances": true}, "branding": {"icon": "", "logo": null, "primary_color": null, "secondary_color": null}, "invoices": {"default_account_tax_ids": null, "hosted_payment_method_save": "offer"}, "payments": {"statement_descriptor": "SMALLCLAIMSGENIE.COM", "statement_descriptor_kana": null, "statement_descriptor_kanji": null}, "dashboard": {"timezone": "Etc/UTC", "display_name": "Thoxie sandbox"}, "card_issuing": {"tos_acceptance": {"ip": null, "date": null}}, "card_payments": {"statement_descriptor_prefix": null, "statement_descriptor_prefix_kana": null, "statement_descriptor_prefix_kanji": null}, "bacs_debit_payments": {"display_name": null, "service_user_number": null}, "sepa_debit_payments": {}}, "controller": {"type": "account"}, "capabilities": {}, "business_type": null, "charges_enabled": false, "payouts_enabled": false, "business_profile": {"mcc": null, "url": "https://smallclaimsgenie.com", "name": "Thoxie sandbox", "support_url": null, "support_email": null, "support_phone": null, "annual_revenue": null, "support_address": null, "estimated_worker_count": null, "minority_owned_business_designation": null}, "default_currency": "usd", "details_submitted": false}	2026-05-02 22:53:37.606849+00	2026-05-02 22:53:37.606849+00	2026-05-02 22:53:37.606849+00	{96d33eba38e2706d11be2af1d39a82ed1c0428bd7d3f05c94b7e211c6394117d}
{"id": "acct_1TSm0YGjdBAJdeVn", "type": "standard", "email": "paul@thoxie.com", "object": "account", "company": {"name": "Goldies Properties LLC", "structure": "single_member_llc"}, "country": "US", "settings": {"payouts": {"schedule": {"interval": "manual", "delay_days": 2}, "statement_descriptor": null, "debit_negative_balances": true}, "branding": {"icon": null, "logo": null, "primary_color": null, "secondary_color": null}, "invoices": {"default_account_tax_ids": null, "hosted_payment_method_save": "offer"}, "payments": {"statement_descriptor": "SMALL CLAIMS GENIE", "statement_descriptor_kana": null, "statement_descriptor_kanji": null}, "dashboard": {"timezone": "America/Cancun", "display_name": "Thoxie"}, "card_issuing": {"tos_acceptance": {"ip": null, "date": null}}, "card_payments": {"statement_descriptor_prefix": null, "statement_descriptor_prefix_kana": null, "statement_descriptor_prefix_kanji": null}, "bacs_debit_payments": {"display_name": null, "service_user_number": null}, "sepa_debit_payments": {}}, "controller": {"type": "account"}, "capabilities": {"transfers": "active", "eps_payments": "active", "pix_payments": "active", "blik_payments": "active", "card_payments": "active", "link_payments": "active", "affirm_payments": "inactive", "klarna_payments": "active", "mb_way_payments": "active", "cashapp_payments": "active", "acss_debit_payments": "active", "amazon_pay_payments": "active", "bancontact_payments": "active", "cartes_bancaires_payments": "pending", "afterpay_clearpay_payments": "active", "us_bank_account_ach_payments": "active"}, "business_type": "company", "charges_enabled": true, "payouts_enabled": true, "business_profile": {"mcc": "7392", "url": "https://smallclaimsgenie.com", "name": "Small Claims Genie", "support_url": null, "support_email": null, "support_phone": "+16506461925", "annual_revenue": null, "support_address": {"city": "Sausalito", "line1": "3020 Bridgeway", "line2": null, "state": "CA", "country": "US", "postal_code": "94965"}, "estimated_worker_count": null, "minority_owned_business_designation": null}, "default_currency": "usd", "details_submitted": true}	2026-05-12 22:56:37.845774+00	2026-06-24 15:22:33.332674+00	2026-06-24 15:22:33.332674+00	{4384cea76da68ac38847f5a74a8ee772e409479d6db6b885b8c64803a0a90aa0,573fcf3e2e1ecc3484ab4cda81476a6403ab3c65c45f80c30966f47544d288e8}
\.


--
-- Data for Name: active_entitlements; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.active_entitlements (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: charges; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.charges (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: checkout_session_line_items; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.checkout_session_line_items (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
2026-06-26 13:18:48.407551+00	2026-06-26 13:18:46+00	{"id": "li_1TmDB4GjdBAJdeVnP2JYykdK", "price": "price_1TlscwGjdBAJdeVnm4UN0EwC", "object": "item", "currency": "usd", "metadata": {}, "quantity": 1, "amount_tax": 0, "description": "Genie Plus: Paralegal Review", "amount_total": 15900, "amount_discount": 0, "amount_subtotal": 15900, "checkout_session": "cs_live_b1GRhoMIO1GyyJ1pU94av45oimu1zMA9ZacOwva9pvXBqe6vgmWEicGyi4", "adjustable_quantity": null}	acct_1TSm0YGjdBAJdeVn
\.


--
-- Data for Name: checkout_sessions; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.checkout_sessions (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
2026-06-26 13:18:47.08559+00	2026-06-26 13:18:46+00	{"id": "cs_live_b1GRhoMIO1GyyJ1pU94av45oimu1zMA9ZacOwva9pvXBqe6vgmWEicGyi4", "url": null, "mode": "payment", "locale": null, "object": "checkout.session", "status": "expired", "consent": null, "created": 1782393526, "invoice": null, "ui_mode": "hosted_page", "currency": "usd", "customer": null, "livemode": true, "metadata": {"userId": "user_3Bti2v3Lju4bFfnrNdXfnq83Q3J"}, "discounts": [], "cancel_url": "https://smallclaimsgenie.com/pricing?payment=cancelled", "expires_at": 1782479926, "custom_text": {"submit": null, "after_submit": null, "shipping_address": null, "terms_of_service_acceptance": null}, "permissions": null, "submit_type": null, "success_url": "https://smallclaimsgenie.com/dashboard?payment=success", "amount_total": 15900, "payment_link": null, "setup_intent": null, "subscription": null, "automatic_tax": {"status": null, "enabled": false, "provider": null, "liability": null}, "client_secret": null, "custom_fields": [], "shipping_cost": null, "total_details": {"amount_tax": 0, "amount_discount": 0, "amount_shipping": 0}, "customer_email": null, "origin_context": null, "payment_intent": null, "payment_status": "unpaid", "recovered_from": null, "wallet_options": null, "amount_subtotal": 15900, "adaptive_pricing": {"enabled": true}, "after_expiration": null, "customer_account": null, "customer_details": null, "invoice_creation": {"enabled": false, "invoice_data": {"footer": null, "issuer": null, "metadata": {}, "description": null, "custom_fields": null, "account_tax_ids": null, "rendering_options": null}}, "managed_payments": {"enabled": false}, "shipping_options": [], "branding_settings": {"icon": null, "logo": null, "font_family": "default", "border_style": "rounded", "button_color": "#0074d4", "display_name": "Small Claims Genie", "background_color": "#ffffff"}, "customer_creation": "if_required", "consent_collection": null, "client_reference_id": "user_3Bti2v3Lju4bFfnrNdXfnq83Q3J", "currency_conversion": null, "payment_method_types": ["card"], "allow_promotion_codes": true, "collected_information": null, "integration_identifier": null, "payment_method_options": {"card": {"request_three_d_secure": "automatic"}}, "phone_number_collection": {"enabled": false}, "payment_method_collection": "if_required", "billing_address_collection": null, "shipping_address_collection": null, "saved_payment_method_options": null, "payment_method_configuration_details": null}	acct_1TSm0YGjdBAJdeVn
\.


--
-- Data for Name: coupons; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.coupons (_updated_at, _last_synced_at, _raw_data) FROM stdin;
\.


--
-- Data for Name: credit_notes; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.credit_notes (_last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.customers (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: disputes; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.disputes (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: early_fraud_warnings; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.early_fraud_warnings (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.events (_updated_at, _last_synced_at, _raw_data) FROM stdin;
\.


--
-- Data for Name: features; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.features (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.invoices (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: payment_intents; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.payment_intents (_last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: payment_methods; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.payment_methods (_last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: payouts; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.payouts (_updated_at, _last_synced_at, _raw_data) FROM stdin;
\.


--
-- Data for Name: plans; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.plans (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: prices; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.prices (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
2026-05-02 22:53:50.796243+00	2026-05-02 22:53:50+00	{"id": "price_1TSmPyGsJamlGRz5Pis1jFyl", "type": "one_time", "active": true, "object": "price", "created": 1777762430, "product": "prod_URflhZ44lEopqL", "currency": "usd", "livemode": false, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 15900, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "15900"}	acct_1TSm0mGsJamlGRz5
2026-05-12 19:18:33.588846+00	2026-05-12 19:18:33+00	{"id": "price_1TWLp7GsJamlGRz5gR3BbYf4", "type": "one_time", "active": true, "object": "price", "created": 1778613513, "product": "prod_UVMYDY6yV8sEpb", "currency": "usd", "livemode": false, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 7900, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "7900"}	acct_1TSm0mGsJamlGRz5
2026-05-12 19:18:34.194295+00	2026-05-12 19:18:33+00	{"id": "price_1TWLp7GsJamlGRz5XNkOi39u", "type": "one_time", "active": true, "object": "price", "created": 1778613513, "product": "prod_UVMYdxyx8j0e4y", "currency": "usd", "livemode": false, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 9900, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "9900"}	acct_1TSm0mGsJamlGRz5
2026-05-12 19:18:34.864236+00	2026-05-12 19:18:34+00	{"id": "price_1TWLp8GsJamlGRz5TtlBpbYL", "type": "one_time", "active": true, "object": "price", "created": 1778613514, "product": "prod_UVMYAh9qSVasf6", "currency": "usd", "livemode": false, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 9900, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "9900"}	acct_1TSm0mGsJamlGRz5
2026-05-12 19:18:35.495449+00	2026-05-12 19:18:35+00	{"id": "price_1TWLp9GsJamlGRz50h0u3PEA", "type": "one_time", "active": true, "object": "price", "created": 1778613515, "product": "prod_UVMYp4MMQdFT94", "currency": "usd", "livemode": false, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 10900, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "10900"}	acct_1TSm0mGsJamlGRz5
2026-05-12 19:18:36.499154+00	2026-05-12 19:18:35+00	{"id": "price_1TWLp9GsJamlGRz5ekweRXnF", "type": "one_time", "active": true, "object": "price", "created": 1778613515, "product": "prod_UVMYx4peDDEnK2", "currency": "usd", "livemode": false, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 8900, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "8900"}	acct_1TSm0mGsJamlGRz5
2026-05-12 19:18:37.068711+00	2026-05-12 19:18:36+00	{"id": "price_1TWLpAGsJamlGRz5rORS5JSB", "type": "one_time", "active": true, "object": "price", "created": 1778613516, "product": "prod_UVMYrzhsY5hkqc", "currency": "usd", "livemode": false, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 10900, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "10900"}	acct_1TSm0mGsJamlGRz5
2026-05-12 23:02:47.7184+00	2026-05-12 23:02:47+00	{"id": "price_1TWPK7GjdBAJdeVnCxhjPd16", "type": "one_time", "active": true, "object": "price", "created": 1778626967, "product": "prod_UVQAo61jrin0Yx", "currency": "usd", "livemode": false, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 7900, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "7900"}	acct_1TSm0YGjdBAJdeVn
2026-05-12 23:02:48.242815+00	2026-05-12 23:02:47+00	{"id": "price_1TWPK7GjdBAJdeVn2oiUICcS", "type": "one_time", "active": true, "object": "price", "created": 1778626967, "product": "prod_UVQABSOxEr1iY4", "currency": "usd", "livemode": false, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 9900, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "9900"}	acct_1TSm0YGjdBAJdeVn
2026-05-12 23:02:48.904419+00	2026-05-12 23:02:48+00	{"id": "price_1TWPK8GjdBAJdeVnbNR8Nt49", "type": "one_time", "active": true, "object": "price", "created": 1778626968, "product": "prod_UVQAEtNHI3C6FM", "currency": "usd", "livemode": false, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 9900, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "9900"}	acct_1TSm0YGjdBAJdeVn
2026-05-12 23:02:49.507103+00	2026-05-12 23:02:49+00	{"id": "price_1TWPK9GjdBAJdeVnjq1lSYn7", "type": "one_time", "active": true, "object": "price", "created": 1778626969, "product": "prod_UVQAqYXybODNut", "currency": "usd", "livemode": false, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 10900, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "10900"}	acct_1TSm0YGjdBAJdeVn
2026-05-12 23:02:50.156233+00	2026-05-12 23:02:49+00	{"id": "price_1TWPK9GjdBAJdeVnf4YKjvX8", "type": "one_time", "active": true, "object": "price", "created": 1778626969, "product": "prod_UVQAWDSQoD7aY6", "currency": "usd", "livemode": false, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 15900, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "15900"}	acct_1TSm0YGjdBAJdeVn
2026-05-12 23:02:50.782413+00	2026-05-12 23:02:50+00	{"id": "price_1TWPKAGjdBAJdeVnHflaeF8s", "type": "one_time", "active": true, "object": "price", "created": 1778626970, "product": "prod_UVQAzvNk1wVChH", "currency": "usd", "livemode": false, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 8900, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "8900"}	acct_1TSm0YGjdBAJdeVn
2026-05-12 23:02:51.448853+00	2026-05-12 23:02:50+00	{"id": "price_1TWPKAGjdBAJdeVnpSkVRVNS", "type": "one_time", "active": true, "object": "price", "created": 1778626970, "product": "prod_UVQAFvC6UZfmUJ", "currency": "usd", "livemode": false, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 10900, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "10900"}	acct_1TSm0YGjdBAJdeVn
2026-06-26 13:18:48.400516+00	2026-06-26 13:18:48.4+00	{"id": "price_1TlscwGjdBAJdeVnm4UN0EwC", "type": "one_time", "active": true, "object": "price", "created": 1782314530, "product": "prod_UlPRvVh6N9bUBR", "currency": "usd", "livemode": true, "metadata": {}, "nickname": null, "recurring": null, "lookup_key": null, "tiers_mode": null, "unit_amount": 15900, "tax_behavior": "unspecified", "billing_scheme": "per_unit", "custom_unit_amount": null, "transform_quantity": null, "unit_amount_decimal": "15900"}	acct_1TSm0YGjdBAJdeVn
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.products (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
2026-05-02 22:53:50.558078+00	2026-05-02 22:53:50+00	{"id": "prod_URflhZ44lEopqL", "url": null, "name": "Genie Plus: Paralegal Review", "type": "service", "active": true, "images": [], "object": "product", "created": 1777762430, "updated": 1777762430, "livemode": false, "metadata": {"plan": "paralegal"}, "tax_code": null, "shippable": null, "attributes": [], "unit_label": null, "description": "Small Claims Genie AI tools plus personalized document review and hearing prep from a trained paralegal.", "tax_details": null, "default_price": null, "marketing_features": [], "package_dimensions": null, "statement_descriptor": null}	acct_1TSm0mGsJamlGRz5
2026-05-12 19:18:33.357816+00	2026-05-12 19:18:32+00	{"id": "prod_UVMYDY6yV8sEpb", "url": null, "name": "Personal Case (up to $5,000)", "type": "service", "active": true, "images": [], "object": "product", "created": 1778613512, "updated": 1778613512, "livemode": false, "metadata": {"plan": "personal_low"}, "tax_code": null, "shippable": null, "attributes": [], "unit_label": null, "description": "For person-versus-person disputes such as neighbor, roommate, or acquaintance conflicts. Claims up to $5,000.", "tax_details": null, "default_price": null, "marketing_features": [], "package_dimensions": null, "statement_descriptor": null}	acct_1TSm0mGsJamlGRz5
2026-05-12 19:18:33.942231+00	2026-05-12 19:18:33+00	{"id": "prod_UVMYdxyx8j0e4y", "url": null, "name": "Personal Case ($5,000 and above)", "type": "service", "active": true, "images": [], "object": "product", "created": 1778613513, "updated": 1778613513, "livemode": false, "metadata": {"plan": "personal_high"}, "tax_code": null, "shippable": null, "attributes": [], "unit_label": null, "description": "For person-versus-person disputes such as neighbor, roommate, or acquaintance conflicts. Claims of $5,000 or more.", "tax_details": null, "default_price": null, "marketing_features": [], "package_dimensions": null, "statement_descriptor": null}	acct_1TSm0mGsJamlGRz5
2026-05-12 19:18:34.648554+00	2026-05-12 19:18:34+00	{"id": "prod_UVMYAh9qSVasf6", "url": null, "name": "Business Case (up to $5,000)", "type": "service", "active": true, "images": [], "object": "product", "created": 1778613514, "updated": 1778613514, "livemode": false, "metadata": {"plan": "business_low"}, "tax_code": null, "shippable": null, "attributes": [], "unit_label": null, "description": "For any case involving a business on either side — individual suing a business or vice versa. Claims up to $5,000.", "tax_details": null, "default_price": null, "marketing_features": [], "package_dimensions": null, "statement_descriptor": null}	acct_1TSm0mGsJamlGRz5
2026-05-12 23:02:49.90316+00	2026-05-12 23:02:49+00	{"id": "prod_UVQAWDSQoD7aY6", "url": null, "name": "Genie Plus: Paralegal Review", "type": "service", "active": true, "images": [], "object": "product", "created": 1778626969, "updated": 1778626969, "livemode": false, "metadata": {"plan": "paralegal"}, "tax_code": null, "shippable": null, "attributes": [], "unit_label": null, "description": "Small Claims Genie AI tools plus personalized document review and hearing prep from a trained paralegal.", "tax_details": null, "default_price": null, "marketing_features": [], "package_dimensions": null, "statement_descriptor": null}	acct_1TSm0YGjdBAJdeVn
2026-05-12 19:18:35.275268+00	2026-05-12 19:18:34+00	{"id": "prod_UVMYp4MMQdFT94", "url": null, "name": "Business Case ($5,000 and above)", "type": "service", "active": true, "images": [], "object": "product", "created": 1778613514, "updated": 1778613514, "livemode": false, "metadata": {"plan": "business_high"}, "tax_code": null, "shippable": null, "attributes": [], "unit_label": null, "description": "For any case involving a business on either side — individual suing a business or vice versa. Claims of $5,000 or more.", "tax_details": null, "default_price": null, "marketing_features": [], "package_dimensions": null, "statement_descriptor": null}	acct_1TSm0mGsJamlGRz5
2026-05-12 19:18:36.176721+00	2026-05-12 19:18:35+00	{"id": "prod_UVMYx4peDDEnK2", "url": null, "name": "Post-Judgment Collection (up to $5,000)", "type": "service", "active": true, "images": [], "object": "product", "created": 1778613515, "updated": 1778613515, "livemode": false, "metadata": {"plan": "collection_low"}, "tax_code": null, "shippable": null, "attributes": [], "unit_label": null, "description": "Every enforcement tool California law provides — writs, levies, garnishments, and liens — for judgments up to $5,000.", "tax_details": null, "default_price": null, "marketing_features": [], "package_dimensions": null, "statement_descriptor": null}	acct_1TSm0mGsJamlGRz5
2026-05-12 19:19:16.515111+00	2026-05-12 19:19:16+00	{"id": "prod_UVMYrzhsY5hkqc", "url": null, "name": "Post-Judgment Collection ($5,000 and above)", "type": "service", "active": true, "images": [], "object": "product", "created": 1778613516, "updated": 1778613556, "livemode": false, "metadata": {"plan": "collection_high"}, "tax_code": null, "shippable": null, "attributes": [], "unit_label": null, "description": "Every enforcement tool California law provides — writs, levies, garnishments, and liens — for judgments of $5,000 or more.", "tax_details": null, "default_price": null, "marketing_features": [], "package_dimensions": null, "statement_descriptor": null}	acct_1TSm0mGsJamlGRz5
2026-05-12 23:02:47.4967+00	2026-05-12 23:02:46+00	{"id": "prod_UVQAo61jrin0Yx", "url": null, "name": "Personal Case (up to $5,000)", "type": "service", "active": true, "images": [], "object": "product", "created": 1778626966, "updated": 1778626966, "livemode": false, "metadata": {"plan": "personal_low"}, "tax_code": null, "shippable": null, "attributes": [], "unit_label": null, "description": "For person-versus-person disputes such as neighbor, roommate, or acquaintance conflicts. Claims up to $5,000.", "tax_details": null, "default_price": null, "marketing_features": [], "package_dimensions": null, "statement_descriptor": null}	acct_1TSm0YGjdBAJdeVn
2026-05-12 23:02:48.043745+00	2026-05-12 23:02:47+00	{"id": "prod_UVQABSOxEr1iY4", "url": null, "name": "Personal Case ($5,000 and above)", "type": "service", "active": true, "images": [], "object": "product", "created": 1778626967, "updated": 1778626967, "livemode": false, "metadata": {"plan": "personal_high"}, "tax_code": null, "shippable": null, "attributes": [], "unit_label": null, "description": "For person-versus-person disputes such as neighbor, roommate, or acquaintance conflicts. Claims of $5,000 or more.", "tax_details": null, "default_price": null, "marketing_features": [], "package_dimensions": null, "statement_descriptor": null}	acct_1TSm0YGjdBAJdeVn
2026-05-12 23:02:48.674844+00	2026-05-12 23:02:48+00	{"id": "prod_UVQAEtNHI3C6FM", "url": null, "name": "Business Case (up to $5,000)", "type": "service", "active": true, "images": [], "object": "product", "created": 1778626968, "updated": 1778626968, "livemode": false, "metadata": {"plan": "business_low"}, "tax_code": null, "shippable": null, "attributes": [], "unit_label": null, "description": "For any case involving a business on either side — individual suing a business or vice versa. Claims up to $5,000.", "tax_details": null, "default_price": null, "marketing_features": [], "package_dimensions": null, "statement_descriptor": null}	acct_1TSm0YGjdBAJdeVn
2026-05-12 23:02:49.315826+00	2026-05-12 23:02:48+00	{"id": "prod_UVQAqYXybODNut", "url": null, "name": "Business Case ($5,000 and above)", "type": "service", "active": true, "images": [], "object": "product", "created": 1778626968, "updated": 1778626968, "livemode": false, "metadata": {"plan": "business_high"}, "tax_code": null, "shippable": null, "attributes": [], "unit_label": null, "description": "For any case involving a business on either side — individual suing a business or vice versa. Claims of $5,000 or more.", "tax_details": null, "default_price": null, "marketing_features": [], "package_dimensions": null, "statement_descriptor": null}	acct_1TSm0YGjdBAJdeVn
2026-05-12 23:02:50.536902+00	2026-05-12 23:02:50+00	{"id": "prod_UVQAzvNk1wVChH", "url": null, "name": "Post-Judgment Collection (up to $5,000)", "type": "service", "active": true, "images": [], "object": "product", "created": 1778626970, "updated": 1778626970, "livemode": false, "metadata": {"plan": "collection_low"}, "tax_code": null, "shippable": null, "attributes": [], "unit_label": null, "description": "Every enforcement tool California law provides — writs, levies, garnishments, and liens — for judgments up to $5,000.", "tax_details": null, "default_price": null, "marketing_features": [], "package_dimensions": null, "statement_descriptor": null}	acct_1TSm0YGjdBAJdeVn
2026-05-12 23:02:51.170458+00	2026-05-12 23:02:50+00	{"id": "prod_UVQAFvC6UZfmUJ", "url": null, "name": "Post-Judgment Collection ($5,000 and above)", "type": "service", "active": true, "images": [], "object": "product", "created": 1778626970, "updated": 1778626970, "livemode": false, "metadata": {"plan": "collection_high"}, "tax_code": null, "shippable": null, "attributes": [], "unit_label": null, "description": "Every enforcement tool California law provides — writs, levies, garnishments, and liens — for judgments of $5,000 or more.", "tax_details": null, "default_price": null, "marketing_features": [], "package_dimensions": null, "statement_descriptor": null}	acct_1TSm0YGjdBAJdeVn
\.


--
-- Data for Name: refunds; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.refunds (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.reviews (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: setup_intents; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.setup_intents (_last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: subscription_items; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.subscription_items (_last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: subscription_schedules; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.subscription_schedules (_last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.subscriptions (_updated_at, _last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Data for Name: tax_ids; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.tax_ids (_last_synced_at, _raw_data, _account_id) FROM stdin;
\.


--
-- Name: beta_access_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.beta_access_id_seq', 1, true);


--
-- Name: cases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cases_id_seq', 903, true);


--
-- Name: chat_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.chat_messages_id_seq', 2, true);


--
-- Name: conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.conversations_id_seq', 1, false);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.documents_id_seq', 7, true);


--
-- Name: efile_court_locations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.efile_court_locations_id_seq', 1, false);


--
-- Name: efile_submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.efile_submissions_id_seq', 1, false);


--
-- Name: genie_conversions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.genie_conversions_id_seq', 1, false);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.messages_id_seq', 1, false);


--
-- Name: purchases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.purchases_id_seq', 1, false);


--
-- Name: _sync_status_id_seq; Type: SEQUENCE SET; Schema: stripe; Owner: postgres
--

SELECT pg_catalog.setval('stripe._sync_status_id_seq', 1, false);


--
-- Name: ai_rate_limits ai_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_rate_limits
    ADD CONSTRAINT ai_rate_limits_pkey PRIMARY KEY (user_id);


--
-- Name: beta_access beta_access_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.beta_access
    ADD CONSTRAINT beta_access_pkey PRIMARY KEY (id);


--
-- Name: beta_access beta_access_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.beta_access
    ADD CONSTRAINT beta_access_user_id_unique UNIQUE (user_id);


--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: download_tokens download_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.download_tokens
    ADD CONSTRAINT download_tokens_pkey PRIMARY KEY (token);


--
-- Name: efile_court_locations efile_court_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.efile_court_locations
    ADD CONSTRAINT efile_court_locations_pkey PRIMARY KEY (id);


--
-- Name: efile_submissions efile_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.efile_submissions
    ADD CONSTRAINT efile_submissions_pkey PRIMARY KEY (id);


--
-- Name: genie_conversions genie_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.genie_conversions
    ADD CONSTRAINT genie_conversions_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


--
-- Name: purchases purchases_stripe_session_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_stripe_session_id_unique UNIQUE (stripe_session_id);


--
-- Name: _migrations _migrations_name_key; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe._migrations
    ADD CONSTRAINT _migrations_name_key UNIQUE (name);


--
-- Name: _migrations _migrations_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe._migrations
    ADD CONSTRAINT _migrations_pkey PRIMARY KEY (id);


--
-- Name: _sync_status _sync_status_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe._sync_status
    ADD CONSTRAINT _sync_status_pkey PRIMARY KEY (id);


--
-- Name: _sync_status _sync_status_resource_account_key; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe._sync_status
    ADD CONSTRAINT _sync_status_resource_account_key UNIQUE (resource, account_id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: active_entitlements active_entitlements_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.active_entitlements
    ADD CONSTRAINT active_entitlements_pkey PRIMARY KEY (id);


--
-- Name: charges charges_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.charges
    ADD CONSTRAINT charges_pkey PRIMARY KEY (id);


--
-- Name: checkout_session_line_items checkout_session_line_items_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.checkout_session_line_items
    ADD CONSTRAINT checkout_session_line_items_pkey PRIMARY KEY (id);


--
-- Name: checkout_sessions checkout_sessions_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.checkout_sessions
    ADD CONSTRAINT checkout_sessions_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: credit_notes credit_notes_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.credit_notes
    ADD CONSTRAINT credit_notes_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: disputes disputes_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.disputes
    ADD CONSTRAINT disputes_pkey PRIMARY KEY (id);


--
-- Name: early_fraud_warnings early_fraud_warnings_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.early_fraud_warnings
    ADD CONSTRAINT early_fraud_warnings_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: features features_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.features
    ADD CONSTRAINT features_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: _managed_webhooks managed_webhooks_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe._managed_webhooks
    ADD CONSTRAINT managed_webhooks_pkey PRIMARY KEY (id);


--
-- Name: _managed_webhooks managed_webhooks_url_account_unique; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe._managed_webhooks
    ADD CONSTRAINT managed_webhooks_url_account_unique UNIQUE (url, account_id);


--
-- Name: payment_intents payment_intents_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.payment_intents
    ADD CONSTRAINT payment_intents_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- Name: payouts payouts_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.payouts
    ADD CONSTRAINT payouts_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: prices prices_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.prices
    ADD CONSTRAINT prices_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: refunds refunds_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.refunds
    ADD CONSTRAINT refunds_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: setup_intents setup_intents_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.setup_intents
    ADD CONSTRAINT setup_intents_pkey PRIMARY KEY (id);


--
-- Name: subscription_items subscription_items_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.subscription_items
    ADD CONSTRAINT subscription_items_pkey PRIMARY KEY (id);


--
-- Name: subscription_schedules subscription_schedules_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.subscription_schedules
    ADD CONSTRAINT subscription_schedules_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: tax_ids tax_ids_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.tax_ids
    ADD CONSTRAINT tax_ids_pkey PRIMARY KEY (id);


--
-- Name: cases_confirmation_email_sent_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cases_confirmation_email_sent_idx ON public.cases USING btree (confirmation_email_sent);


--
-- Name: cases_hearing_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cases_hearing_date_idx ON public.cases USING btree (hearing_date);


--
-- Name: cases_intake_complete_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cases_intake_complete_idx ON public.cases USING btree (intake_complete);


--
-- Name: cases_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cases_user_id_idx ON public.cases USING btree (user_id);


--
-- Name: chat_messages_case_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX chat_messages_case_id_idx ON public.chat_messages USING btree (case_id);


--
-- Name: documents_case_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX documents_case_id_idx ON public.documents USING btree (case_id);


--
-- Name: documents_ocr_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX documents_ocr_status_idx ON public.documents USING btree (ocr_status);


--
-- Name: efile_court_locations_cli_state_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX efile_court_locations_cli_state_uidx ON public.efile_court_locations USING btree (cli_code, jurisdiction_state);


--
-- Name: efile_court_locations_courthouse_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX efile_court_locations_courthouse_idx ON public.efile_court_locations USING btree (courthouse_id);


--
-- Name: efile_court_locations_state_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX efile_court_locations_state_idx ON public.efile_court_locations USING btree (jurisdiction_state);


--
-- Name: efile_submissions_case_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX efile_submissions_case_id_idx ON public.efile_submissions USING btree (case_id);


--
-- Name: efile_submissions_envelope_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX efile_submissions_envelope_id_idx ON public.efile_submissions USING btree (envelope_id);


--
-- Name: efile_submissions_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX efile_submissions_user_id_idx ON public.efile_submissions USING btree (user_id);


--
-- Name: purchases_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX purchases_user_id_idx ON public.purchases USING btree (user_id);


--
-- Name: active_entitlements_lookup_key_key; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE UNIQUE INDEX active_entitlements_lookup_key_key ON stripe.active_entitlements USING btree (lookup_key) WHERE (lookup_key IS NOT NULL);


--
-- Name: features_lookup_key_key; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE UNIQUE INDEX features_lookup_key_key ON stripe.features USING btree (lookup_key) WHERE (lookup_key IS NOT NULL);


--
-- Name: idx_accounts_api_key_hashes; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX idx_accounts_api_key_hashes ON stripe.accounts USING gin (api_key_hashes);


--
-- Name: idx_accounts_business_name; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX idx_accounts_business_name ON stripe.accounts USING btree (business_name);


--
-- Name: idx_sync_status_resource_account; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX idx_sync_status_resource_account ON stripe._sync_status USING btree (resource, account_id);


--
-- Name: stripe_active_entitlements_customer_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_active_entitlements_customer_idx ON stripe.active_entitlements USING btree (customer);


--
-- Name: stripe_active_entitlements_feature_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_active_entitlements_feature_idx ON stripe.active_entitlements USING btree (feature);


--
-- Name: stripe_checkout_session_line_items_price_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_checkout_session_line_items_price_idx ON stripe.checkout_session_line_items USING btree (price);


--
-- Name: stripe_checkout_session_line_items_session_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_checkout_session_line_items_session_idx ON stripe.checkout_session_line_items USING btree (checkout_session);


--
-- Name: stripe_checkout_sessions_customer_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_checkout_sessions_customer_idx ON stripe.checkout_sessions USING btree (customer);


--
-- Name: stripe_checkout_sessions_invoice_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_checkout_sessions_invoice_idx ON stripe.checkout_sessions USING btree (invoice);


--
-- Name: stripe_checkout_sessions_payment_intent_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_checkout_sessions_payment_intent_idx ON stripe.checkout_sessions USING btree (payment_intent);


--
-- Name: stripe_checkout_sessions_subscription_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_checkout_sessions_subscription_idx ON stripe.checkout_sessions USING btree (subscription);


--
-- Name: stripe_credit_notes_customer_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_credit_notes_customer_idx ON stripe.credit_notes USING btree (customer);


--
-- Name: stripe_credit_notes_invoice_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_credit_notes_invoice_idx ON stripe.credit_notes USING btree (invoice);


--
-- Name: stripe_dispute_created_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_dispute_created_idx ON stripe.disputes USING btree (created);


--
-- Name: stripe_early_fraud_warnings_charge_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_early_fraud_warnings_charge_idx ON stripe.early_fraud_warnings USING btree (charge);


--
-- Name: stripe_early_fraud_warnings_payment_intent_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_early_fraud_warnings_payment_intent_idx ON stripe.early_fraud_warnings USING btree (payment_intent);


--
-- Name: stripe_invoices_customer_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_invoices_customer_idx ON stripe.invoices USING btree (customer);


--
-- Name: stripe_invoices_subscription_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_invoices_subscription_idx ON stripe.invoices USING btree (subscription);


--
-- Name: stripe_managed_webhooks_enabled_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_managed_webhooks_enabled_idx ON stripe._managed_webhooks USING btree (enabled);


--
-- Name: stripe_managed_webhooks_status_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_managed_webhooks_status_idx ON stripe._managed_webhooks USING btree (status);


--
-- Name: stripe_payment_intents_customer_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_payment_intents_customer_idx ON stripe.payment_intents USING btree (customer);


--
-- Name: stripe_payment_intents_invoice_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_payment_intents_invoice_idx ON stripe.payment_intents USING btree (invoice);


--
-- Name: stripe_payment_methods_customer_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_payment_methods_customer_idx ON stripe.payment_methods USING btree (customer);


--
-- Name: stripe_refunds_charge_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_refunds_charge_idx ON stripe.refunds USING btree (charge);


--
-- Name: stripe_refunds_payment_intent_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_refunds_payment_intent_idx ON stripe.refunds USING btree (payment_intent);


--
-- Name: stripe_reviews_charge_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_reviews_charge_idx ON stripe.reviews USING btree (charge);


--
-- Name: stripe_reviews_payment_intent_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_reviews_payment_intent_idx ON stripe.reviews USING btree (payment_intent);


--
-- Name: stripe_setup_intents_customer_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_setup_intents_customer_idx ON stripe.setup_intents USING btree (customer);


--
-- Name: stripe_tax_ids_customer_idx; Type: INDEX; Schema: stripe; Owner: postgres
--

CREATE INDEX stripe_tax_ids_customer_idx ON stripe.tax_ids USING btree (customer);


--
-- Name: _managed_webhooks handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe._managed_webhooks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_metadata();


--
-- Name: _sync_status handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe._sync_status FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_metadata();


--
-- Name: accounts handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: active_entitlements handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.active_entitlements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: charges handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.charges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: checkout_session_line_items handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.checkout_session_line_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: checkout_sessions handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.checkout_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: coupons handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: customers handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: disputes handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.disputes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: early_fraud_warnings handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.early_fraud_warnings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: events handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: features handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.features FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: invoices handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: payouts handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.payouts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: plans handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: prices handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.prices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: products handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: refunds handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.refunds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: reviews handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: subscriptions handle_updated_at; Type: TRIGGER; Schema: stripe; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: chat_messages chat_messages_case_id_cases_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_case_id_cases_id_fk FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;


--
-- Name: documents documents_case_id_cases_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_case_id_cases_id_fk FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_conversations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_conversations_id_fk FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: active_entitlements fk_active_entitlements_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.active_entitlements
    ADD CONSTRAINT fk_active_entitlements_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: charges fk_charges_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.charges
    ADD CONSTRAINT fk_charges_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: checkout_session_line_items fk_checkout_session_line_items_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.checkout_session_line_items
    ADD CONSTRAINT fk_checkout_session_line_items_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: checkout_sessions fk_checkout_sessions_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.checkout_sessions
    ADD CONSTRAINT fk_checkout_sessions_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: credit_notes fk_credit_notes_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.credit_notes
    ADD CONSTRAINT fk_credit_notes_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: customers fk_customers_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.customers
    ADD CONSTRAINT fk_customers_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: disputes fk_disputes_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.disputes
    ADD CONSTRAINT fk_disputes_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: early_fraud_warnings fk_early_fraud_warnings_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.early_fraud_warnings
    ADD CONSTRAINT fk_early_fraud_warnings_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: features fk_features_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.features
    ADD CONSTRAINT fk_features_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: invoices fk_invoices_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.invoices
    ADD CONSTRAINT fk_invoices_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: _managed_webhooks fk_managed_webhooks_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe._managed_webhooks
    ADD CONSTRAINT fk_managed_webhooks_account FOREIGN KEY (account_id) REFERENCES stripe.accounts(id);


--
-- Name: payment_intents fk_payment_intents_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.payment_intents
    ADD CONSTRAINT fk_payment_intents_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: payment_methods fk_payment_methods_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.payment_methods
    ADD CONSTRAINT fk_payment_methods_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: plans fk_plans_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.plans
    ADD CONSTRAINT fk_plans_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: prices fk_prices_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.prices
    ADD CONSTRAINT fk_prices_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: products fk_products_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.products
    ADD CONSTRAINT fk_products_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: refunds fk_refunds_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.refunds
    ADD CONSTRAINT fk_refunds_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: reviews fk_reviews_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.reviews
    ADD CONSTRAINT fk_reviews_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: setup_intents fk_setup_intents_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.setup_intents
    ADD CONSTRAINT fk_setup_intents_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: subscription_items fk_subscription_items_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.subscription_items
    ADD CONSTRAINT fk_subscription_items_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: subscription_schedules fk_subscription_schedules_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.subscription_schedules
    ADD CONSTRAINT fk_subscription_schedules_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: subscriptions fk_subscriptions_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.subscriptions
    ADD CONSTRAINT fk_subscriptions_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- Name: _sync_status fk_sync_status_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe._sync_status
    ADD CONSTRAINT fk_sync_status_account FOREIGN KEY (account_id) REFERENCES stripe.accounts(id);


--
-- Name: tax_ids fk_tax_ids_account; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.tax_ids
    ADD CONSTRAINT fk_tax_ids_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 9Svb33I4S0KWaQAZefAuqtHek7VYENBSKs1StiKEGYoP8le4dgwS3m0CAZZGG2t

