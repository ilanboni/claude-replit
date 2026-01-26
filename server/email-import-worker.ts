import { storage } from "./storage";
import { searchPortalEmails, parsePortalEmail, markAsRead, isGmailConfigured, searchFormResponseEmails, parseFormResponseEmail, EmailMessage } from "./gmail-service";

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

// Gestisce le risposte alle email di acquisizione ("Nuovo messaggio di XXX per l'annuncio")
async function handleAcquisitionResponse(email: EmailMessage): Promise<boolean> {
  const subject = email.subject || '';
  const body = email.body || email.snippet || '';
  
  // Estrai nome mittente dall'oggetto "Nuovo messaggio di XXX per l'annuncio"
  const nameMatch = subject.match(/Nuovo messaggio di\s+([^]+?)\s+per l['']annuncio/i);
  const mittenteNome = nameMatch ? nameMatch[1].trim() : null;
  
  // Estrai titolo annuncio dall'oggetto "per l'annuncio: TITOLO"
  const titoloMatch = subject.match(/per l['']annuncio[:\s]+(.+)$/i);
  const titoloAnnuncio = titoloMatch ? titoloMatch[1].trim() : null;
  
  console.log(`[EmailImportWorker] Acquisition response from "${mittenteNome}" for "${titoloAnnuncio}"`);
  
  // Cerca l'immobile esterno corrispondente
  let immobileEsterno = null;
  if (titoloAnnuncio) {
    const allEsterni = await storage.getImmobiliEsterni();
    const searchText = titoloAnnuncio.toLowerCase().replace(/[,.\-\s]+/g, ' ');
    
    immobileEsterno = allEsterni.find(ie => {
      // Match con titolo
      if (ie.titolo) {
        const titolo = ie.titolo.toLowerCase().replace(/[,.\-\s]+/g, ' ');
        const searchWords = searchText.split(' ').filter(w => w.length > 2);
        const matchingWords = searchWords.filter(w => titolo.includes(w));
        if (matchingWords.length >= 2) return true;
        if (titolo.includes(searchText) || searchText.includes(titolo)) return true;
      }
      // Match con indirizzo
      if (ie.indirizzo) {
        const addr = ie.indirizzo.toLowerCase().replace(/[,.\-\s]+/g, ' ');
        if (searchText.includes(addr) || addr.includes(searchText)) return true;
      }
      return false;
    });
    
    if (immobileEsterno) {
      console.log(`[EmailImportWorker] Matched external property: ${immobileEsterno.titolo} (ID: ${immobileEsterno.id})`);
    }
  }
  
  // Estrai messaggio dal corpo
  let testoRisposta = '';
  const messagePatterns = [
    /(?:Messaggio|Risposta)[:\s]*([\s\S]*?)(?:Rispondi|Contatta|Vai all|Il Team|$)/i,
    /(?:ha scritto)[:\s]*([\s\S]*?)(?:Rispondi|Contatta|$)/i,
  ];
  
  for (const pattern of messagePatterns) {
    const match = body.match(pattern);
    if (match && match[1]?.trim()) {
      testoRisposta = match[1].trim().slice(0, 1000);
      break;
    }
  }
  if (!testoRisposta) {
    testoRisposta = email.snippet.slice(0, 500);
  }
  
  // Trova o aggiorna cliente
  let cliente = null;
  
  if (immobileEsterno?.clienteId) {
    cliente = await storage.getCliente(immobileEsterno.clienteId);
    
    // Aggiorna nome se generico
    if (cliente && mittenteNome) {
      const nomeAttuale = `${cliente.nome || ""} ${cliente.cognome || ""}`.trim().toLowerCase();
      const isNomeGenerico = nomeAttuale.startsWith("proprietario") || 
                             nomeAttuale === "" ||
                             nomeAttuale.includes("via ") ||
                             nomeAttuale.includes("viale ");
      
      if (isNomeGenerico) {
        const parti = mittenteNome.split(/\s+/);
        const nome = parti[0] || null;
        const cognome = parti.slice(1).join(" ") || null;
        
        if (nome) {
          await storage.updateCliente(cliente.id, { nome, cognome });
          console.log(`[EmailImportWorker] Updated client name to "${nome} ${cognome}"`);
          cliente = await storage.getCliente(cliente.id);
        }
      }
    }
  }
  
  if (immobileEsterno) {
    // Aggiorna immobile esterno: risposta ricevuta
    await storage.updateImmobileEsterno(immobileEsterno.id, {
      rispostaRicevuta: true,
      statoContatto: 'interessato',
    });
    
    if (cliente) {
      // Crea comunicazione
      await storage.createComunicazione({
        clienteId: cliente.id,
        immobileEsternoId: immobileEsterno.id,
        canale: 'email',
        tipo: 'risposta',
        testo: `Risposta da Immobiliare.it: ${testoRisposta}`,
      });
    }
    
    // Crea notifica
    await storage.createNotifica({
      tipo: 'risposta_form',
      titolo: `Risposta ricevuta da Immobiliare.it`,
      messaggio: `${mittenteNome || 'Il proprietario'} ha risposto al tuo messaggio per ${immobileEsterno.indirizzo || immobileEsterno.titolo}`,
      clienteId: cliente?.id || immobileEsterno.clienteId || null,
      emailId: email.id,
      priorita: 1,
    });
  } else {
    // Immobile non trovato - crea notifica generica
    await storage.createNotifica({
      tipo: 'risposta_form',
      titolo: `Risposta da Immobiliare.it`,
      messaggio: `${mittenteNome || 'Qualcuno'} ha risposto: ${testoRisposta.slice(0, 200)}`,
      emailId: email.id,
      priorita: 2,
    });
  }
  
  await markAsRead(email.id);
  return true;
}

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

    let skipped = 0;
    for (const email of emails) {
      try {
        const existing = await storage.getNotificaByEmailId(email.id);
        if (existing) {
          skipped++;
          continue;
        }
        console.log(`[EmailImportWorker] Processing NEW email: ${email.id} - ${email.subject?.substring(0, 60)}`);


        // Distingui tra richiesta visita e risposta acquisizione
        // "Nuovo messaggio di XXX per l'annuncio" = risposta a nostra email di acquisizione
        // "Nuovo contatto per l'annuncio XXX" = richiesta visita su nostro immobile
        const isRispostaAcquisizione = email.subject.includes("Nuovo messaggio di") && 
                                        email.subject.includes("per l'annuncio");
        
        if (isRispostaAcquisizione) {
          // Gestisci come risposta acquisizione
          const result = await handleAcquisitionResponse(email);
          if (result) {
            imported++;
            console.log(`[EmailImportWorker] Imported acquisition response from ${email.subject}`);
          }
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
        
        // Normalize and validate phone number
        const telefonoRaw = parsed.telefonoCliente || "";
        // Remove all non-digits except leading +, then strip + for validation
        const telefonoNormalized = telefonoRaw.replace(/[\s.-]/g, '').replace(/^\+/, '');
        // Valid Italian mobile: optional 39 prefix + 3xx xxxxxxx (9-10 digits after 3)
        const isValidPhone = telefonoNormalized && /^(39)?3\d{8,9}$/.test(telefonoNormalized);
        
        // Validate name - must not be empty or contain nonsense words
        const nomeCompleto = (parsed.nomeCliente || "").trim();
        const parti = nomeCompleto.split(/\s+/);
        const nome = parti[0] || null;
        const cognome = parti.slice(1).join(" ") || null;
        
        // Stricter name validation matching gmail-service.ts isValidName
        const excludeNameWords = [
          'grazie', 'ciao', 'salve', 'buongiorno', 'buonasera', 'cordiali', 'saluti',
          'offerta', 'residenziale', 'cerca', 'casa', 'appartamento', 'immobile',
          'trilocale', 'bilocale', 'monolocale', 'quadrilocale', 'attico', 'mansarda',
          'vendita', 'affitto', 'classe', 'energetica', 'area', 'zone', 'euro',
          'risposta', 'messaggio', 'attesa', 'nuovo', 'annuncio', 'portale',
          'contatto', 'richiesta', 'informazioni', 'prezzo', 'mq', 'metri', 'chi'
        ];
        const hasValidName = nome && nome.length >= 2 && nome.length <= 30 && 
          parti.length <= 4 && 
          !excludeNameWords.some(w => nomeCompleto.toLowerCase().includes(w)) &&
          /[A-ZÀ-Ÿ]/.test(nomeCompleto);
        
        const hasValidEmail = parsed.emailCliente && parsed.emailCliente.includes('@');
        
        // Need at least a valid name OR (valid email AND valid phone)
        const canCreateClient = hasValidName || (hasValidEmail && isValidPhone);
        
        if (!cliente && canCreateClient) {
          // Format phone with 39 prefix for storage
          const telefonoFormatted = isValidPhone ? 
            (telefonoNormalized.startsWith('39') ? telefonoNormalized : '39' + telefonoNormalized) : null;
          
          cliente = await storage.createCliente({
            nome: hasValidName ? nome : null,
            cognome: hasValidName ? cognome : null,
            email: parsed.emailCliente || null,
            telefono: telefonoFormatted,
            tipoCliente: "compratore",
            note: `Contatto da ${parsed.portale}`,
          });
          console.log(`[EmailImportWorker] Created new client: ${cliente.nome} ${cliente.cognome}`);
        } else if (!cliente && !canCreateClient) {
          console.log(`[EmailImportWorker] Skipping client creation - insufficient data: name="${nomeCompleto}", email="${parsed.emailCliente}", phone="${telefonoRaw}"`);
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
          messaggio: `${parsed.nomeCliente || "Cliente"} ha richiesto informazioni${immobile ? ` per ${immobile.indirizzo || immobile.titolo}` : ""}`,
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
    console.log(`[EmailImportWorker] Summary: ${imported} imported, ${skipped} already processed`);
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
        
        // Match by address or title (fuzzy)
        if (!immobileEsterno && parsed.indirizzoImmobile) {
          const allEsterni = await storage.getImmobiliEsterni();
          const searchText = parsed.indirizzoImmobile.toLowerCase().replace(/[,.\-\s]+/g, ' ');
          
          immobileEsterno = allEsterni.find(ie => {
            // Match con indirizzo
            if (ie.indirizzo) {
              const addr1 = ie.indirizzo.toLowerCase().replace(/[,.\-\s]+/g, ' ');
              if (addr1.includes(searchText) || searchText.includes(addr1)) return true;
            }
            // Match con titolo dell'annuncio (es: "Quadrilocale via Francesco Viganò 8")
            if (ie.titolo) {
              const titolo = ie.titolo.toLowerCase().replace(/[,.\-\s]+/g, ' ');
              // Confronto più flessibile: cerca parole chiave in comune
              const searchWords = searchText.split(' ').filter(w => w.length > 2);
              const matchingWords = searchWords.filter(w => titolo.includes(w));
              // Se almeno 2 parole corrispondono (es: "quadrilocale" e "viganò"), è un match
              if (matchingWords.length >= 2) return true;
              // Oppure se il titolo contiene la stringa di ricerca o viceversa
              if (titolo.includes(searchText) || searchText.includes(titolo)) return true;
            }
            return false;
          });
          
          if (immobileEsterno) {
            console.log(`[EmailImportWorker] Matched external property by title/address: ${immobileEsterno.titolo}`);
          }
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

          // PREVENZIONE DUPLICATI: Usa il cliente esistente collegato all'immobile esterno
          // Se il cliente ha un nome generico ("Proprietario..."), aggiorna con il nome reale
          let cliente = null;
          if (immobileEsterno.clienteId) {
            cliente = await storage.getCliente(immobileEsterno.clienteId);
            
            // Se il cliente esiste e ha un nome generico, aggiorna con il nome reale dal mittente
            if (cliente && parsed.mittente) {
              const nomeAttuale = `${cliente.nome || ""} ${cliente.cognome || ""}`.trim().toLowerCase();
              const isNomeGenerico = nomeAttuale.startsWith("proprietario") || 
                                     nomeAttuale === "" ||
                                     nomeAttuale.includes("via ") ||
                                     nomeAttuale.includes("viale ") ||
                                     nomeAttuale.includes("corso ");
              
              if (isNomeGenerico) {
                const nomeCompleto = parsed.mittente.trim();
                const parti = nomeCompleto.split(/\s+/);
                const nome = parti[0] || null;
                const cognome = parti.slice(1).join(" ") || null;
                
                if (nome) {
                  await storage.updateCliente(cliente.id, { nome, cognome });
                  console.log(`[EmailImportWorker] Updated client ${cliente.id} name from "${nomeAttuale}" to "${nome} ${cognome}"`);
                  // Ricarica il cliente aggiornato
                  cliente = await storage.getCliente(cliente.id);
                }
              }
            }
          }
          
          // Solo se NON c'è un cliente collegato, cerchiamo per nome (per evitare duplicati)
          if (!cliente && parsed.mittente) {
            const nomeCompleto = parsed.mittente.trim();
            if (nomeCompleto.length > 2) {
              const parti = nomeCompleto.split(/\s+/);
              const nome = parti[0];
              const cognome = parti.slice(1).join(" ");
              
              const allClienti = await storage.getClienti();
              
              // Prima cerca un cliente già collegato allo stesso immobile esterno
              cliente = allClienti.find(c => {
                // Verifica se questo cliente è già collegato a questo immobile esterno
                // tramite comunicazioni o altri riferimenti
                return false; // Per ora non cerchiamo, evitiamo duplicati
              });
              
              // Se non troviamo, cerchiamo per nome esatto
              if (!cliente) {
                cliente = allClienti.find(c => {
                  const clienteNome = (c.nome || "").toLowerCase().trim();
                  const clienteCognome = (c.cognome || "").toLowerCase().trim();
                  const searchNome = nome.toLowerCase();
                  const searchCognome = cognome.toLowerCase();
                  
                  // Match esatto nome + cognome
                  if (clienteNome === searchNome && clienteCognome === searchCognome) return true;
                  
                  return false;
                });
              }
              
              if (cliente) {
                console.log(`[EmailImportWorker] Found existing client by name "${nomeCompleto}": ${cliente.nome} ${cliente.cognome} (ID: ${cliente.id})`);
                // Collega l'immobile esterno al cliente trovato
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
