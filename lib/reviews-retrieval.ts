/**
 * Reviews retrieval simplificado.
 * Devuelve 3-5 reviews históricas similares al email entrante.
 * Para hackathon: search por keywords (no embeddings) — suficiente y rápido.
 * Las reviews están curated del scrape de 1640 reviews Trustpilot abr 2026.
 */

export type HistoricalReview = {
  date: string;
  rating: 1 | 2 | 3;
  language: string;
  category: string;
  text: string;
  pattern: string;
};

const historicalReviews: HistoricalReview[] = [
  {
    date: "2026-04-22",
    rating: 1,
    language: "en",
    category: "return",
    text: "The third party company (Reveni) that they use to process returns is completely useless. They have provided me with an incorrect shipping label and every email I send is responded with an AI generated response saying they are working on the case.",
    pattern: "Reveni genera label incorrecta + bot estándar no resuelve",
  },
  {
    date: "2026-04-22",
    rating: 1,
    language: "en",
    category: "return",
    text: "I ordered an item that turned out to be too large and therefore requested a return. I was sent a return label for UPS USA, making it completely unusable, as the item was delivered to Denmark. I have followed up eight times without receiving a single response.",
    pattern: "Label US para envío UE — Reveni issue confirmed",
  },
  {
    date: "2026-04-15",
    rating: 1,
    language: "es",
    category: "shipping_delay",
    text: "Llevo desde el 31 de marzo que hice un pedido y sigo sin recibir información de cuándo llegará y aúnque ya me contacte con el servicio a cliente no tengo información todavía",
    pattern: "Pedido >2 semanas + soporte sin info",
  },
  {
    date: "2026-04-14",
    rating: 1,
    language: "en",
    category: "shipping_delay",
    text: "I ordered a hoodie in November and it still hasn't come. I have sent over 30 emails and they just reply 'we are working on it'. It's an absolute joke they should have sent out a new hoodie 2 weeks after it went missing in delivery.",
    pattern: "30 emails sin solución — bot estándar 'working on it'",
  },
  {
    date: "2026-03-16",
    rating: 1,
    language: "es",
    category: "customs_duty",
    text: "no me han resuelto nada de mi paquete, sigue atrapado en aduana y siempre que mando correo me contesta el mismo bot",
    pattern: "Aduana + bot estándar (cita literal del problema)",
  },
  {
    date: "2026-03-12",
    rating: 1,
    language: "es",
    category: "shipping_delay",
    text: "Si no reclamo vía comentario de Instagram mi pedido de remplazo no me habría llegado seguramente. Servicio postventa por email pésimo. No volveré a comprar",
    pattern: "Cliente reclama por IG porque email no responde — daño público",
  },
  {
    date: "2026-01-29",
    rating: 1,
    language: "en",
    category: "customs_duty",
    text: "This company advertises that duty is not payable on imports to the UK. This is a lie. We have just received a threat of legal action from FedEx due to Scuffers not paying their duty, despite repeated chases over months.",
    pattern: "🚨 UK duty fraud — FedEx amenaza legal contra cliente",
  },
  {
    date: "2026-01-30",
    rating: 1,
    language: "es",
    category: "shipping_delay",
    text: "Me informan de que se ha realizado un abono, pero no una devolución del dinero, sino un saldo para gastar únicamente en su tienda. Considero esto totalmente inaceptable.",
    pattern: "Store credit forzado en vez de refund real",
  },
  {
    date: "2026-04-26",
    rating: 1,
    language: "es",
    category: "wrong_item",
    text: "He pedido zapatillas con cordones amarillas y me llegaron con cordones marrones. Al principio reconocieron el error, y cuando pedí la oja de reclamaciones me propusieron descuento, reembolso o devolución, luego cambiaron en la web scuffers.com el color de los cordones de amarillos a marrones y no contestan más a ningún correo.",
    pattern: "Modifican web para encubrir error — daño reputacional grave",
  },
  {
    date: "2026-04-21",
    rating: 1,
    language: "es",
    category: "customs_duty",
    text: "Tuve que pagar impuestos de importación a FedEx que no lo anunciaban en la página. Eso no pasa en Amazon ni en Temu.",
    pattern: "LatAm sticker shock + comparación con benchmarks",
  },
  {
    date: "2026-04-18",
    rating: 1,
    language: "en",
    category: "missing_item",
    text: "I ordered 27 items, but only received 22. The package arrived visibly damaged. Customer support keeps insisting that 'the weight matches' and therefore all items must have been included.",
    pattern: "Pedido parcial + soporte niega evidencia de cliente",
  },
  {
    date: "2026-02-21",
    rating: 1,
    language: "es",
    category: "return",
    text: "Otra vez. Intento devolver el pedido con el link que me mandan pero NO me deja poner un número de teléfono español si tengo una dirección francesa, automáticamente solo me deja poner +33. Han pasado SEMANAS, no sé si ha decidido no resolver este problema para que no tengan que devolverme el dinero",
    pattern: "Bug UX devoluciones (form rechaza tlf cross-border) + sospecha de mala fe",
  },
  {
    date: "2026-02-12",
    rating: 1,
    language: "fr",
    category: "shipping_delay",
    text: "Colis jamais reçu. Le cadeau de Noel de ma fille et celui de ma nièce normalement livré le 22 décembre 96 euros pour 2 articles. J'ai déposé une plainte à la police ça ne sert à rien.",
    pattern: "Pedido perdido en navidades — cliente FR escaló a policía",
  },
  {
    date: "2026-02-18",
    rating: 1,
    language: "es",
    category: "shipping_delay",
    text: "Despues de 4 semanas de la compra y varias reclamaciones por no recibir el pedido, scuffers me ofrecio Como única opcion un abono (que Tuve que gestionar yo) para volver a comprar. Compre lo mismo y pague mas dinero. Poco cariño al cliente",
    pattern: "Store credit forzado + cliente termina pagando más",
  },
  {
    date: "2026-04-20",
    rating: 1,
    language: "es",
    category: "general",
    text: "La peor atención al público que tuve en años, no saben resolver un problema, todo lo que hacen es mandar mensajes con una maquina, vergüenza",
    pattern: "Bot estándar genera vergüenza — daño marca",
  },
];

