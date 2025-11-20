/**
 * Extrait uniquement le contenu de la réponse d'un email, en supprimant les citations précédentes
 */
export function extractReplyContent(text: string, html?: string): string {
  // Si on a du HTML, extraire le texte d'abord
  let content = text || '';
  
  if (html && !text) {
    // Extraire le texte du HTML
    content = html.replace(/<[^>]*>/g, '').trim();
  }
  
  if (!content) {
    return '';
  }
  
  // Normaliser les retours à la ligne
  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Patterns pour détecter le début des citations
  const quotePatterns = [
    // Citations avec ">" au début de ligne (peut commencer par des espaces avant le >)
    /^[\s>]*>.*$/m,
    // "On ... a écrit :" ou "Le ... a écrit :" (format français complet avec date)
    /^(On|Le|lun\.|mar\.|mer\.|jeu\.|ven\.|sam\.|dim\.)\s+.*?(a écrit|écrit|wrote).*$/mi,
    // Dates françaises "Le jeu. 20 nov. 2025"
    /^(Le|On)\s+[a-z]+\s+\d+\s+[a-z]+\s+\d+.*$/mi,
    // "From:", "To:", "Subject:", "De :", "À :" (en-têtes d'email)
    /^(From|To|Subject|De|À|Objet|From:|To:|Subject:|De :|À :|Objet :)\s*:?\s*.*$/mi,
    // "Sent:", "Envoyé", "Date:"
    /^(Sent|Envoyé|Date|Sent:|Envoyé :|Date :)\s*:?\s*.*$/mi,
    // Séparateurs de citation
    /^[-_]{3,}.*$/m,
    /^_{10,}$/m,
    /^-{10,}$/m,
    /^[=]{10,}$/m,
    // "Tu as reçu un nouveau message" (pattern du template Resend)
    /^Tu as reçu un.*nouveau message.*$/mi,
    // "Nouveau message de contact"
    /^Nouveau message de contact.*$/mi,
    // "Club :", "Email du club :", "Message :" (patterns du template)
    /^(Club|Email du club|Message)\s*:.*$/mi,
    // "Pour répondre :", "Conversation ID:"
    /^(Pour répondre|Conversation ID|Pour répondre :|Conversation ID :)\s*:?\s*.*$/mi,
    // "Ce message a été envoyé depuis"
    /^Ce message a été envoyé.*$/mi,
    // Dates et heures
    /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}.*$/m,
    // "Original Message" ou "Message original"
    /^(Original Message|Message original|-----Original Message-----|-----\s*Original Message\s*-----).*$/mi,
  ];
  
  // Diviser le contenu en lignes
  const lines = content.split('\n');
  let replyLines: string[] = [];
  let foundQuoteStart = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Vérifier si cette ligne correspond à un pattern de citation
    let isQuote = false;
    for (const pattern of quotePatterns) {
      if (pattern.test(line)) {
        isQuote = true;
        foundQuoteStart = true;
        break;
      }
    }
    
    // Si on trouve le début d'une citation, arrêter
    if (foundQuoteStart && isQuote) {
      break;
    }
    
    // Si on a déjà trouvé une citation mais que cette ligne n'en est pas une,
    // c'est peut-être une ligne vide entre la réponse et la citation
    if (foundQuoteStart && !isQuote && line.trim() === '') {
      // Continuer à chercher, peut-être qu'il y a encore du contenu
      continue;
    }
    
    // Si on n'a pas encore trouvé de citation, ajouter la ligne
    if (!foundQuoteStart) {
      replyLines.push(line);
    }
  }
  
  // Nettoyer le résultat
  let result = replyLines.join('\n').trim();
  
  // Supprimer les lignes vides en début et fin
  result = result.replace(/^\n+|\n+$/g, '');
  
  // Si le résultat est vide, essayer une approche différente : prendre les premières lignes
  // jusqu'à ce qu'on trouve un pattern de citation
  if (!result && content) {
    const allLines = content.split('\n');
    const firstNonEmptyLines: string[] = [];
    
    for (const line of allLines) {
      // Vérifier si c'est une citation
      let isQuote = false;
      for (const pattern of quotePatterns) {
        if (pattern.test(line)) {
          isQuote = true;
          break;
        }
      }
      
      if (isQuote) {
        break;
      }
      
      firstNonEmptyLines.push(line);
    }
    
    result = firstNonEmptyLines.join('\n').trim();
  }
  
  return result || content.trim();
}

