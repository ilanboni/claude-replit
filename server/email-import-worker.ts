import { storage } from "./storage";
import { searchPortalEmails, parsePortalEmail, markAsRead, isGmailConfigured, searchFormResponseEmails, parseFormResponseEmail } from "./gmail-service";

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
        
        // Skip clients with invalid phone numbers (not starting with 3 or +)
        const telefono = parsed.telefonoCliente || "";
        const isInvalidPhone = telefono && /^[15]/.test(telefono);
        
        if (!cliente && (parsed.nomeCliente || parsed.emailCliente || parsed.telefonoCliente) && !isInvalidPhone) {
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
        } else if (isInvalidPhone) {
          console.log(`[EmailImportWorker] Skipping client with invalid phone: ${telefono}`);
        }

        let immobile: Awaited<ReturnType<typeof storage.getImmobileByIdPortale>> | undefined;
        let immobileEsterno: any = undefined;
        
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
        
        // Search by address in external properties (immobili_esterni) if no internal match
        if (!immobile && parsed.indirizzoImmobile) {
          const allImmobiliEsterni = await storage.getImmobiliEsterni();
          const addressNorm = parsed.indirizzoImmobile.toLowerCase().replace(/[,.\s]+/g, ' ').trim();
          
          immobileEsterno = allImmobiliEsterni.find(ie => {
            const titolo = (ie.titolo || '').toLowerCase();
            const indirizzo = (ie.indirizzo || '').toLowerCase();
            // Extract street name for matching (e.g., "via seprio" from "Via Seprio, Milano")
            const streetWords = addressNorm.split(' ').filter(w => w.length > 2);
            return streetWords.some(word => titolo.includes(word) || indirizzo.includes(word));
          });
          
          if (immobileEsterno) {
            console.log(`[EmailImportWorker] Found external property by address: ${immobileEsterno.titolo}`);
          }
        }

        if (cliente) {
          await storage.createComunicazione({
            clienteId: cliente.id,
            immobileId: immobile?.id || null,
            immobileEsternoId: immobileEsterno?.id || null,
            canale: "email",
            tipo: "richiesta",
            testo: parsed.testoRichiesta || "Richiesta informazioni via email",
          });
        }

        if (cliente && immobile) {
          const testoRichiesta = parsed.testoRichiesta || "";
          await storage.createRichiesta({
            clienteId: cliente.id,
            descrizioneLibera: `Richiesta visita per ${immobile.titolo || immobile.indirizzo || "immobile"}. ${testoRichiesta.slice(0, 500)}`,
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

  // Run both portal imports and form response imports
  manualImportEmails().catch(console.error);

  intervalId = setInterval(() => {
    manualImportEmails().catch(console.error);
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
  const portalResult = await importPortalEmails();
  const formResult = await importFormResponses();
  return {
    imported: portalResult.imported + formResult.imported,
    errors: [...portalResult.errors, ...formResult.errors],
  };
}

// Import form responses from portal emails and associate with external properties
async function importFormResponses(): Promise<{ imported: number; errors: string[] }> {
  if (!await isGmailConfigured()) {
    return { imported: 0, errors: ["Gmail not configured"] };
  }

  let imported = 0;
  const errors: string[] = [];

  try {
    const emails = await searchFormResponseEmails();
    console.log(`[EmailImportWorker] Found ${emails.length} form response emails`);

    for (const email of emails) {
      try {
        // Check if already processed
        const existing = await storage.getNotificaByEmailId(email.id);
        if (existing) {
          continue;
        }

        const parsed = parseFormResponseEmail(email);
        console.log(`[EmailImportWorker] Parsed form response from ${parsed.portale}:`, parsed.indirizzoImmobile || parsed.urlAnnuncio);
        
        // Try to match with external property
        let immobileEsterno = null;
        
        // Match by URL
        if (parsed.urlAnnuncio) {
          immobileEsterno = await storage.getImmobileEsternoByUrl(parsed.urlAnnuncio);
        }
        
        // Match by address (fuzzy)
        if (!immobileEsterno && parsed.indirizzoImmobile) {
          const allEsterni = await storage.getImmobiliEsterni();
          immobileEsterno = allEsterni.find(ie => {
            if (!ie.indirizzo) return false;
            const addr1 = ie.indirizzo.toLowerCase().replace(/[,.\-\s]+/g, ' ');
            const addr2 = parsed.indirizzoImmobile!.toLowerCase().replace(/[,.\-\s]+/g, ' ');
            return addr1.includes(addr2) || addr2.includes(addr1);
          });
        }
        
        // Match by reference number
        if (!immobileEsterno && parsed.riferimentoAnnuncio) {
          const allEsterni = await storage.getImmobiliEsterni();
          immobileEsterno = allEsterni.find(ie => 
            ie.riferimentoAnnuncio?.toLowerCase() === parsed.riferimentoAnnuncio?.toLowerCase() ||
            ie.idWeb === parsed.riferimentoAnnuncio
          );
        }

        if (immobileEsterno) {
          // Update external property: mark response received
          await storage.updateImmobileEsterno(immobileEsterno.id, {
            rispostaRicevuta: true,
            statoContatto: 'interessato',
            // Update contact info if we got new info
            ...(parsed.telefonoMittente && !immobileEsterno.contattoTelefono ? { 
              contattoTelefono: parsed.telefonoMittente,
              contattoMetodo: 'telefono'
            } : {}),
            ...(parsed.emailMittente && !immobileEsterno.contattoEmail ? { 
              contattoEmail: parsed.emailMittente 
            } : {}),
            ...(parsed.mittente && immobileEsterno.contattoNome?.startsWith('Proprietario') ? { 
              contattoNome: parsed.mittente 
            } : {}),
          });

          // If we now have phone, update client too
          if (immobileEsterno.clienteId) {
            const cliente = await storage.getCliente(immobileEsterno.clienteId);
            if (cliente) {
              // Create communication record
              await storage.createComunicazione({
                clienteId: cliente.id,
                canale: 'email',
                tipo: 'risposta',
                testo: `Risposta da ${parsed.portale}: ${parsed.testoRisposta.slice(0, 1000)}`,
              });
              
              // Update client contact info if missing
              if (parsed.telefonoMittente && !cliente.telefono) {
                await storage.updateCliente(cliente.id, { telefono: parsed.telefonoMittente });
              }
              if (parsed.emailMittente && !cliente.email) {
                await storage.updateCliente(cliente.id, { email: parsed.emailMittente });
              }
            }
          }

          // Create notification
          await storage.createNotifica({
            tipo: 'risposta_form',
            titolo: `Risposta ricevuta da ${parsed.portale}`,
            messaggio: `Il proprietario di ${immobileEsterno.indirizzo || immobileEsterno.titolo} ha risposto al tuo messaggio`,
            clienteId: immobileEsterno.clienteId || null,
            emailId: email.id,
            priorita: 1,
          });

          await markAsRead(email.id);
          imported++;
          console.log(`[EmailImportWorker] Imported form response for property: ${immobileEsterno.indirizzo}`);
        } else {
          // No match found, create generic notification
          await storage.createNotifica({
            tipo: 'risposta_form',
            titolo: `Risposta da ${parsed.portale}`,
            messaggio: `Nuova risposta ricevuta: ${parsed.testoRisposta.slice(0, 200)}`,
            emailId: email.id,
            priorita: 2,
          });
          await markAsRead(email.id);
          console.log(`[EmailImportWorker] Form response without property match from ${parsed.portale}`);
        }
      } catch (emailError) {
        console.error(`[EmailImportWorker] Error processing form response ${email.id}:`, emailError);
        errors.push(`Form response ${email.id}: ${String(emailError)}`);
      }
    }
  } catch (error) {
    console.error("[EmailImportWorker] Error fetching form response emails:", error);
    errors.push(String(error));
  }

  return { imported, errors };
}

// Combined import function that handles both portal inquiries and form responses
async function importAllEmails(): Promise<{ portalImported: number; formResponsesImported: number; errors: string[] }> {
  const portalResult = await importPortalEmails();
  const formResult = await importFormResponses();
  
  return {
    portalImported: portalResult.imported,
    formResponsesImported: formResult.imported,
    errors: [...portalResult.errors, ...formResult.errors],
  };
}