const categoryKeywords: Record<string, RegExp[]> = {
  shipping_delay: [
    /shipping|delivery|envío|tracking|fedex|ups|seur|correos|days|weeks|semanas|días|sem|month|mes/i,
    /still.*(not|haven|never)|sigue|todavía|aún/i,
  ],
  return: [
    /return|devolu|retour|reso|refund|reembolso|reveni|label|étiquette|cambiar/i,
  ],
  customs_duty: [
    /custom|aduana|duty|impuesto|tax|fee|tariff|douane|dazi/i,
    /£|euros.*extra|fedex.*charg/i,
  ],
  legal_risk: [
    /ocu|trustpilot|abogado|denuncia|policía|police|legal|attorney|misleading|fraud|estafa|scam|trading standards/i,
  ],
  wrong_item: [
    /wrong|incorrect|equivocado|distinto|otra prenda|différent|sbagliato/i,
  ],
  missing_item: [
    /missing|faltan|partial|incompleto|incomplete|manqu|less items/i,
  ],
  sizing: [/size|talla|taglia|taille|fit|tight|loose|small|big|grande|peque/i],
  quality: [/quality|calidad|broken|roto|stain|mancha|rip|cremall|zipper|seam/i],
};

export function classifyByKeywords(email: string): string {
  const scores: Record<string, number> = {};
  for (const [category, patterns] of Object.entries(categoryKeywords)) {
    scores[category] = patterns.reduce(
      (acc, p) => acc + (p.test(email) ? 1 : 0),
      0,
    );
  }
  const ranked = Object.entries(scores).sort(([, a], [, b]) => b - a);
  if (ranked[0][1] === 0) return "general";
  return ranked[0][0];
}

export function retrieveSimilarReviews(
  email: string,
  category: string,
  limit = 3,
): HistoricalReview[] {
  const sameCategory = historicalReviews.filter(
    (r) => r.category === category,
  );

  const tokens = new Set(
    email
      .toLowerCase()
      .replace(/[^\wáéíóúñü ]/gi, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );

  const scored = sameCategory.map((r) => {
    const reviewTokens = r.text.toLowerCase().split(/\s+/);
    const overlap = reviewTokens.filter((t) => tokens.has(t)).length;
    return { review: r, score: overlap };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.review);
}

export function buildReviewsContext(
  reviews: HistoricalReview[],
): string {
  if (reviews.length === 0) return "";
  return `# REVIEWS HISTÓRICAS SIMILARES (de las 1640 scrapeadas en Trustpilot)

Estos son casos parecidos al actual. NO repitas estos errores en tu respuesta:

${reviews
  .map(
    (r, i) =>
      `${i + 1}. [${r.date} · ${r.rating}★ · ${r.language.toUpperCase()}] ${r.text}\n   PATRÓN DETECTADO: ${r.pattern}`,
  )
  .join("\n\n")}`;
}
