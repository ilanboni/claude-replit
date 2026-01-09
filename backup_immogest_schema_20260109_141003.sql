--
-- PostgreSQL database dump
--

\restrict dvCchcI6psyYLj1zYowOa91BozYOVSVgQ014pSwd0iocncxwUeC9EzeELAg1Jmu

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

\unrestrict dvCchcI6psyYLj1zYowOa91BozYOVSVgQ014pSwd0iocncxwUeC9EzeELAg1Jmu

