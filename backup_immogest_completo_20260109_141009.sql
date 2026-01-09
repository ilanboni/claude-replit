--
-- PostgreSQL database dump
--

\restrict MLe66HlC6cqmkTFhmckelEm4HJHroqgI7bKxUMeCkhM5mEJAR5yTOhJQBHQA3Tc

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: appointment_confirmations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointment_confirmations (
    id integer NOT NULL,
    whatsapp_message_id integer,
    cliente_id integer,
    client_name text,
    client_phone text,
    salutation text,
    appointment_date timestamp without time zone NOT NULL,
    address text,
    original_message text,
    status text DEFAULT 'pending'::text,
    calendar_event_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: appointment_confirmations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointment_confirmations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appointment_confirmations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointment_confirmations_id_seq OWNED BY public.appointment_confirmations.id;


--
-- Name: appuntamenti; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appuntamenti (
    id integer NOT NULL,
    cliente_id integer NOT NULL,
    immobile_id integer,
    data_ora timestamp without time zone NOT NULL,
    luogo text,
    note text,
    confermato boolean DEFAULT false,
    completato boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    esito text
);


--
-- Name: appuntamenti_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appuntamenti_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appuntamenti_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appuntamenti_id_seq OWNED BY public.appuntamenti.id;


--
-- Name: attivita_cliente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attivita_cliente (
    id integer NOT NULL,
    cliente_id integer NOT NULL,
    immobile_id integer,
    titolo text NOT NULL,
    descrizione text,
    fonte text,
    scadenza timestamp without time zone,
    stato text DEFAULT 'da_fare'::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: attivita_cliente_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attivita_cliente_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attivita_cliente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attivita_cliente_id_seq OWNED BY public.attivita_cliente.id;


--
-- Name: attivita_immobile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attivita_immobile (
    id integer NOT NULL,
    immobile_id integer NOT NULL,
    titolo text NOT NULL,
    descrizione text,
    scadenza timestamp without time zone,
    stato text DEFAULT 'da_fare'::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: attivita_immobile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attivita_immobile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attivita_immobile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attivita_immobile_id_seq OWNED BY public.attivita_immobile.id;


--
-- Name: bot_conversation_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bot_conversation_logs (
    id integer NOT NULL,
    campaign_message_id integer NOT NULL,
    phone_number text NOT NULL,
    user_message text NOT NULL,
    bot_response text NOT NULL,
    intent text,
    confidence integer,
    metadata json,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: bot_conversation_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bot_conversation_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bot_conversation_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bot_conversation_logs_id_seq OWNED BY public.bot_conversation_logs.id;


--
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_events (
    id integer NOT NULL,
    title text NOT NULL,
    description text,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    location text,
    cliente_id integer,
    immobile_id integer,
    appointment_confirmation_id integer,
    google_event_id text,
    dedupe_key text,
    sync_status text DEFAULT 'pending'::text,
    sync_error text,
    last_sync_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: calendar_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.calendar_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: calendar_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.calendar_events_id_seq OWNED BY public.calendar_events.id;


--
-- Name: campaign_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_messages (
    id integer NOT NULL,
    campaign_id integer NOT NULL,
    immobile_esterno_id integer,
    phone_number text NOT NULL,
    owner_name text,
    message_content text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    sent_at timestamp without time zone,
    delivered_at timestamp without time zone,
    read_at timestamp without time zone,
    responded_at timestamp without time zone,
    response text,
    followup_sent boolean DEFAULT false,
    followup_sent_at timestamp without time zone,
    followup_response text,
    conversation_active boolean DEFAULT false,
    last_bot_message text,
    last_bot_message_at timestamp without time zone,
    error_message text,
    metadata json,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: campaign_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.campaign_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campaign_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campaign_messages_id_seq OWNED BY public.campaign_messages.id;


--
-- Name: clienti; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clienti (
    id integer NOT NULL,
    appellativo text,
    nome text,
    cognome text,
    telefono text,
    email text,
    compleanno text,
    religione text,
    note text,
    tipo_cliente text DEFAULT 'compratore'::text NOT NULL,
    rating_cliente integer DEFAULT 3,
    attivo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    link_immobile text,
    cliente_amico boolean DEFAULT false
);


--
-- Name: clienti_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clienti_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clienti_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clienti_id_seq OWNED BY public.clienti.id;


--
-- Name: comunicazioni; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comunicazioni (
    id integer NOT NULL,
    cliente_id integer,
    immobile_id integer,
    tipo text DEFAULT 'nota'::text NOT NULL,
    testo text NOT NULL,
    canale text DEFAULT 'sistema'::text,
    creato_da text DEFAULT 'sistema'::text,
    data_ora timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    esito text,
    immobile_esterno_id integer,
    whatsapp_message_id integer
);


--
-- Name: comunicazioni_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comunicazioni_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comunicazioni_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comunicazioni_id_seq OWNED BY public.comunicazioni.id;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id integer NOT NULL,
    title text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;


--
-- Name: documenti_immobile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documenti_immobile (
    id integer NOT NULL,
    immobile_id integer NOT NULL,
    nome text NOT NULL,
    tipo text,
    url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: documenti_immobile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.documenti_immobile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documenti_immobile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.documenti_immobile_id_seq OWNED BY public.documenti_immobile.id;


--
-- Name: immobili; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.immobili (
    id integer NOT NULL,
    proprietario_id integer,
    titolo text NOT NULL,
    descrizione text,
    indirizzo text,
    zona text,
    mq integer,
    prezzo numeric(12,2),
    piano integer,
    stato_nuovo boolean DEFAULT false,
    stato_ristrutturato boolean DEFAULT false,
    stato_buono boolean DEFAULT false,
    stato_da_ristrutturare boolean DEFAULT false,
    balcone boolean DEFAULT false,
    terrazzo boolean DEFAULT false,
    ascensore boolean DEFAULT false,
    box boolean DEFAULT false,
    camere integer,
    bagni integer,
    latitudine numeric(10,7),
    longitudine numeric(10,7),
    esclusiva boolean DEFAULT false,
    multiagenzia boolean DEFAULT false,
    fonte text DEFAULT 'privato'::text,
    immagini json DEFAULT '[]'::json,
    attivo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    citta text,
    stato_vendita text DEFAULT 'disponibile'::text,
    note_interne text,
    piani_edificio integer,
    cantina boolean DEFAULT false,
    giardino boolean DEFAULT false,
    arredato boolean DEFAULT false,
    classe_energetica text,
    prestazione_energetica text,
    spese_condominiali numeric(10,2),
    riscaldamento text,
    esposizione text,
    anno_costruzione integer,
    contatto_nome text,
    contatto_telefono text,
    contatto_email text,
    url_annuncio text,
    testo_originale text,
    riferimento_annuncio text,
    data_pubblicazione text,
    stato_contatto text DEFAULT 'nuovo'::text,
    messaggio_inviato text,
    data_contatto timestamp without time zone,
    preferito boolean DEFAULT false,
    origine text DEFAULT 'mandato'::text,
    caratteristiche json DEFAULT '{}'::json,
    id_web text,
    id_portale text
);


--
-- Name: immobili_esterni; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.immobili_esterni (
    id integer NOT NULL,
    titolo text NOT NULL,
    descrizione text,
    indirizzo text,
    zona text,
    mq integer,
    prezzo numeric(12,2),
    piano integer,
    camere integer,
    bagni integer,
    contatto_nome text,
    contatto_telefono text,
    contatto_email text,
    url_annuncio text,
    fonte text DEFAULT 'manuale'::text,
    testo_originale text,
    caratteristiche json DEFAULT '{}'::json,
    immagini json DEFAULT '[]'::json,
    data_pubblicazione text,
    preferito boolean DEFAULT false,
    stato_contatto text DEFAULT 'nuovo'::text,
    messaggio_inviato text,
    data_contatto timestamp without time zone,
    note text,
    attivo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    citta text,
    piani_edificio integer,
    ascensore boolean DEFAULT false,
    balcone boolean DEFAULT false,
    terrazzo boolean DEFAULT false,
    box boolean DEFAULT false,
    cantina boolean DEFAULT false,
    giardino boolean DEFAULT false,
    arredato boolean DEFAULT false,
    stato_nuovo boolean DEFAULT false,
    stato_ristrutturato boolean DEFAULT false,
    stato_buono boolean DEFAULT false,
    stato_da_ristrutturare boolean DEFAULT false,
    classe_energetica text,
    prestazione_energetica text,
    spese_condominiali numeric(10,2),
    riscaldamento text,
    esposizione text,
    anno_costruzione integer,
    riferimento_annuncio text,
    cliente_id integer,
    id_web text
);


--
-- Name: immobili_esterni_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.immobili_esterni_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: immobili_esterni_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.immobili_esterni_id_seq OWNED BY public.immobili_esterni.id;


--
-- Name: immobili_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.immobili_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: immobili_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.immobili_id_seq OWNED BY public.immobili.id;


--
-- Name: matching; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matching (
    id integer NOT NULL,
    richiesta_id integer NOT NULL,
    immobile_id integer NOT NULL,
    punteggio integer DEFAULT 0 NOT NULL,
    proposto boolean DEFAULT false,
    accettato boolean,
    note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: matching_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.matching_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: matching_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.matching_id_seq OWNED BY public.matching.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    conversation_id integer NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: notifiche; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifiche (
    id integer NOT NULL,
    tipo text NOT NULL,
    titolo text NOT NULL,
    messaggio text,
    cliente_id integer,
    immobile_id integer,
    email_id text,
    letta boolean DEFAULT false,
    archiviata boolean DEFAULT false,
    priorita integer DEFAULT 2,
    scadenza timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: notifiche_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifiche_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifiche_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifiche_id_seq OWNED BY public.notifiche.id;


--
-- Name: oauth_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_tokens (
    id integer NOT NULL,
    provider text NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    expires_at timestamp without time zone,
    scope text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: oauth_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.oauth_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: oauth_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.oauth_tokens_id_seq OWNED BY public.oauth_tokens.id;


--
-- Name: portali_immobile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portali_immobile (
    id integer NOT NULL,
    immobile_id integer NOT NULL,
    nome_portale text NOT NULL,
    url_annuncio text,
    stato text DEFAULT 'online'::text,
    data_pubblicazione timestamp without time zone,
    note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: portali_immobile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.portali_immobile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: portali_immobile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.portali_immobile_id_seq OWNED BY public.portali_immobile.id;


--
-- Name: richieste; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.richieste (
    id integer NOT NULL,
    cliente_id integer NOT NULL,
    descrizione_libera text,
    budget_massimo numeric(12,2),
    mq_minimi integer,
    zona text,
    poligono_geografico json,
    piano_tutti boolean DEFAULT false,
    piano_intermedi boolean DEFAULT false,
    piano_ultimo boolean DEFAULT false,
    stato_nuovo boolean DEFAULT false,
    stato_ristrutturato boolean DEFAULT false,
    stato_buono boolean DEFAULT false,
    stato_da_ristrutturare boolean DEFAULT false,
    balcone boolean DEFAULT false,
    terrazzo boolean DEFAULT false,
    ascensore boolean DEFAULT false,
    box boolean DEFAULT false,
    camere_minime integer,
    bagni_minimi integer,
    priorita integer DEFAULT 2,
    rating_richiesta integer DEFAULT 3,
    attiva boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    link_ricerca text
);


--
-- Name: richieste_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.richieste_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: richieste_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.richieste_id_seq OWNED BY public.richieste.id;


--
-- Name: scheduled_bot_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_bot_messages (
    id integer NOT NULL,
    campaign_message_id integer NOT NULL,
    conversation_id integer NOT NULL,
    phone_number text NOT NULL,
    user_message text NOT NULL,
    scheduled_at timestamp without time zone NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0,
    last_error text,
    sent_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: scheduled_bot_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scheduled_bot_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scheduled_bot_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scheduled_bot_messages_id_seq OWNED BY public.scheduled_bot_messages.id;


--
-- Name: storico_prezzo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.storico_prezzo (
    id integer NOT NULL,
    immobile_id integer NOT NULL,
    prezzo numeric(12,2) NOT NULL,
    data_modifica timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    note text
);


--
-- Name: storico_prezzo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.storico_prezzo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: storico_prezzo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.storico_prezzo_id_seq OWNED BY public.storico_prezzo.id;


--
-- Name: whatsapp_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_campaigns (
    id integer NOT NULL,
    name text NOT NULL,
    template text NOT NULL,
    instructions text,
    objection_handling json,
    followup_template text,
    followup_delay_days integer DEFAULT 3,
    use_ai_personalization boolean DEFAULT false,
    status text DEFAULT 'draft'::text NOT NULL,
    total_targets integer DEFAULT 0,
    sent_count integer DEFAULT 0,
    responded_count integer DEFAULT 0,
    converted_count integer DEFAULT 0,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    metadata json,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: whatsapp_campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.whatsapp_campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: whatsapp_campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.whatsapp_campaigns_id_seq OWNED BY public.whatsapp_campaigns.id;


--
-- Name: whatsapp_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_conversations (
    id integer NOT NULL,
    phone_number text NOT NULL,
    cliente_id integer,
    immobile_id integer,
    nome text,
    ultimo_messaggio text,
    ultimo_messaggio_data timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    non_letti integer DEFAULT 0,
    stato text DEFAULT 'attivo'::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: whatsapp_conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.whatsapp_conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: whatsapp_conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.whatsapp_conversations_id_seq OWNED BY public.whatsapp_conversations.id;


--
-- Name: whatsapp_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_messages (
    id integer NOT NULL,
    conversation_id integer NOT NULL,
    whatsapp_message_id text,
    direction text NOT NULL,
    message_type text DEFAULT 'text'::text,
    content text NOT NULL,
    media_url text,
    status text DEFAULT 'sent'::text,
    status_timestamp timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: whatsapp_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.whatsapp_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: whatsapp_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.whatsapp_messages_id_seq OWNED BY public.whatsapp_messages.id;


--
-- Name: appointment_confirmations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_confirmations ALTER COLUMN id SET DEFAULT nextval('public.appointment_confirmations_id_seq'::regclass);


--
-- Name: appuntamenti id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appuntamenti ALTER COLUMN id SET DEFAULT nextval('public.appuntamenti_id_seq'::regclass);


--
-- Name: attivita_cliente id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attivita_cliente ALTER COLUMN id SET DEFAULT nextval('public.attivita_cliente_id_seq'::regclass);


--
-- Name: attivita_immobile id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attivita_immobile ALTER COLUMN id SET DEFAULT nextval('public.attivita_immobile_id_seq'::regclass);


--
-- Name: bot_conversation_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_conversation_logs ALTER COLUMN id SET DEFAULT nextval('public.bot_conversation_logs_id_seq'::regclass);


--
-- Name: calendar_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events ALTER COLUMN id SET DEFAULT nextval('public.calendar_events_id_seq'::regclass);


--
-- Name: campaign_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_messages ALTER COLUMN id SET DEFAULT nextval('public.campaign_messages_id_seq'::regclass);


--
-- Name: clienti id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clienti ALTER COLUMN id SET DEFAULT nextval('public.clienti_id_seq'::regclass);


--
-- Name: comunicazioni id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunicazioni ALTER COLUMN id SET DEFAULT nextval('public.comunicazioni_id_seq'::regclass);


--
-- Name: conversations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations ALTER COLUMN id SET DEFAULT nextval('public.conversations_id_seq'::regclass);


--
-- Name: documenti_immobile id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documenti_immobile ALTER COLUMN id SET DEFAULT nextval('public.documenti_immobile_id_seq'::regclass);


--
-- Name: immobili id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.immobili ALTER COLUMN id SET DEFAULT nextval('public.immobili_id_seq'::regclass);


--
-- Name: immobili_esterni id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.immobili_esterni ALTER COLUMN id SET DEFAULT nextval('public.immobili_esterni_id_seq'::regclass);


--
-- Name: matching id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matching ALTER COLUMN id SET DEFAULT nextval('public.matching_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: notifiche id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifiche ALTER COLUMN id SET DEFAULT nextval('public.notifiche_id_seq'::regclass);


--
-- Name: oauth_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_tokens ALTER COLUMN id SET DEFAULT nextval('public.oauth_tokens_id_seq'::regclass);


--
-- Name: portali_immobile id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portali_immobile ALTER COLUMN id SET DEFAULT nextval('public.portali_immobile_id_seq'::regclass);


--
-- Name: richieste id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.richieste ALTER COLUMN id SET DEFAULT nextval('public.richieste_id_seq'::regclass);


--
-- Name: scheduled_bot_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_bot_messages ALTER COLUMN id SET DEFAULT nextval('public.scheduled_bot_messages_id_seq'::regclass);


--
-- Name: storico_prezzo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storico_prezzo ALTER COLUMN id SET DEFAULT nextval('public.storico_prezzo_id_seq'::regclass);


--
-- Name: whatsapp_campaigns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_campaigns ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_campaigns_id_seq'::regclass);


--
-- Name: whatsapp_conversations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_conversations_id_seq'::regclass);


--
-- Name: whatsapp_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_messages ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_messages_id_seq'::regclass);


--
-- Data for Name: appointment_confirmations; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: appuntamenti; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: attivita_cliente; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.attivita_cliente VALUES (1, 40, NULL, 'WhatsApp inviato', 'Gent.mo Sig. Troina,

la contatto in quanto, recentemente, abbiamo organizzato un sopralluogo presso un trilocale sito in Via Primaticcio 90.

In merito a questo immobile, la proprietà, non avendolo ancora venduto, ha deciso di abbassare la richiesta economica.

Le invio, di seguito, il link dell''immobile e rimango a disposizione per effettuare un nuovo sopralluogo oppure per fornirle eventuali informazioni.

Le inoltro di seguito il link dell''appartamento e porgo cordiali saluti,

Ilan Boni - C', NULL, NULL, 'da_fare', '2026-01-08 12:25:04.615692');
INSERT INTO public.attivita_cliente VALUES (2, 41, NULL, 'WhatsApp inviato', 'Ciao', NULL, NULL, 'da_fare', '2026-01-08 14:06:28.932204');
INSERT INTO public.attivita_cliente VALUES (4, 43, 3, 'URGENTE: Rispondere a Brunella Della Mura', 'Richiesta visita immobile Prima (Via Primaticcio) da Idealista. Messaggio cliente: Questo appartamento mi interessa e mi piacerebbe visitarlo. Grazie', NULL, NULL, 'fatto', '2026-01-08 22:44:31.957379');


--
-- Data for Name: attivita_immobile; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.attivita_immobile VALUES (1, 3, 'WhatsApp inviato', 'WhatsApp inviato a Giovanni Troina: Gent.mo Sig. Troina,

la contatto in quanto, recentemente, abbiamo organizzato un sopralluogo presso un trilocale sito in Via Primaticcio 90.

In merito a questo immobile, la proprietà, non avendolo ancora venduto, ha deciso di abbassare la richiesta economica.

Le invio, di seguito, il link dell''im', NULL, 'fatto', '2026-01-08 12:25:04.610347');
INSERT INTO public.attivita_immobile VALUES (2, 3, 'WhatsApp inviato', 'WhatsApp inviato a Brunella Della Mura: Buongiorno Sig.ra Della Mura,

ho ricevuto la sua richiesta di visita per l''immobile di Via Primaticcio.

Se mi volesse dare qualche sua disponibilità procedo volentieri con il fissare un sopralluogo.

Rimango in attesa di un suo riscontro e le auguro una buona giornata.

Ilan Boni - Cavour Immobili', NULL, 'fatto', '2026-01-09 08:34:54.141349');


--
-- Data for Name: bot_conversation_logs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: calendar_events; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: campaign_messages; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.campaign_messages VALUES (1, 1, NULL, '393407992052', 'Proprietario Via Torino', 'Messaggio di acquisizione', 'sent', '2026-01-09 08:33:17.636025', NULL, NULL, NULL, NULL, false, NULL, NULL, true, NULL, NULL, NULL, NULL, '2026-01-09 09:03:17.636025');
INSERT INTO public.campaign_messages VALUES (2, 1, 16, '393475876090', 'Proprietario Indipendenza - Regina Giovanna, Milano', 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent''anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un''opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile. Dal suo annuncio si notano alcune caratteristiche, come la doppia esposizione e la ristrutturazione, che rendono l''immobile in linea con alcune esigenze ricorrenti in questo periodo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l''immobile: una decina di minuti per ascoltare la sua situazione, vedere l''appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', 'sent', '2026-01-09 09:40:33.847', NULL, NULL, NULL, NULL, false, NULL, NULL, true, NULL, NULL, NULL, NULL, '2026-01-09 09:40:33.848443');
INSERT INTO public.campaign_messages VALUES (3, 1, 15, '393514371535', 'Proprietario San Vittore - Washington, Milano', 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent''anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un''opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile. Dal suo annuncio si notano alcune caratteristiche, come la ristrutturazione completa del 2022 e la doppia esposizione, che rendono l''immobile in linea con alcune esigenze ricorrenti in questo periodo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l''immobile: una decina di minuti per ascoltare la sua situazione, vedere l''appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', 'sent', '2026-01-09 09:40:58.747', NULL, NULL, NULL, NULL, false, NULL, NULL, true, NULL, NULL, NULL, NULL, '2026-01-09 09:40:58.747711');
INSERT INTO public.campaign_messages VALUES (4, 1, 13, '393387112718', 'Proprietario Carrobbio - Cinque Vie, Milano', 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent''anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un''opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile. Dal suo annuncio si notano alcune caratteristiche, come la ristrutturazione completa e la doppia esposizione, che rendono l''immobile in linea con alcune esigenze ricorrenti in questo periodo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l''immobile: una decina di minuti per ascoltare la sua situazione, vedere l''appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', 'sent', '2026-01-09 09:41:42.645', NULL, NULL, NULL, NULL, false, NULL, NULL, true, NULL, NULL, NULL, NULL, '2026-01-09 09:41:42.646468');
INSERT INTO public.campaign_messages VALUES (5, 1, 15, '393514371535', 'Proprietario San Vittore - Washington, Milano', 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent''anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un''opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile. Dal suo annuncio si notano alcune caratteristiche, come la ristrutturazione completa del 2022 e la doppia esposizione, che rendono l''immobile in linea con alcune esigenze ricorrenti in questo periodo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l''immobile: una decina di minuti per ascoltare la sua situazione, vedere l''appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', 'sent', '2026-01-09 10:00:49.878', NULL, NULL, NULL, NULL, false, NULL, NULL, true, NULL, NULL, NULL, NULL, '2026-01-09 10:00:49.879682');


--
-- Data for Name: clienti; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.clienti VALUES (40, 'Sig.', 'Giovanni', 'Troina', '+39 347 1027 019', 'giovannitroina@hotmail.it', '', 'cattolica', '', 'compratore', 3, true, '2026-01-08 11:07:59.581732', '2026-01-08 11:15:07.01', NULL, false);
INSERT INTO public.clienti VALUES (39, 'Ciao', 'Yael', 'Rosenholz', '+393899244145', '', '', 'ebraica', '', 'venditore', 5, true, '2026-01-08 11:00:16.789085', '2026-01-08 11:53:08.706', NULL, true);
INSERT INTO public.clienti VALUES (38, 'Gent.ma Sig.ra', '', 'Ascari', '+393283645648', '', '', 'cattolica', '', 'compratore', 3, true, '2026-01-08 10:14:40.218508', '2026-01-08 11:54:59.729', NULL, false);
INSERT INTO public.clienti VALUES (41, 'Gent.mo Sig.', 'Ilan', 'Boni', '393407992052', '', '', 'ebraica', '', 'compratore', 3, true, '2026-01-08 13:54:37.578294', '2026-01-08 14:01:30.984', NULL, true);
INSERT INTO public.clienti VALUES (43, NULL, 'Brunella Della Mura', NULL, '3897895209', 'brunella.dellamura@gmail.com', NULL, NULL, 'Contatto da Idealista per immobile Prima (Via Primaticcio). Messaggio: Ciao, questo appartamento mi interessa e mi piacerebbe visitarlo. Grazie', 'compratore', 3, true, '2026-01-08 22:44:03.113138', '2026-01-08 22:44:03.113138', NULL, false);
INSERT INTO public.clienti VALUES (44, NULL, 'Proprietario', 'Indipendenza - Regina Giovanna, Milano', '393475876090', '', NULL, NULL, 'Prospect da acquisizione: Bilocale in vendita in Via Pietro Calvi s.n.c


Indipendenza - Regina Giovanna, Milano

Vedi mappa', 'venditore', 1, true, '2026-01-09 09:40:33.826428', '2026-01-09 09:40:33.826428', NULL, false);
INSERT INTO public.clienti VALUES (45, NULL, 'Proprietario', 'San Vittore - Washington, Milano', '393514371535', '', NULL, NULL, 'Prospect da acquisizione: Bilocale in vendita in Via dei Grimani, 11


San Vittore - Washington, Milano

Vedi mappa', 'venditore', 1, true, '2026-01-09 09:40:58.736453', '2026-01-09 09:40:58.736453', NULL, false);
INSERT INTO public.clienti VALUES (46, NULL, 'Proprietario', 'Carrobbio - Cinque Vie, Milano', '393387112718', '', NULL, NULL, 'Prospect da acquisizione: Trilocale in vendita in Via Crocefisso, 4


Carrobbio - Cinque Vie, Milano

Vedi mappa', 'venditore', 1, true, '2026-01-09 09:41:42.628928', '2026-01-09 09:41:42.628928', NULL, false);
INSERT INTO public.clienti VALUES (47, NULL, 'Cavour', 'Immobiliare', '125738855', 'p.salvemini@gmail.com', NULL, NULL, 'Contatto da Immobiliare.it', 'compratore', 3, true, '2026-01-09 10:51:37.976277', '2026-01-09 10:51:37.976277', NULL, false);
INSERT INTO public.clienti VALUES (48, NULL, 'Ilan', 'Boni
 Email', '124851857', NULL, NULL, NULL, 'Contatto da Immobiliare.it', 'compratore', 3, true, '2026-01-09 10:51:38.013422', '2026-01-09 10:51:38.013422', NULL, false);
INSERT INTO public.clienti VALUES (49, NULL, 'Ilan', 'Boni
 Email', '125263535', NULL, NULL, NULL, 'Contatto da Immobiliare.it', 'compratore', 3, true, '2026-01-09 10:51:38.026972', '2026-01-09 10:51:38.026972', NULL, false);
INSERT INTO public.clienti VALUES (50, NULL, 'idealista', NULL, '20251204', 'rita.capocasale97@gmail.com', NULL, NULL, 'Contatto da Idealista', 'compratore', 3, true, '2026-01-09 10:51:38.057511', '2026-01-09 10:51:38.057511', NULL, false);
INSERT INTO public.clienti VALUES (51, NULL, 'Ilan', 'Boni', '122999712', 'samydelagala@gmail.com', NULL, NULL, 'Contatto da Immobiliare.it', 'compratore', 3, true, '2026-01-09 10:51:38.070981', '2026-01-09 10:51:38.070981', NULL, false);
INSERT INTO public.clienti VALUES (52, NULL, 'Cavour', 'Immobiliare', '123221219', 'pvdn2jhz8x@privaterelay.appleid.com', NULL, NULL, 'Contatto da Immobiliare.it', 'compratore', 3, true, '2026-01-09 10:51:38.079993', '2026-01-09 10:51:38.079993', NULL, false);
INSERT INTO public.clienti VALUES (53, NULL, 'Cavour', 'Immobiliare', '122845588', 'michela.paglioli@gmail.com', NULL, NULL, 'Contatto da Immobiliare.it', 'compratore', 3, true, '2026-01-09 10:51:38.098041', '2026-01-09 10:51:38.098041', NULL, false);
INSERT INTO public.clienti VALUES (54, NULL, 'solid', NULL, NULL, NULL, NULL, NULL, 'Contatto da Idealista', 'compratore', 3, true, '2026-01-09 10:51:38.159601', '2026-01-09 10:51:38.159601', NULL, false);
INSERT INTO public.clienti VALUES (55, NULL, 'Cavour', 'Immobiliare', '54488088', 'uslu_ege@icloud.com', NULL, NULL, 'Contatto da Immobiliare.it', 'compratore', 3, true, '2026-01-09 10:51:38.213032', '2026-01-09 10:51:38.213032', NULL, false);
INSERT INTO public.clienti VALUES (56, NULL, 'Cavour', 'Immobiliare', '119032725', 'monicaidaspinelli@gmail.com', NULL, NULL, 'Contatto da Immobiliare.it', 'compratore', 3, true, '2026-01-09 10:51:38.531558', '2026-01-09 10:51:38.531558', NULL, false);
INSERT INTO public.clienti VALUES (57, NULL, 'Cavour', 'Immobiliare', '121091184', 'mattia.boarin@gmail.com', NULL, NULL, 'Contatto da Immobiliare.it', 'compratore', 3, true, '2026-01-09 10:51:38.577551', '2026-01-09 10:51:38.577551', NULL, false);
INSERT INTO public.clienti VALUES (58, NULL, 'solid', NULL, NULL, NULL, NULL, NULL, 'Contatto da Idealista', 'compratore', 3, true, '2026-01-09 10:51:38.693985', '2026-01-09 10:51:38.693985', NULL, false);
INSERT INTO public.clienti VALUES (59, NULL, 'Cavour', 'Immobiliare', '119374265', 'pranthof@gmail.com', NULL, NULL, 'Contatto da Immobiliare.it', 'compratore', 3, true, '2026-01-09 10:51:38.762943', '2026-01-09 10:51:38.762943', NULL, false);
INSERT INTO public.clienti VALUES (60, NULL, 'solid', NULL, NULL, NULL, NULL, NULL, 'Contatto da Idealista', 'compratore', 3, true, '2026-01-09 10:52:20.390776', '2026-01-09 10:52:20.390776', NULL, false);
INSERT INTO public.clienti VALUES (61, NULL, 'solid', NULL, NULL, NULL, NULL, NULL, 'Contatto da Idealista', 'compratore', 3, true, '2026-01-09 10:52:20.973925', '2026-01-09 10:52:20.973925', NULL, false);
INSERT INTO public.clienti VALUES (62, NULL, 'Andrea', 'Grassi', '3427615185', 'andrea.grassi84@gmail.com', NULL, NULL, 'Contatto da Idealista per immobile Prima (Via Primaticcio). Messaggio: Ciao, questo appartamento mi interessa e mi piacerebbe visitarlo. Grazie', 'compratore', 3, true, '2026-01-09 11:03:43.434494', '2026-01-09 11:03:43.434494', NULL, false);
INSERT INTO public.clienti VALUES (63, NULL, 'Sonia', 'Semeraro', '3661324861', 's.semeraro256@gmail.com', NULL, NULL, 'Contatto da Idealista per immobile Prima (Via Primaticcio). Messaggio: Buongiorno siamo interessati a vedere l''immobile se ancora disponibile. Sarebbe possibile domani mattina? Grazie', 'compratore', 3, true, '2026-01-09 11:04:23.935214', '2026-01-09 11:04:23.935214', NULL, false);


--
-- Data for Name: comunicazioni; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.comunicazioni VALUES (2, NULL, NULL, 'messaggio', 'prova', 'whatsapp', 'agente', '2026-01-07 12:15:38.470185', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (3, NULL, NULL, 'messaggio', 'prova', 'whatsapp', 'agente', '2026-01-07 12:21:40.758354', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (4, NULL, NULL, 'risposta', 'Prova', 'whatsapp', 'cliente', '2026-01-07 12:24:56.403308', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (5, NULL, NULL, 'messaggio', 'prova', 'whatsapp', 'agente', '2026-01-07 12:26:20.128167', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (6, NULL, NULL, 'messaggio', 'Ciao', 'whatsapp', 'agente', '2026-01-07 12:30:57.188739', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (8, NULL, NULL, 'messaggio', 'Buongiorno Sig.ra Ascari, di seguito le invio il link di visualizzazione dell''immobile di Via Castaldi. L''appartamento sarà disponibile per la locazione a partire dalla terza settimana di Gennaio. Ps: purtroppo le foto mi sono state date dalla proprietaria e non rendono giustizia a un appartamento che è proprio una chicca.  Mi dica se vuole che lo faccia vedere alla sua amica in anteprima. Un caro saluto e spero a presto. Ilan Boni - https://www.immobiliare.it/annunci/112971065', 'whatsapp', 'agente', '2026-01-08 10:12:21.281347', NULL, NULL, 7);
INSERT INTO public.comunicazioni VALUES (9, NULL, NULL, 'messaggio', 'Buongiorno Sig.ra Ascari, di seguito le invio il link di visualizzazione dell''immobile di Via Castaldi. L''appartamento sarà disponibile per la locazione a partire dalla terza settimana di Gennaio. Ps: purtroppo le foto mi sono state date dalla proprietaria e non rendono giustizia a un appartamento che è proprio una chicca.  Mi dica se vuole che lo faccia vedere alla sua amica in anteprima. Un caro saluto e spero a presto. Ilan Boni - https://www.immobiliare.it/annunci/112971065', 'whatsapp', 'agente', '2026-01-08 10:12:23.935082', NULL, NULL, 8);
INSERT INTO public.comunicazioni VALUES (7, NULL, NULL, 'messaggio', 'https://youtube.com/shorts/wK8pqZBnLuw?si=vhdTbcMSAjEbyc-S', 'whatsapp', 'agente', '2026-01-07 14:01:42.269988', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (11, 40, 3, 'followup', 'Gent.mo Sig. Troina,

la contatto in quanto, recentemente, abbiamo organizzato un sopralluogo presso un trilocale sito in Via Primaticcio 90.

In merito a questo immobile, la proprietà, non avendolo ancora venduto, ha deciso di abbassare la richiesta economica.

Le invio, di seguito, il link dell''immobile e rimango a disposizione per effettuare un nuovo sopralluogo oppure per fornirle eventuali informazioni.

Le inoltro di seguito il link dell''appartamento e porgo cordiali saluti,

Ilan Boni - Cavour Immobiliare

https://www.immobiliare.it/annunci/125738855/', 'whatsapp', 'agente', '2026-01-08 12:25:04.604183', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (13, 41, NULL, 'nota', 'Ciao', 'whatsapp', 'agente', '2026-01-08 14:06:28.927236', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (14, 41, NULL, 'risposta', 'Test webhook', 'whatsapp', 'cliente', '2026-01-08 15:42:20.941313', NULL, NULL, 13);
INSERT INTO public.comunicazioni VALUES (15, 41, NULL, 'risposta', 'Test fix webhook', 'whatsapp', 'cliente', '2026-01-08 15:43:48.745391', NULL, NULL, 14);
INSERT INTO public.comunicazioni VALUES (16, 41, NULL, 'risposta', 'Test messaggio locale', 'whatsapp', 'cliente', '2026-01-08 18:07:07.951206', NULL, NULL, 15);
INSERT INTO public.comunicazioni VALUES (17, 41, NULL, 'messaggio', 'Messaggio inviato dal telefono', 'whatsapp', 'agente', '2026-01-08 18:44:21.825019', NULL, NULL, 16);
INSERT INTO public.comunicazioni VALUES (18, 41, NULL, 'messaggio', 'Test finale - rispondi CIAO', 'whatsapp', 'agente', '2026-01-08 18:53:15.330072', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (19, 41, NULL, 'messaggio', 'Test webhook - rispondi OK', 'whatsapp', 'agente', '2026-01-08 18:53:15.347552', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (20, 41, NULL, 'messaggio', 'Secondo test - rispondi a questo messaggio per verificare il webhook', 'whatsapp', 'agente', '2026-01-08 18:53:15.364093', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (21, 41, NULL, 'messaggio', 'Test nuova istanza 87870 - ImmoGest', 'whatsapp', 'agente', '2026-01-08 18:53:15.37959', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (22, 41, NULL, 'messaggio', 'Ciao', 'whatsapp', 'agente', '2026-01-08 18:53:15.394356', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (23, 41, NULL, 'messaggio', 'WhatsApp API on UltraMsg.com works good', 'whatsapp', 'agente', '2026-01-08 18:53:15.406687', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (24, 40, NULL, 'messaggio', 'Gent.mo Sig. Troina,

la contatto in quanto, recentemente, abbiamo organizzato un sopralluogo presso un trilocale sito in Via Primaticcio 90.

In merito a questo immobile, la proprietà, non avendolo ancora venduto, ha deciso di abbassare la richiesta economica.

Le invio, di seguito, il link dell''immobile e rimango a disposizione per effettuare un nuovo sopralluogo oppure per fornirle eventuali informazioni.

Le inoltro di seguito il link dell''appartamento e porgo cordiali saluti,

Ilan Boni - Cavour Immobiliare

https://www.immobiliare.it/annunci/125738855/', 'whatsapp', 'agente', '2026-01-08 18:53:15.419279', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (25, 41, NULL, 'messaggio', 'prova', 'whatsapp', 'agente', '2026-01-08 18:53:15.432662', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (26, 41, NULL, 'messaggio', 'prova', 'whatsapp', 'agente', '2026-01-08 18:53:15.447705', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (27, 41, NULL, 'messaggio', 'prova', 'whatsapp', 'agente', '2026-01-08 18:53:15.467377', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (28, NULL, NULL, 'messaggio', 'ES1!  6903.50', 'whatsapp', 'agente', '2026-01-08 18:53:15.485679', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (29, NULL, NULL, 'messaggio', 'Aqui estoy con Jimmy', 'whatsapp', 'agente', '2026-01-08 18:53:15.506828', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (30, NULL, NULL, 'messaggio', 'Test alert from curl!', 'whatsapp', 'agente', '2026-01-08 18:53:15.520696', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (31, NULL, NULL, 'messaggio', 'ES1!', 'whatsapp', 'agente', '2026-01-08 18:53:15.533216', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (32, NULL, NULL, 'messaggio', 'Test alert from curl!', 'whatsapp', 'agente', '2026-01-08 18:53:15.54941', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (33, NULL, NULL, 'messaggio', 'Test alert to con Clau from curl!', 'whatsapp', 'agente', '2026-01-08 18:53:15.56227', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (34, NULL, NULL, 'messaggio', 'Hola es claudia', 'whatsapp', 'agente', '2026-01-08 18:53:15.572911', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (35, NULL, NULL, 'messaggio', 'ES1!  2026-01-01T23:22:26Z', 'whatsapp', 'agente', '2026-01-08 18:53:15.585426', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (36, NULL, NULL, 'messaggio', 'ES1! 2026-01-01T23:21:00Z', 'whatsapp', 'agente', '2026-01-08 18:53:15.596891', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (37, NULL, NULL, 'messaggio', 'ES1! 2026-01-01T23:20:00Z 1', 'whatsapp', 'agente', '2026-01-08 18:53:15.609201', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (38, NULL, NULL, 'messaggio', 'ES1! 2026-01-01T23:19:00Z 1', 'whatsapp', 'agente', '2026-01-08 18:53:15.622311', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (39, NULL, NULL, 'messaggio', '{}', 'whatsapp', 'agente', '2026-01-08 18:53:15.635286', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (40, NULL, NULL, 'messaggio', '{}', 'whatsapp', 'agente', '2026-01-08 18:53:15.647472', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (41, NULL, NULL, 'messaggio', '{}', 'whatsapp', 'agente', '2026-01-08 18:53:15.658034', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (42, NULL, NULL, 'messaggio', '{}', 'whatsapp', 'agente', '2026-01-08 18:53:15.670903', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (43, NULL, NULL, 'messaggio', '{}', 'whatsapp', 'agente', '2026-01-08 18:53:15.684408', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (44, NULL, NULL, 'messaggio', '{}', 'whatsapp', 'agente', '2026-01-08 18:53:15.695239', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (45, NULL, NULL, 'messaggio', '{}', 'whatsapp', 'agente', '2026-01-08 18:53:15.709463', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (46, NULL, NULL, 'messaggio', '{}', 'whatsapp', 'agente', '2026-01-08 18:53:15.721762', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (47, NULL, NULL, 'messaggio', '{}', 'whatsapp', 'agente', '2026-01-08 18:53:15.734705', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (48, NULL, NULL, 'messaggio', '{}', 'whatsapp', 'agente', '2026-01-08 18:53:15.746241', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (12, 40, NULL, 'risposta', 'Buongiorno, grazie mille, ma non sono interessato. Saluti', 'whatsapp', 'cliente', '2026-01-08 13:23:12.101137', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (197, 63, NULL, 'risposta', 'Grazie mille a domenica', 'whatsapp', 'cliente', '2026-01-09 13:34:25.276912', NULL, NULL, 94);
INSERT INTO public.comunicazioni VALUES (49, NULL, NULL, 'messaggio', 'Gent.ma Sig.ra Artuso,

Ho ricevuto la sua richiesta per visitare l’immobile di Via Primaticcio.

Se gentilmente mi volesse fornire qualche sua disponibilità, sarò felice di organizzare un sopralluogo.

Rimango in attesa di un suo riscontro e colgo l’occasione per augurarle un felice 2026.

Ilan Boni - Cavour Immobiliare', 'whatsapp', 'agente', '2026-01-08 18:53:15.755724', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (50, NULL, NULL, 'messaggio', 'testing TV alert en mi replit gmail', 'whatsapp', 'agente', '2026-01-08 18:53:15.767', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (51, NULL, NULL, 'messaggio', 'Test alert to 1255 from curl!', 'whatsapp', 'agente', '2026-01-08 18:53:15.777117', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (52, NULL, NULL, 'messaggio', 'Daniiiiiii', 'whatsapp', 'agente', '2026-01-08 18:53:15.787749', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (53, NULL, NULL, 'messaggio', 'Test alert from curl!', 'whatsapp', 'agente', '2026-01-08 18:53:15.800281', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (54, NULL, NULL, 'messaggio', 'Hola prueba', 'whatsapp', 'agente', '2026-01-08 18:53:15.813671', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (55, NULL, NULL, 'messaggio', 'TEST ALERT: BTC/USD Buy Signal - Price: $42,500', 'whatsapp', 'agente', '2026-01-08 18:53:15.827782', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (56, NULL, NULL, 'messaggio', 'TEST ALERT: BTC/USD Buy Signal - Price: $42,500', 'whatsapp', 'agente', '2026-01-08 18:53:15.840228', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (57, NULL, NULL, 'messaggio', 'Ciao', 'whatsapp', 'agente', '2026-01-08 18:53:15.851261', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (58, NULL, NULL, 'messaggio', 'Gentile Proprietario,
sono l’assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent’anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un’opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile in Francesco Ferrucci, 1.
Caratteristiche come il bilocale ristrutturato, la tranquillità, la climatizzazione caldo/freddo sono oggi molto richieste da chi cerca immobili con potenzialità immediate, sia in termini di rendimento sia di stabilità del valore nel tempo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l’immobile: una decina di minuti per ascoltare la sua situazione, vedere l’appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', 'whatsapp', 'agente', '2026-01-08 18:53:15.862441', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (59, NULL, NULL, 'messaggio', 'Gentile Proprietario,
sono l’assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent’anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un’opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile in Andrea Solari.
Caratteristiche come l''aria condizionata, la luminosità, il balcone sono oggi molto richieste da chi cerca immobili con potenzialità immediate, sia in termini di rendimento sia di stabilità del valore nel tempo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l’immobile: una decina di minuti per ascoltare la sua situazione, vedere l’appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', 'whatsapp', 'agente', '2026-01-08 18:53:15.871888', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (60, NULL, NULL, 'messaggio', 'Gentile Cliente,

la contatto in quanto, di recente, ha richiesto informazioni su un immobile in vendita Via Guido d''Arezzo.

L''immobile è stato venduto.

Qualora volesse indicarmi i dettagli della sua ricerca, sarò felice di inserirla nel database ed avvisarla, in anteprima, sull''uscita di nuovi immobili in linea con le sue preferenze.

Colgo l''occasione per augurarle un buon Natale e un 2026 ricco di soddisfazioni.

Ilan Boni - Cavour Immobiliare', 'whatsapp', 'agente', '2026-01-08 18:53:15.882631', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (61, NULL, NULL, 'messaggio', 'Gentile Cliente,

la contatto in quanto, di recente, ha richiesto informazioni su un immobile in vendita Via Guido d''Arezzo.

L''immobile è stato venduto.

Qualora volesse indicarmi i dettagli della sua ricerca, sarò felice di inserirla nel database ed avvisarla, in anteprima, sull''uscita di nuovi immobili in linea con le sue preferenze.

Colgo l''occasione per augurarle un buon Natale e un 2026 ricco di soddisfazioni.

Ilan Boni - Cavour Immobiliare', 'whatsapp', 'agente', '2026-01-08 18:53:15.891401', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (62, NULL, NULL, 'messaggio', 'Gentile Cliente,

la contatto in quanto, di recente, ha richiesto informazioni su un immobile in vendita Via Guido d''Arezzo.

L''immobile è stato venduto.

Qualora volesse indicarmi i dettagli della sua ricerca, sarò felice di inserirla nel database ed avvisarla, in anteprima, sull''uscita di nuovi immobili in linea con le sue preferenze.

Colgo l''occasione per augurarle un buon Natale e un 2026 ricco di soddisfazioni.

Ilan Boni - Cavour Immobiliare', 'whatsapp', 'agente', '2026-01-08 18:53:15.901471', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (63, NULL, NULL, 'messaggio', 'Gentile Cliente,

la contatto in quanto, di recente, ha richiesto informazioni su un immobile in vendita Via Guido d''Arezzo.

L''immobile è stato venduto.

Qualora volesse indicarmi i dettagli della sua ricerca, sarò felice di inserirla nel database ed avvisarla, in anteprima, sull''uscita di nuovi immobili in linea con le sue preferenze.

Colgo l''occasione per augurarle un buon Natale e un 2026 ricco di soddisfazioni.

Ilan Boni - Cavour Immobiliare', 'whatsapp', 'agente', '2026-01-08 18:53:15.911134', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (64, NULL, NULL, 'messaggio', 'Gentile Cliente,

la contatto in quanto, di recente, ha richiesto informazioni su un immobile in vendita Via Guido d''Arezzo.

L''immobile è stato venduto.

Qualora volesse indicarmi i dettagli della sua ricerca, sarò felice di inserirla nel database ed avvisarla, in anteprima, sull''uscita di nuovi immobili in linea con le sue preferenze.

Colgo l''occasione per augurarle un buon Natale e un 2026 ricco di soddisfazioni.

Ilan Boni - Cavour Immobiliare', 'whatsapp', 'agente', '2026-01-08 18:53:15.920411', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (65, NULL, NULL, 'messaggio', 'Gentile Cliente,

la contatto in quanto, di recente, ha richiesto informazioni su un immobile in vendita Via Guido d''Arezzo.

L''immobile è stato venduto.

Qualora volesse indicarmi i dettagli della sua ricerca, sarò felice di inserirla nel database ed avvisarla, in anteprima, sull''uscita di nuovi immobili in linea con le sue preferenze.

Colgo l''occasione per augurarle un buon Natale e un 2026 ricco di soddisfazioni.

Ilan Boni - Cavour Immobiliare', 'whatsapp', 'agente', '2026-01-08 18:53:15.931322', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (86, 43, NULL, 'messaggio', 'Perfetto. Le confermo appuntamento di mercoledì 14/1, ore 18, in Via Primaticcio 90. Le auguro una buona giornata e un buon week end. Ilan Boni - Cavour Immobiliare', 'whatsapp', 'agente', '2026-01-09 10:51:11.501829', NULL, NULL, 81);
INSERT INTO public.comunicazioni VALUES (66, NULL, NULL, 'messaggio', 'Gentile Cliente,

la contatto in quanto, di recente, ha richiesto informazioni su un immobile in vendita Via Guido d''Arezzo.

L''immobile è stato venduto.

Qualora volesse indicarmi i dettagli della sua ricerca, sarò felice di inserirla nel database ed avvisarla, in anteprima, sull''uscita di nuovi immobili in linea con le sue preferenze.

Colgo l''occasione per augurarle un buon Natale e un 2026 ricco di soddisfazioni.

Ilan Boni - Cavour Immobiliare', 'whatsapp', 'agente', '2026-01-08 18:53:15.941347', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (68, 41, NULL, 'messaggio', 'Riproviamo dai!', 'whatsapp', 'agente', '2026-01-08 19:21:19.245785', NULL, NULL, 67);
INSERT INTO public.comunicazioni VALUES (69, 41, NULL, 'risposta', 'Evviva!!', 'whatsapp', 'cliente', '2026-01-08 19:22:24.956131', NULL, NULL, 68);
INSERT INTO public.comunicazioni VALUES (71, 41, NULL, 'messaggio', 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent''anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un''opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile in Via Torino. Dal suo annuncio si notano alcune caratteristiche, come la ristrutturazione completa e la presenza del balcone, che rendono l''immobile in linea con alcune esigenze ricorrenti in questo periodo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l''immobile: una decina di minuti per ascoltare la sua situazione, vedere l''appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', 'whatsapp', 'agente', '2026-01-09 08:29:53.480775', NULL, NULL, 69);
INSERT INTO public.comunicazioni VALUES (72, 41, NULL, 'risposta', 'Grazie per il messaggio. Se ha clienti li puó portare. Non diamo provvigioni e mandati', 'whatsapp', 'cliente', '2026-01-09 08:30:54.966123', NULL, NULL, 70);
INSERT INTO public.comunicazioni VALUES (67, NULL, NULL, 'risposta', 'Test webhook', 'whatsapp', 'cliente', '2026-01-08 19:17:49.518359', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (73, 43, 3, 'risposta', 'Buongiorno Sig.ra Della Mura,

ho ricevuto la sua richiesta di visita per l''immobile di Via Primaticcio.

Se mi volesse dare qualche sua disponibilità procedo volentieri con il fissare un sopralluogo.

Rimango in attesa di un suo riscontro e le auguro una buona giornata.

Ilan Boni - Cavour Immobiliare', 'whatsapp', 'agente', '2026-01-09 08:34:54.137446', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (74, 43, NULL, 'messaggio', 'Buongiorno Sig.ra Della Mura,

ho ricevuto la sua richiesta di visita per l''immobile di Via Primaticcio.

Se mi volesse dare qualche sua disponibilità procedo volentieri con il fissare un sopralluogo.

Rimango in attesa di un suo riscontro e le auguro una buona giornata.

Ilan Boni - Cavour Immobiliare', 'whatsapp', 'agente', '2026-01-09 08:34:55.230572', NULL, NULL, 72);
INSERT INTO public.comunicazioni VALUES (75, 43, NULL, 'risposta', 'Salve buon giorno io potrei domani  o mercoledì prossimo', 'whatsapp', 'cliente', '2026-01-09 08:49:39.774435', NULL, NULL, 73);
INSERT INTO public.comunicazioni VALUES (76, 43, NULL, 'messaggio', 'Grazie per la risposta. Stanno cominciando a togliere alcuni mobili e a riordinare un po'' e immagino che domani cisarà un po'' di confusione all''interno dell''appartamento. Mercoledì andrebbe benissimo. Potrebbe andare bene in pausa pranzo oppure dopo le 18?', 'whatsapp', 'agente', '2026-01-09 09:30:14.558839', NULL, NULL, 74);
INSERT INTO public.comunicazioni VALUES (77, 43, NULL, 'messaggio', 'Grazie per la risposta. Stanno cominciando a togliere alcuni mobili e a riordinare un po'' e immagino che domani cisarà un po'' di confusione all''interno dell''appartamento. Mercoledì andrebbe benissimo. Potrebbe andare bene in pausa pranzo oppure dopo le 18?', 'whatsapp', 'agente', '2026-01-09 09:30:16.523296', NULL, NULL, 75);
INSERT INTO public.comunicazioni VALUES (78, 44, NULL, 'proposta', 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent''anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un''opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile. Dal suo annuncio si notano alcune caratteristiche, come la doppia esposizione e la ristrutturazione, che rendono l''immobile in linea con alcune esigenze ricorrenti in questo periodo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l''immobile: una decina di minuti per ascoltare la sua situazione, vedere l''appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', 'whatsapp', 'agente', '2026-01-09 09:40:33.842662', NULL, 16, NULL);
INSERT INTO public.comunicazioni VALUES (187, 62, NULL, 'risposta', 'Buongiorno Andrea, in riferimento alla richiesta di visita dell''appartamento di Via Primaticcio, le chiedo di darmi un paio di disponibilità al fine di organizzare un sopralluogo. Fra oggi e il week end la proprietà sarà all''interno dell''appartamento per sgomberare un po'' di arredo ed oggetti. Volendo potremmo provare già domenica mattina. In alternativa attendo qualche sua disponibilità. Rimango in attesa e le auguro una buona giornata. Ilan Boni - Cavour Immobiliare', 'whatsapp', 'agente', '2026-01-09 11:19:48.191448', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (188, 62, NULL, 'messaggio', 'Buongiorno Andrea, in riferimento alla richiesta di visita dell''appartamento di Via Primaticcio, le chiedo di darmi un paio di disponibilità al fine di organizzare un sopralluogo. Fra oggi e il week end la proprietà sarà all''interno dell''appartamento per sgomberare un po'' di arredo ed oggetti. Volendo potremmo provare già domenica mattina. In alternativa attendo qualche sua disponibilità. Rimango in attesa e le auguro una buona giornata. Ilan Boni - Cavour Immobiliare', 'whatsapp', 'agente', '2026-01-09 11:19:49.37932', NULL, NULL, 85);
INSERT INTO public.comunicazioni VALUES (79, 44, NULL, 'messaggio', 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent''anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un''opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile. Dal suo annuncio si notano alcune caratteristiche, come la doppia esposizione e la ristrutturazione, che rendono l''immobile in linea con alcune esigenze ricorrenti in questo periodo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l''immobile: una decina di minuti per ascoltare la sua situazione, vedere l''appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', 'whatsapp', 'agente', '2026-01-09 09:40:34.816645', NULL, NULL, 76);
INSERT INTO public.comunicazioni VALUES (80, 45, NULL, 'proposta', 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent''anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un''opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile. Dal suo annuncio si notano alcune caratteristiche, come la ristrutturazione completa del 2022 e la doppia esposizione, che rendono l''immobile in linea con alcune esigenze ricorrenti in questo periodo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l''immobile: una decina di minuti per ascoltare la sua situazione, vedere l''appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', 'whatsapp', 'agente', '2026-01-09 09:40:58.743982', NULL, 15, NULL);
INSERT INTO public.comunicazioni VALUES (81, 46, NULL, 'proposta', 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent''anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un''opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile. Dal suo annuncio si notano alcune caratteristiche, come la ristrutturazione completa e la doppia esposizione, che rendono l''immobile in linea con alcune esigenze ricorrenti in questo periodo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l''immobile: una decina di minuti per ascoltare la sua situazione, vedere l''appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', 'whatsapp', 'agente', '2026-01-09 09:41:42.641034', NULL, 13, NULL);
INSERT INTO public.comunicazioni VALUES (82, 46, NULL, 'messaggio', 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent''anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un''opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile. Dal suo annuncio si notano alcune caratteristiche, come la ristrutturazione completa e la doppia esposizione, che rendono l''immobile in linea con alcune esigenze ricorrenti in questo periodo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l''immobile: una decina di minuti per ascoltare la sua situazione, vedere l''appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', 'whatsapp', 'agente', '2026-01-09 09:41:43.601708', NULL, NULL, 77);
INSERT INTO public.comunicazioni VALUES (83, 43, NULL, 'risposta', 'Alle 18 potrebbe andar bene', 'whatsapp', 'cliente', '2026-01-09 09:43:25.351965', NULL, NULL, 78);
INSERT INTO public.comunicazioni VALUES (84, 45, NULL, 'proposta', 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent''anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un''opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile. Dal suo annuncio si notano alcune caratteristiche, come la ristrutturazione completa del 2022 e la doppia esposizione, che rendono l''immobile in linea con alcune esigenze ricorrenti in questo periodo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l''immobile: una decina di minuti per ascoltare la sua situazione, vedere l''appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', 'whatsapp', 'agente', '2026-01-09 10:00:49.874068', NULL, 15, NULL);
INSERT INTO public.comunicazioni VALUES (85, 43, NULL, 'messaggio', 'Perfetto. Le confermo appuntamento di mercoledì 14/1, ore 18, in Via Primaticcio 90. Le auguro una buona giornata e un buon week end. Ilan Boni - Cavour Immobiliare', 'whatsapp', 'agente', '2026-01-09 10:51:09.470257', NULL, NULL, 80);
INSERT INTO public.comunicazioni VALUES (135, 43, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Brunella Della Mura

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:nabj3ld26ahect4dqvqanfp7eakllj3veu6nsomq@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Prima


 [LINK: http://www.immobiliare.it/annunci/125738855/]


 [LINK: http://www.immobiliare.it/annunci/125738855/] &#65279;Appartamento
in vendita&#65279;
 Via Francesco Primaticcio, Milano
 â‚¬ 329.000

 80 mÂ² | 3 locali | 1 bagno


 Contatti


 Nome: Brunella Della Mura
 Email: [LINK: mailto:brunella.dellamura@gmail.com]
brunella.dellamura@gmail.com
 Telefono: 3897895209

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.063041', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (136, 47, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Ilan Boni

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:nagamgs7lnd6ydeyp35qnfp23sbelxukgydfnzhq@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Prima


 [LINK: http://www.immobiliare.it/annunci/125738855/]


 [LINK: http://www.immobiliare.it/annunci/125738855/] &#65279;Appartamento
in vendita&#65279;
 Via Francesco Primaticcio, Milano
 â‚¬ 329.000

 80 mÂ² | 3 locali | 1 bagno


 Contatti


 Nome: Ilan Boni
 Email: [LINK: mailto:p.salvemini@gmail.com] p.salvemini@gmail.com
 Telefono: 3407992052

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.113507', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (137, 48, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: Immobiliare.it]


 Messaggio inviato

 Ciao Ilan Boni,
 ti confermiamo che la tua richiesta relativa all''annuncio sotto indicato
Ã¨ stata inviata correttamente.


 [LINK:
http://www.immobiliare.it/annunci/124851857/?utm_source=conferma_contatto&utm_medium=email&utm_campaign=detail]


 [LINK:
http://www.immobiliare.it/annunci/124851857/?utm_source=conferma_contatto&utm_medium=email&utm_campaign=detail]
&#65279;Appartamento in vendita&#65279;
 Via Vigevano, Milano
 â‚¬ 940.000

 107 mÂ² | 3 locali | 2 bagni |  lusso


 [LINK:
http://www.immobiliare.it/landing/?ctaToken=08d280847c14b4e32378b1fa23fc7661&action=save_listing&idAnnuncio=124851857&type=ad&from=contact&backurl=/utente/annunci/salvati]
 Salva annuncio


 [LINK:
http://www.immobiliare.it/landing/?ctaToken=08d280847c14b4e32378b1fa23fc7661&action=save_listing&idAnnuncio=124851857&type=ad&from=contact&backurl=/utente/annunci/salvati]


   	Salva lâ€™annuncio contattato per non perderlo
Riceverai un avviso quando il prezzo dellâ€™immobile si abbasserÃ


 Vuoi inviare un nuovo messaggio?  	Â
Â

 [LINK:
http://www.immobiliare.it/annunci/124851857/?utm_source=conferma_contatto&utm_medium=email&utm_campaign=ricontatta]
 Contatta di nuovo
Â
Â


 Dati dell''inserzionista


   	 privato
 Nadia Casa


 Informazioni inviate all''inserzionista


 Nome: Ilan Boni
 Email: [LINK: mailto:info@cavourimmobiliare.it] info@cavourimmobiliare.it

 Telefono: 0235981509
 Messaggio

 Buongiorno Nadia, mi chiamo Ilan Boni e sono, oltre che proprietario di 2
agenzie immobiliari, il Vice Presidente della ComunitÃ¡ ebraica di Milano.
Ho notato l''appartamento di Via Vigevano pubblicizzato su Internet e penso
che possa risultare molto appetibile per i tanti clienti correligionari sia
italiani che stranieri con i quali ho a che fare giornalmente e che sono
alla ricerca di investimenti da mettere a reddito o appartamenti da abitare
in particolare per le zone centrali di Milano con vicinanza a luoghi
eb', 'email', 'sistema', '2026-01-09 10:52:20.136239', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (138, 49, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: Immobiliare.it]


 Messaggio inviato

 Ciao Ilan Boni,
 ti confermiamo che la tua richiesta relativa all''annuncio sotto indicato
Ã¨ stata inviata correttamente.


 [LINK:
http://www.immobiliare.it/annunci/125263535/?utm_source=conferma_contatto&utm_medium=email&utm_campaign=detail]


 [LINK:
http://www.immobiliare.it/annunci/125263535/?utm_source=conferma_contatto&utm_medium=email&utm_campaign=detail]
&#65279;Appartamento in vendita&#65279;
 Via Monferrato, Milano
 â‚¬ 1.290.000

 150 mÂ² | 3 locali | 2 bagni


 [LINK:
http://www.immobiliare.it/landing/?ctaToken=08d280847c14b4e32378b1fa23fc7661&action=save_listing&idAnnuncio=125263535&type=ad&from=contact&backurl=/utente/annunci/salvati]
 Salva annuncio


 [LINK:
http://www.immobiliare.it/landing/?ctaToken=08d280847c14b4e32378b1fa23fc7661&action=save_listing&idAnnuncio=125263535&type=ad&from=contact&backurl=/utente/annunci/salvati]


   	Salva lâ€™annuncio contattato per non perderlo
Riceverai un avviso quando il prezzo dellâ€™immobile si abbasserÃ


 Vuoi inviare un nuovo messaggio?  	Â
Â

 [LINK:
http://www.immobiliare.it/annunci/125263535/?utm_source=conferma_contatto&utm_medium=email&utm_campaign=ricontatta]
 Contatta di nuovo
Â
Â


 Dati dell''inserzionista


   	 privato


 Informazioni inviate all''inserzionista


 Nome: Ilan Boni
 Email: [LINK: mailto:info@cavourimmobiliare.it] info@cavourimmobiliare.it

 Telefono: 0235981509
 Messaggio

 Gent. Proprietario, mi chiamo Ilan Boni e sono, oltre che proprietario di
2 agenzie immobiliari, il Vice Presidente della ComunitÃ¡ ebraica di
Milano. Ho notato l''appartamento di Via Monferrato (A 2 passi da Via
Marghera, una delle mie 2 sedi) pubblicizzato su Internet e penso che possa
risultare molto appetibile per i tanti clienti correligionari sia italiani
che stranieri con i quali ho a che fare giornalmente e che sono alla
ricerca di investimenti da mettere a reddito o appartamenti da abitare in
particolare per le zone central', 'email', 'sistema', '2026-01-09 10:52:20.159254', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (139, 50, NULL, 'richiesta', '<!-- FILE: undefined -->
<!doctype html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><title>Valoraciones</title><!--[if !mso]><!-- --><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]--><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style type="text/css">#outlook a {
      padding: 0;
    }

    .ReadMsgBody {
      width: 100%;
    }

    .ExternalClass {
      width: 100%;
    }

    .ExternalClass * {
      line-height: 100%;
    }

    body {
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    table,
    td {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }

    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }

    p {
      display: block;
      margin: 13px 0;
    }</style><!--[if !mso]><!--><style type="text/css">@media only screen and (max-width:480px) {
      @-ms-viewport {
        width: 320px;
      }

      @viewport {
        width: 320px;
      }
    }</style><!--<![endif]--><!--[if mso]>
        <xml>
        <o:OfficeDocumentSettings>
          <o:AllowPNG/>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
        </xml>
        <![endif]--><!--[if lte mso 11]>
        <style type="text/css">
          .outlook-group-fix { width:100% !important; }
        </style>
        <![endif]--><style type="text/css">@media only screen and (min-width:480px) {
      .mj-column-per-100 {
        width: 100% !important;
        max-width: 100%;
      }

      .mj-column-px-552 {
        width: 552px !important;
        max-width: 552px;
   ', 'email', 'sistema', '2026-01-09 10:52:20.187716', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (140, 51, NULL, 'richiesta', ' [LINK: https://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Samantha De la Gala

Mi interessa questo immobile, vorrei avere maggiori informazioni grazie


 [LINK:
mailto:oyzc4zjzhazgcmzwgqwtembtmqwtknrummwwcnrtgiwwiodgmvrgcnjzgbstoyq@messaggi.immobiliare.it?subject=Nuovo
messaggio da Ilan Boni]  Rispondi
 Messaggio ricevuto per l''annuncio: &#65279;GdA&#65279;


 [LINK: https://www.immobiliare.it/annunci/122999712/]


 [LINK: https://www.immobiliare.it/annunci/122999712/] &#65279;Appartamento
in vendita&#65279;
 Via Guido d''Arezzo, Milano
 Prezzo su richiesta

 229 mÂ² | 4 locali | 2 bagni |  lusso


 Contatti


 Nome: Samantha De la Gala
 Email: [LINK: mailto:samydelagala@gmail.com] samydelagala@gmail.com
 Telefono: +393445389118

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: https://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: https://www.immobiliare.it/terms/] Condizioni generali |
[LINK: https://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.206704', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (191, 62, NULL, 'risposta', 'Oppure martedì dalla stessa ora', 'whatsapp', 'cliente', '2026-01-09 11:28:14.909601', NULL, NULL, 88);
INSERT INTO public.comunicazioni VALUES (141, 52, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Rossana Tenconi

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:naok2vvcv4t4ssv3pmvqneqfvv3vrayvidty7dea@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Rond


 [LINK: http://www.immobiliare.it/annunci/123221219/]


 [LINK: http://www.immobiliare.it/annunci/123221219/] &#65279;Appartamento
in vendita&#65279;
 Via Pietro Rondoni, Milano
 â‚¬ 900.000

 134 mÂ² | 5 locali | 2 bagni |  lusso


 Contatti


 Nome: Rossana Tenconi
 Email: [LINK: mailto:pvdn2jhz8x@privaterelay.appleid.com]
pvdn2jhz8x@privaterelay.appleid.com
 Telefono: +39391 732 4483

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.226464', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (142, 51, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 maria rita grossi

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:namoabho26xtjkmu3k7qnelnhkj4mca3nrqzff3a@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: GdA


 [LINK: http://www.immobiliare.it/annunci/122999712/]


 [LINK: http://www.immobiliare.it/annunci/122999712/] &#65279;Appartamento
in vendita&#65279;
 Via Guido d''Arezzo, Milano
 Prezzo su richiesta

 229 mÂ² | 4 locali | 2 bagni |  lusso


 Contatti


 Nome: maria rita grossi
 Email: [LINK: mailto:mariarita.marrazza@gmail.com]
mariarita.marrazza@gmail.com
 Telefono: +393355452450

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.249116', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (143, 51, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 samydelagala A

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:nd3j5t4mahpmnilp3voqneigpujv6grhyno4uy3a@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: GdA


 [LINK: http://www.immobiliare.it/annunci/122999712/]


 [LINK: http://www.immobiliare.it/annunci/122999712/] &#65279;Appartamento
in vendita&#65279;
 Via Guido d''Arezzo, Milano
 Prezzo su richiesta

 229 mÂ² | 4 locali | 2 bagni |  lusso


 Contatti


 Nome: samydelagala A
 Email: [LINK: mailto:samydelagala@gmail.com] samydelagala@gmail.com
 Telefono: +393445389118

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.27296', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (144, 53, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Michela Paglioli

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:nagq4ctybzxo56lfra4anefwggwjbrgvgxf3dtpq@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: SanGim


 [LINK: http://www.immobiliare.it/annunci/122845588/]


 [LINK: http://www.immobiliare.it/annunci/122845588/] &#65279;Appartamento
in vendita&#65279;
 Viale San Gimignano, Milano
 â‚¬ 580.000

 113 mÂ² | 4 locali | 1 bagno


 Contatti


 Nome: Michela Paglioli
 Email: [LINK: mailto:michela.paglioli@gmail.com]
michela.paglioli@gmail.com
 Telefono: +39335337529

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.294011', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (145, 51, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Vittoria Filippi Gabardi

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4zdgmvrdanbumiwwgmbzhewtkm3gg4wwczdfhawtsnbvgu2timdemy2dgoi@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: GdA


 [LINK: http://www.immobiliare.it/annunci/122999712/]


 [LINK: http://www.immobiliare.it/annunci/122999712/] &#65279;Appartamento
in vendita&#65279;
 Via Guido d''Arezzo, Milano
 Prezzo su richiesta

 229 mÂ² | 4 locali | 2 bagni |  lusso


 Contatti


 Nome: Vittoria Filippi Gabardi
 Email: [LINK: mailto:vittoriafilippigabardi@yahoo.it]
vittoriafilippigabardi@yahoo.it
 Telefono: +39338 9290575

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.315108', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (146, 52, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 ORNELLA TURATI

Mi interessa questo immobile, vorrei avere maggiori informazioni e
visitarlo


 [LINK:
mailto:oyzc4nbxme3dkyjrhawtsy3gmewtkzlgmiwtqmrsgqwtczrzmvswgmjtgnqwkoi@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Rond


 [LINK: http://www.immobiliare.it/annunci/123221219/]


 [LINK: http://www.immobiliare.it/annunci/123221219/] &#65279;Appartamento
in vendita&#65279;
 Via Pietro Rondoni, Milano
 â‚¬ 900.000

 134 mÂ² | 5 locali | 2 bagni |  lusso


 Contatti


 Nome: ORNELLA TURATI
 Email: [LINK: mailto:turatiornella@gmail.com] turatiornella@gmail.com
 Telefono: +393355844580

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.336155', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (147, 51, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 giacomo rossi

Mi interessa questo immobile, vorrei avere maggiori informazioni. E''
possibile sapere a quanto ammonta la richiesta?


 [LINK:
mailto:oyzc4nrzhbstsodcmywtqnlgmqwtknjzmewwem3ehewwinjygmzdczlfga3wema@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: GdA


 [LINK: http://www.immobiliare.it/annunci/122999712/]


 [LINK: http://www.immobiliare.it/annunci/122999712/] &#65279;Appartamento
in vendita&#65279;
 Via Guido d''Arezzo, Milano
 Prezzo su richiesta

 229 mÂ² | 4 locali | 2 bagni |  lusso


 Contatti


 Nome: giacomo rossi
 Email: [LINK: mailto:jackrosso@gmail.com] jackrosso@gmail.com
 Telefono: 3290217166

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.360333', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (148, 60, NULL, 'richiesta', 'body{width:100% !important;}.ExternalClass {width:100% !important;}.ExternalClass * {line-height:100%;}.ReadMsgBody{width:100%;}body { margin: 1em auto;width: 95%;color: #666666;background-color:#efefeb;font-size: 16px;line-height:24px;-webkit-text-size-adjust: none !important;}table {border-collapse:collapse;color:#666666;//line-height:20px;font-family:Arial;//font-size:16px;width: 100%;}img { border: none; }/* REMOVABLE START */td {vertical-align:middle;}hr { border-bottom: 1px dashed #FFF; border-top: 1px dashed #CCC;}h1:not(:first-child), h2, h3 {margin-top:20px;color:#141414;}h1, h2, h3 {color:#141414 !important;}h1 {font-size:20px;font-weight:bold;margin-bottom:15px;}h2 {font-size:16px;font-weight:bold;margin-bottom:6px;}h3 {font-size:14px;font-weight:bold;margin-bottom:6px;}p {margin-bottom:16px !important; margin-top:16px !important;color:#141414;}li {margin-bottom:0px;margin-left:30px;color:#141414;}a {color:#0066CC;}.bottomInfo {padding: 0.5em 15px;}.bigLink {font-size:18px;font-weight:700;}.grayLinks a {color:#666;}.grayLinks p {color:#4D4D4C;}#backgroundTable {background-color:#EFEFEB;}.greyback { display: block; background-color: #F2F2F2; padding: 0px;}.greyback p { padding: 10px; margin: 5px;}#wrapperTable {max-width: 600px;display: block;margin: 20px auto 0;}#wrapperTable, #wrapper > td {background-color:#efefeb;}.viewInWeb {padding-bottom:5px;}.viewInWeb a {text-decoration: none;font-size: 12px;}table.layout { outline: none; padding: 0; margin: 0;}table.layout td.izq { vertical-align: top !important;}table.layout td.dch { vertical-align: top !important; padding-left: 20px;}#mainTable {color:#666666;padding:0;outline:none;margin:0 auto !important;}#mainTable {margin-top:30px;padding:10px;}.slide {width:6px;vertical-align:top;}.slide img {width:6px;height:78px;}#headerInside {width:100%;background-color:#fff;border-top:solid 1px #dededa;border-left:solid 1px #dededa;border-right:solid 1px #dededa;font-size:1px;line-height:1px;}#header table td {height:', 'email', 'sistema', '2026-01-09 10:52:20.395167', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (149, 51, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Ludovica

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4m3cmjrtenbygywtozbvmuwtkzrsmmwwczdgg4wwknjtmq3tqmjvmvswknq@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: GdA


 [LINK: http://www.immobiliare.it/annunci/122999712/]


 [LINK: http://www.immobiliare.it/annunci/122999712/] &#65279;Appartamento
in vendita&#65279;
 Via Guido d''Arezzo, Milano
 Prezzo su richiesta

 229 mÂ² | 4 locali | 2 bagni |  lusso


 Contatti


 Nome: Ludovica
 Email: [LINK: mailto:ludovica.balbo@gmail.com] ludovica.balbo@gmail.com
 Telefono: 3491672665

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.420134', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (150, 51, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 ARIANNA DI FONZO Latmiral

Mi interessa questo immobile, vorrei avere maggiori informazioni. Lascio i
miei recapiti. Grazie Arianna


 [LINK:
mailto:oyzc4ytegjsdimteguwwkytdhewtkobugmwtqylcgawwgmbrmztgczrsgq2dsmy@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: GdA


 [LINK: http://www.immobiliare.it/annunci/122999712/]


 [LINK: http://www.immobiliare.it/annunci/122999712/] &#65279;Appartamento
in vendita&#65279;
 Via Guido d''Arezzo, Milano
 Prezzo su richiesta

 229 mÂ² | 4 locali | 2 bagni |  lusso


 Contatti


 Nome: ARIANNA DI FONZO Latmiral
 Email: [LINK: mailto:ariannadifonzo@gmail.com] ariannadifonzo@gmail.com
 Telefono: +393477397510

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.440238', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (151, 55, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Ege Uslu

Buongiorno, mi chiamo Ege e studio Architettura al Politecnico di Milano.
Sono molto interessato a questo annuncio. Sarebbe possibile ricevere
maggiori informazioni? Se Ã¨ possibile, mi piacerebbe anche fissare un
appuntamento per visitare lâ€™appartamento di persona. Resto in attesa di
un vostro gentile riscontro. Grazie mille per lâ€™attenzione e buona
giornata.


 [LINK:
mailto:oyzc4mdchfrwiytdhewtqmjsmqwtknbzgewwen3cmmwtszdggq3dmztgmzsdsoa@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Corr


 [LINK: http://www.immobiliare.it/annunci/54488088/]


 [LINK: http://www.immobiliare.it/annunci/54488088/] &#65279;Appartamento
in affitto&#65279;
 Via Correggio, Milano
 â‚¬ 1.250

 45 mÂ² | 2 locali | 1 bagno


 Contatti


 Nome: Ege Uslu
 Email: [LINK: mailto:uslu_ege@icloud.com] uslu_ege@icloud.com
 Telefono: +393931645628

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.460379', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (192, 62, NULL, 'messaggio', 'Va benissimo lunedì alle 18. Glielo posso già confermare se per lei va ancora bene', 'whatsapp', 'agente', '2026-01-09 13:15:21.502305', NULL, NULL, 89);
INSERT INTO public.comunicazioni VALUES (152, 51, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Francesca

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4nbxgqzdendggewwgy3ehawtkobtmywwcyzqgewtczbtme3dkmdbme3ggoi@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: GdA


 [LINK: http://www.immobiliare.it/annunci/122999712/]


 [LINK: http://www.immobiliare.it/annunci/122999712/] &#65279;Appartamento
in vendita&#65279;
 Via Guido d''Arezzo, Milano
 Prezzo su richiesta

 229 mÂ² | 4 locali | 2 bagni |  lusso


 Contatti


 Nome: Francesca
 Email: [LINK: mailto:francescamri@hotmail.com] francescamri@hotmail.com
 Telefono: 3409369526

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.48057', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (153, 53, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 ANTO B

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4mzzmmygknzrgqwtgnzyguwtkndgmmwwezjyg4wwimdfgbswgmtgmy4gemi@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: SanGim


 [LINK: http://www.immobiliare.it/annunci/122845588/]


 [LINK: http://www.immobiliare.it/annunci/122845588/] &#65279;Appartamento
in vendita&#65279;
 Viale San Gimignano, Milano
 â‚¬ 580.000

 113 mÂ² | 4 locali | 1 bagno


 Contatti


 Nome: ANTO B
 Email: [LINK: mailto:antob963@outlook.it] antob963@outlook.it
 Telefono: 3357524462

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.504776', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (154, 51, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Anna Cristina

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4mrqme4tqntemmwwknteguwtkmlbgqwtsmtdgmwwiojxmzsdkzjqhfqtoza@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: GdA


 [LINK: http://www.immobiliare.it/annunci/122999712/]


 [LINK: http://www.immobiliare.it/annunci/122999712/] &#65279;Appartamento
in vendita&#65279;
 Via Guido d''Arezzo, Milano
 Prezzo su richiesta

 229 mÂ² | 4 locali | 2 bagni |  lusso


 Contatti


 Nome: Anna Cristina
 Email: [LINK: mailto:annacristinasalzano8@libero.it]
annacristinasalzano8@libero.it
 Telefono: 3484483497

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.520995', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (155, 51, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Fabio Franco

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4mjuhbstinrzmqwtomzxgywtkmjumqwtqolghewtgn3bmy3wendbhe3tgmi@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: GdA


 [LINK: http://www.immobiliare.it/annunci/122999712/]


 [LINK: http://www.immobiliare.it/annunci/122999712/] &#65279;Appartamento
in vendita&#65279;
 Via Guido d''Arezzo, Milano
 Prezzo su richiesta

 229 mÂ² | 4 locali | 2 bagni |  lusso


 Contatti


 Nome: Fabio Franco
 Email: [LINK: mailto:f.franco@notaiofranco.it] f.franco@notaiofranco.it
 Telefono: 3356363572

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.549005', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (156, 52, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Filippo Armani

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4ytfgzsdonrymiwwezjugawtkylcgywwcyjsgywwkzddgbrteyldgy3tqzi@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Rond


 [LINK: http://www.immobiliare.it/annunci/123221219/]


 [LINK: http://www.immobiliare.it/annunci/123221219/] &#65279;Appartamento
in vendita&#65279;
 Via Pietro Rondoni, Milano
 â‚¬ 900.000

 134 mÂ² | 5 locali | 2 bagni |  lusso


 Contatti


 Nome: Filippo Armani
 Email: [LINK: mailto:armanifilippo@gmail.com] armanifilippo@gmail.com
 Telefono: 3312532969

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.570964', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (157, 52, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Laura Lojacono

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4odgmzqtcobxgiwtaytbmewtkobvgqwtszbrguwteyrsheygcoleme3dkmq@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Rond


 [LINK: http://www.immobiliare.it/annunci/123221219/]


 [LINK: http://www.immobiliare.it/annunci/123221219/] &#65279;Appartamento
in vendita&#65279;
 Via Pietro Rondoni, Milano
 â‚¬ 900.000

 134 mÂ² | 5 locali | 2 bagni |  lusso


 Contatti


 Nome: Laura Lojacono
 Email: [LINK: mailto:lauralojacono89@gmail.com] lauralojacono89@gmail.com

 Telefono: 3408259920

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.592512', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (158, 52, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Cristian Crippa

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4y3gmrsgezrqguwtgmrsmiwtkojtmqwwcmzqgqwwinruhezweobxgeztcza@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Rond


 [LINK: http://www.immobiliare.it/annunci/123221219/]


 [LINK: http://www.immobiliare.it/annunci/123221219/] &#65279;Appartamento
in vendita&#65279;
 Via Pietro Rondoni, Milano
 â‚¬ 900.000

 134 mÂ² | 5 locali | 2 bagni |  lusso


 Contatti


 Nome: Cristian Crippa
 Email: [LINK: mailto:crippacristian@yahoo.it] crippacristian@yahoo.it
 Telefono: +393317813243

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.612812', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (159, 55, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Maria Bovio

Mi interessa questo immobile, vorrei avere maggiori informazioni. Sono una
ragazza lavoratrice - 35 anni.


 [LINK:
mailto:oyzc4obqg5rwen3chawtqobzgqwtkojvgewtsnlbmiwteyjtgvsteyzxme3wima@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Corr


 [LINK: http://www.immobiliare.it/annunci/54488088/]


 [LINK: http://www.immobiliare.it/annunci/54488088/] &#65279;Bilocale via
Correggio, Amendola - Buonarroti, Milano&#65279;
 Via Correggio, Milano
 â‚¬ 1.250

 45 mÂ² | 2 locali | 1 bagno


 Contatti


 Nome: Maria Bovio
 Email: [LINK: mailto:mbovio23@gmail.com] mbovio23@gmail.com
 Telefono: 3482629962

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.633176', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (160, 51, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Francesca Marcassa

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4zbyhbswmzjrmewtcmbvgmwtknzuhewtsyrxg4wtmzdfgezdanlcmnsdcmq@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: GdA


 [LINK: http://www.immobiliare.it/annunci/122999712/]


 [LINK: http://www.immobiliare.it/annunci/122999712/] &#65279;Quadrilocale
via Guido d''Arezzo 8, Pagano, Milano&#65279;
 Via Guido d''Arezzo, Milano
 Prezzo su richiesta

 229 mÂ² | 4 locali | 2 bagni |  lusso


 Contatti


 Nome: Francesca Marcassa
 Email: [LINK: mailto:francesca.marcassa.psicologa@gmail.com]
francesca.marcassa.psicologa@gmail.com

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.652218', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (161, 51, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 luca astrologo

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4ytdhaydonbymuwtmyzvgywtknbqgawwcoldmuwtcyzyhfswmytggu3daoi@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: GdA


 [LINK: http://www.immobiliare.it/annunci/122999712/]


 [LINK: http://www.immobiliare.it/annunci/122999712/] &#65279;Quadrilocale
via Guido d''Arezzo 8, Pagano, Milano&#65279;
 Via Guido d''Arezzo, Milano
 Prezzo su richiesta

 229 mÂ² | 4 locali | 2 bagni |  lusso


 Contatti


 Nome: luca astrologo
 Email: [LINK: mailto:luca.astrologo1@gmail.com] luca.astrologo1@gmail.com

 Telefono: 3384000026

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.671522', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (162, 51, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 josefd97@gmail.com

Mi interessa questo immobile, vorrei avere maggiori informazioni dove si
trova e il prezzo


 [LINK:
mailto:oyzc4olgmq4temtfmiwtinrwhawtkmdcmmwwcnbxgewtcnbxgjrgknlcg5rdqoa@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: GdA


 [LINK: http://www.immobiliare.it/annunci/122999712/]


 [LINK: http://www.immobiliare.it/annunci/122999712/] &#65279;Appartamento
in vendita&#65279;
 Via Guido d''Arezzo, Milano
 Prezzo su richiesta

 229 mÂ² | 4 locali | 2 bagni |  lusso


 Contatti


 Nome: josefd97@gmail.com
 Email: [LINK: mailto:josefd97@gmail.com] josefd97@gmail.com
 Telefono: 3663954680

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.688705', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (193, 62, NULL, 'messaggio', 'Va benissimo lunedì alle 18. Glielo posso già confermare se per lei va ancora bene', 'whatsapp', 'agente', '2026-01-09 13:15:23.624823', NULL, NULL, 90);
INSERT INTO public.comunicazioni VALUES (163, 51, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Cristian Crippa

Mi interessa questo immobile, vorrei avere maggiori informazioni, prezzo,
ubicazione box con prezzo relativo grazie


 [LINK:
mailto:oyzc4zjumrsdkoddgawtozbymywtkmdfgqwtqobtgmwwezjuguztsolfgu2tqzi@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: GdA


 [LINK: http://www.immobiliare.it/annunci/122999712/]


 [LINK: http://www.immobiliare.it/annunci/122999712/] &#65279;Appartamento
in vendita&#65279;
 Via Guido d''Arezzo, Milano
 Prezzo su richiesta

 229 mÂ² | 4 locali | 2 bagni |  lusso


 Contatti


 Nome: Cristian Crippa
 Email: [LINK: mailto:crippacristian@yahoo.it] crippacristian@yahoo.it
 Telefono: +393317813243

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.709748', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (164, 51, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 stefano foglieni

Mi interessa questo immobile, vorrei avere maggiori informazioni. Posso
chiedere il prezzo dellâ€™appartamento


 [LINK:
mailto:oyzc4n3bgq3dinrwmiwtsnzvmuwtkobsmewtsnbxgiwtmyrzgvqteobrgi3diza@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: GdA


 [LINK: http://www.immobiliare.it/annunci/122999712/]


 [LINK: http://www.immobiliare.it/annunci/122999712/] &#65279;Appartamento
in vendita&#65279;
 Via Guido d''Arezzo, Milano
 Prezzo su richiesta

 229 mÂ² | 4 locali | 2 bagni |  lusso


 Contatti


 Nome: stefano foglieni
 Email: [LINK: mailto:stefano.foglieni@gmail.com]
stefano.foglieni@gmail.com

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.731337', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (165, 51, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 fmscaglia M

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4yrygqyginrsgiwtmmtcgawtkzbzgqwwcobzgawtioldgrrwmzjrgfsdomq@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: GdA


 [LINK: http://www.immobiliare.it/annunci/122999712/]


 [LINK: http://www.immobiliare.it/annunci/122999712/] &#65279;Appartamento
in vendita&#65279;
 Via Guido d''Arezzo, Milano
 Prezzo su richiesta

 229 mÂ² | 4 locali | 2 bagni |  lusso


 Contatti


 Nome: fmscaglia M
 Email: [LINK: mailto:fmscaglia@gmail.com] fmscaglia@gmail.com
 Telefono: 3427643978

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.756925', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (166, 53, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 MARCO DANIELI

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4zbzmnrtizjymqwtgnzvgqwtkobrhewwcmbzguwtkyryhe2dkndegazdeni@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: SanGim


 [LINK: http://www.immobiliare.it/annunci/122845588/]


 [LINK: http://www.immobiliare.it/annunci/122845588/] &#65279;Appartamento
in vendita&#65279;
 Viale San Gimignano, Milano
 â‚¬ 580.000

 113 mÂ² | 4 locali | 1 bagno


 Contatti


 Nome: MARCO DANIELI
 Email: [LINK: mailto:archmarcodanieli@gmail.com]
archmarcodanieli@gmail.com
 Telefono: 3920616176

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.777478', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (167, 56, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Monica Spinelli

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4yjzgrtdozlfgawtozjxgmwtkzrrgqwtsnbuhawtemrumnqtayzqgqytcmq@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Bel


 [LINK: http://www.immobiliare.it/annunci/119032725/]


 [LINK: http://www.immobiliare.it/annunci/119032725/] &#65279;Appartamento
in vendita&#65279;
 Viale Belisario, Milano
 â‚¬ 770.000

 91 mÂ² | 3 locali | 1 bagno |  lusso


 Contatti


 Nome: Monica Spinelli
 Email: [LINK: mailto:monicaidaspinelli@gmail.com]
monicaidaspinelli@gmail.com
 Telefono: +393405475383

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.799982', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (194, 63, NULL, 'messaggio', 'Perfetto. Glielo confermo. Ci vediamo domenica alle 10 in Via Primaticcio 90. Le auguro una buona giornata, Sonia', 'whatsapp', 'agente', '2026-01-09 13:16:15.518933', NULL, NULL, 91);
INSERT INTO public.comunicazioni VALUES (168, 56, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Fabrizio Crocetta

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4yrxmjtdqojqguwtkzlcguwtkmlcgywweylgmuwwgntbguytsnzzgnqwgza@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Bel


 [LINK: http://www.immobiliare.it/annunci/119032725/]


 [LINK: http://www.immobiliare.it/annunci/119032725/] &#65279;Appartamento
in vendita&#65279;
 Viale Belisario, Milano
 â‚¬ 770.000

 91 mÂ² | 3 locali | 1 bagno |  lusso


 Contatti


 Nome: Fabrizio Crocetta
 Email: [LINK: mailto:fabrizio.crocetta@gmail.com]
fabrizio.crocetta@gmail.com
 Telefono: 3385329708

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.830503', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (169, 56, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: Immobiliare.it]


 conÂ Â   	 [LINK: https://www.luxuryestate.com/]  [IMAGE:
LuxuryEstate.com]


  Hai un nuovo messaggio:


 cristiano ceruti

Mi interessa questo immobile, vorrei avere maggiori informazioni.


 [LINK:
mailto:oyzc4mdfmnrdcn3emuwtazbxgmwtknbzguwwcyrqgiwtaobtgvsgkzbsmqygkmi@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Bel


 [LINK: http://www.immobiliare.it/annunci/119032725/]


 [LINK: http://www.immobiliare.it/annunci/119032725/] &#65279;Appartamento
in vendita&#65279;
 Viale Belisario, Milano
 â‚¬ 770.000

 91 mÂ² | 3 locali | 1 bagno |  lusso


 Contatti


 Nome: cristiano ceruti
 Email: [LINK: mailto:8sbcr8jxdn@privaterelay.appleid.com]
8sbcr8jxdn@privaterelay.appleid.com
 Telefono: +393355958294

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: https://www.facebook.com/immobiliare.it/]  [IMAGE: Facebook]
[LINK: https://www.instagram.com/immobiliare.it/]  [IMAGE: Instagram]
	 [LINK: https://twitter.com/immobiliare_it]  [IMAGE: Twitter]
[LINK: https://www.linkedin.com/company/immobiliare-it/]  [IMAGE: LinkedIn]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.851874', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (170, 57, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Mattia Boarin

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4ytcgiygeyrvmuwwintghawtknlegawwcmrrgmwwiyzzme3dgmjygeztqni@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Abruzzi


 [LINK: http://www.immobiliare.it/annunci/121091184/]


 [LINK: http://www.immobiliare.it/annunci/121091184/] &#65279;Appartamento
in vendita&#65279;
 Viale Abruzzi, Milano
 â‚¬ 650.000

 116 mÂ² | 3 locali | 1 bagno


 Contatti


 Nome: Mattia Boarin
 Email: [LINK: mailto:mattia.boarin@gmail.com] mattia.boarin@gmail.com
 Telefono: 3403510142

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.868068', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (171, 57, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Nataliya Mazuryak

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4nlcgazdknbzmewtiyrumewtkobymywtqn3fmmwwizdfmzqwkolfheygkyi@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Abruzzi


 [LINK: http://www.immobiliare.it/annunci/121091184/]


 [LINK: http://www.immobiliare.it/annunci/121091184/] &#65279;Appartamento
in vendita&#65279;
 Viale Abruzzi, Milano
 â‚¬ 650.000

 116 mÂ² | 3 locali | 1 bagno


 Contatti


 Nome: Nataliya Mazuryak
 Email: [LINK: mailto:natmmx@gmail.com] natmmx@gmail.com
 Telefono: 3402820821

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.886702', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (172, 57, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Laura Squadrani

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4zbsmjrtcmlcgywwmnlgmiwtkmdbmywwcobsgawwizlegizdoojxg44wmmy@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Abruzzi


 [LINK: http://www.immobiliare.it/annunci/121091184/]


 [LINK: http://www.immobiliare.it/annunci/121091184/] &#65279;Appartamento
in vendita&#65279;
 Viale Abruzzi, Milano
 â‚¬ 650.000

 116 mÂ² | 3 locali | 1 bagno


 Contatti


 Nome: Laura Squadrani
 Email: [LINK: mailto:laura.squadrani@hotmail.it]
laura.squadrani@hotmail.it
 Telefono: 3388891916

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.900577', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (195, 63, NULL, 'messaggio', 'Perfetto. Glielo confermo. Ci vediamo domenica alle 10 in Via Primaticcio 90. Le auguro una buona giornata, Sonia', 'whatsapp', 'agente', '2026-01-09 13:16:17.380589', NULL, NULL, 92);
INSERT INTO public.comunicazioni VALUES (173, 57, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 GIADA MASSESE

Mi interessa questo immobile, vorrei avere maggiori informazioni e vorrei
visitarlo. Grazie, giada


 [LINK:
mailto:oyzc4nlehfsdsyzxmewtqobxmmwtkyzzmewtsmdggmwwcnzvgqytsmzxmzstqza@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Abruzzi


 [LINK: http://www.immobiliare.it/annunci/121091184/]


 [LINK: http://www.immobiliare.it/annunci/121091184/] &#65279;Appartamento
in vendita&#65279;
 Viale Abruzzi, Milano
 â‚¬ 650.000

 116 mÂ² | 3 locali | 1 bagno


 Contatti


 Nome: GIADA MASSESE
 Email: [LINK: mailto:giada.massese@gmail.com] giada.massese@gmail.com
 Telefono: 3346873203

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.918751', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (174, 57, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 elena lux

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4nrwge2wkmrsg4wtqzdbmiwtkmtfmiwweobsmqwtsnlegvtdmmzqg5rwimi@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Abruzzi


 [LINK: http://www.immobiliare.it/annunci/121091184/]


 [LINK: http://www.immobiliare.it/annunci/121091184/] &#65279;Appartamento
in vendita&#65279;
 Viale Abruzzi, Milano
 â‚¬ 650.000

 116 mÂ² | 3 locali | 1 bagno


 Contatti


 Nome: elena lux
 Email: [LINK: mailto:elenastella.lux@gmail.com] elenastella.lux@gmail.com


 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.936443', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (175, 47, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 walter cangini

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4zlgmm2tmytcgmwtqmzwgmwtkndemywweojvmywtczrqmqytqnzsgjqtioi@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Abruzzi


 [LINK: http://www.immobiliare.it/annunci/121091184/]


 [LINK: http://www.immobiliare.it/annunci/121091184/] &#65279;Appartamento
in vendita&#65279;
 Viale Abruzzi, Milano
 â‚¬ 650.000

 116 mÂ² | 3 locali | 1 bagno


 Contatti


 Nome: walter cangini
 Email: [LINK: mailto:p.salvemini@gmail.com] p.salvemini@gmail.com
 Telefono: 3407992053

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.956326', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (176, 61, NULL, 'richiesta', 'body{width:100% !important;}.ExternalClass {width:100% !important;}.ExternalClass * {line-height:100%;}.ReadMsgBody{width:100%;}body { margin: 1em auto;width: 95%;color: #666666;background-color:#efefeb;font-size: 16px;line-height:24px;-webkit-text-size-adjust: none !important;}table {border-collapse:collapse;color:#666666;//line-height:20px;font-family:Arial;//font-size:16px;width: 100%;}img { border: none; }/* REMOVABLE START */td {vertical-align:middle;}hr { border-bottom: 1px dashed #FFF; border-top: 1px dashed #CCC;}h1:not(:first-child), h2, h3 {margin-top:20px;color:#141414;}h1, h2, h3 {color:#141414 !important;}h1 {font-size:20px;font-weight:bold;margin-bottom:15px;}h2 {font-size:16px;font-weight:bold;margin-bottom:6px;}h3 {font-size:14px;font-weight:bold;margin-bottom:6px;}p {margin-bottom:16px !important; margin-top:16px !important;color:#141414;}li {margin-bottom:0px;margin-left:30px;color:#141414;}a {color:#0066CC;}.bottomInfo {padding: 0.5em 15px;}.bigLink {font-size:18px;font-weight:700;}.grayLinks a {color:#666;}.grayLinks p {color:#4D4D4C;}#backgroundTable {background-color:#EFEFEB;}.greyback { display: block; background-color: #F2F2F2; padding: 0px;}.greyback p { padding: 10px; margin: 5px;}#wrapperTable {max-width: 600px;display: block;margin: 20px auto 0;}#wrapperTable, #wrapper > td {background-color:#efefeb;}.viewInWeb {padding-bottom:5px;}.viewInWeb a {text-decoration: none;font-size: 12px;}table.layout { outline: none; padding: 0; margin: 0;}table.layout td.izq { vertical-align: top !important;}table.layout td.dch { vertical-align: top !important; padding-left: 20px;}#mainTable {color:#666666;padding:0;outline:none;margin:0 auto !important;}#mainTable {margin-top:30px;padding:10px;}.slide {width:6px;vertical-align:top;}.slide img {width:6px;height:78px;}#headerInside {width:100%;background-color:#fff;border-top:solid 1px #dededa;border-left:solid 1px #dededa;border-right:solid 1px #dededa;font-size:1px;line-height:1px;}#header table td {height:', 'email', 'sistema', '2026-01-09 10:52:20.977204', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (177, 57, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Carolina

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4ojzmzrwcm3bmiwwgnbymewtkzlcgewtqn3dgewwcm3emiytqnbtgjsdinq@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Abruzzi


 [LINK: http://www.immobiliare.it/annunci/121091184/]


 [LINK: http://www.immobiliare.it/annunci/121091184/] &#65279;Appartamento
in vendita&#65279;
 Viale Abruzzi, Milano
 â‚¬ 650.000

 116 mÂ² | 3 locali | 1 bagno


 Contatti


 Nome: Carolina
 Email: [LINK: mailto:carolinavitabile@gmail.com]
carolinavitabile@gmail.com
 Telefono: 3381612602

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:20.996069', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (178, 57, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 elena fracassi

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4nlbgfqtcmrxmiwwgnrsmywtkm3gmywtszrshawtozlbgvsdiylbgeytkna@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Abruzzi


 [LINK: http://www.immobiliare.it/annunci/121091184/]


 [LINK: http://www.immobiliare.it/annunci/121091184/] &#65279;Appartamento
in vendita&#65279;
 Viale Abruzzi, Milano
 â‚¬ 650.000

 116 mÂ² | 3 locali | 1 bagno


 Contatti


 Nome: elena fracassi
 Email: [LINK: mailto:eafracassi@yahoo.it] eafracassi@yahoo.it
 Telefono: 3388126830

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:21.017753', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (196, 62, NULL, 'risposta', 'Ok', 'whatsapp', 'cliente', '2026-01-09 13:33:44.148442', NULL, NULL, 93);
INSERT INTO public.comunicazioni VALUES (179, 57, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 Paola Perna

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4obrha4ggmtbgqwtiytemuwtkzddmewwenrqmuwtsobwheydcyrvhbqwmna@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Abruzzi


 [LINK: http://www.immobiliare.it/annunci/121091184/]


 [LINK: http://www.immobiliare.it/annunci/121091184/] &#65279;Appartamento
in vendita&#65279;
 Viale Abruzzi, Milano
 â‚¬ 650.000

 116 mÂ² | 3 locali | 1 bagno


 Contatti


 Nome: Paola Perna
 Email: [LINK: mailto:paolaperna@paolaperna.it] paolaperna@paolaperna.it
 Telefono: 3472555721

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:21.042001', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (180, 59, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: ImmobiliarePro]


  Hai un nuovo messaggio:


 paul deutsch

Mi interessa questo immobile, vorrei avere maggiori informazioni e una
appuntamento per visitare .


 [LINK:
mailto:oyzc4odgmm2wkzbvgywtomlgmewtkn3fmewtqyzxmmwtcmjugyztentbmvrwiny@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: &#65279;Boll&#65279;


 [LINK: http://www.immobiliare.it/annunci/119374265/]


 [LINK: http://www.immobiliare.it/annunci/119374265/] &#65279;Casa
indipendente in vendita&#65279;
 Corte Bollani, Venezia
 â‚¬ 1.250.000

 172 mÂ² | 5+ locale | 3+ bagno |  lusso


 Contatti


 Nome: paul deutsch
 Email: [LINK: mailto:pranthof@gmail.com] pranthof@gmail.com

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:21.068849', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (181, 59, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: Immobiliare.it]


 conÂ Â   	 [LINK: https://www.luxuryestate.com/]  [IMAGE:
LuxuryEstate.com]


  Hai un nuovo messaggio:


 Natalie Dalponte

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4n3dmqywknjwgewtgzjwmiwtkyztmywwcn3dguwwmmzxmi2tgmrwgfqtani@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Boll


 [LINK: http://www.immobiliare.it/annunci/119374265/]


 [LINK: http://www.immobiliare.it/annunci/119374265/] &#65279;Casa
indipendente in vendita&#65279;
 Corte Bollani, Venezia
 â‚¬ 1.250.000

 172 mÂ² | 5+ locale | 3+ bagno |  lusso


 Contatti


 Nome: Natalie Dalponte
 Email: [LINK: mailto:natalie.dalponte@gmail.com]
natalie.dalponte@gmail.com
 Telefono: 3392064428

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: https://www.facebook.com/immobiliare.it/]  [IMAGE: Facebook]
[LINK: https://www.instagram.com/immobiliare.it/]  [IMAGE: Instagram]
	 [LINK: https://twitter.com/immobiliare_it]  [IMAGE: Twitter]
[LINK: https://www.linkedin.com/company/immobiliare-it/]  [IMAGE: LinkedIn]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:21.08858', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (182, 56, NULL, 'richiesta', ' [LINK: http://www.immobiliare.it/]  [IMAGE: Immobiliare.it]


 conÂ Â   	 [LINK: https://www.luxuryestate.com/]  [IMAGE:
LuxuryEstate.com]


  Hai un nuovo messaggio:


 publierre U

Mi interessa questo immobile, vorrei avere maggiori informazioni


 [LINK:
mailto:oyzc4nbymuywezdgguwwcobqmewtkzjvmmwtszbqmywwkmldgm4tmyrwhbsgiyy@messaggi.immobiliare.it?subject=Nuovo
messaggio da Cavour Immobiliare]  Rispondi
 Messaggio ricevuto per l''annuncio: Bel


 [LINK: http://www.immobiliare.it/annunci/119032725/]


 [LINK: http://www.immobiliare.it/annunci/119032725/] &#65279;Appartamento
in vendita&#65279;
 Viale Belisario, Milano
 â‚¬ 770.000

 91 mÂ² | 3 locali | 1 bagno |  lusso


 Contatti


 Nome: publierre U
 Email: [LINK: mailto:publierre@publierre.com] publierre@publierre.com
 Telefono: 335271380

 Il Team di &#65279;Immobiliare.it&#65279;


 Gestisci le richieste direttamente dal tuo smartphone


 [LINK: https://www.immobiliare.it/download-app-mobile?store=ios]  [IMAGE:
App Store]
 [LINK: https://www.immobiliare.it/download-app-mobile?store=android]
[IMAGE: Google Play Store]


 [IMAGE: illustrazione]


 [LINK: https://www.facebook.com/immobiliare.it/]  [IMAGE: Facebook]
[LINK: https://www.instagram.com/immobiliare.it/]  [IMAGE: Instagram]
	 [LINK: https://twitter.com/immobiliare_it]  [IMAGE: Twitter]
[LINK: https://www.linkedin.com/company/immobiliare-it/]  [IMAGE: LinkedIn]


 [LINK: http://www.immobiliare.it/] Immobiliare.it Tutti i diritti
riservati. [LINK: http://www.immobiliare.it/terms/] Condizioni generali |
[LINK: http://www.immobiliare.it/terms/privacy/] Regole della privacy', 'email', 'sistema', '2026-01-09 10:52:21.108463', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (183, 62, 3, 'richiesta_visita', 'Richiesta da Idealista: Ciao, questo appartamento mi interessa e mi piacerebbe visitarlo. Grazie', 'email', 'sistema', '2026-01-09 11:03:58.159487', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (184, 63, 3, 'richiesta_visita', 'Richiesta da Idealista: Buongiorno siamo interessati a vedere l''immobile se ancora disponibile. Sarebbe possibile domani mattina? Grazie', 'email', 'sistema', '2026-01-09 11:04:33.497978', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (185, 63, NULL, 'risposta', 'Buongiorno Sig.ra Semeraro, purtroppo fra oggi e il week end la proprietà sarà all''interno dell''appartamento per sgomberare qualche arredo ed oggetti. Possiamo provare domenica mattina, se vi andasse bene, con il rischio che l''appartamento sia un po'' disordinato. Potrei alle 10. In alternativa la prossima settimana ho l''agenda abbastanza libera quindi se volesse indicarmi un paio di slot sarò felice di fissare l''appuntamento. Rimango a disposizione e le auguro una buona giornata. Ilan Boni - Cavour Immobiliare', 'whatsapp', 'agente', '2026-01-09 11:16:38.413647', NULL, NULL, NULL);
INSERT INTO public.comunicazioni VALUES (186, 63, NULL, 'messaggio', 'Buongiorno Sig.ra Semeraro, purtroppo fra oggi e il week end la proprietà sarà all''interno dell''appartamento per sgomberare qualche arredo ed oggetti. Possiamo provare domenica mattina, se vi andasse bene, con il rischio che l''appartamento sia un po'' disordinato. Potrei alle 10. In alternativa la prossima settimana ho l''agenda abbastanza libera quindi se volesse indicarmi un paio di slot sarò felice di fissare l''appuntamento. Rimango a disposizione e le auguro una buona giornata. Ilan Boni - Cavour Immobiliare', 'whatsapp', 'agente', '2026-01-09 11:16:39.319644', NULL, NULL, 83);
INSERT INTO public.comunicazioni VALUES (189, 63, NULL, 'risposta', 'Va benissimo alle 10 di domenica. Abitiamo nello stesso cortile', 'whatsapp', 'cliente', '2026-01-09 11:21:07.932009', NULL, NULL, 86);
INSERT INTO public.comunicazioni VALUES (190, 62, NULL, 'risposta', 'Buongiorno, sono disponibile da lunedì a partire dalle ore 18', 'whatsapp', 'cliente', '2026-01-09 11:27:38.009745', NULL, NULL, 87);


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: documenti_immobile; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: immobili; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.immobili VALUES (2, NULL, 'Appartamento ristrutturato a CityLife', '', 'Via Senofonte', '', 115, 1200000.00, 4, false, false, true, false, true, false, false, false, 2, 3, NULL, NULL, false, false, 'agenzia', '[]', true, '2026-01-06 08:25:49.894303', '2026-01-06 08:25:49.894303', NULL, 'disponibile', NULL, NULL, false, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'nuovo', NULL, NULL, false, 'mandato', '{}', NULL, NULL);
INSERT INTO public.immobili VALUES (3, 39, 'Trilocale con giardino condominiale e ottima distribuzione', 'In condominio signorile anni ’60 con portineria e giardino condominiale curato, proponiamo trilocale di 80 mq al piano rialzato, da ristrutturare, con spazi ben distribuiti.

Ingresso, soggiorno con balcone affacciato sul verde, cucina semi-abitabile, due camere matrimoniali, bagno finestrato.
Doppio affaccio, ambienti ampi e regolari, facili da personalizzare.

Soluzione adatta sia a chi cerca una casa comoda, sia a chi valuta un acquisto per investimento. La metratura, il taglio interno e la zona garantiscono una buona tenuta nel tempo, in un’area che, dati alla mano, continua a crescere.

Servizi sotto casa: negozi, bar, supermercati, di fronte un grande Carrefour, e tutti i principali servizi di prima necessità. Collegamenti rapidi con il centro tramite M1 Bande Nere e con l’aeroporto di Linate grazie alla nuova M4 Gelsomini, entrambe a pochi minuti a piedi.

Contesto curato, spazi che funzionano, posizione ben collegata.
Una proposta equilibrata, adatta a diverse esigenze abitative e di investimento.', 'Via Primaticcio 90', 'Bande Nere', 80, 329000.00, 1, false, false, false, true, true, false, false, false, 2, 1, NULL, NULL, true, false, 'agenzia', '[]', true, '2026-01-08 10:58:33.660496', '2026-01-08 13:34:48.067', NULL, 'disponibile', NULL, NULL, false, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'nuovo', NULL, NULL, false, 'mandato', '{}', 'IMM-MK5C3NLC', 'Prima');


--
-- Data for Name: immobili_esterni; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.immobili_esterni VALUES (16, 'Bilocale in vendita in Via Pietro Calvi s.n.c


Indipendenza - Regina Giovanna, Milano

Vedi mappa', 'Appartamento situato in una delle zone più esclusive di Milano in zona piazza Risorgimento. Con doppia esposizione. L appartamento sarà venduto ristrutturato ed è composto da grande ingresso/zona cucina, ampio disimpegno, due ampie camere finestrate di cui una angolare con due finestre, un grande bagno divisibile Luminosissimo in stabile caratteristico e ben tenuto con doppio accesso sia da scala interna che da ascensore. Occasione unica. Le fotografie saranno pubblicate alTermine della ristrutturazione. Le fotografie pubblicate non rappresentano alcun termine contrattuale e rappresentano immagini puramente simboliche non corrispondenti allo stato attuale dell appartamento. No agenzie.', NULL, 'Indipendenza - Regina Giovanna, Milano', 65, 560000.00, NULL, 2, 1, NULL, '3475876090', NULL, 'https://www.idealista.it/immobile/34458730/', 'idealista.it', 'Vai al contenuto principale
Immobili 
Inbox 6
Acquisizione 
Richieste 
Servizi
29
Case a Milano

42 di 14615 immobili

Precedente
Successivo
4 foto
Mappa

Bilocale in vendita in Via Pietro Calvi s.n.c

560.000 € 65 m2 2 locali 2º piano con ascensore

Salvapreferito
Elimina
Bilocale in vendita in Via Pietro Calvi s.n.c
Indipendenza - Regina Giovanna, Milano  Vedi mappa
560.000 €
 Calcola mutuo  Confronta mutui
65 m2
2 locali
2º piano con ascensore
Salvapreferito
Elimina
Condividi
Aggiungi una nota
Segnala come contattato
Descrizione dell’inserzionista
Disponibile in Italiano English Altre lingue 

Appartamento situato in una delle zone più esclusive di Milano in zona piazza Risorgimento. Con doppia esposizione. L appartamento sarà venduto ristrutturato ed è composto da grande ingresso/zona cucina, ampio disimpegno, due ampie camere finestrate di cui una angolare con due finestre, un grande bagno divisibile Luminosissimo in stabile caratteristico e ben tenuto con doppio accesso sia da scala interna che da ascensore.
Occasione unica. Le fotografie saranno pubblicate al
Termine della ristrutturazione. Le fotografie pubblicate non rappresentano alcun termine contrattuale e rappresentano immagini puramente simboliche non corrispondenti allo stato attuale dell appartamento.
No agenzie.

Caratteristiche specifiche
65 m² commerciali
2 locali
1 bagno
Buono stato
Orientamento sud, ovest
Costruito nel 1940
Riscaldamento centralizzato: Gas
Classe energetica (Legge 90 del 2013, legislazione vigente):  (IPE non indicato)
Solo l''accesso esteriore è adattato per persone a mobilità ridotta
Costruzione
2º piano
Con ascensore
Dotazione
Aria condizionata

Annuncio aggiornato 12 giorni fa

Foto
Sala
Sala
Sala
Vedi un''altra foto
Camera da letto
 Vedi qualche errore?

Segnalacelo per poterlo correggere e aiutare anche gli altri utenti.

Facci sapere quale errore hai visto
Prezzo

Prezzo dell''immobile:
560.000 €

Prezzo al m²:
8.615 €/m²

150 €/mese di spese condominiali

Fai una controproposta

Avvisami se diminuisce il prezzo

 
Prezzo dell''immobile
 
€
Capitale iniziale
 
€
%
Durata in anni
 
Tasso d''interesse 
 
Fisso
Variabile
 
%
Importo del mutuo:
- €
La tua rata mensile:
- €
Imposte e spese non incluse
Trova mutuo Il risultato del calcolo è indicativo e non vincolante, essendo demandata ai singoli istituti finanziatori ogni valutazione sul merito creditizio del singolo utente. Condizioni generali.
Posizione
Via Pietro Calvi s.n.c
Quartiere Indipendenza - Regina Giovanna
Zona Garibaldi - Porta Venezia
Milano
Milano, Milano
 Ingrandisci mappa
Statistiche
Chiedi all''inserzionista
Il tuo indirizzo mail
Il tuo telefono
+39
Il tuo nome
Aggiungi ai preferiti
 347 587 6090
Codice dell''annuncio

34458730

Massimiliano
 Case a Indipendenza - Regina Giovanna
Servizi di idealista
Stai cercando un immobile?
Ricerca immobili
Vendita di case e appartamenti in Italia
Affitto di case e appartamenti in Italia
Case e appartamenti in affitto
Appartamenti in condivisione
Opportunità di investimento
Rentalia, affitto vacanze
Report dei prezzi
idealista maps
Case di lusso in vendita in Italia
Case di lusso in affitto in Italia
Hai un immobile?
Inserisci annuncio gratis
Area del proprietario
Migliora le foto del tuo annuncio
Richiedi l''attestato di prestazione energetica (APE)
Crea gratuitamente il tuo contratto di affitto
Consulta se un inquilino è moroso
Valuta gratis qualsiasi immobile
Trova le agenzie per vendere facilmente la tua casa
Segnala un inquilino moroso
Guida per vendere la tua casa
Ristrutturazione casa
Sei un professionista immobiliare?
Pubblica i tuoi immobili da professionista
Sei già cliente? Accedi al tuo account
Corsi immobiliari
Pubblicità su idealista
idealista/tools: Software gestionale immobiliare
Altri software consigliati
Registro inquilini morosi
idealista/data: tecnologia per l''analisi immobiliare
AvaiBook: software per gestire il tuo affitto vacanze
Regold: Servizi per Agenti Immobiliari
Gestionale Immobiliare miogest
Gestim: Software gestionale immobiliare
idealista
 Italiano
Tutto su idealista
Chi siamo
Perché siamo leader
Sala stampa
Lavora con noi
idealista/mutui
idealista/data
idealista/news
Aiuto
Domande frequenti (FAQ)
Contattaci
Privacy
Utilizzo dei cookie
Condizioni generali
Altri paesi
idealista Spagna
idealista Portogallo
Nel tuo cellulare o tablet
idealista Copyright © 2000-2026', '{}', '[]', NULL, false, 'contattato', 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent''anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un''opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile. Dal suo annuncio si notano alcune caratteristiche, come la doppia esposizione e la ristrutturazione, che rendono l''immobile in linea con alcune esigenze ricorrenti in questo periodo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l''immobile: una decina di minuti per ascoltare la sua situazione, vedere l''appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', '2026-01-09 09:40:33.796', NULL, true, '2026-01-09 08:52:28.566878', '2026-01-09 09:40:33.83', NULL, NULL, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 44, 'ACQ-MK6N1CZW');
INSERT INTO public.immobili_esterni VALUES (11, 'Bilocale in vendita in Via Torino, 66


Carrobbio - Cinque Vie, Milano

Vedi mappa', 'Via Torino, una delle zone più centrali e ricercate di Milano, a pochi passi da Piazza Duomo e dai principali servizi, proponiamo in vendita splendido bilocale completamente ristrutturato con finiture di lusso in contesto condominiale di lusso con servizio portineria.L''immobile si presenta già arredato a nuovo, con arredi su misura, cucina, frigorifero, forno microonde e cabina armadio.La recente ristrutturazione con materiali di pregio, infissi completamente nuovi, impianto climatizzazione in ogni vano, domotica Smartlife, parquet in legno vero lavorato a mano, pareti in microcemento per un design moderno e raffinato ed illuminazione Artemide ne completano la qualità.Dotato di un piccolo balcone sulla corta interna del condominio.L''appartamento è composto da soggiorno con angolo cottura, camera da letto con cabina armadio e bagno, piu salone dotato di divano letto.Superficie commerciale indicativa circa 43 mq, da verificare presso i documenti catastaliNO SPESE DI AGENZIA (VENDITA DIRETTA)NON GRADIAMO ESSERE CONTATTATI DA AGENZIE IMMOBILIARI. L''annuncio è rivolto solo a privati ( o Società) interessati all''acquisto.



                
                Leggi il commento completo', NULL, 'Carrobbio - Cinque Vie, Milano', 45, 588000.00, NULL, 2, 1, NULL, '3407992052', NULL, 'https://www.idealista.it/immobile/34508849/', 'idealista.it', 'Vai al contenuto principale
Immobili 
Inbox 4
Acquisizione 
Richieste 
Servizi
29
Case a Milano

9 di 14582 immobili

Precedente
Successivo
7 foto
Planimetria
Video
Mappa

Bilocale in vendita in Via Torino, 66

588.000 € 45 m2 2 locali 3º piano con ascensore

Salvapreferito
Elimina
Bilocale in vendita in Via Torino, 66
Carrobbio - Cinque Vie, Milano  Vedi mappa
588.000 €
 Calcola mutuo  Confronta mutui
45 m2
2 locali
3º piano con ascensore
Salvapreferito
Elimina
Condividi
Aggiungi una nota
Segnala come contattato
Descrizione dell’inserzionista
Disponibile in Italiano English Altre lingue 

Via Torino, una delle zone più centrali e ricercate di Milano, a pochi passi da Piazza Duomo e dai principali servizi, proponiamo in vendita splendido bilocale completamente ristrutturato con finiture di lusso in contesto condominiale di lusso con servizio portineria.
L''immobile si presenta già arredato a nuovo, con arredi su misura, cucina, frigorifero, forno microonde e cabina armadio.
La recente ristrutturazione con materiali di pregio, infissi completamente nuovi, impianto climatizzazione in ogni vano, domotica Smartlife, parquet in legno vero lavorato a mano, pareti in microcemento per un design moderno e raffinato ed illuminazione Artemide ne completano la qualità.
Dotato di un piccolo balcone sulla corta interna del condominio.
L''appartamento è composto da soggiorno con angolo cottura, camera da letto con cabina armadio e bagno, piu salone dotato di divano letto.
Superficie commerciale indicativa circa 43 mq, da verificare presso i documenti catastali
NO SPESE DI AGENZIA (VENDITA DIRETTA)
NON GRADIAMO ESSERE CONTATTATI DA AGENZIE IMMOBILIARI. L''annuncio è rivolto solo a privati ( o Società) interessati all''acquisto.

 Leggi il commento completo

Pubblicità

Caratteristiche specifiche
45 m² commerciali
2 locali
1 bagno
Balcone
Buono stato
Armadi a muro
Orientamento est, ovest
Classe energetica (Legge 90 del 2013, legislazione vigente):  (IPE non indicato)
Costruzione
3º piano
Con ascensore
Dotazione
Aria condizionata

Annuncio aggiornato 21 ore fa

Video
Foto
Planimetrie
 Vedi qualche errore?

Segnalacelo per poterlo correggere e aiutare anche gli altri utenti.

Facci sapere quale errore hai visto
Prezzo

Prezzo dell''immobile:
588.000 €

Prezzo al m²:
13.067 €/m²

180 €/mese di spese condominiali

Fai una controproposta

Avvisami se diminuisce il prezzo

 
Prezzo dell''immobile
 
€
Capitale iniziale
 
€
%
Durata in anni
 
Tasso d''interesse 
 
Fisso
Variabile
 
%
Importo del mutuo:
- €
La tua rata mensile:
- €
Imposte e spese non incluse
Trova mutuo Il risultato del calcolo è indicativo e non vincolante, essendo demandata ai singoli istituti finanziatori ogni valutazione sul merito creditizio del singolo utente. Condizioni generali.
Posizione
Via Torino, 66
Quartiere Carrobbio - Cinque Vie
Zona Centro Storico
Milano
Milano, Milano
 Ingrandisci mappa
Statistiche
Chiedi all''inserzionista
Il tuo indirizzo mail
Il tuo telefono
+39
Il tuo nome
Aggiungi ai preferiti
 389 493 5851
Codice dell''annuncio

34508849

Privato
Mirko Barbesta
 Case a Carrobbio - Cinque Vie
Servizi di idealista
Stai cercando un immobile?
Ricerca immobili
Vendita di case e appartamenti in Italia
Affitto di case e appartamenti in Italia
Case e appartamenti in affitto
Appartamenti in condivisione
Opportunità di investimento
Rentalia, affitto vacanze
Report dei prezzi
idealista maps
Case di lusso in vendita in Italia
Case di lusso in affitto in Italia
Hai un immobile?
Inserisci annuncio gratis
Area del proprietario
Migliora le foto del tuo annuncio
Richiedi l''attestato di prestazione energetica (APE)
Crea gratuitamente il tuo contratto di affitto
Consulta se un inquilino è moroso
Valuta gratis qualsiasi immobile
Trova le agenzie per vendere facilmente la tua casa
Segnala un inquilino moroso
Guida per vendere la tua casa
Ristrutturazione casa
Sei un professionista immobiliare?
Pubblica i tuoi immobili da professionista
Sei già cliente? Accedi al tuo account
Corsi immobiliari
Pubblicità su idealista
idealista/tools: Software gestionale immobiliare
Altri software consigliati
Registro inquilini morosi
idealista/data: tecnologia per l''analisi immobiliare
AvaiBook: software per gestire il tuo affitto vacanze
Regold: Servizi per Agenti Immobiliari
Gestionale Immobiliare miogest
Gestim: Software gestionale immobiliare
idealista
 Italiano
Tutto su idealista
Chi siamo
Perché siamo leader
Sala stampa
Lavora con noi
idealista/mutui
idealista/data
idealista/news
Aiuto
Domande frequenti (FAQ)
Contattaci
Privacy
Utilizzo dei cookie
Condizioni generali
Altri paesi
idealista Spagna
idealista Portogallo
Nel tuo cellulare o tablet
idealista Copyright © 2000-2026', '{}', '[]', NULL, false, 'contattato', 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent''anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un''opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile in Via Torino. Dal suo annuncio si notano alcune caratteristiche, come la ristrutturazione completa e la presenza del balcone, che rendono l''immobile in linea con alcune esigenze ricorrenti in questo periodo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l''immobile: una decina di minuti per ascoltare la sua situazione, vedere l''appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', '2026-01-09 08:29:52.624', NULL, true, '2026-01-08 10:47:09.513627', '2026-01-09 08:29:52.652', NULL, NULL, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ACQ-MK5BOZP8');
INSERT INTO public.immobili_esterni VALUES (14, 'Trilocale in vendita in Via delle Foppette, 6


Solari - Savona, Milano

Vedi mappa', 'Appartamento finemente ristrutturato da studio milanese di architettura, composto da 3 camere e 3 bagni oltre ad angolo cottura e piccolo leaving, sito al piano secondo. Pavimentazione in ceramica di pregio; porte a scomparsa; tutti gli infissi sono recenti con doppi vetri per garantire una completa insonorizzazione, garantita anche dal fatto che l''appartamento si trova all''ultimo piano dello stabile. L''immobile è attualmente adibito a bed & breakfast ma può agevolmente essere trasformato (abbattendo divisori in cartongesso) in un ampio trilocale composto da soggiorno, due camere da letto e due bagni. Completa la proprietà un comodo solaio.Lo stabile, pur essendo in prossimità delle fermate della circonvallazione, gode di una posizione tranquilla e silenziosa. Il tetto è stato completamente rifatto nell''estate 2025.Ci troviamo nella famosa "zona Tortona" sede di molteplici showroom delle principali case di moda e a soli 300 mt dal MUDEC.L''appartamento viene compravenduto senza alcuna spesa di intermediazione, per consentire un notevole risparmio di spesa agli acquirenti, pertanto si invitano le agenzie immobiliari ad astenersi da qualsivoglia contatto.Per appuntamenti inviare messaggio WHATSAPP al n. Sarete ricontattati a breve.



                
                Leggi il commento completo', NULL, 'Solari - Savona, Milano', 70, 395000.00, NULL, 3, 3, NULL, NULL, NULL, 'https://www.idealista.it/immobile/34522004/', 'idealista.it', 'Vai al contenuto principale
Immobili 
Inbox 6
Acquisizione 
Richieste 
Servizi
29
Case a Milano

1 di 14613 immobili

Successivo
20 foto
Planimetria
Mappa

Trilocale in vendita in Via delle Foppette, 6

395.000 € 70 m2 3 locali 2º piano senza ascensore

Salvapreferito
Elimina
Trilocale in vendita in Via delle Foppette, 6
Solari - Savona, Milano  Vedi mappa
395.000 €
 Calcola mutuo  Confronta mutui
70 m2
3 locali
2º piano senza ascensore
Salvapreferito
Elimina
Condividi
Aggiungi una nota
Segnala come contattato
Descrizione dell’inserzionista
Disponibile in Italiano English Altre lingue 

Appartamento finemente ristrutturato da studio milanese di architettura, composto da 3 camere e 3 bagni oltre ad angolo cottura e piccolo leaving, sito al piano secondo. Pavimentazione in ceramica di pregio; porte a scomparsa; tutti gli infissi sono recenti con doppi vetri per garantire una completa insonorizzazione, garantita anche dal fatto che l''appartamento si trova all''ultimo piano dello stabile.
L''immobile è attualmente adibito a bed & breakfast ma può agevolmente essere trasformato (abbattendo divisori in cartongesso) in un ampio trilocale composto da soggiorno, due camere da letto e due bagni. Completa la proprietà un comodo solaio.
Lo stabile, pur essendo in prossimità delle fermate della circonvallazione, gode di una posizione tranquilla e silenziosa. Il tetto è stato completamente rifatto nell''estate 2025.
Ci troviamo nella famosa "zona Tortona" sede di molteplici showroom delle principali case di moda e a soli 300 mt dal MUDEC.
L''appartamento viene compravenduto senza alcuna spesa di intermediazione, per consentire un notevole risparmio di spesa agli acquirenti, pertanto si invitano le agenzie immobiliari ad astenersi da qualsivoglia contatto.
Per appuntamenti inviare messaggio WHATSAPP al n. Sarete ricontattati a breve.

 Leggi il commento completo

Pubblicità

Caratteristiche specifiche
70 m² commerciali
3 locali
3 bagni
Balcone
Buono stato
Cantina
Orientamento sud, est
Classe energetica (D.L. 192 del 2005):  (IPE non indicato)
Costruzione
2º piano
Senza ascensore
Dotazione
Aria condizionata

Annuncio aggiornato 16 ore fa

Foto
Planimetrie
 Vedi qualche errore?

Segnalacelo per poterlo correggere e aiutare anche gli altri utenti.

Facci sapere quale errore hai visto
Prezzo

Prezzo dell''immobile:
395.000 €

Prezzo al m²:
5.643 €/m²

250 €/mese di spese condominiali

Fai una controproposta

Avvisami se diminuisce il prezzo

 
Prezzo dell''immobile
 
€
Capitale iniziale
 
€
%
Durata in anni
 
Tasso d''interesse 
 
Fisso
Variabile
 
%
Importo del mutuo:
- €
La tua rata mensile:
- €
Imposte e spese non incluse
Trova mutuo Il risultato del calcolo è indicativo e non vincolante, essendo demandata ai singoli istituti finanziatori ogni valutazione sul merito creditizio del singolo utente. Condizioni generali.
Posizione
Via delle Foppette, 6
Quartiere Solari - Savona
Zona Navigli - Bocconi
Milano
Milano, Milano
 Ingrandisci mappa
Statistiche
Chiedi all''inserzionista
Il tuo indirizzo mail
Il tuo telefono
+39
Il tuo nome
Aggiungi ai preferiti
Vedi il telefono
Codice dell''annuncio

34522004

Privato
LUCIA Papaleo
 Case a Solari - Savona
Servizi di idealista
Stai cercando un immobile?
Ricerca immobili
Vendita di case e appartamenti in Italia
Affitto di case e appartamenti in Italia
Case e appartamenti in affitto
Appartamenti in condivisione
Opportunità di investimento
Rentalia, affitto vacanze
Report dei prezzi
idealista maps
Case di lusso in vendita in Italia
Case di lusso in affitto in Italia
Hai un immobile?
Inserisci annuncio gratis
Area del proprietario
Migliora le foto del tuo annuncio
Richiedi l''attestato di prestazione energetica (APE)
Crea gratuitamente il tuo contratto di affitto
Consulta se un inquilino è moroso
Valuta gratis qualsiasi immobile
Trova le agenzie per vendere facilmente la tua casa
Segnala un inquilino moroso
Guida per vendere la tua casa
Ristrutturazione casa
Sei un professionista immobiliare?
Pubblica i tuoi immobili da professionista
Sei già cliente? Accedi al tuo account
Corsi immobiliari
Pubblicità su idealista
idealista/tools: Software gestionale immobiliare
Altri software consigliati
Registro inquilini morosi
idealista/data: tecnologia per l''analisi immobiliare
AvaiBook: software per gestire il tuo affitto vacanze
Regold: Servizi per Agenti Immobiliari
Gestionale Immobiliare miogest
Gestim: Software gestionale immobiliare
idealista
 Italiano
Tutto su idealista
Chi siamo
Perché siamo leader
Sala stampa
Lavora con noi
idealista/mutui
idealista/data
idealista/news
Aiuto
Domande frequenti (FAQ)
Contattaci
Privacy
Utilizzo dei cookie
Condizioni generali
Altri paesi
idealista Spagna
idealista Portogallo
Nel tuo cellulare o tablet
idealista Copyright © 2000-2026', '{}', '[]', NULL, false, 'nuovo', NULL, NULL, NULL, true, '2026-01-09 08:48:12.393658', '2026-01-09 08:48:12.393658', NULL, NULL, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ACQ-MK6MVVBV');
INSERT INTO public.immobili_esterni VALUES (13, 'Trilocale in vendita in Via Crocefisso, 4


Carrobbio - Cinque Vie, Milano

Vedi mappa', 'Splendido trilocale assoggettato a ristrutturazione completa.La ristrutturazione ha previsto la revisione degli spazi e il rifacimento a nuovo di impianto idraulico, elettrico, aria condizionata, tutte le pavimentazioni e i rivestimenti e finestre. L''appartamento si compone di camera padronale con bagno privato, seconda camera con bagno privato, zona giorno con cucina a vista e balcone accessibile dalla zona giorno.Molto luminoso grazie alla doppia esposizione e a 7 finestre di grandi dimensioni. L''affaccio interno garantisce silenziosità e privacy assolute.La zona centralissima offre nelle immediate vicinanze: attrazioni turistiche (Duomo a ca. 500 mt. , basilica Santa Sofia a ca. 50 mt. , Torre Velasca a ca. 200 mt. , etc) metropolitana (50 metri), bus e tram, supermercati, scuole, ristoranti, bar, farmacia, e vari negozi di prossimità.NO AGENZIA.', NULL, 'Carrobbio - Cinque Vie, Milano', 79, 730000.00, NULL, 3, 2, NULL, '3387112718', NULL, 'https://www.idealista.it/immobile/32365924/', 'idealista.it', 'Vai al contenuto principale
Immobili 
Inbox 5
Acquisizione 
Richieste 
Servizi
29
Case a Milano

11 di 14604 immobili

Precedente
Successivo
9 foto
Planimetria
Mappa

Trilocale in vendita in Via Crocefisso, 4

730.000 € 79 m2 3 locali 1º piano con ascensore

Salvapreferito
Elimina
Trilocale in vendita in Via Crocefisso, 4
Carrobbio - Cinque Vie, Milano  Vedi mappa
730.000 €
 Calcola mutuo  Confronta mutui
79 m2
3 locali
1º piano con ascensore
Salvapreferito
Elimina
Condividi
Aggiungi una nota
Segnala come contattato
Descrizione dell’inserzionista
Disponibile in Italiano English Altre lingue 

Splendido trilocale assoggettato a ristrutturazione completa.
La ristrutturazione ha previsto la revisione degli spazi e il rifacimento a nuovo di impianto idraulico, elettrico, aria condizionata, tutte le pavimentazioni e i rivestimenti e finestre.
L''appartamento si compone di camera padronale con bagno privato, seconda camera con bagno privato, zona giorno con cucina a vista e balcone accessibile dalla zona giorno.

Molto luminoso grazie alla doppia esposizione e a 7 finestre di grandi dimensioni. L''affaccio interno garantisce silenziosità e privacy assolute.

La zona centralissima offre nelle immediate vicinanze: attrazioni turistiche (Duomo a ca. 500 mt. , basilica Santa Sofia a ca. 50 mt. , Torre Velasca a ca. 200 mt. , etc) metropolitana (50 metri), bus e tram, supermercati, scuole, ristoranti, bar, farmacia, e vari negozi di prossimità.

NO AGENZIA.

Pubblicità

Caratteristiche specifiche
79 m² commerciali
3 locali
2 bagni
Balcone
Buono stato
Cantina
Classe energetica: Non indicato
Costruzione
1º piano
Con ascensore
Dotazione
Aria condizionata

Annuncio aggiornato un giorno fa

Foto
Planimetrie
 Vedi qualche errore?

Segnalacelo per poterlo correggere e aiutare anche gli altri utenti.

Facci sapere quale errore hai visto
Prezzo

Prezzo dell''immobile:
730.000 €

Prezzo al m²:
9.241 €/m²

250 €/mese di spese condominiali

Fai una controproposta

Avvisami se diminuisce il prezzo

 
Prezzo dell''immobile
 
€
Capitale iniziale
 
€
%
Durata in anni
 
Tasso d''interesse 
 
Fisso
Variabile
 
%
Importo del mutuo:
- €
La tua rata mensile:
- €
Imposte e spese non incluse
Trova mutuo Il risultato del calcolo è indicativo e non vincolante, essendo demandata ai singoli istituti finanziatori ogni valutazione sul merito creditizio del singolo utente. Condizioni generali.
Posizione
Via Crocefisso, 4
Quartiere Carrobbio - Cinque Vie
Zona Centro Storico
Milano
Milano, Milano
 Ingrandisci mappa
Statistiche
Chiedi all''inserzionista
Il tuo indirizzo mail
Il tuo telefono
+39
Il tuo nome
Aggiungi ai preferiti
 338 711 2718
Codice dell''annuncio

32365924

Privato
Stefano
 Case a Carrobbio - Cinque Vie
Servizi di idealista
Stai cercando un immobile?
Ricerca immobili
Vendita di case e appartamenti in Italia
Affitto di case e appartamenti in Italia
Case e appartamenti in affitto
Appartamenti in condivisione
Opportunità di investimento
Rentalia, affitto vacanze
Report dei prezzi
idealista maps
Case di lusso in vendita in Italia
Case di lusso in affitto in Italia
Hai un immobile?
Inserisci annuncio gratis
Area del proprietario
Migliora le foto del tuo annuncio
Richiedi l''attestato di prestazione energetica (APE)
Crea gratuitamente il tuo contratto di affitto
Consulta se un inquilino è moroso
Valuta gratis qualsiasi immobile
Trova le agenzie per vendere facilmente la tua casa
Segnala un inquilino moroso
Guida per vendere la tua casa
Ristrutturazione casa
Sei un professionista immobiliare?
Pubblica i tuoi immobili da professionista
Sei già cliente? Accedi al tuo account
Corsi immobiliari
Pubblicità su idealista
idealista/tools: Software gestionale immobiliare
Altri software consigliati
Registro inquilini morosi
idealista/data: tecnologia per l''analisi immobiliare
AvaiBook: software per gestire il tuo affitto vacanze
Regold: Servizi per Agenti Immobiliari
Gestionale Immobiliare miogest
Gestim: Software gestionale immobiliare
idealista
 Italiano
Tutto su idealista
Chi siamo
Perché siamo leader
Sala stampa
Lavora con noi
idealista/mutui
idealista/data
idealista/news
Aiuto
Domande frequenti (FAQ)
Contattaci
Privacy
Utilizzo dei cookie
Condizioni generali
Altri paesi
idealista Spagna
idealista Portogallo
Nel tuo cellulare o tablet
idealista Copyright © 2000-2026', '{}', '[]', NULL, false, 'contattato', 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent''anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un''opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile. Dal suo annuncio si notano alcune caratteristiche, come la ristrutturazione completa e la doppia esposizione, che rendono l''immobile in linea con alcune esigenze ricorrenti in questo periodo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l''immobile: una decina di minuti per ascoltare la sua situazione, vedere l''appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', '2026-01-09 09:41:42.591', NULL, true, '2026-01-09 08:45:45.119774', '2026-01-09 09:41:42.636', NULL, NULL, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 46, 'ACQ-MK6MSPP1');
INSERT INTO public.immobili_esterni VALUES (15, 'Bilocale in vendita in Via dei Grimani, 11


San Vittore - Washington, Milano

Vedi mappa', 'Ampio bilocale di 70 mq posto al piano quarto con cantina.L’appartamento è caratterizzato da ampia zona giorno con area cucina e living di circa 40mq. Camera matrimoniale, bagno padronale e bagno di servizio per ospiti. Balcone.Doppia esposizione: zona notte est, zona giorno sud-ovest.L’immobile è stato integralmente ristrutturato nel 2022 e verrà ceduto con tutto l’arredo eseguito su misura. Possibilità di adattamento a trilocale.Riscaldamento centralizzato e aria condizionata con pompa di calore.Condominio dotato di servizio portineria dalle 8 alle 13.30 dal lunedì al sabato.Ben collegato sia dalla nuova metro M4 sia da mezzi di superficie.Dotato nelle vicinanze di tutti i servizi: supermercati, ristoranti, bar, farmacie e banche.Cucina ARR ITAL CUCINETavolo BONALDOSedie CALLIGARISBagno LAGOIlluminazione CATELLANI&SMITHDivanoFinestre triplo vetro INTERNORMBox doccia cristallo.', NULL, 'San Vittore - Washington, Milano', 90, 620000.00, NULL, 2, 2, NULL, '3514371535', NULL, 'https://www.idealista.it/immobile/31133498/', 'idealista.it', 'Vai al contenuto principale
Immobili 
Inbox 6
Acquisizione 
Richieste 
Servizi
29
Case a Milano

40 di 14613 immobili

Precedente
Successivo
11 foto
Planimetria
Mappa

Bilocale in vendita in Via dei Grimani, 11

620.000 € 70 m2 2 locali 4º piano con ascensore

Salvapreferito
Elimina
Bilocale in vendita in Via dei Grimani, 11
San Vittore - Washington, Milano  Vedi mappa
620.000 € 660.000 € 6%
 Calcola mutuo  Confronta mutui
70 m2
2 locali
4º piano con ascensore
Salvapreferito
Elimina
Condividi
Aggiungi una nota
Segnala come contattato
Descrizione dell’inserzionista
Disponibile in Italiano English Altre lingue 

Ampio bilocale di 70 mq posto al piano quarto con cantina.
L’appartamento è caratterizzato da ampia zona giorno con area cucina e living di circa 40mq. Camera matrimoniale, bagno padronale e bagno di servizio per ospiti. Balcone.
Doppia esposizione: zona notte est, zona giorno sud-ovest.
L’immobile è stato integralmente ristrutturato nel 2022 e verrà ceduto con tutto l’arredo eseguito su misura. Possibilità di adattamento a trilocale.
Riscaldamento centralizzato e aria condizionata con pompa di calore.
Condominio dotato di servizio portineria dalle 8 alle 13.30 dal lunedì al sabato.
Ben collegato sia dalla nuova metro M4 sia da mezzi di superficie.
Dotato nelle vicinanze di tutti i servizi: supermercati, ristoranti, bar, farmacie e banche.

Cucina ARR ITAL CUCINE
Tavolo BONALDO
Sedie CALLIGARIS
Bagno LAGO
Illuminazione CATELLANI&SMITH
Divano
Finestre triplo vetro INTERNORM
Box doccia cristallo.

Caratteristiche specifiche
70 m² commerciali
2 locali
2 bagni
Terrazzo
Buono stato
Armadi a muro
Cantina
Orientamento est, ovest
Costruito nel 1952
Riscaldamento centralizzato: Gas
Classe energetica (Legge 90 del 2013, legislazione vigente):  (119 kWh/m² anno)
Solo l''interno della casa è adattato per persone a mobilità ridotta
Costruzione
4º piano
Con ascensore
Dotazione
Aria condizionata

Annuncio aggiornato 9 giorni fa

Foto
Sala
Vista
Camera da letto
Vedi altre 8 foto
Camera da letto
Planimetrie
Planimetria
 Vedi qualche errore?

Segnalacelo per poterlo correggere e aiutare anche gli altri utenti.

Facci sapere quale errore hai visto
Prezzo

Prezzo dell''immobile:
620.000 €

Prezzo al m²:
8.857 €/m²

200 €/mese di spese condominiali

Fai una controproposta

Avvisami se diminuisce il prezzo

 
Prezzo dell''immobile
 
€
Capitale iniziale
 
€
30%
Durata in anni
 
Tasso d''interesse 
 
Fisso
Variabile
 
%
Importo del mutuo:
434.000 €
La tua rata mensile:
1.807 €
Imposte e spese non incluse
Trova mutuo Il risultato del calcolo è indicativo e non vincolante, essendo demandata ai singoli istituti finanziatori ogni valutazione sul merito creditizio del singolo utente. Condizioni generali.
Posizione
Via dei Grimani, 11
Quartiere San Vittore - Washington
Zona Fiera - De Angeli
Milano
Milano, Milano
 Ingrandisci mappa
Statistiche

Annuncio aggiornato il 30 dicembre

349	visite
8	contatti via email
84	volte salvato come preferito
Chiedi all''inserzionista
Il tuo indirizzo mail
Il tuo telefono
+39
Il tuo nome
Aggiungi ai preferiti
 351 437 1535
Codice dell''annuncio

31133498

Danilo Giorgio Romano
 Case a San Vittore - Washington
Altri annunci simili a questo
1/
25
Attico in Via Giorgio Washington, San Vittore - Washington, Milano
690.000 €
3 locali105 m28º piano con ascensore
1/
43
Bilocale in Via Privata Procopio, San Vittore - Washington, Milano
565.000 €
2 locali60 m24º piano con ascensore
1/
25
Trilocale in Via Costanza, 37, San Vittore - Washington, Milano
685.000 €
3 locali105 m23º piano con ascensore
Servizi di idealista
Stai cercando un immobile?
Ricerca immobili
Vendita di case e appartamenti in Italia
Affitto di case e appartamenti in Italia
Case e appartamenti in affitto
Appartamenti in condivisione
Opportunità di investimento
Rentalia, affitto vacanze
Report dei prezzi
idealista maps
Case di lusso in vendita in Italia
Case di lusso in affitto in Italia
Hai un immobile?
Inserisci annuncio gratis
Area del proprietario
Migliora le foto del tuo annuncio
Richiedi l''attestato di prestazione energetica (APE)
Crea gratuitamente il tuo contratto di affitto
Consulta se un inquilino è moroso
Valuta gratis qualsiasi immobile
Trova le agenzie per vendere facilmente la tua casa
Segnala un inquilino moroso
Guida per vendere la tua casa
Ristrutturazione casa
Sei un professionista immobiliare?
Pubblica i tuoi immobili da professionista
Sei già cliente? Accedi al tuo account
Corsi immobiliari
Pubblicità su idealista
idealista/tools: Software gestionale immobiliare
Altri software consigliati
Registro inquilini morosi
idealista/data: tecnologia per l''analisi immobiliare
AvaiBook: software per gestire il tuo affitto vacanze
Regold: Servizi per Agenti Immobiliari
Gestionale Immobiliare miogest
Gestim: Software gestionale immobiliare
idealista
 Italiano
Tutto su idealista
Chi siamo
Perché siamo leader
Sala stampa
Lavora con noi
idealista/mutui
idealista/data
idealista/news
Aiuto
Domande frequenti (FAQ)
Contattaci
Privacy
Utilizzo dei', '{}', '[]', NULL, false, 'contattato', 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent''anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un''opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile. Dal suo annuncio si notano alcune caratteristiche, come la ristrutturazione completa del 2022 e la doppia esposizione, che rendono l''immobile in linea con alcune esigenze ricorrenti in questo periodo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l''immobile: una decina di minuti per ascoltare la sua situazione, vedere l''appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', '2026-01-09 10:00:49.847', NULL, true, '2026-01-09 08:51:39.044924', '2026-01-09 10:00:49.866', NULL, NULL, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 45, 'ACQ-MK6N0AS4');
INSERT INTO public.immobili_esterni VALUES (17, 'Trilocale in vendita in Via Privata Luigi Cirenei, 5


Gorla, Milano

Vedi mappa', 'Trilocale con Box auto e cantinaNO AGENZIE - Proponiamo in vendita in palazzo di recente costruzione (2008), uno splendido trilocale di 71mq posto al quarto piano con terrazzo ed ottima esposizione sud est ed affaccio libero sul parco chiuso sottostante.L''immobile è composto da ingresso con cucina a vista in ambiente unico molto luminoso con accesso ad ampio terrazzo munito di zanzariere antivento ed oscuranti e un piccolo locale lavanderia nascosto. Prosegue una camera da letto matrimoniale, cameretta dei bambini ed un bagno. Presente anche un comodo ripostiglio in quota nel corridoio.Cantina di pertinenza e box pavimentati locati al piano -2 con comodo accesso diretto all''ascensore. Box auto di 16 mq soppalcato e pavimentato in vendita separatamente a 25.000 euro.La casa si presenta in ottimo stato con impianti di aria condizionata, zanzariere e infissi con doppio vetrocamera in legno. Basse spese condominiali.La palazzina è circondata dal verde con affaccio su parco comunale in contesto molto tranquillo e in zona ampiamente fornita di tutti i servizi.La metro Gorla MM1 dista circa 10 minuti a piedi.



                
                Leggi il commento completo', NULL, 'Gorla, Milano', 90, 355000.00, NULL, 3, 1, NULL, '3407992052', NULL, 'https://www.idealista.it/immobile/34512601/', 'idealista.it', 'Vai al contenuto principale
Immobili 
Inbox 7
Acquisizione 
Richieste 
Servizi
Case a Gorla
12 foto
Planimetria
Mappa

Trilocale in vendita in Via Privata Luigi Cirenei, 5

355.000 € 71 m2 3 locali 4º piano con ascensore Box opz. 25.000 €

Salvapreferito
Elimina
Trilocale in vendita in Via Privata Luigi Cirenei, 5
Gorla, Milano  Vedi mappa
355.000 €
 Calcola mutuo  Confronta mutui
71 m2
3 locali
4º piano con ascensore
Box opz. 25.000 €
Salvapreferito
Elimina
Condividi
Aggiungi una nota
Segnala come contattato
Descrizione dell’inserzionista
Disponibile in Italiano English Altre lingue 

Trilocale con Box auto e cantina
NO AGENZIE - Proponiamo in vendita in palazzo di recente costruzione (2008), uno splendido trilocale di 71mq posto al quarto piano con terrazzo ed ottima esposizione sud est ed affaccio libero sul parco chiuso sottostante.
L''immobile è composto da ingresso con cucina a vista in ambiente unico molto luminoso con accesso ad ampio terrazzo munito di zanzariere antivento ed oscuranti e un piccolo locale lavanderia nascosto. Prosegue una camera da letto matrimoniale, cameretta dei bambini ed un bagno. Presente anche un comodo ripostiglio in quota nel corridoio.
Cantina di pertinenza e box pavimentati locati al piano -2 con comodo accesso diretto all''ascensore. Box auto di 16 mq soppalcato e pavimentato in vendita separatamente a 25.000 euro.
La casa si presenta in ottimo stato con impianti di aria condizionata, zanzariere e infissi con doppio vetrocamera in legno. Basse spese condominiali.
La palazzina è circondata dal verde con affaccio su parco comunale in contesto molto tranquillo e in zona ampiamente fornita di tutti i servizi.
La metro Gorla MM1 dista circa 10 minuti a piedi.

 Leggi il commento completo

Pubblicità

Caratteristiche specifiche
71 m² commerciali, 65 m² calpestabili
3 locali
1 bagno
Terrazzo
Box singolo a 25.000 euro in piú
Buono stato
Cantina
Orientamento sud, est
Classe energetica (Legge 90 del 2013, legislazione vigente):  (143 kWh/m² anno)
Costruzione
4º piano
Con ascensore
Dotazione
Aria condizionata

Annuncio aggiornato un giorno fa

Foto
Planimetrie
 Vedi qualche errore?

Segnalacelo per poterlo correggere e aiutare anche gli altri utenti.

Facci sapere quale errore hai visto
Prezzo

Prezzo dell''immobile:
355.000 €

Prezzo al m²:
5.000 €/m²

100 €/mese di spese condominiali

Fai una controproposta

Avvisami se diminuisce il prezzo

 
Prezzo dell''immobile
 
€
Capitale iniziale
 
€
%
Durata in anni
 
Tasso d''interesse 
 
Fisso
Variabile
 
%
Importo del mutuo:
- €
La tua rata mensile:
- €
Imposte e spese non incluse
Trova mutuo Il risultato del calcolo è indicativo e non vincolante, essendo demandata ai singoli istituti finanziatori ogni valutazione sul merito creditizio del singolo utente. Condizioni generali.
Posizione
Via Privata Luigi Cirenei, 5
Quartiere Gorla
Zona Greco - Turro
Milano
Milano, Milano
 Ingrandisci mappa
Statistiche
Chiedi all''inserzionista
Il tuo indirizzo mail
Il tuo telefono
+39
Il tuo nome
Aggiungi ai preferiti
Vedi il telefono
Codice dell''annuncio

34512601

Privato
Davide
 Case a Gorla
Servizi di idealista
Stai cercando un immobile?
Ricerca immobili
Vendita di case e appartamenti in Italia
Affitto di case e appartamenti in Italia
Case e appartamenti in affitto
Appartamenti in condivisione
Opportunità di investimento
Rentalia, affitto vacanze
Report dei prezzi
idealista maps
Case di lusso in vendita in Italia
Case di lusso in affitto in Italia
Hai un immobile?
Inserisci annuncio gratis
Area del proprietario
Migliora le foto del tuo annuncio
Richiedi l''attestato di prestazione energetica (APE)
Crea gratuitamente il tuo contratto di affitto
Consulta se un inquilino è moroso
Valuta gratis qualsiasi immobile
Trova le agenzie per vendere facilmente la tua casa
Segnala un inquilino moroso
Guida per vendere la tua casa
Ristrutturazione casa
Sei un professionista immobiliare?
Pubblica i tuoi immobili da professionista
Sei già cliente? Accedi al tuo account
Corsi immobiliari
Pubblicità su idealista
idealista/tools: Software gestionale immobiliare
Altri software consigliati
Registro inquilini morosi
idealista/data: tecnologia per l''analisi immobiliare
AvaiBook: software per gestire il tuo affitto vacanze
Regold: Servizi per Agenti Immobiliari
Gestionale Immobiliare miogest
Gestim: Software gestionale immobiliare
idealista
 Italiano
Tutto su idealista
Chi siamo
Perché siamo leader
Sala stampa
Lavora con noi
idealista/mutui
idealista/data
idealista/news
Aiuto
Domande frequenti (FAQ)
Contattaci
Privacy
Utilizzo dei cookie
Condizioni generali
Altri paesi
idealista Spagna
idealista Portogallo
Nel tuo cellulare o tablet
idealista Copyright © 2000-2026', '{}', '[]', NULL, false, 'nuovo', NULL, NULL, NULL, true, '2026-01-09 11:11:29.342553', '2026-01-09 11:12:03.774', NULL, NULL, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ACQ-MK6S04S8');


--
-- Data for Name: matching; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: notifiche; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.notifiche VALUES (1, 'richiesta_visita', 'Nuova richiesta da Idealista', 'Cliente ha richiesto informazioni', NULL, NULL, '19b230bd2c48b9bc', false, false, 1, NULL, '2026-01-09 10:51:37.985511');
INSERT INTO public.notifiche VALUES (2, 'richiesta_visita', 'Nuova richiesta da Idealista', 'Cliente ha richiesto informazioni', NULL, NULL, '19b03a4e66b0c940', false, false, 1, NULL, '2026-01-09 10:51:38.037156');
INSERT INTO public.notifiche VALUES (3, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 43, NULL, '19b9ec95d6a8f745', false, false, 1, NULL, '2026-01-09 10:52:20.083212');
INSERT INTO public.notifiche VALUES (4, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 47, NULL, '19b9dbee00e426fb', false, false, 1, NULL, '2026-01-09 10:52:20.117142');
INSERT INTO public.notifiche VALUES (5, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Ilan Boni
 Email ha richiesto informazioni', 48, NULL, '19b0c818db265b45', false, false, 1, NULL, '2026-01-09 10:52:20.140976');
INSERT INTO public.notifiche VALUES (6, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Ilan Boni
 Email ha richiesto informazioni', 49, NULL, '19b0c6fe72c6567b', false, false, 1, NULL, '2026-01-09 10:52:20.165211');
INSERT INTO public.notifiche VALUES (7, 'richiesta_visita', 'Nuova richiesta da Idealista', 'idealista ha richiesto informazioni', 50, NULL, '19aeb24180bded86', false, false, 1, NULL, '2026-01-09 10:52:20.191039');
INSERT INTO public.notifiche VALUES (8, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Ilan Boni ha richiesto informazioni', 51, NULL, '19ac604765fa5bd9', false, false, 1, NULL, '2026-01-09 10:52:20.209793');
INSERT INTO public.notifiche VALUES (9, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 52, NULL, '19aa662e25948d35', false, false, 1, NULL, '2026-01-09 10:52:20.229604');
INSERT INTO public.notifiche VALUES (10, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 51, NULL, '19a812ad7d3e61ef', false, false, 1, NULL, '2026-01-09 10:52:20.252049');
INSERT INTO public.notifiche VALUES (11, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 51, NULL, '19a681593adbcc60', false, false, 1, NULL, '2026-01-09 10:52:20.275698');
INSERT INTO public.notifiche VALUES (12, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 53, NULL, '19a547b2b9c1faf5', false, false, 1, NULL, '2026-01-09 10:52:20.297634');
INSERT INTO public.notifiche VALUES (13, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 51, NULL, '19a3720516f4f970', false, false, 1, NULL, '2026-01-09 10:52:20.317814');
INSERT INTO public.notifiche VALUES (14, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 52, NULL, '19a3172c0a0f9686', false, false, 1, NULL, '2026-01-09 10:52:20.339469');
INSERT INTO public.notifiche VALUES (15, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 51, NULL, '199f21a082c610fd', false, false, 1, NULL, '2026-01-09 10:52:20.364148');
INSERT INTO public.notifiche VALUES (16, 'richiesta_visita', 'Nuova richiesta da Idealista', 'solid ha richiesto informazioni', 60, NULL, '199b6b81c4eae01d', false, false, 1, NULL, '2026-01-09 10:52:20.401693');
INSERT INTO public.notifiche VALUES (17, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 51, NULL, '199a1998327ecce2', false, false, 1, NULL, '2026-01-09 10:52:20.423006');
INSERT INTO public.notifiche VALUES (18, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 51, NULL, '1999454deab1aceb', false, false, 1, NULL, '2026-01-09 10:52:20.444015');
INSERT INTO public.notifiche VALUES (19, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 55, NULL, '19990ac2062d52e0', false, false, 1, NULL, '2026-01-09 10:52:20.463072');
INSERT INTO public.notifiche VALUES (20, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 51, NULL, '19990857f39d84f6', false, false, 1, NULL, '2026-01-09 10:52:20.483639');
INSERT INTO public.notifiche VALUES (21, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 53, NULL, '19986dea17a175bd', false, false, 1, NULL, '2026-01-09 10:52:20.508901');
INSERT INTO public.notifiche VALUES (22, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 51, NULL, '199755a53afbcf5f', false, false, 1, NULL, '2026-01-09 10:52:20.524614');
INSERT INTO public.notifiche VALUES (23, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 51, NULL, '1996d9e20c7e3c9a', false, false, 1, NULL, '2026-01-09 10:52:20.553138');
INSERT INTO public.notifiche VALUES (24, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 52, NULL, '1996c39a2a4eda99', false, false, 1, NULL, '2026-01-09 10:52:20.573863');
INSERT INTO public.notifiche VALUES (25, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 52, NULL, '1995d3122ebbf8d1', false, false, 1, NULL, '2026-01-09 10:52:20.595482');
INSERT INTO public.notifiche VALUES (26, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 52, NULL, '1995c27b19f4a222', false, false, 1, NULL, '2026-01-09 10:52:20.615746');
INSERT INTO public.notifiche VALUES (27, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 55, NULL, '199397435aed0d6c', false, false, 1, NULL, '2026-01-09 10:52:20.635771');
INSERT INTO public.notifiche VALUES (28, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 51, NULL, '199357c5bda1d4ff', false, false, 1, NULL, '2026-01-09 10:52:20.654742');
INSERT INTO public.notifiche VALUES (29, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 51, NULL, '199308fd722b4064', false, false, 1, NULL, '2026-01-09 10:52:20.674527');
INSERT INTO public.notifiche VALUES (30, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 51, NULL, '1992e460a4ecdc38', false, false, 1, NULL, '2026-01-09 10:52:20.691576');
INSERT INTO public.notifiche VALUES (31, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 51, NULL, '1992de4b958c0df7', false, false, 1, NULL, '2026-01-09 10:52:20.712602');
INSERT INTO public.notifiche VALUES (32, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 51, NULL, '1992ddf2017729fe', false, false, 1, NULL, '2026-01-09 10:52:20.738471');
INSERT INTO public.notifiche VALUES (33, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 51, NULL, '1992dc8ab3c452d7', false, false, 1, NULL, '2026-01-09 10:52:20.759943');
INSERT INTO public.notifiche VALUES (34, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 53, NULL, '1990b3cd3392d75b', false, false, 1, NULL, '2026-01-09 10:52:20.783213');
INSERT INTO public.notifiche VALUES (35, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 56, NULL, '198d5b1d149e9936', false, false, 1, NULL, '2026-01-09 10:52:20.803062');
INSERT INTO public.notifiche VALUES (36, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 56, NULL, '198035771c099392', false, false, 1, NULL, '2026-01-09 10:52:20.835075');
INSERT INTO public.notifiche VALUES (37, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 56, NULL, '1978894a226e95e7', false, false, 1, NULL, '2026-01-09 10:52:20.855081');
INSERT INTO public.notifiche VALUES (38, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 57, NULL, '197825e17f952725', false, false, 1, NULL, '2026-01-09 10:52:20.871112');
INSERT INTO public.notifiche VALUES (39, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 57, NULL, '1977cfa21ac435f8', false, false, 1, NULL, '2026-01-09 10:52:20.890019');
INSERT INTO public.notifiche VALUES (40, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 57, NULL, '1977a960b7769b63', false, false, 1, NULL, '2026-01-09 10:52:20.905195');
INSERT INTO public.notifiche VALUES (41, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'MASSESE

Mi interessa questo immobile ha richiesto informazioni', 57, NULL, '19773c8b1a91ff6c', false, false, 1, NULL, '2026-01-09 10:52:20.92141');
INSERT INTO public.notifiche VALUES (42, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 57, NULL, '1975e3585f75dc41', false, false, 1, NULL, '2026-01-09 10:52:20.939335');
INSERT INTO public.notifiche VALUES (43, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 47, NULL, '197583d9e23618ca', false, false, 1, NULL, '2026-01-09 10:52:20.95868');
INSERT INTO public.notifiche VALUES (44, 'richiesta_visita', 'Nuova richiesta da Idealista', 'solid ha richiesto informazioni', 61, NULL, '19751e1645a2adf7', false, false, 1, NULL, '2026-01-09 10:52:20.97973');
INSERT INTO public.notifiche VALUES (45, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 57, NULL, '1974f6701a535e91', false, false, 1, NULL, '2026-01-09 10:52:20.999901');
INSERT INTO public.notifiche VALUES (46, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 57, NULL, '1974088297699599', false, false, 1, NULL, '2026-01-09 10:52:21.020761');
INSERT INTO public.notifiche VALUES (47, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 57, NULL, '1973b575bc9cc738', false, false, 1, NULL, '2026-01-09 10:52:21.046424');
INSERT INTO public.notifiche VALUES (48, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 59, NULL, '197345045e866b9e', false, false, 1, NULL, '2026-01-09 10:52:21.07244');
INSERT INTO public.notifiche VALUES (49, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 59, NULL, '196d3f47ae6c5686', false, false, 1, NULL, '2026-01-09 10:52:21.09123');
INSERT INTO public.notifiche VALUES (50, 'richiesta_visita', 'Nuova richiesta da Immobiliare.it', 'Cavour Immobiliare ha richiesto informazioni', 56, NULL, '196b5256d5920bd6', false, false, 1, NULL, '2026-01-09 10:52:21.111462');
INSERT INTO public.notifiche VALUES (51, 'richiesta_visita', 'Nuova richiesta da Idealista', 'Andrea Grassi ha richiesto visita per Prima (Via Primaticcio)', 62, 3, NULL, false, false, 1, NULL, '2026-01-09 11:04:02.264696');
INSERT INTO public.notifiche VALUES (52, 'richiesta_visita', 'Nuova richiesta da Idealista', 'Sonia Semeraro ha richiesto visita per Prima (Via Primaticcio) - Domani mattina', 63, 3, NULL, false, false, 1, NULL, '2026-01-09 11:04:37.619885');


--
-- Data for Name: oauth_tokens; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: portali_immobile; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: richieste; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: scheduled_bot_messages; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: storico_prezzo; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: whatsapp_campaigns; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.whatsapp_campaigns VALUES (1, 'Invio messaggi acquisizione', 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent''anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un''opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile in {{via}}.
Caratteristiche come {{caratteristiche}} sono oggi molto richieste da chi cerca immobili con potenzialità immediate, sia in termini di rendimento sia di stabilità del valore nel tempo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l''immobile: una decina di minuti per ascoltare la sua situazione, vedere l''appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', 'IDENTITÀ BOT:
- Nome: Assistente del Dott. Ilan Boni
- Presentazione: "Sono l''assistente del Dott. Ilan Boni."
- Background: Il Dott. Boni è agente immobiliare da oltre trent''anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano.
- Posizionamento: Figura di supporto che gestisce il primo contatto, ascolta il proprietario e valuta se ha senso fissare un incontro diretto con il Dott. Boni.

OBIETTIVI:
- Primario: Fissare un appuntamento presso l''immobile con il Dott. Boni, breve e non vincolante.
- Secondario: Lasciare un''ottima impressione, creare fiducia, posizionare il Dott. Boni come riferimento per dubbi futuri.

REGOLE DI COMPORTAMENTO:
1. Dare sempre del Lei.
2. Essere empatico, calmo e rispettoso.
3. Ascoltare prima di rispondere.
4. Non criticare altre agenzie.
5. Non fare promesse sul risultato.
6. Non portare clienti senza aver visto l''immobile.
7. Evitare discussioni tecniche approfondite via messaggio.
8. Riportare sempre la conversazione verso la proposta di un incontro breve.
9. Chiudere sempre con gentilezza.

STILE COMUNICAZIONE:
- Formalità: Dare sempre del "Lei"
- Frasi: brevi
- Tono: calmo, istituzionale, empatico
- EVITARE: tono commerciale, promesse, pressing, linguaggio aggressivo, linguaggio troppo tecnico

STRUTTURA CONVERSAZIONE:
1. Empatia
2. Ricalco del bisogno o della preoccupazione
3. Valore dell''incontro con il Dott. Boni
4. Invito a fissare un appuntamento breve

FRASI PER APPUNTAMENTO:
- "Se per Lei può essere utile, posso fissare un breve incontro con il Dott. Boni direttamente in appartamento."
- "Il Dott. Boni può passare in dieci minuti per darle un quadro chiaro della situazione."
- "Se ha piacere, possiamo organizzare un incontro rapido in casa, così il Dott. Boni la ascolta e vede l''immobile."

SUGGERIMENTI ORARI:
- "Preferisce tardo pomeriggio o fine mattinata?"
- "Nei prossimi giorni ha un momento libero, anche breve?"

DOMANDE TECNICHE:
"Per darle una risposta seria su questo punto è necessario che il Dott. Boni veda l''immobile e capisca bene la sua situazione. Direi che può essere proprio la prima cosa da affrontare quando ci incontriamo. Le andrebbe bene fissare un breve appuntamento?"

RISPOSTA FALLBACK:
"Capisco quello che mi sta scrivendo. Per darle una risposta concreta è utile che il Dott. Boni veda l''immobile e ascolti la sua situazione. Possiamo fissare un incontro breve in appartamento, anche nei prossimi giorni?"

CHIUSURA CON APPUNTAMENTO:
- "Perfetto, allora confermo l''incontro con il Dott. Boni."
- "Grazie, appuntamento fissato con il Dott. Boni."

CHIUSURA SENZA APPUNTAMENTO:
- "Grazie per il tempo. Se dovesse avere bisogno di un confronto più avanti, può scrivermi quando vuole."
- "Capisco e rispetto la sua scelta. Rimango a disposizione per qualsiasi dubbio futuro."

FIRMA: Un cordiale saluto, l''Assistente del Dott. Ilan Boni', '{
    "no_agency_solo_privati": {
      "triggers": ["no agenzie", "no agenzia", "solo privati", "vendo da solo", "senza agenzia", "vendita privata", "vendere da privato"],
      "responses": [
        "Capisco perfettamente, molti proprietari oggi preferiscono muoversi da privati. Il punto è che gli investitori che segue il Dott. Boni non si muovono mai senza prima avere un quadro preciso dell''immobile e dei documenti. Per questo serve un breve incontro in casa: dieci minuti per ascoltare la sua situazione e capire se l''immobile rientra davvero nelle richieste che abbiamo.",
        "È comprensibile. Anche chi vende da privato spesso chiede un confronto per evitare errori o perdite di tempo. Per capire se e come possiamo esserle utili, il Dott. Boni deve vedere l''immobile e ascoltare la sua storia. Possiamo fissare un incontro breve?"
      ]
    },
    "already_agency": {
      "triggers": ["ho già un''agenzia", "mi segue un''altra agenzia", "ho un amico agente", "sono già seguito"],
      "responses": [
        "Capisco bene, ed è un segno di correttezza da parte sua. A volte però un secondo sguardo, soprattutto di un professionista che lavora molto con investitori italiani e stranieri, può dare spunti utili senza togliere nulla a chi la segue oggi. Il Dott. Boni può passare per un breve confronto in appartamento, le potrebbe essere utile?",
        "Ha fatto bene a dirlo. Non si tratta di sostituire il lavoro di nessuno, ma di offrirle un punto di vista aggiuntivo, basato sulla domanda reale che gestiamo ogni giorno. Se vuole, posso organizzare un incontro di dieci minuti con il Dott. Boni direttamente in casa."
      ]
    },
    "porta_cliente_no_mandato": {
      "triggers": ["portate clienti", "portate il cliente", "se avete un cliente", "no mandato", "senza mandato", "non pago provvigioni"],
      "responses": [
        "Capisco cosa intende. Il Dott. Boni però non porta mai un acquirente senza aver prima visto l''immobile e valutato documenti e situazione del proprietario. Non sarebbe serio né per Lei né per l''investitore. Possiamo fissare un incontro breve in casa e capire insieme se il suo immobile può rientrare nelle richieste che abbiamo.",
        "Comprendo la richiesta. Il punto è che il nostro lavoro non è accompagnare persone a caso, ma costruire trattative solide mettendo gli acquirenti in concorrenza tra loro. Per farlo serve conoscere bene l''immobile. Possiamo organizzare un appuntamento con il Dott. Boni per vedere la casa?"
      ]
    },
    "ci_penso": {
      "triggers": ["ci penso", "devo pensarci", "vediamo", "forse", "valuterò"],
      "responses": [
        "È giusto prendersi un momento. Di solito però prima di pensarci aiuta avere qualche dato concreto sulla domanda reale in zona. Il Dott. Boni può passarle dieci minuti in appartamento e darle un quadro chiaro. Vuole fissare un momento?",
        "Capisco. Un incontro breve serve proprio a chiarire i dubbi che oggi la fanno esitare. Se vuole, organizzo un appuntamento con il Dott. Boni direttamente in casa."
      ]
    }
  }', 'Gentile {{nome}},

qualche giorno fa Le ho scritto riguardo al Suo immobile in {{via}}.
Non ho ricevuto risposta e mi permetto di ricontattarLa brevemente.

Se nel frattempo ha trovato un acquirente o ha deciso di non vendere, La ringrazio comunque per il tempo.

Altrimenti, rimane valida la disponibilità del Dott. Boni per un breve incontro in appartamento, senza alcun impegno.

Può rispondere a questo messaggio o contattarci allo 02 35981509.

Un cordiale saluto,
Sara
Assistente del Dott. Ilan Boni', 3, true, 'active', 0, 0, 0, 0, NULL, NULL, NULL, '2026-01-07 08:31:41.563709');


--
-- Data for Name: whatsapp_conversations; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.whatsapp_conversations VALUES (12, '3471887993', NULL, NULL, NULL, 'Gentile Proprietario,
sono l’assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da ', '2025-12-22 09:33:44', 0, 'attivo', '2026-01-08 18:53:15.856307', '2026-01-08 18:53:15.856307');
INSERT INTO public.whatsapp_conversations VALUES (13, '393279237352', NULL, NULL, NULL, 'Gentile Proprietario,
sono l’assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da ', '2025-12-22 09:33:42', 0, 'attivo', '2026-01-08 18:53:15.86689', '2026-01-08 18:53:15.86689');
INSERT INTO public.whatsapp_conversations VALUES (14, '393203780814', NULL, NULL, NULL, 'Gentile Cliente,

la contatto in quanto, di recente, ha richiesto informazioni su un immobile in ven', '2025-12-18 07:59:37', 0, 'attivo', '2026-01-08 18:53:15.877098', '2026-01-08 18:53:15.877098');
INSERT INTO public.whatsapp_conversations VALUES (15, '393389290575', NULL, NULL, NULL, 'Gentile Cliente,

la contatto in quanto, di recente, ha richiesto informazioni su un immobile in ven', '2025-12-18 07:59:35', 0, 'attivo', '2026-01-08 18:53:15.886134', '2026-01-08 18:53:15.886134');
INSERT INTO public.whatsapp_conversations VALUES (3, '393283645648', NULL, NULL, NULL, 'Buongiorno Sig.ra Ascari, di seguito le invio il link di visualizzazione dell''immobile di Via Castal', '2026-01-08 10:12:23.927', 0, 'attivo', '2026-01-08 10:12:21.24264', '2026-01-08 10:12:23.927');
INSERT INTO public.whatsapp_conversations VALUES (4, '3471027019', 40, 3, 'Giovanni Troina', 'Gent.mo Sig. Troina,

la contatto in quanto, recentemente, abbiamo organizzato un sopralluogo presso', '2026-01-08 12:25:04.539', 0, 'attivo', '2026-01-08 12:25:04.541145', '2026-01-08 12:25:04.541145');
INSERT INTO public.whatsapp_conversations VALUES (16, '393209271589', NULL, NULL, NULL, 'Gentile Cliente,

la contatto in quanto, di recente, ha richiesto informazioni su un immobile in ven', '2025-12-18 07:59:33', 0, 'attivo', '2026-01-08 18:53:15.895605', '2026-01-08 18:53:15.895605');
INSERT INTO public.whatsapp_conversations VALUES (17, '393454495643', NULL, NULL, NULL, 'Gentile Cliente,

la contatto in quanto, di recente, ha richiesto informazioni su un immobile in ven', '2025-12-18 07:59:31', 0, 'attivo', '2026-01-08 18:53:15.906269', '2026-01-08 18:53:15.906269');
INSERT INTO public.whatsapp_conversations VALUES (18, '393332900817', NULL, NULL, NULL, 'Gentile Cliente,

la contatto in quanto, di recente, ha richiesto informazioni su un immobile in ven', '2025-12-18 07:59:30', 0, 'attivo', '2026-01-08 18:53:15.915021', '2026-01-08 18:53:15.915021');
INSERT INTO public.whatsapp_conversations VALUES (19, '393356138712', NULL, NULL, NULL, 'Gentile Cliente,

la contatto in quanto, di recente, ha richiesto informazioni su un immobile in ven', '2025-12-18 07:59:28', 0, 'attivo', '2026-01-08 18:53:15.924774', '2026-01-08 18:53:15.924774');
INSERT INTO public.whatsapp_conversations VALUES (20, '393339211552', NULL, NULL, NULL, 'Gentile Cliente,

la contatto in quanto, di recente, ha richiesto informazioni su un immobile in ven', '2025-12-18 07:59:26', 0, 'attivo', '2026-01-08 18:53:15.935191', '2026-01-08 18:53:15.935191');
INSERT INTO public.whatsapp_conversations VALUES (29, '3427615185', 62, NULL, 'Andrea Grassi', 'Buongiorno Andrea, in riferimento alla richiesta di visita dell''appartamento di Via Primaticcio, le ', '2026-01-09 11:19:48.172', 0, 'attivo', '2026-01-09 11:19:48.173074', '2026-01-09 11:19:48.173074');
INSERT INTO public.whatsapp_conversations VALUES (7, '393407992052', 41, NULL, 'I', 'Grazie per il messaggio. Se ha clienti li puó portare. Non diamo provvigioni e mandati', '2026-01-09 08:30:54.943', 0, 'attivo', '2026-01-08 15:42:20.910783', '2026-01-09 08:31:06.782');
INSERT INTO public.whatsapp_conversations VALUES (30, '393427615185', 62, NULL, 'Andrea', 'Ok', '2026-01-09 13:33:44.127', 1, 'attivo', '2026-01-09 11:19:49.373309', '2026-01-09 13:33:44.127');
INSERT INTO public.whatsapp_conversations VALUES (24, '393475876090', 44, NULL, NULL, 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da ', '2026-01-09 09:40:34.807', 0, 'attivo', '2026-01-09 09:40:34.808417', '2026-01-09 09:40:34.808417');
INSERT INTO public.whatsapp_conversations VALUES (25, '393387112718', 46, NULL, NULL, 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da ', '2026-01-09 09:41:43.591', 0, 'attivo', '2026-01-09 09:41:43.592305', '2026-01-09 09:41:43.592305');
INSERT INTO public.whatsapp_conversations VALUES (28, '393661324861', 63, NULL, 'Sonia', 'Grazie mille a domenica', '2026-01-09 13:34:25.243', 1, 'attivo', '2026-01-09 11:16:39.309921', '2026-01-09 13:34:25.243');
INSERT INTO public.whatsapp_conversations VALUES (26, '393514371535', 45, NULL, NULL, 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da ', '2026-01-09 10:00:49.89', 0, 'attivo', '2026-01-09 10:00:49.884447', '2026-01-09 10:00:49.89');
INSERT INTO public.whatsapp_conversations VALUES (23, '393897895209', 43, NULL, 'Bruni', 'Perfetto. Le confermo appuntamento di mercoledì 14/1, ore 18, in Via Primaticcio 90. Le auguro una b', '2026-01-09 10:51:11.456', 0, 'attivo', '2026-01-09 08:34:55.224348', '2026-01-09 10:51:11.456');
INSERT INTO public.whatsapp_conversations VALUES (27, '3661324861', 63, NULL, 'Sonia Semeraro', 'Buongiorno Sig.ra Semeraro, purtroppo fra oggi e il week end la proprietà sarà all''interno dell''appa', '2026-01-09 11:16:38.39', 0, 'attivo', '2026-01-09 11:16:38.390698', '2026-01-09 11:16:38.390698');
INSERT INTO public.whatsapp_conversations VALUES (10, '393402614687', NULL, NULL, NULL, 'Gent.ma Sig.ra Artuso,

Ho ricevuto la sua richiesta per visitare l’immobile di Via Primaticcio.

Se', '2026-01-01 21:13:05', 0, 'attivo', '2026-01-08 18:53:15.75033', '2026-01-08 18:53:15.75033');


--
-- Data for Name: whatsapp_messages; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.whatsapp_messages VALUES (24, 7, '659', 'outbound', 'chat', 'prova', NULL, 'device', NULL, '2026-01-08 18:53:15.429998');
INSERT INTO public.whatsapp_messages VALUES (25, 7, '658', 'outbound', 'chat', 'prova', NULL, 'device', NULL, '2026-01-08 18:53:15.443076');
INSERT INTO public.whatsapp_messages VALUES (26, 7, '657', 'outbound', 'chat', 'prova', NULL, 'device', NULL, '2026-01-08 18:53:15.462355');
INSERT INTO public.whatsapp_messages VALUES (8, 3, '3EB091A7B1990DBDC3FA08', 'outbound', 'chat', 'Buongiorno Sig.ra Ascari, di seguito le invio il link di visualizzazione dell''immobile di Via Castaldi. L''appartamento sarà disponibile per la locazione a partire dalla terza settimana di Gennaio. Ps: purtroppo le foto mi sono state date dalla proprietaria e non rendono giustizia a un appartamento che è proprio una chicca.  Mi dica se vuole che lo faccia vedere alla sua amica in anteprima. Un caro saluto e spero a presto. Ilan Boni - https://www.immobiliare.it/annunci/112971065', NULL, 'sent', NULL, '2026-01-08 10:12:23.931905');
INSERT INTO public.whatsapp_messages VALUES (7, 3, '660', 'outbound', 'text', 'Buongiorno Sig.ra Ascari, di seguito le invio il link di visualizzazione dell''immobile di Via Castaldi. L''appartamento sarà disponibile per la locazione a partire dalla terza settimana di Gennaio. Ps: purtroppo le foto mi sono state date dalla proprietaria e non rendono giustizia a un appartamento che è proprio una chicca.  Mi dica se vuole che lo faccia vedere alla sua amica in anteprima. Un caro saluto e spero a presto. Ilan Boni - https://www.immobiliare.it/annunci/112971065', NULL, 'delivered', '2026-01-08 10:12:26.407', '2026-01-08 10:12:21.26996');
INSERT INTO public.whatsapp_messages VALUES (10, 4, NULL, 'outbound', 'text', 'Gent.mo Sig. Troina,

la contatto in quanto, recentemente, abbiamo organizzato un sopralluogo presso un trilocale sito in Via Primaticcio 90.

In merito a questo immobile, la proprietà, non avendolo ancora venduto, ha deciso di abbassare la richiesta economica.

Le invio, di seguito, il link dell''immobile e rimango a disposizione per effettuare un nuovo sopralluogo oppure per fornirle eventuali informazioni.

Le inoltro di seguito il link dell''appartamento e porgo cordiali saluti,

Ilan Boni - Cavour Immobiliare

https://www.immobiliare.it/annunci/125738855/', NULL, 'sent', NULL, '2026-01-08 12:25:04');
INSERT INTO public.whatsapp_messages VALUES (13, 7, 'test123', 'inbound', 'text', 'Test webhook', NULL, 'received', NULL, '2026-01-08 15:42:20.929426');
INSERT INTO public.whatsapp_messages VALUES (14, 7, 'test789', 'inbound', 'text', 'Test fix webhook', NULL, 'received', NULL, '2026-01-08 15:43:48.740331');
INSERT INTO public.whatsapp_messages VALUES (15, 7, 'testlocale789', 'inbound', 'chat', 'Test messaggio locale', NULL, 'received', NULL, '2026-01-08 18:07:07.827859');
INSERT INTO public.whatsapp_messages VALUES (16, 7, 'outbound_phone_test_123', 'outbound', 'chat', 'Messaggio inviato dal telefono', NULL, 'sent', NULL, '2026-01-08 18:44:21.806613');
INSERT INTO public.whatsapp_messages VALUES (17, 7, '667', 'outbound', 'chat', 'Test finale - rispondi CIAO', NULL, 'device', NULL, '2026-01-08 18:53:15.322644');
INSERT INTO public.whatsapp_messages VALUES (18, 7, '666', 'outbound', 'chat', 'Test webhook - rispondi OK', NULL, 'device', NULL, '2026-01-08 18:53:15.343129');
INSERT INTO public.whatsapp_messages VALUES (19, 7, '665', 'outbound', 'chat', 'Secondo test - rispondi a questo messaggio per verificare il webhook', NULL, 'device', NULL, '2026-01-08 18:53:15.359228');
INSERT INTO public.whatsapp_messages VALUES (20, 7, '664', 'outbound', 'chat', 'Test nuova istanza 87870 - ImmoGest', NULL, 'device', NULL, '2026-01-08 18:53:15.375267');
INSERT INTO public.whatsapp_messages VALUES (21, 7, '663', 'outbound', 'chat', 'Ciao', NULL, 'device', NULL, '2026-01-08 18:53:15.390546');
INSERT INTO public.whatsapp_messages VALUES (22, 7, '662', 'outbound', 'chat', 'WhatsApp API on UltraMsg.com works good', NULL, 'device', NULL, '2026-01-08 18:53:15.403506');
INSERT INTO public.whatsapp_messages VALUES (48, 10, '635', 'outbound', 'chat', 'Gent.ma Sig.ra Artuso,

Ho ricevuto la sua richiesta per visitare l’immobile di Via Primaticcio.

Se gentilmente mi volesse fornire qualche sua disponibilità, sarò felice di organizzare un sopralluogo.

Rimango in attesa di un suo riscontro e colgo l’occasione per augurarle un felice 2026.

Ilan Boni - Cavour Immobiliare', NULL, 'device', NULL, '2026-01-08 18:53:15.752495');
INSERT INTO public.whatsapp_messages VALUES (85, 30, '3EB098CE66ACF3EF166E9B', 'outbound', 'chat', 'Buongiorno Andrea, in riferimento alla richiesta di visita dell''appartamento di Via Primaticcio, le chiedo di darmi un paio di disponibilità al fine di organizzare un sopralluogo. Fra oggi e il week end la proprietà sarà all''interno dell''appartamento per sgomberare un po'' di arredo ed oggetti. Volendo potremmo provare già domenica mattina. In alternativa attendo qualche sua disponibilità. Rimango in attesa e le auguro una buona giornata. Ilan Boni - Cavour Immobiliare', NULL, 'sent', NULL, '2026-01-09 11:19:49.376756');
INSERT INTO public.whatsapp_messages VALUES (57, 12, '626', 'outbound', 'chat', 'Gentile Proprietario,
sono l’assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent’anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un’opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile in Francesco Ferrucci, 1.
Caratteristiche come il bilocale ristrutturato, la tranquillità, la climatizzazione caldo/freddo sono oggi molto richieste da chi cerca immobili con potenzialità immediate, sia in termini di rendimento sia di stabilità del valore nel tempo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l’immobile: una decina di minuti per ascoltare la sua situazione, vedere l’appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', NULL, 'device', NULL, '2026-01-08 18:53:15.859525');
INSERT INTO public.whatsapp_messages VALUES (58, 13, '625', 'outbound', 'chat', 'Gentile Proprietario,
sono l’assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent’anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un’opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile in Andrea Solari.
Caratteristiche come l''aria condizionata, la luminosità, il balcone sono oggi molto richieste da chi cerca immobili con potenzialità immediate, sia in termini di rendimento sia di stabilità del valore nel tempo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l’immobile: una decina di minuti per ascoltare la sua situazione, vedere l’appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', NULL, 'device', NULL, '2026-01-08 18:53:15.869469');
INSERT INTO public.whatsapp_messages VALUES (59, 14, '624', 'outbound', 'chat', 'Gentile Cliente,

la contatto in quanto, di recente, ha richiesto informazioni su un immobile in vendita Via Guido d''Arezzo.

L''immobile è stato venduto.

Qualora volesse indicarmi i dettagli della sua ricerca, sarò felice di inserirla nel database ed avvisarla, in anteprima, sull''uscita di nuovi immobili in linea con le sue preferenze.

Colgo l''occasione per augurarle un buon Natale e un 2026 ricco di soddisfazioni.

Ilan Boni - Cavour Immobiliare', NULL, 'device', NULL, '2026-01-08 18:53:15.879645');
INSERT INTO public.whatsapp_messages VALUES (60, 15, '623', 'outbound', 'chat', 'Gentile Cliente,

la contatto in quanto, di recente, ha richiesto informazioni su un immobile in vendita Via Guido d''Arezzo.

L''immobile è stato venduto.

Qualora volesse indicarmi i dettagli della sua ricerca, sarò felice di inserirla nel database ed avvisarla, in anteprima, sull''uscita di nuovi immobili in linea con le sue preferenze.

Colgo l''occasione per augurarle un buon Natale e un 2026 ricco di soddisfazioni.

Ilan Boni - Cavour Immobiliare', NULL, 'device', NULL, '2026-01-08 18:53:15.888586');
INSERT INTO public.whatsapp_messages VALUES (61, 16, '622', 'outbound', 'chat', 'Gentile Cliente,

la contatto in quanto, di recente, ha richiesto informazioni su un immobile in vendita Via Guido d''Arezzo.

L''immobile è stato venduto.

Qualora volesse indicarmi i dettagli della sua ricerca, sarò felice di inserirla nel database ed avvisarla, in anteprima, sull''uscita di nuovi immobili in linea con le sue preferenze.

Colgo l''occasione per augurarle un buon Natale e un 2026 ricco di soddisfazioni.

Ilan Boni - Cavour Immobiliare', NULL, 'device', NULL, '2026-01-08 18:53:15.898404');
INSERT INTO public.whatsapp_messages VALUES (62, 17, '621', 'outbound', 'chat', 'Gentile Cliente,

la contatto in quanto, di recente, ha richiesto informazioni su un immobile in vendita Via Guido d''Arezzo.

L''immobile è stato venduto.

Qualora volesse indicarmi i dettagli della sua ricerca, sarò felice di inserirla nel database ed avvisarla, in anteprima, sull''uscita di nuovi immobili in linea con le sue preferenze.

Colgo l''occasione per augurarle un buon Natale e un 2026 ricco di soddisfazioni.

Ilan Boni - Cavour Immobiliare', NULL, 'device', NULL, '2026-01-08 18:53:15.908658');
INSERT INTO public.whatsapp_messages VALUES (63, 18, '620', 'outbound', 'chat', 'Gentile Cliente,

la contatto in quanto, di recente, ha richiesto informazioni su un immobile in vendita Via Guido d''Arezzo.

L''immobile è stato venduto.

Qualora volesse indicarmi i dettagli della sua ricerca, sarò felice di inserirla nel database ed avvisarla, in anteprima, sull''uscita di nuovi immobili in linea con le sue preferenze.

Colgo l''occasione per augurarle un buon Natale e un 2026 ricco di soddisfazioni.

Ilan Boni - Cavour Immobiliare', NULL, 'device', NULL, '2026-01-08 18:53:15.91777');
INSERT INTO public.whatsapp_messages VALUES (64, 19, '619', 'outbound', 'chat', 'Gentile Cliente,

la contatto in quanto, di recente, ha richiesto informazioni su un immobile in vendita Via Guido d''Arezzo.

L''immobile è stato venduto.

Qualora volesse indicarmi i dettagli della sua ricerca, sarò felice di inserirla nel database ed avvisarla, in anteprima, sull''uscita di nuovi immobili in linea con le sue preferenze.

Colgo l''occasione per augurarle un buon Natale e un 2026 ricco di soddisfazioni.

Ilan Boni - Cavour Immobiliare', NULL, 'device', NULL, '2026-01-08 18:53:15.927818');
INSERT INTO public.whatsapp_messages VALUES (65, 20, '618', 'outbound', 'chat', 'Gentile Cliente,

la contatto in quanto, di recente, ha richiesto informazioni su un immobile in vendita Via Guido d''Arezzo.

L''immobile è stato venduto.

Qualora volesse indicarmi i dettagli della sua ricerca, sarò felice di inserirla nel database ed avvisarla, in anteprima, sull''uscita di nuovi immobili in linea con le sue preferenze.

Colgo l''occasione per augurarle un buon Natale e un 2026 ricco di soddisfazioni.

Ilan Boni - Cavour Immobiliare', NULL, 'device', NULL, '2026-01-08 18:53:15.93811');
INSERT INTO public.whatsapp_messages VALUES (67, 7, '2A80C51F4A7B5845F548', 'outbound', 'chat', 'Riproviamo dai!', NULL, 'delivered', '2026-01-08 19:21:20.961', '2026-01-08 19:21:19.237717');
INSERT INTO public.whatsapp_messages VALUES (68, 7, '3ACCF6EC6E8BD5BDAD0B', 'inbound', 'chat', 'Evviva!!', NULL, 'received', NULL, '2026-01-08 19:22:24.95221');
INSERT INTO public.whatsapp_messages VALUES (69, 7, '3EB0F569B41549253C8100', 'outbound', 'chat', 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent''anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un''opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile in Via Torino. Dal suo annuncio si notano alcune caratteristiche, come la ristrutturazione completa e la presenza del balcone, che rendono l''immobile in linea con alcune esigenze ricorrenti in questo periodo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l''immobile: una decina di minuti per ascoltare la sua situazione, vedere l''appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', NULL, 'sent', NULL, '2026-01-09 08:29:53.472152');
INSERT INTO public.whatsapp_messages VALUES (70, 7, '3AB6386B5BC7836A85A1', 'inbound', 'chat', 'Grazie per il messaggio. Se ha clienti li puó portare. Non diamo provvigioni e mandati', NULL, 'received', NULL, '2026-01-09 08:30:54.95686');
INSERT INTO public.whatsapp_messages VALUES (72, 23, '3EB0BFAF94731A389FF9EF', 'outbound', 'chat', 'Buongiorno Sig.ra Della Mura,

ho ricevuto la sua richiesta di visita per l''immobile di Via Primaticcio.

Se mi volesse dare qualche sua disponibilità procedo volentieri con il fissare un sopralluogo.

Rimango in attesa di un suo riscontro e le auguro una buona giornata.

Ilan Boni - Cavour Immobiliare', NULL, 'sent', NULL, '2026-01-09 08:34:55.227931');
INSERT INTO public.whatsapp_messages VALUES (73, 23, '3A6A05135A9D12710261', 'inbound', 'chat', 'Salve buon giorno io potrei domani  o mercoledì prossimo', NULL, 'received', NULL, '2026-01-09 08:49:39.770876');
INSERT INTO public.whatsapp_messages VALUES (75, 23, '3EB052EB583A818E9C18B6', 'outbound', 'chat', 'Grazie per la risposta. Stanno cominciando a togliere alcuni mobili e a riordinare un po'' e immagino che domani cisarà un po'' di confusione all''interno dell''appartamento. Mercoledì andrebbe benissimo. Potrebbe andare bene in pausa pranzo oppure dopo le 18?', NULL, 'sent', NULL, '2026-01-09 09:30:16.519409');
INSERT INTO public.whatsapp_messages VALUES (74, 23, '670', 'outbound', 'text', 'Grazie per la risposta. Stanno cominciando a togliere alcuni mobili e a riordinare un po'' e immagino che domani cisarà un po'' di confusione all''interno dell''appartamento. Mercoledì andrebbe benissimo. Potrebbe andare bene in pausa pranzo oppure dopo le 18?', NULL, 'delivered', '2026-01-09 09:30:18.148', '2026-01-09 09:30:14.546631');
INSERT INTO public.whatsapp_messages VALUES (76, 24, '3EB07F7D785B58F1B0C583', 'outbound', 'chat', 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent''anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un''opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile. Dal suo annuncio si notano alcune caratteristiche, come la doppia esposizione e la ristrutturazione, che rendono l''immobile in linea con alcune esigenze ricorrenti in questo periodo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l''immobile: una decina di minuti per ascoltare la sua situazione, vedere l''appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', NULL, 'sent', NULL, '2026-01-09 09:40:34.812715');
INSERT INTO public.whatsapp_messages VALUES (77, 25, '3EB03F348F3A251824ACCF', 'outbound', 'chat', 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent''anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un''opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile. Dal suo annuncio si notano alcune caratteristiche, come la ristrutturazione completa e la doppia esposizione, che rendono l''immobile in linea con alcune esigenze ricorrenti in questo periodo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l''immobile: una decina di minuti per ascoltare la sua situazione, vedere l''appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', NULL, 'sent', NULL, '2026-01-09 09:41:43.596511');
INSERT INTO public.whatsapp_messages VALUES (78, 23, '3AF6A7433D74E478A648', 'inbound', 'chat', 'Alle 18 potrebbe andar bene', NULL, 'received', NULL, '2026-01-09 09:43:25.347987');
INSERT INTO public.whatsapp_messages VALUES (79, 26, '674', 'outbound', 'chat', 'Gentile Proprietario,
sono l''assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent''anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un''opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile. Dal suo annuncio si notano alcune caratteristiche, come la ristrutturazione completa del 2022 e la doppia esposizione, che rendono l''immobile in linea con alcune esigenze ricorrenti in questo periodo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l''immobile: una decina di minuti per ascoltare la sua situazione, vedere l''appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni', NULL, 'sent', NULL, '2026-01-09 10:00:49.887702');
INSERT INTO public.whatsapp_messages VALUES (93, 30, '2A564917E378919E5358', 'inbound', 'chat', 'Ok', NULL, 'received', NULL, '2026-01-09 13:33:44.144076');
INSERT INTO public.whatsapp_messages VALUES (84, 29, '677', 'outbound', 'text', 'Buongiorno Andrea, in riferimento alla richiesta di visita dell''appartamento di Via Primaticcio, le chiedo di darmi un paio di disponibilità al fine di organizzare un sopralluogo. Fra oggi e il week end la proprietà sarà all''interno dell''appartamento per sgomberare un po'' di arredo ed oggetti. Volendo potremmo provare già domenica mattina. In alternativa attendo qualche sua disponibilità. Rimango in attesa e le auguro una buona giornata. Ilan Boni - Cavour Immobiliare', NULL, 'delivered', '2026-01-09 11:19:52.522', '2026-01-09 11:19:48.187534');
INSERT INTO public.whatsapp_messages VALUES (81, 23, '3EB0D3F47E7B6A7736A633', 'outbound', 'chat', 'Perfetto. Le confermo appuntamento di mercoledì 14/1, ore 18, in Via Primaticcio 90. Le auguro una buona giornata e un buon week end. Ilan Boni - Cavour Immobiliare', NULL, 'sent', NULL, '2026-01-09 10:51:11.494697');
INSERT INTO public.whatsapp_messages VALUES (86, 28, 'AC4C312F2B6DA62A3FED4CCC45B2D28D', 'inbound', 'chat', 'Va benissimo alle 10 di domenica. Abitiamo nello stesso cortile', NULL, 'received', NULL, '2026-01-09 11:21:07.923479');
INSERT INTO public.whatsapp_messages VALUES (80, 23, '675', 'outbound', 'text', 'Perfetto. Le confermo appuntamento di mercoledì 14/1, ore 18, in Via Primaticcio 90. Le auguro una buona giornata e un buon week end. Ilan Boni - Cavour Immobiliare', NULL, 'delivered', '2026-01-09 10:51:14.202', '2026-01-09 10:51:09.460643');
INSERT INTO public.whatsapp_messages VALUES (83, 28, '3EB0A0D354786CF5A0C170', 'outbound', 'chat', 'Buongiorno Sig.ra Semeraro, purtroppo fra oggi e il week end la proprietà sarà all''interno dell''appartamento per sgomberare qualche arredo ed oggetti. Possiamo provare domenica mattina, se vi andasse bene, con il rischio che l''appartamento sia un po'' disordinato. Potrei alle 10. In alternativa la prossima settimana ho l''agenda abbastanza libera quindi se volesse indicarmi un paio di slot sarò felice di fissare l''appuntamento. Rimango a disposizione e le auguro una buona giornata. Ilan Boni - Cavour Immobiliare', NULL, 'sent', NULL, '2026-01-09 11:16:39.316534');
INSERT INTO public.whatsapp_messages VALUES (87, 30, '2A852094881A97E52444', 'inbound', 'chat', 'Buongiorno, sono disponibile da lunedì a partire dalle ore 18', NULL, 'received', NULL, '2026-01-09 11:27:38.006152');
INSERT INTO public.whatsapp_messages VALUES (82, 27, '676', 'outbound', 'text', 'Buongiorno Sig.ra Semeraro, purtroppo fra oggi e il week end la proprietà sarà all''interno dell''appartamento per sgomberare qualche arredo ed oggetti. Possiamo provare domenica mattina, se vi andasse bene, con il rischio che l''appartamento sia un po'' disordinato. Potrei alle 10. In alternativa la prossima settimana ho l''agenda abbastanza libera quindi se volesse indicarmi un paio di slot sarò felice di fissare l''appuntamento. Rimango a disposizione e le auguro una buona giornata. Ilan Boni - Cavour Immobiliare', NULL, 'delivered', '2026-01-09 11:16:41.992', '2026-01-09 11:16:38.409424');
INSERT INTO public.whatsapp_messages VALUES (88, 30, '2A3BAE6CAE6DF2071E6B', 'inbound', 'chat', 'Oppure martedì dalla stessa ora', NULL, 'received', NULL, '2026-01-09 11:28:14.90173');
INSERT INTO public.whatsapp_messages VALUES (91, 28, '679', 'outbound', 'text', 'Perfetto. Glielo confermo. Ci vediamo domenica alle 10 in Via Primaticcio 90. Le auguro una buona giornata, Sonia', NULL, 'delivered', '2026-01-09 13:16:19.697', '2026-01-09 13:16:15.514162');
INSERT INTO public.whatsapp_messages VALUES (90, 30, '3EB082A4ED3F7958B22C9E', 'outbound', 'chat', 'Va benissimo lunedì alle 18. Glielo posso già confermare se per lei va ancora bene', NULL, 'sent', NULL, '2026-01-09 13:15:23.621474');
INSERT INTO public.whatsapp_messages VALUES (94, 28, 'AC88ECDF8CAC016B83D84FB4A63427AB', 'inbound', 'chat', 'Grazie mille a domenica', NULL, 'received', NULL, '2026-01-09 13:34:25.273528');
INSERT INTO public.whatsapp_messages VALUES (89, 30, '678', 'outbound', 'text', 'Va benissimo lunedì alle 18. Glielo posso già confermare se per lei va ancora bene', NULL, 'delivered', '2026-01-09 13:17:09.76', '2026-01-09 13:15:21.47069');
INSERT INTO public.whatsapp_messages VALUES (92, 28, '3EB063CBC6EF39C67A5909', 'outbound', 'chat', 'Perfetto. Glielo confermo. Ci vediamo domenica alle 10 in Via Primaticcio 90. Le auguro una buona giornata, Sonia', NULL, 'sent', NULL, '2026-01-09 13:16:17.377017');


--
-- Name: appointment_confirmations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.appointment_confirmations_id_seq', 1, false);


--
-- Name: appuntamenti_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.appuntamenti_id_seq', 1, false);


--
-- Name: attivita_cliente_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attivita_cliente_id_seq', 4, true);


--
-- Name: attivita_immobile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attivita_immobile_id_seq', 2, true);


--
-- Name: bot_conversation_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bot_conversation_logs_id_seq', 1, false);


--
-- Name: calendar_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.calendar_events_id_seq', 1, false);


--
-- Name: campaign_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.campaign_messages_id_seq', 5, true);


--
-- Name: clienti_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clienti_id_seq', 63, true);


--
-- Name: comunicazioni_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.comunicazioni_id_seq', 197, true);


--
-- Name: conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.conversations_id_seq', 1, false);


--
-- Name: documenti_immobile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.documenti_immobile_id_seq', 1, false);


--
-- Name: immobili_esterni_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.immobili_esterni_id_seq', 17, true);


--
-- Name: immobili_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.immobili_id_seq', 3, true);


--
-- Name: matching_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.matching_id_seq', 3, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.messages_id_seq', 1, false);


--
-- Name: notifiche_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifiche_id_seq', 52, true);


--
-- Name: oauth_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.oauth_tokens_id_seq', 1, false);


--
-- Name: portali_immobile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.portali_immobile_id_seq', 1, false);


--
-- Name: richieste_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.richieste_id_seq', 2, true);


--
-- Name: scheduled_bot_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.scheduled_bot_messages_id_seq', 1, false);


--
-- Name: storico_prezzo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.storico_prezzo_id_seq', 1, false);


--
-- Name: whatsapp_campaigns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.whatsapp_campaigns_id_seq', 1, true);


--
-- Name: whatsapp_conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.whatsapp_conversations_id_seq', 30, true);


--
-- Name: whatsapp_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.whatsapp_messages_id_seq', 94, true);


--
-- Name: appointment_confirmations appointment_confirmations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_confirmations
    ADD CONSTRAINT appointment_confirmations_pkey PRIMARY KEY (id);


--
-- Name: appuntamenti appuntamenti_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appuntamenti
    ADD CONSTRAINT appuntamenti_pkey PRIMARY KEY (id);


--
-- Name: attivita_cliente attivita_cliente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attivita_cliente
    ADD CONSTRAINT attivita_cliente_pkey PRIMARY KEY (id);


--
-- Name: attivita_immobile attivita_immobile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attivita_immobile
    ADD CONSTRAINT attivita_immobile_pkey PRIMARY KEY (id);


--
-- Name: bot_conversation_logs bot_conversation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_conversation_logs
    ADD CONSTRAINT bot_conversation_logs_pkey PRIMARY KEY (id);


--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: campaign_messages campaign_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_messages
    ADD CONSTRAINT campaign_messages_pkey PRIMARY KEY (id);


--
-- Name: clienti clienti_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clienti
    ADD CONSTRAINT clienti_pkey PRIMARY KEY (id);


--
-- Name: comunicazioni comunicazioni_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunicazioni
    ADD CONSTRAINT comunicazioni_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: documenti_immobile documenti_immobile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documenti_immobile
    ADD CONSTRAINT documenti_immobile_pkey PRIMARY KEY (id);


--
-- Name: immobili_esterni immobili_esterni_id_web_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.immobili_esterni
    ADD CONSTRAINT immobili_esterni_id_web_unique UNIQUE (id_web);


--
-- Name: immobili_esterni immobili_esterni_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.immobili_esterni
    ADD CONSTRAINT immobili_esterni_pkey PRIMARY KEY (id);


--
-- Name: immobili immobili_id_web_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.immobili
    ADD CONSTRAINT immobili_id_web_unique UNIQUE (id_web);


--
-- Name: immobili immobili_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.immobili
    ADD CONSTRAINT immobili_pkey PRIMARY KEY (id);


--
-- Name: matching matching_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matching
    ADD CONSTRAINT matching_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifiche notifiche_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifiche
    ADD CONSTRAINT notifiche_pkey PRIMARY KEY (id);


--
-- Name: oauth_tokens oauth_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_tokens
    ADD CONSTRAINT oauth_tokens_pkey PRIMARY KEY (id);


--
-- Name: portali_immobile portali_immobile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portali_immobile
    ADD CONSTRAINT portali_immobile_pkey PRIMARY KEY (id);


--
-- Name: richieste richieste_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.richieste
    ADD CONSTRAINT richieste_pkey PRIMARY KEY (id);


--
-- Name: scheduled_bot_messages scheduled_bot_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_bot_messages
    ADD CONSTRAINT scheduled_bot_messages_pkey PRIMARY KEY (id);


--
-- Name: storico_prezzo storico_prezzo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storico_prezzo
    ADD CONSTRAINT storico_prezzo_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_campaigns whatsapp_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_campaigns
    ADD CONSTRAINT whatsapp_campaigns_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_conversations whatsapp_conversations_phone_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_phone_number_unique UNIQUE (phone_number);


--
-- Name: whatsapp_conversations whatsapp_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_messages whatsapp_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_pkey PRIMARY KEY (id);


--
-- Name: appointment_confirmations appointment_confirmations_cliente_id_clienti_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_confirmations
    ADD CONSTRAINT appointment_confirmations_cliente_id_clienti_id_fk FOREIGN KEY (cliente_id) REFERENCES public.clienti(id) ON DELETE SET NULL;


--
-- Name: appointment_confirmations appointment_confirmations_whatsapp_message_id_whatsapp_messages; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_confirmations
    ADD CONSTRAINT appointment_confirmations_whatsapp_message_id_whatsapp_messages FOREIGN KEY (whatsapp_message_id) REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL;


--
-- Name: appuntamenti appuntamenti_cliente_id_clienti_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appuntamenti
    ADD CONSTRAINT appuntamenti_cliente_id_clienti_id_fk FOREIGN KEY (cliente_id) REFERENCES public.clienti(id) ON DELETE CASCADE;


--
-- Name: appuntamenti appuntamenti_immobile_id_immobili_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appuntamenti
    ADD CONSTRAINT appuntamenti_immobile_id_immobili_id_fk FOREIGN KEY (immobile_id) REFERENCES public.immobili(id) ON DELETE SET NULL;


--
-- Name: attivita_cliente attivita_cliente_cliente_id_clienti_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attivita_cliente
    ADD CONSTRAINT attivita_cliente_cliente_id_clienti_id_fk FOREIGN KEY (cliente_id) REFERENCES public.clienti(id) ON DELETE CASCADE;


--
-- Name: attivita_cliente attivita_cliente_immobile_id_immobili_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attivita_cliente
    ADD CONSTRAINT attivita_cliente_immobile_id_immobili_id_fk FOREIGN KEY (immobile_id) REFERENCES public.immobili(id) ON DELETE SET NULL;


--
-- Name: attivita_immobile attivita_immobile_immobile_id_immobili_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attivita_immobile
    ADD CONSTRAINT attivita_immobile_immobile_id_immobili_id_fk FOREIGN KEY (immobile_id) REFERENCES public.immobili(id) ON DELETE CASCADE;


--
-- Name: bot_conversation_logs bot_conversation_logs_campaign_message_id_campaign_messages_id_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_conversation_logs
    ADD CONSTRAINT bot_conversation_logs_campaign_message_id_campaign_messages_id_ FOREIGN KEY (campaign_message_id) REFERENCES public.campaign_messages(id) ON DELETE CASCADE;


--
-- Name: calendar_events calendar_events_cliente_id_clienti_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_cliente_id_clienti_id_fk FOREIGN KEY (cliente_id) REFERENCES public.clienti(id) ON DELETE SET NULL;


--
-- Name: calendar_events calendar_events_immobile_id_immobili_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_immobile_id_immobili_id_fk FOREIGN KEY (immobile_id) REFERENCES public.immobili(id) ON DELETE SET NULL;


--
-- Name: campaign_messages campaign_messages_campaign_id_whatsapp_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_messages
    ADD CONSTRAINT campaign_messages_campaign_id_whatsapp_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_messages campaign_messages_immobile_esterno_id_immobili_esterni_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_messages
    ADD CONSTRAINT campaign_messages_immobile_esterno_id_immobili_esterni_id_fk FOREIGN KEY (immobile_esterno_id) REFERENCES public.immobili_esterni(id) ON DELETE SET NULL;


--
-- Name: comunicazioni comunicazioni_cliente_id_clienti_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunicazioni
    ADD CONSTRAINT comunicazioni_cliente_id_clienti_id_fk FOREIGN KEY (cliente_id) REFERENCES public.clienti(id) ON DELETE CASCADE;


--
-- Name: comunicazioni comunicazioni_immobile_esterno_id_immobili_esterni_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunicazioni
    ADD CONSTRAINT comunicazioni_immobile_esterno_id_immobili_esterni_id_fk FOREIGN KEY (immobile_esterno_id) REFERENCES public.immobili_esterni(id) ON DELETE SET NULL;


--
-- Name: comunicazioni comunicazioni_immobile_id_immobili_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunicazioni
    ADD CONSTRAINT comunicazioni_immobile_id_immobili_id_fk FOREIGN KEY (immobile_id) REFERENCES public.immobili(id) ON DELETE SET NULL;


--
-- Name: comunicazioni comunicazioni_whatsapp_message_id_whatsapp_messages_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunicazioni
    ADD CONSTRAINT comunicazioni_whatsapp_message_id_whatsapp_messages_id_fk FOREIGN KEY (whatsapp_message_id) REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL;


--
-- Name: documenti_immobile documenti_immobile_immobile_id_immobili_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documenti_immobile
    ADD CONSTRAINT documenti_immobile_immobile_id_immobili_id_fk FOREIGN KEY (immobile_id) REFERENCES public.immobili(id) ON DELETE CASCADE;


--
-- Name: immobili_esterni immobili_esterni_cliente_id_clienti_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.immobili_esterni
    ADD CONSTRAINT immobili_esterni_cliente_id_clienti_id_fk FOREIGN KEY (cliente_id) REFERENCES public.clienti(id) ON DELETE SET NULL;


--
-- Name: immobili immobili_proprietario_id_clienti_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.immobili
    ADD CONSTRAINT immobili_proprietario_id_clienti_id_fk FOREIGN KEY (proprietario_id) REFERENCES public.clienti(id) ON DELETE SET NULL;


--
-- Name: matching matching_immobile_id_immobili_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matching
    ADD CONSTRAINT matching_immobile_id_immobili_id_fk FOREIGN KEY (immobile_id) REFERENCES public.immobili(id) ON DELETE CASCADE;


--
-- Name: matching matching_richiesta_id_richieste_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matching
    ADD CONSTRAINT matching_richiesta_id_richieste_id_fk FOREIGN KEY (richiesta_id) REFERENCES public.richieste(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_conversations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_conversations_id_fk FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: notifiche notifiche_cliente_id_clienti_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifiche
    ADD CONSTRAINT notifiche_cliente_id_clienti_id_fk FOREIGN KEY (cliente_id) REFERENCES public.clienti(id) ON DELETE CASCADE;


--
-- Name: notifiche notifiche_immobile_id_immobili_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifiche
    ADD CONSTRAINT notifiche_immobile_id_immobili_id_fk FOREIGN KEY (immobile_id) REFERENCES public.immobili(id) ON DELETE CASCADE;


--
-- Name: portali_immobile portali_immobile_immobile_id_immobili_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portali_immobile
    ADD CONSTRAINT portali_immobile_immobile_id_immobili_id_fk FOREIGN KEY (immobile_id) REFERENCES public.immobili(id) ON DELETE CASCADE;


--
-- Name: richieste richieste_cliente_id_clienti_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.richieste
    ADD CONSTRAINT richieste_cliente_id_clienti_id_fk FOREIGN KEY (cliente_id) REFERENCES public.clienti(id) ON DELETE CASCADE;


--
-- Name: scheduled_bot_messages scheduled_bot_messages_campaign_message_id_campaign_messages_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_bot_messages
    ADD CONSTRAINT scheduled_bot_messages_campaign_message_id_campaign_messages_id FOREIGN KEY (campaign_message_id) REFERENCES public.campaign_messages(id) ON DELETE CASCADE;


--
-- Name: scheduled_bot_messages scheduled_bot_messages_conversation_id_whatsapp_conversations_i; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_bot_messages
    ADD CONSTRAINT scheduled_bot_messages_conversation_id_whatsapp_conversations_i FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE;


--
-- Name: storico_prezzo storico_prezzo_immobile_id_immobili_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storico_prezzo
    ADD CONSTRAINT storico_prezzo_immobile_id_immobili_id_fk FOREIGN KEY (immobile_id) REFERENCES public.immobili(id) ON DELETE CASCADE;


--
-- Name: whatsapp_conversations whatsapp_conversations_cliente_id_clienti_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_cliente_id_clienti_id_fk FOREIGN KEY (cliente_id) REFERENCES public.clienti(id) ON DELETE SET NULL;


--
-- Name: whatsapp_conversations whatsapp_conversations_immobile_id_immobili_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_immobile_id_immobili_id_fk FOREIGN KEY (immobile_id) REFERENCES public.immobili(id) ON DELETE SET NULL;


--
-- Name: whatsapp_messages whatsapp_messages_conversation_id_whatsapp_conversations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_conversation_id_whatsapp_conversations_id_fk FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict MLe66HlC6cqmkTFhmckelEm4HJHroqgI7bKxUMeCkhM5mEJAR5yTOhJQBHQA3Tc

