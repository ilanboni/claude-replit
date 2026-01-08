# ImmoGest CRM - Real Estate Management System

## Overview

ImmoGest is a professional Italian real estate CRM (Customer Relationship Management) system with integrated AI capabilities. The application manages clients, properties, buyer requests, appointments, communications, and provides automatic property-to-buyer matching powered by OpenAI.

**Core Features:**
- Client management (buyers, sellers, or both)
- Property listings with detailed attributes
- Buyer request tracking with AI-powered parsing
- Automatic property matching with scoring
- Appointment scheduling
- Communication logging
- AI coaching and suggestions
- Dark/light theme support

## User Preferences

Preferred communication style: Simple, everyday language.

**Automazioni richieste:**
- Quando l'utente fornisce un nuovo JSON per il mirroring, aggiornare automaticamente:
  1. `server/bot-config.ts` - MIRRORING_PROMPT e MIRRORING_CONFIG
  2. `server/ai-service.ts` - funzione generateMirroring
  3. `server/routes.ts` - endpoint generate-initial-message (se usa parametri diversi)

**Flusso auto-popolamento annunci:**
- `extractPropertyFacts()` in ai-service.ts estrae 18+ campi strutturati da testo annuncio (temperature 0)
- POST /api/acquisizione chiama extractPropertyFacts e popola automaticamente camere, bagni, piano, ascensore, balcone, terrazzo, cantina, arredato, box, classe energetica, zona
- I fatti estratti sono salvati in `caratteristiche.extractedFacts` per il mirroring
- Gli endpoint generate-message e generate-mirroring usano i fatti estratti per contesto AI coerente

## System Architecture

### Frontend Architecture

**Framework:** React with TypeScript, using Vite as the build tool

**Routing:** Wouter (lightweight React router)

**State Management:** TanStack React Query for server state, React Context for UI state (theme, sidebar)

**UI Components:** shadcn/ui component library built on Radix UI primitives with Tailwind CSS styling

**Design System:** Material Design inspired, following enterprise SaaS patterns with:
- Fixed left sidebar (280px) + flexible main content area
- Professional neutral color palette with blue primary accents
- Inter/Roboto typography for legibility
- Responsive grid layouts for dashboard and data views

### Backend Architecture

**Framework:** Express.js with TypeScript running on Node.js

**API Design:** RESTful JSON API with endpoints organized by domain:
- `/api/dashboard/*` - Statistics and overview data
- `/api/clienti/*` - Client CRUD operations
- `/api/immobili/*` - Property management
- `/api/richieste/*` - Buyer request handling
- `/api/appuntamenti/*` - Appointment scheduling
- `/api/comunicazioni/*` - Communication logs
- `/api/matching/*` - AI-powered property matching

**Storage Pattern:** Repository pattern with a `storage.ts` abstraction layer providing interface-based data access

### Data Storage

**Database:** PostgreSQL with Drizzle ORM

**Schema Design:** Relational model with these core entities:
- `clienti` - Clients with contact info, type (buyer/seller/both), rating
- `richieste` - Buyer requests with budget, location, property preferences
- `immobili` - Property listings with full attribute set (size, rooms, price, features)
- `comunicazioni` - Communication history linked to clients
- `appuntamenti` - Scheduled appointments with clients and properties
- `matching` - AI-generated property-to-request matches with scores
- `conversations` / `messages` - AI chat conversation storage
- `whatsapp_campaigns` - WhatsApp acquisition campaigns for private sellers
- `campaign_messages` - Individual messages sent in campaigns with tracking
- `bot_conversation_logs` - AI chatbot conversation logs with intent analysis
- `whatsapp_conversations` - Real-time WhatsApp chat conversations by phone number
- `whatsapp_messages` - Individual WhatsApp messages with delivery status tracking

**Migrations:** Managed via Drizzle Kit with `drizzle-kit push` command

### AI Integration

**Provider:** OpenAI API (via Replit AI Integrations)

**Capabilities:**
- Natural language parsing of buyer requests to structured data
- Property matching score calculation
- WhatsApp chatbot (Dott. Ilan Boni persona) for acquisition conversations
- Intent analysis and objection handling for real estate negotiations
- AI coach messaging for agent guidance
- Image generation support
- Conversational chat interface

