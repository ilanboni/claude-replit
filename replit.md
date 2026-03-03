# ImmoGest CRM - Real Estate Management System

## Overview

ImmoGest is an AI-powered professional Italian real estate CRM designed to streamline property management. It handles client relations, property listings, buyer requests, appointments, and communications. Key features include AI-driven property-to-buyer matching, natural language parsing for requests, and an integrated WhatsApp chatbot for enhanced client interaction and acquisition. The system aims to automate routine tasks, provide intelligent insights, and improve efficiency for real estate agents.

## User Preferences

Preferred communication style: Simple, everyday language.

Automazioni richieste:
- Quando l'utente fornisce un nuovo JSON per il mirroring, aggiornare automaticamente:
  1. `server/bot-config.ts` - MIRRORING_PROMPT e MIRRORING_CONFIG
  2. `server/ai-service.ts` - funzione generateMirroring
  3. `server/routes.ts` - endpoint generate-initial-message (se usa parametri diversi)

Flusso auto-popolamento annunci:
- `extractPropertyFacts()` in ai-service.ts estrae 18+ campi strutturati da testo annuncio (temperature 0)
- POST /api/acquisizione chiama extractPropertyFacts e popola automaticamente camere, bagni, piano, ascensore, balcone, terrazzo, cantina, arredato, box, classe energetica, zona
- I fatti estratti sono salvati in `caratteristiche.extractedFacts` per il mirroring
- Gli endpoint generate-message e generate-mirroring usano i fatti estratti per contesto AI coerente

## System Architecture

### Frontend Architecture

The frontend is built with React and TypeScript using Vite, Wouter for routing, and TanStack React Query for server state. UI components leverage shadcn/ui (Radix UI + Tailwind CSS) following a Material Design-inspired aesthetic with a fixed left sidebar, a neutral color palette with blue accents, and responsive layouts.

### Backend Architecture

The backend is an Express.js (Node.js, TypeScript) RESTful JSON API. It uses a repository pattern with a `storage.ts` abstraction layer for data access. Endpoints are organized by domain (e.g., `/api/clienti`, `/api/immobili`, `/api/matching`).

### Data Storage

PostgreSQL is the primary database, managed with Drizzle ORM. The schema includes core entities like `clienti`, `immobili`, `richieste`, `appuntamenti`, `comunicazioni`, `matching`, and specific tables for AI conversations, WhatsApp campaigns, market opportunities, and notifications. Drizzle Kit handles migrations.

### Opportunità di Mercato (Multi-Agency Properties)

This feature tracks properties from other agencies that might match buyer requests. Opportunities move through states (`in_valutazione`, `iter_proprietario`, `acquisito`, `scartato`), support CRUD operations, and integrate with buyer requests for matching. It includes dedicated API endpoints for listing, detail, state changes, and conversion to internal portfolio properties, along with activity and document management.

### Email Import Worker

A background worker (`server/email-import-worker.ts`) polls Gmail for portal emails (Idealista, Immobiliare.it, etc.), automatically creating clients, communication records, and visit requests, linking them to properties, and generating persistent notifications. It handles duplicate prevention and can be triggered manually.

### AI Integration

AI services power the system capabilities. The WhatsApp chatbot (Dott. Ilan Boni persona) uses **Anthropic Claude** (claude-sonnet-4-20250514) for acquisition conversations, intent analysis, and follow-up (EARA framework), handling common objections with handoff rules. **OpenAI API** (GPT-4o) is used for natural language parsing, buyer request processing, property matching, AI coaching, mirroring generation, and image generation (gpt-image-1). A persistent delay system schedules bot messages to simulate human timing. Google Calendar integration is implemented via OAuth 2.0 for event syncing.

### Build System

Vite is used for frontend development (HMR) and production builds, while esbuild bundles the backend for optimized performance.

## External Dependencies

### Database
- **PostgreSQL**
- **Drizzle ORM**
- **connect-pg-simple** (PostgreSQL session store)

### AI Services
- **Anthropic Claude** (claude-sonnet-4-20250514 for WhatsApp chatbot conversations)
- **OpenAI API** (GPT-4o for text parsing/matching/coaching, gpt-image-1 for images)

### Communication Integrations
- **UltraMsg WhatsApp Integration** (Instance 87870) for bidirectional sync, webhooks, and real-time updates.
  - Requires `ULTRAMSG_INSTANCE_ID` and `ULTRAMSG_API_KEY`.
- **Gmail** (OAuth-based integration prepared)

### UI Libraries
- **Radix UI**
- **Tailwind CSS**
- **Lucide React**
- **Embla Carousel**
- **React Day Picker**
- **Recharts**

### Utility Libraries
- **date-fns**
- **zod**
- **react-hook-form**
- **p-limit / p-retry**