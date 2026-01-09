import { storage } from "./storage";
import { searchPortalEmails, parsePortalEmail, markAsRead, isGmailConfigured } from "./gmail-service";

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

async function importPortalEmails(): Promise<{ imported: number; errors: string[] }> {
  if (!await isGmailConfigured()) {
    console.log("[EmailImportWorker] Gmail not configured, skipping import");
    return { imported: 0, errors: ["Gmail not configured"] };
  }

  let imported = 0;
  const errors: string[] = [];

  try {
    const emails = await searchPortalEmails();
    console.log(`[EmailImportWorker] Found ${emails.length} portal emails`);

    for (const email of emails) {
      try {
        const existing = await storage.getNotificaByEmailId(email.id);
        if (existing) {
          continue;
        }

        const parsed = parsePortalEmail(email);
        
        let cliente = await storage.getClienteByEmailOrPhone(parsed.emailCliente, parsed.telefonoCliente);
        
        if (!cliente && (parsed.nomeCliente || parsed.emailCliente || parsed.telefonoCliente)) {
          const nomeCompleto = parsed.nomeCliente || "";
          const parti = nomeCompleto.split(" ");
          const nome = parti[0] || null;
          const cognome = parti.slice(1).join(" ") || null;
          
          cliente = await storage.createCliente({
            nome,
            cognome,
            email: parsed.emailCliente || null,
            telefono: parsed.telefonoCliente || null,
            tipoCliente: "compratore",
            note: `Contatto da ${parsed.portale}`,
          });
          console.log(`[EmailImportWorker] Created new client: ${cliente.nome} ${cliente.cognome}`);
        }

        let immobile: Awaited<ReturnType<typeof storage.getImmobileByIdPortale>> | undefined;
        if (parsed.riferimentoImmobile) {
          immobile = await storage.getImmobileByIdPortale(parsed.riferimentoImmobile);
        }
        
        if (!immobile && parsed.riferimentoImmobile) {
          const allImmobili = await storage.getImmobili();
          immobile = allImmobili.find(i => 
            i.idPortale?.toLowerCase().includes(parsed.riferimentoImmobile!.toLowerCase()) ||
            i.titolo?.toLowerCase().includes(parsed.riferimentoImmobile!.toLowerCase()) ||
            i.zona?.toLowerCase().includes(parsed.riferimentoImmobile!.toLowerCase())
          );
        }

        if (cliente) {
          await storage.createComunicazione({
            clienteId: cliente.id,
            immobileId: immobile?.id || null,
            canale: "email",
            tipo: "richiesta",
            contenuto: parsed.testoRichiesta,
            direzione: "in_entrata",
          });
        }

        if (cliente && immobile) {
          await storage.createRichiesta({
            clienteId: cliente.id,
            descrizioneLibera: `Richiesta visita per ${immobile.titolo || immobile.indirizzo || "immobile"}. ${parsed.testoRichiesta.slice(0, 500)}`,
            zona: immobile.zona || undefined,
          });
        }

        await storage.createNotifica({
          tipo: "richiesta_visita",
          titolo: `Nuova richiesta da ${parsed.portale}`,
          messaggio: `${parsed.nomeCliente || "Cliente"} ha richiesto informazioni${immobile ? ` per ${immobile.titolo || immobile.indirizzo}` : ""}`,
          clienteId: cliente?.id || null,
          immobileId: immobile?.id || null,
          emailId: email.id,
          priorita: 1,
        });

        await markAsRead(email.id);
        imported++;
        console.log(`[EmailImportWorker] Imported email from ${parsed.nomeCliente || parsed.emailCliente} via ${parsed.portale}`);
        
      } catch (emailError) {
        console.error(`[EmailImportWorker] Error processing email ${email.id}:`, emailError);
        errors.push(`Email ${email.id}: ${String(emailError)}`);
      }
    }
  } catch (error) {
    console.error("[EmailImportWorker] Error fetching emails:", error);
    errors.push(String(error));
  }

  return { imported, errors };
}

export function startEmailImportWorker(intervalMinutes: number = 5): void {
  if (isRunning) {
    console.log("[EmailImportWorker] Already running");
    return;
  }

  isRunning = true;
  console.log(`[EmailImportWorker] Starting worker (polling every ${intervalMinutes} minutes)`);

  importPortalEmails().catch(console.error);

  intervalId = setInterval(() => {
    importPortalEmails().catch(console.error);
  }, intervalMinutes * 60 * 1000);
}

export function stopEmailImportWorker(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  isRunning = false;
  console.log("[EmailImportWorker] Stopped");
}

export async function manualImportEmails(): Promise<{ imported: number; errors: string[] }> {
  return importPortalEmails();
}