**Integration Modules:**
- `server/ai-service.ts` - Core AI functions for CRM operations
- `server/replit_integrations/chat/` - Chat conversation management
- `server/replit_integrations/image/` - Image generation
- `server/replit_integrations/batch/` - Batch processing with rate limiting

### Build System

**Development:** Vite dev server with HMR, tsx for TypeScript execution

**Production Build:** 
- Frontend: Vite builds to `dist/public`
- Backend: esbuild bundles server code to `dist/index.cjs`
- Key dependencies are bundled to reduce cold start times

## External Dependencies

### Database
- **PostgreSQL** - Primary data store (requires `DATABASE_URL` environment variable)
- **Drizzle ORM** - Type-safe database queries and schema management
- **connect-pg-simple** - PostgreSQL session store

### AI Services
- **OpenAI API** - GPT-4o for text processing, gpt-image-1 for image generation
- Environment variables: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`

### Communication Integrations

#### UltraMsg WhatsApp Integration (Instance 87870)
**Configurazione funzionante per sincronizzazione bidirezionale:**

| Impostazione | Valore |
|--------------|--------|
| **Instance ID** | 87870 |
| **Instance Phone** | 390235981509 |
| **Webhook URL** | `https://<project-url>/api/whatsapp/webhook` |
| **Webhook on Received** | ✅ ON |
| **Webhook on Create/Send** | ✅ ON (cattura messaggi dal telefono!) |
| **Webhook on Message Ack** | ✅ ON (per stati consegna) |

**Secrets richiesti:**
- `ULTRAMSG_INSTANCE_ID` - ID istanza UltraMsg
- `ULTRAMSG_API_KEY` - Token API UltraMsg

**Endpoints WhatsApp:**
- `GET /api/whatsapp/conversations` - Lista conversazioni con clienteNome
- `GET /api/whatsapp/conversations/:id` - Dettaglio conversazione con messaggi
- `POST /api/whatsapp/send` - Invia messaggio (crea conversazione se non esiste)
- `POST /api/whatsapp/sync` - Sincronizza messaggi da UltraMsg API (polling manuale)
- `POST /api/whatsapp/webhook` - Webhook UltraMsg per ricezione real-time
- `POST /api/webhook/ultramsg` - Alias webhook (stesso handler)
- `POST /api/whatsapp/conversations/:id/read` - Segna come letta
- `DELETE /api/whatsapp/conversations/:id` - Elimina conversazione
- `WebSocket /ws/whatsapp` - Aggiornamenti real-time

**Eventi webhook gestiti:**
- `message_received` - Messaggi in arrivo dai clienti
- `message_create` - Messaggi inviati dal telefono (fromMe: true)
- `message_ack` - Stati consegna (sent, delivered, read)

**Logica di matching:**
- I messaggi vengono associati automaticamente ai clienti confrontando il numero di telefono
- Conversazioni raggruppate per clienteId nell'UI

- **Gmail** - OAuth-based email integration (architecture prepared)

### UI Libraries
- **Radix UI** - Accessible component primitives
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **Embla Carousel** - Carousel component
- **React Day Picker** - Calendar component
- **Recharts** - Charting library

### Utility Libraries
- **date-fns** - Date formatting and manipulation
- **zod** - Schema validation
- **react-hook-form** - Form handling
- **p-limit / p-retry** - Rate limiting and retry logic for API calls

## Development Notes

### Query Key Patterns for Filtered Queries
The default queryFn joins queryKey segments with "/" creating a URL path. For API calls requiring query parameters (e.g., `?clienteId=1`), use custom queryFn:
```tsx
useQuery<Richiesta[]>({
  queryKey: ["/api/richieste", "cliente", clienteId],  // Cache key
  queryFn: async () => {
    const res = await fetch(`/api/richieste?clienteId=${clienteId}`);
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  },
});
```

### Zod Coercion for Optional Fields
For forms with optional numeric/decimal fields, use preprocessing to handle empty strings, null, undefined, and NaN:
```typescript
const coerceOptionalNumber = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  },
  z.number().optional().nullable()
);
```