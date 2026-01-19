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
        
        // Se non troviamo per email/telefono, cerchiamo per nome nell'oggetto o nel corpo
        if (!cliente && parsed.nomeCliente) {
          const nomeCompleto = parsed.nomeCliente.trim();
          if (nomeCompleto.length > 2) {
            const parti = nomeCompleto.split(/\s+/);
            const nome = parti[0];
            const cognome = parti.slice(1).join(" ");
            
            // Cerca cliente per nome e cognome
            const allClienti = await storage.getClienti();
            cliente = allClienti.find(c => {
              const clienteNome = (c.nome || "").toLowerCase().trim();
              const clienteCognome = (c.cognome || "").toLowerCase().trim();
              const searchNome = nome.toLowerCase();
              const searchCognome = cognome.toLowerCase();
              
              // Match esatto nome + cognome
              if (clienteNome === searchNome && clienteCognome === searchCognome) return true;
              // Match nome completo nel cognome (es: "Fabrizio Monello" in cognome)
              if (clienteCognome.includes(searchNome) && clienteCognome.includes(searchCognome)) return true;
              // Match parziale con almeno nome e parte del cognome
              if (clienteNome === searchNome && searchCognome && clienteCognome.includes(searchCognome.split(" ")[0])) return true;
              
              return false;
            });
            
            if (cliente) {
              console.log(`[EmailImportWorker] Found client by name "${nomeCompleto}": ${cliente.nome} ${cliente.cognome} (ID: ${cliente.id})`);
            }
          }
        }
        
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

          // Estrai il link della chat di Immobiliare.it se presente
          const linkMatch = parsed.testoRisposta.match(/\[LINK:\s*(https:\/\/www\.immobiliare\.it\/user\/messages\/[^\]]+)\]/i) ||
                           parsed.testoRisposta.match(/(https:\/\/www\.immobiliare\.it\/user\/messages\/[a-f0-9\-]+)/i);
          const linkChatImmobiliare = linkMatch ? linkMatch[1] : null;

          // If we now have phone, update client too - or try to find client by name
          let cliente = null;
          if (immobileEsterno.clienteId) {
            cliente = await storage.getCliente(immobileEsterno.clienteId);
          }
          
          // Se non abbiamo un cliente collegato, proviamo a cercare per nome nel mittente
          if (!cliente && parsed.mittente) {
            const nomeCompleto = parsed.mittente.trim();
            if (nomeCompleto.length > 2) {
              const parti = nomeCompleto.split(/\s+/);
              const nome = parti[0];
              const cognome = parti.slice(1).join(" ");
              
              const allClienti = await storage.getClienti();
              cliente = allClienti.find(c => {
                const clienteNome = (c.nome || "").toLowerCase().trim();
                const clienteCognome = (c.cognome || "").toLowerCase().trim();
                const searchNome = nome.toLowerCase();
                const searchCognome = cognome.toLowerCase();
                
                if (clienteNome === searchNome && clienteCognome === searchCognome) return true;
                if (clienteCognome.includes(searchNome) && clienteCognome.includes(searchCognome)) return true;
                if (clienteNome === searchNome && searchCognome && clienteCognome.includes(searchCognome.split(" ")[0])) return true;
                
                return false;
              });
              
              if (cliente) {
                console.log(`[EmailImportWorker] Found client by sender name "${nomeCompleto}": ${cliente.nome} ${cliente.cognome} (ID: ${cliente.id})`);
                // Aggiorna l'immobile esterno con il cliente trovato
                await storage.updateImmobileEsterno(immobileEsterno.id, { clienteId: cliente.id });
              }
            }
          }
          
          if (cliente) {
            // Create communication record with chat link
            let testoCompleto = `Risposta da ${parsed.portale}: ${parsed.testoRisposta.slice(0, 1000)}`;
            if (linkChatImmobiliare) {
              testoCompleto += `\n\n[LINK: ${linkChatImmobiliare}]`;
            }
            
            await storage.createComunicazione({
              clienteId: cliente.id,
              immobileEsternoId: immobileEsterno.id,
              canale: 'email',
              tipo: 'risposta',
              testo: testoCompleto,
            });
            
            // Update client contact info if missing
            if (parsed.telefonoMittente && !cliente.telefono) {
              await storage.updateCliente(cliente.id, { telefono: parsed.telefonoMittente });
            }
            if (parsed.emailMittente && !cliente.email) {
              await storage.updateCliente(cliente.id, { email: parsed.emailMittente });
            }
          }

          // Create notification
          await storage.createNotifica({
            tipo: 'risposta_form',
            titolo: `Risposta ricevuta da ${parsed.portale}`,
            messaggio: `Il proprietario di ${immobileEsterno.indirizzo || immobileEsterno.titolo} ha risposto al tuo messaggio`,
            clienteId: immobileEsterno.clienteId || cliente?.id || null,
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
