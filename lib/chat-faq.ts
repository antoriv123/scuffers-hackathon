/**
 * FAQ fast path — preguntas resueltas sin llamar a Claude.
 * Latencia <50ms. Categorías cubiertas: las 15 FAQs más frecuentes
 * de un ecommerce de moda + las específicas de Scuffers.
 *
 * Diseño: cada FAQ tiene patrones (regex) que matchean en cualquier idioma
 * + plantillas de respuesta multi-idioma. Si matchea → respuesta inmediata.
 * Si no → fallback al LLM.
 */

export type FaqLang = "es" | "en" | "fr" | "it" | "de";

export type FaqEntry = {
  id: string;
  category: string;
  patterns: RegExp[];
  /** Reply per language. Falls back to ES if lang missing. */
  reply: Partial<Record<FaqLang, string>>;
  /** Quick-reply chips to suggest after this answer (label, message to send). */
  followups?: Array<{ label: string; send: string }>;
};

export const FAQS: FaqEntry[] = [
  // ─────────────────────────────────────────────────────────
  // ENVÍOS
  // ─────────────────────────────────────────────────────────
  {
    id: "shipping-times",
    category: "shipping_info",
    patterns: [
      /(cu[aá]nto tarda|tiempo de env[ií]o|d[ií]as.*env[ií]o|cu[aá]ndo llega|when will|how long.*ship|delivery time|shipping time|combien.*livraison|tempi.*spedizione)/i,
    ],
    reply: {
      es: "Tiempos de envío estimados:\n\n• España — 24-48h\n• Europa — 4 días laborables\n• UK / Suiza — 4-6 días\n• US — 5-7 días\n• LatAm / Asia — 7-12 días\n\nUsamos FedEx (principal), UPS, SEUR y Correos Express. Si tu pedido lleva más de 5 días sin movimiento dime el order id y lo miro al momento.",
      en: "Estimated shipping times:\n\n• Spain — 24-48h\n• EU — 4 business days\n• UK / Switzerland — 4-6 days\n• US — 5-7 days\n• LatAm / Asia — 7-12 days\n\nWe ship via FedEx (main), UPS, SEUR and Correos Express. If your order has been stuck >5 days without tracking updates, drop me your order ID and I'll check now.",
      fr: "Délais de livraison estimés :\n\n• Espagne — 24-48h\n• UE — 4 jours ouvrés\n• UK / Suisse — 4-6 jours\n• US — 5-7 jours\n• LatAm / Asie — 7-12 jours\n\nNous expédions via FedEx, UPS, SEUR et Correos. Si ta commande est bloquée depuis +5 jours, envoie ton numéro de commande.",
    },
    followups: [
      { label: "Track my order", send: "Quiero saber dónde está mi pedido" },
      { label: "Do you ship to my country?", send: "¿Enviáis a mi país?" },
    ],
  },
  {
    id: "shipping-countries",
    category: "shipping_info",
    patterns: [
      /(env[ií]o.*pa[ií]s|env[ií]os internacionales|ship to (mexico|chile|argentina|brazil|usa|us|uk|canada|japan)|do you ship.*to|envoi.*pays|spedizione.*paese)/i,
      /(env[ií]a|env[ií]as).*(M[ée]xico|Chile|Argentina|Estados Unidos|Brasil|Colombia)/i,
    ],
    reply: {
      es: "Sí, enviamos a 30+ países. España y la UE no tienen problema (sin duty extra). Para UK, US y LatAm hay aduana / duty:\n\n• UK — pedidos >£135 → 20% duty (anuncio web: lo cubrimos, pero guarda comprobante por si FedEx te factura).\n• US — duty solo si pedido >$800.\n• LatAm — duty + manejo FedEx 30-100€ que paga el cliente.\n\n¿Qué país en concreto?",
      en: "Yes, we ship to 30+ countries. EU is duty-free. UK, US and LatAm have customs:\n\n• UK — orders >£135 → 20% duty (we cover it per policy — keep the FedEx receipt just in case).\n• US — duty only over $800.\n• LatAm — customs + FedEx handling fees 30-100€ paid by customer.\n\nWhich country?",
    },
    followups: [
      { label: "UK duty details", send: "¿Pago duty si compro desde UK?" },
      { label: "LatAm customs", send: "¿Cuánto pago de aduana en Chile/México?" },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // DEVOLUCIONES
  // ─────────────────────────────────────────────────────────
  {
    id: "return-policy",
    category: "return_info",
    patterns: [
      /(pol[ií]tica.*devoluci[óo]n|c[óo]mo devuelvo|c[óo]mo se devuelve|devolver un pedido|return policy|how.*(do|to|can|should).*return|how.*return.*item|comment.*retourner|come.*restituire|return.*process|start.*return)/i,
    ],
    reply: {
      es: "Devoluciones en 14 días desde la entrega:\n\n• España — gratis. Te genero el label de devolución, lo dejas en cualquier punto SEUR/Correos.\n• Internacional — coste devolución 10-15€ (se paga del refund).\n• Refund en DINERO REAL al método original (nunca solo store credit).\n• Mystery boxes — solo cambio de talla, no devolución.\n\nDime tu número de pedido y te genero la etiqueta correcta para tu país.",
      en: "Returns within 14 days of delivery:\n\n• Spain — free. I generate the label, drop it at any SEUR / Correos pickup.\n• International — return cost 10-15€ (deducted from refund).\n• Refund as REAL MONEY to original payment method (not store credit).\n• Mystery boxes — size exchange only.\n\nDrop me your order ID and I'll generate the correct label for your country.",
      fr: "Retours sous 14 jours après réception :\n\n• Espagne — gratuit.\n• International — frais 10-15€ (déduits du remboursement).\n• Remboursement en argent réel sur le moyen de paiement original.\n\nEnvoie ton numéro de commande pour que je génère l'étiquette correcte.",
    },
    followups: [
      { label: "Start a return", send: "Quiero devolver un pedido" },
      { label: "Wrong size", send: "Pedí talla M y me queda enorme" },
    ],
  },
  {
    id: "refund-time",
    category: "return_info",
    patterns: [
      /(cu[aá]ndo.*reembolso|cu[aá]ndo.*refund|cu[aá]ndo.*me devolv[ée]is|when.*refund|refund.*how long|reembolso tarda)/i,
    ],
    reply: {
      es: "Una vez recibimos tu devolución en almacén:\n\n• Inspección y validación — 24-48h.\n• Refund a tu método original (tarjeta / Klarna / PayPal) — 3-5 días laborables.\n• El extracto bancario puede tardar 1-2 días extra en mostrarlo.\n\nSi pasaron >7 días desde que validamos y no lo ves, dime tu order id y lo revisamos directamente con el banco.",
      en: "Once your return arrives at our warehouse:\n\n• Inspection and validation — 24-48h.\n• Refund to original payment method (card / Klarna / PayPal) — 3-5 business days.\n• Your bank may take 1-2 extra days to show it.\n\nIf >7 days have passed since validation, share the order ID and we'll chase the bank directly.",
    },
  },

  // ─────────────────────────────────────────────────────────
  // TALLAS
  // ─────────────────────────────────────────────────────────
  {
    id: "sizing-guide",
    category: "sizing_info",
    patterns: [
      /(gu[ií]a de tallas|c[óo]mo elegir.*talla|c[óo]mo elijo.*talla|qu[eé] talla|tallas son|fit oversized|vais oversized|sois oversized|size guide|sizing guide|what size|fit.*(oversized|true to size)|guide.*tailles|guida.*taglie)/i,
    ],
    reply: {
      es: "Nuestro fit es **oversized** por defecto:\n\n• Hoodies — ve a tu talla habitual (la M nuestra equivale a una L tradicional).\n• Tees / polos — fit relajado, talla habitual.\n• Pants — fit relajado-recto, mira el largo si mides <1.65m.\n• Footwear — talla EU estándar.\n\nSi te queda mal, cambio gratis dentro de España. ¿Qué prenda buscas?",
      en: "Our default fit is **oversized**:\n\n• Hoodies — go true to size (our M = traditional L).\n• Tees / polos — relaxed fit, true to size.\n• Pants — relaxed-straight, check length if you're <1.65m.\n• Footwear — standard EU sizing.\n\nFree exchange within Spain if it doesn't fit. What item are you looking at?",
    },
    followups: [
      { label: "Wrong size received", send: "Pedí talla M y me queda mal" },
      { label: "Hoodie fit details", send: "¿Cómo es el fit de los hoodies?" },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // PAGOS
  // ─────────────────────────────────────────────────────────
  {
    id: "payment-methods",
    category: "payment_info",
    patterns: [
      /(m[eé]todos de pago|formas de pago|c[oó]mo pago|payment methods|how (can|do) i pay|paypal|klarna|apple pay|google pay|moyens de paiement|metodi.*pagamento)/i,
    ],
    reply: {
      es: "Aceptamos:\n\n• Tarjeta (Visa / Mastercard / Amex) vía Shopify Payments.\n• **Klarna** — paga en 3 plazos sin intereses.\n• Apple Pay y Google Pay en checkout.\n• PayPal en algunos mercados.\n\nNo aplicamos recargo por método. ¿Algo más?",
      en: "We accept:\n\n• Card (Visa / Mastercard / Amex) via Shopify Payments.\n• **Klarna** — pay in 3 with 0% interest.\n• Apple Pay and Google Pay at checkout.\n• PayPal in some markets.\n\nNo extra fees per method. Anything else?",
    },
    followups: [
      { label: "Klarna details", send: "¿Cómo funciona Klarna?" },
    ],
  },
  {
    id: "klarna-info",
    category: "payment_info",
    patterns: [
      /(klarna|pago.*plazos|payment.*installments|pay.*later|3 cuotas|4 cuotas)/i,
    ],
    reply: {
      es: "Con Klarna pagas en 3 cuotas iguales sin intereses ni comisiones — la primera al hacer el pedido, las otras dos en los 60 días siguientes. Disponible para pedidos entre 35€ y 1500€. Lo eliges en el checkout.",
      en: "Klarna lets you pay in 3 equal interest-free installments — first one at checkout, the other two over the next 60 days. Available for orders between 35€ and 1500€. Pick it at checkout.",
    },
  },

  // ─────────────────────────────────────────────────────────
  // TIENDAS
  // ─────────────────────────────────────────────────────────
  {
    id: "stores-list",
    category: "general",
    patterns: [
      /(tiendas?|stores?|donde compr|where can i buy|tu tienda|f[ií]sica|magasins?|negozi)/i,
      /(direcci[oó]n|address|d[oó]nde est[aá]is|where are you|location)/i,
    ],
    reply: {
      es: "Tiendas físicas activas:\n\n**Permanentes**\n• Madrid (2) + outlet Las Rozas Village\n• Barcelona (2) + outlet La Roca Village\n• Valencia (1)\n• Ámsterdam — flagship internacional desde marzo 2025\n\n**Pop-ups activos ahora**\n• París Le Marais — 84 Rue de Turenne, hasta 10 mayo 2026\n• Milano — Brera District\n\n¿Qué ciudad te pilla cerca?",
      en: "Active physical stores:\n\n**Permanent**\n• Madrid (2) + Las Rozas Village outlet\n• Barcelona (2) + La Roca Village outlet\n• Valencia (1)\n• Amsterdam — first international flagship since March 2025\n\n**Active pop-ups**\n• Paris Le Marais — 84 Rue de Turenne, until May 10, 2026\n• Milan — Brera District\n\nWhich city are you near?",
    },
  },
  {
    id: "store-hours",
    category: "general",
    patterns: [
      /(horario|hours|opening|abierto|abren|qu[eé] horas|cu[aá]ndo abre|when.*open)/i,
    ],
    reply: {
      es: "Horario estándar de tiendas Scuffers:\n\n• Lunes-Sábado — 11:00-21:00\n• Domingos y festivos — 12:00-20:00\n\nLas tiendas en outlet (Las Rozas, La Roca) siguen el horario del centro, suele ser 10:00-22:00. ¿Qué tienda quieres comprobar exactamente?",
      en: "Standard Scuffers store hours:\n\n• Mon-Sat — 11:00-21:00\n• Sundays / holidays — 12:00-20:00\n\nOutlet stores (Las Rozas, La Roca) follow mall hours, usually 10:00-22:00. Which store do you want to check?",
    },
  },

  // ─────────────────────────────────────────────────────────
  // DROPS / NOVEDADES
  // ─────────────────────────────────────────────────────────
  {
    id: "next-drop",
    category: "general",
    patterns: [
      /(pr[oó]ximo drop|next drop|cu[aá]ndo.*nuevo|new release|cuando saca|new collection|nueva colecci[oó]n)/i,
    ],
    reply: {
      es: "Drops semanales, normalmente los **viernes a las 18:00 CET**. El próximo es el viernes 03/05 — Iconic Suede Boots Brown y restock de hoodies cream / burgundy. Apúntate a FF FAM (newsletter abajo) para acceso temprano: la última colección se agotó en 4h.",
      en: "Weekly drops, usually **Fridays at 18:00 CET**. Next one Friday May 3rd — Iconic Suede Boots Brown and restock of cream / burgundy hoodies. Sign up for FF FAM (newsletter below) for early access: last collection sold out in 4h.",
    },
    followups: [
      { label: "Join FF FAM", send: "¿Cómo me apunto al newsletter FF FAM?" },
    ],
  },
  {
    id: "ff-fam",
    category: "general",
    patterns: [
      /(ff fam|friends.*family|newsletter|comunidad|early access|acceso temprano)/i,
    ],
    reply: {
      es: "FF FAM = Friends and Family. Es nuestra comunidad — 250K+ personas que reciben:\n\n• Acceso temprano a drops (24h antes que el público).\n• Avisos de pop-ups antes que en redes.\n• Restocks privados.\n\nApúntate con el formulario del footer. Cero spam.",
      en: "FF FAM = Friends and Family. It's our community — 250K+ people getting:\n\n• Early drop access (24h before public).\n• Pop-up alerts before social.\n• Private restocks.\n\nSign up with the form in the footer. Zero spam.",
    },
  },

  // ─────────────────────────────────────────────────────────
  // BRAND / VALORES
  // ─────────────────────────────────────────────────────────
  {
    id: "founders",
    category: "general",
    patterns: [
      /(qui[eé]nes? sois|qui[eé]n fund|qui[eé]nes? fund|fund[oó]|founders?|when (was|did) you start|cu[aá]ndo (se )?fund|history|historia.*marca|chi siete|qui [eê]tes)/i,
    ],
    reply: {
      es: "Scuffers nació en Madrid en 2018, fundada por **Jaime Cruz Vega y Javier López Reinoso** — tenían 16 y 17 años entonces, empezaron con 1.000€ y una serigrafía local. Hoy facturamos 8M€+ con 6.000 pedidos/mes y tiendas en España, Ámsterdam y pop-ups en París y Milán. Sin influencers pagados nunca.",
      en: "Scuffers was founded in Madrid in 2018 by **Jaime Cruz Vega and Javier López Reinoso** — they were 16 and 17, started with 1.000€ and a local screen-printer. Today: 8M€+ revenue, 6.000 orders/month, stores across Spain, Amsterdam, plus pop-ups in Paris and Milan. Never paid an influencer.",
    },
  },
  {
    id: "as-always-with-love",
    category: "general",
    patterns: [
      /(as always.*love|qu[eé] significa.*love|why.*love|el lema|tu lema|tagline|motto)/i,
    ],
    reply: {
      es: "**As Always, With Love** es el lema. Significa que cada drop, cada pieza, cada respuesta de soporte (incluida esta) viene de la misma actitud: hacer las cosas con cuidado, sin atajos. Es lo que la FF FAM espera de nosotros y la vara con la que nos medimos.",
      en: "**As Always, With Love** is the motto. It means every drop, every piece, every support reply (this one included) comes from the same place: care, no shortcuts. It's what the FF FAM expects of us and the bar we measure ourselves against.",
    },
  },

  // ─────────────────────────────────────────────────────────
  // CONTACTO
  // ─────────────────────────────────────────────────────────
  {
    id: "contact-channels",
    category: "general",
    patterns: [
      /(c[oó]mo.*contactar|contact|email.*soporte|hablar con.*humano|talk to.*human|customer service|atenci[oó]n al cliente|tel[eé]fono|phone)/i,
    ],
    reply: {
      es: "Canales de contacto Scuffers:\n\n• **Este chat** — primera línea, 24/7.\n• Email — help@scuffers.com (respuesta <24h).\n• Instagram — @scuffers.co (DMs respondidos por el equipo, no por bot).\n• Tiendas físicas — equipo presencial puede gestionar incidencias en directo.\n\nSi quieres que María o Jorge te llamen, dime tu order id y los aviso.",
      en: "Scuffers contact channels:\n\n• **This chat** — first line, 24/7.\n• Email — help@scuffers.com (reply within 24h).\n• Instagram — @scuffers.co (DMs handled by the team, not a bot).\n• Physical stores — staff can handle incidents in person.\n\nWant María or Jorge to call you? Drop your order ID and I'll flag them.",
    },
  },
];

export type FaqMatch = {
  faq: FaqEntry;
  reply: string;
  followups: Array<{ label: string; send: string }>;
};

/**
 * Try to match the message against FAQ patterns.
 * Returns the canned reply in the requested language (or ES fallback).
 */
export function tryFaqFastPath(
  message: string,
  language: FaqLang = "es",
): FaqMatch | null {
  const text = message.trim();
  // Skip short messages (likely greetings — let LLM handle warmly).
  if (text.length < 5) return null;

  for (const faq of FAQS) {
    if (faq.patterns.some((p) => p.test(text))) {
      const reply = faq.reply[language] ?? faq.reply.es ?? faq.reply.en ?? "";
      if (!reply) continue;
      return {
        faq,
        reply,
        followups: faq.followups ?? [],
      };
    }
  }
  return null;
}

/**
 * Heuristic followup suggestions based on category — for cases that hit the
 * LLM (no FAQ match) but where we still want to offer next-step chips.
 */
export function suggestFollowups(category: string): Array<{ label: string; send: string }> {
  switch (category) {
    case "shipping_delay":
      return [
        { label: "Refund + 10% next order", send: "Prefiero el refund con cupón" },
        { label: "Track again", send: "Mándame el tracking actualizado" },
        { label: "Talk to a human", send: "Quiero hablar con María o Jorge" },
      ];
    case "return":
      return [
        { label: "Get return label", send: "Mándame el label de devolución" },
        { label: "Refund timeline", send: "¿Cuánto tarda el refund?" },
      ];
    case "customs_duty":
      return [
        { label: "What if FedEx bills me?", send: "¿Qué hago si FedEx me factura el duty?" },
        { label: "Talk to a human", send: "Necesito hablar con un humano sobre esto" },
      ];
    case "sizing":
      return [
        { label: "Size guide", send: "Mándame la guía de tallas" },
        { label: "Free exchange", send: "Quiero cambiar la talla" },
      ];
    case "wrong_item":
    case "missing_item":
      return [
        { label: "Send replacement", send: "Quiero la reposición urgente" },
        { label: "Talk to a human", send: "Quiero hablar con un humano" },
      ];
    case "legal_risk":
      return [
        { label: "I'll wait for María", send: "Vale, espero a María" },
      ];
    default:
      return [
        { label: "Track an order", send: "¿Dónde está mi pedido?" },
        { label: "How to return", send: "¿Cómo devuelvo?" },
        { label: "Stores", send: "¿Qué tiendas tenéis?" },
      ];
  }
}
