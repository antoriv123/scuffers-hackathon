/**
 * Knowledge base de Scuffers organizada por categoría.
 * Cada chunk se inyecta en el system prompt según el caso clasificado.
 * Datos verificados: web oficial, Trustpilot scrape (1640 reviews), Modaes,
 * FashionUnited, Teamtailor (oferta AI Builder).
 */

export type KbChunk = {
  id: string;
  category: string;
  title: string;
  content: string;
};

export const knowledgeBase: KbChunk[] = [
  {
    id: "brand-dna",
    category: "always",
    title: "Brand DNA y voz",
    content: `Scuffers nació en Madrid en 2018, fundada por Jaime Cruz Vega y Javier López Reinoso (16 y 17 años entonces). Lema: "As Always, With Love". Comunidad: "FF FAM" (Friends and Family). Estética: streetwear mediterráneo (oversized, tejidos lavados, paleta neutra). Referentes admitidos: Stüssy, Jacquemus.

TONO de comunicación cliente:
- Cercano, NUNCA corporativo. El cliente es FF FAM, no "estimado/a cliente".
- Honesto: si hay un retraso, di que hay un retraso. Prohibido "estamos trabajando en ello" sin contexto.
- Sin jerga corporativa. Sin "atentamente". Sin "lamentamos los inconvenientes".
- Empieza con el nombre del cliente cuando lo tengas.
- Cierra con "As Always, With Love" (en cualquier idioma, mantener original).
- Cero hype: no "increíble", "excepcional", "100% garantizado".
- Una idea por frase. Frases cortas.

NUNCA decir:
- "Pónganse en contacto con help@scuffers.com" (esa es la queja del cliente).
- "Disculpe las molestias" como única respuesta.
- "Estamos investigando" sin acción concreta.
- Promesas vacías de timing ("pronto", "en breve").`,
  },
  {
    id: "shipping-policy",
    category: "shipping_delay",
    title: "Política de envíos y carriers",
    content: `Carriers actuales:
- FedEx (principal, ~70% de pedidos internacionales)
- UPS (UK secundario, devoluciones)
- SEUR (España)
- Correos Express (España)

Tiempos esperados (publicados):
- España: 24-48h
- EU: 4 días laborables
- UK/Suiza: 4-6 días
- US: 5-7 días
- LatAm/Asia: 7-12 días

Tiempos REALES (de las 1640 reviews 2026-Q1):
- España: 3-7 días en muchos casos (SEUR/Correos generan errores de dirección).
- Internacional: 7-21 días con frecuencia. Aduana añade hasta 14 días extra.
- 105 quejas (20% de las críticas) por espera >2 semanas.

Política recuperación recomendada:
- Si pedido >5 días sin movimiento de tracking: ofrecer refund inmediato + 10% next order.
- Si pedido >2 semanas sin entrega: refund completo + cupón 15% sin pedir devolución (porque clave es retener al cliente).
- NUNCA hacer esperar al cliente "hasta que el carrier responda" — esa actitud genera el 30% de las quejas 1-estrella.

Mensajería de tracking:
- Si tracking parado >48h en mismo estado: avisar al cliente proactivamente, no esperar a que reclame.`,
  },
  {
    id: "returns-policy",
    category: "return",
    title: "Política de devoluciones (incluido problema Reveni)",
    content: `Proveedor de gestión de devoluciones: Reveni (third-party). Es fuente confirmada de fricción — múltiples reviews mencionan que genera labels incorrectas (label US para envíos a Francia, Dinamarca, etc.).

Política de devolución:
- Devolución gratis dentro de España.
- Devolución internacional: cargo aprox 10-15€ (cliente paga).
- Plazo: 14 días desde la entrega.
- Mystery boxes: política especial — sólo cambio de talla, no devolución.
- País Isle of Man y otros tax havens: NO devolución según política.

PROBLEMAS HABITUALES en devoluciones (de 1640 reviews):
1. Reveni genera label incorrecta para país del cliente (label US para envío UE).
2. Cliente paga reenvío que debería haber sido gratis por error de Scuffers.
3. Refund se hace como "store credit/abono" en vez de dinero real → genera reclamación adicional.
4. Tiempo de procesamiento: 2-4 semanas vs 7 días que promete la web.

Política a aplicar cuando hay error de Scuffers:
- Refund DINERO REAL al método original (NO store credit forzado).
- Free shipping en próximo pedido.
- Cupón 10-15% si hubo doble fallo (envío + soporte lento).
- Generar label correcta vía Shopify Shipping API si Reveni falla.

Link mock label: https://returns.scuffers.com/label/{order_id}/{country_code}`,
  },
  {
    id: "customs-uk-risk",
    category: "customs_duty",
    title: "Aduanas, duty UK y impuestos LatAm — RIESGO LEGAL",
    content: `⚠️ ALERTA LEGAL ABIERTA:

Web Scuffers anuncia que cubre el duty para UK >£135. EVIDENCIA EN REVIEWS muestra que NO siempre lo cubren — FedEx ha amenazado con acción legal contra clientes individuales por duty no pagado por Scuffers (29 ene 2026 entre otras).

Esto es publicidad engañosa potencial bajo UK CMA / Trading Standards.

Política de respuesta cuando llegue queja UK duty:
- ESCALAR INMEDIATAMENTE a humano senior (Jaime/Javier o legal).
- Refund del duty pagado por el cliente vía FedEx + 100% extra como compensación + free shipping.
- NO usar plantilla. Persona real responde.
- Ticket interno alta prioridad para revisar política UK con FedEx.

Política LatAm (Chile, Argentina, México):
- Aduana e impuestos LOCALES son inevitables (gobierno local + manejo FedEx).
- Cliente PAGA estos cargos. Scuffers NO los cubre.
- Promedio cargo total: 30-80% del valor del pedido en LatAm.

Política de respuesta para sticker shock LatAm:
- Honestidad brutal: explicar qué es duty, qué es manejo FedEx, qué es IVA local.
- NO disculparse por algo inevitable. SÍ disculparse por no haberlo comunicado en checkout.
- Compensar con cupón 30€ por fallo de comunicación.
- Push interno a product team: implementar tax calculator pre-checkout para LatAm.

UE (DE, IT, FR, NL, AT, BE, etc.): sin duty, IVA aplicado correctamente desde España.

US: cliente paga import duty solo si pedido >$800 (umbral de minimis). Mayoría no aplica.`,
  },
  {
    id: "stores-locations",
    category: "general",
    title: "Tiendas físicas y pop-ups",
    content: `Tiendas permanentes:
- Madrid: 2 tiendas + Las Rozas Village outlet
- Barcelona: 2 tiendas + La Roca Village outlet
- Valencia: 1 tienda
- Ámsterdam: tienda permanente abierta marzo 2025 (primera internacional permanente)

Pop-ups activos/recientes:
- París Le Marais: 84 Rue de Turenne, 10 abr - 10 may 2026 ("L'Appartement" inspirado en Sézane)
- Milán: pop-up activo desde mayo 2025
- Berlín, Londres, LA: cerrados

Próxima apertura probable: tienda permanente París (orillas del Sena, 2026-2027).

Política tiendas físicas:
- Devoluciones: en cualquier tienda física (España).
- Eventos: lanzamientos de drops, música en directo, activación FF FAM.
- Pop-up Madrid 2023 atrajo 10.000+ asistentes.`,
  },
  {
    id: "products-catalog",
    category: "sizing",
    title: "Catálogo y guía de tallas",
    content: `Categorías:
- Hoodies (core, oversized fit por defecto, ve a tu talla habitual)
- T-shirts, tank tops, polos, long sleeves (fit relajado)
- Crewnecks, knitwear (fit oversized)
- Pants, sweatpants, shorts (fit relajado-recto)
- Outerwear (chaquetas, abrigos)
- Footwear: Iconic Suede Shoes, Iconic Suede Boots, Iconic Radiant, Iconic Camo, Iconic Original, Iconic Mule, Iconic Braided
- Accesorios: gorras, bolsas, cinturones, calcetines
- Joyería
- Swimwear

Sizing notes (de reviews):
- M = oversized, equivale a una L tradicional.
- Hoodies a veces vienen ligeramente distintos entre lotes (problema QA conocido).
- Footwear talla EU estándar.
- Pants longitud puede ser larga para gente <1.65m.

Política sizing wrong:
- Cambio gratis dentro de España (24-48h reposición).
- Internacional: label de devolución gratis si confirma el cliente que la web dice "M oversized" pero fitting fue claramente más pequeño.
- Si el cliente pide L cuando pidió M y M le quedó pequeño: cambio sin coste, generalmente 3-5 días.`,
  },
  {
    id: "compensation-policy",
    category: "always",
    title: "Política de compensación a clientes",
    content: `Compensación por nivel de fallo:

Nivel 1 — Inconveniente menor (talla, color ligeramente distinto):
- Free shipping en próximo pedido.

Nivel 2 — Fallo de servicio (envío lento, una respuesta lenta):
- Cupón 10% next order.
- Free shipping próximo pedido.

Nivel 3 — Fallo serio (pedido perdido, devolución mal gestionada por Reveni, espera >2 sem):
- Refund completo en DINERO REAL (no store credit).
- Cupón 15% next order.
- Free shipping próximo pedido.

Nivel 4 — Riesgo legal/reputacional (UK duty, posible OCU/abogado, queja viral en IG):
- Refund completo + compensación adicional (ej: 100% del duty pagado de más).
- Escalado a humano senior.
- Free shipping vitalicio para ese cliente.
- Ticket interno alta prioridad.

REGLA DE ORO: si el fallo es de Scuffers, el cliente NO debería pagar nada extra ni perder dinero.

Cupones disponibles (válidos en demo):
- THANKS-FF10 (10% next order)
- THANKS-FF15 (15% next order)
- SCUFFERS-RECOVER (envío gratis + 20% next)`,
  },
  {
    id: "common-cases-patterns",
    category: "always",
    title: "Patrones comunes detectados en 1640 reviews recientes",
    content: `Estadísticas reales (Trustpilot 20 ene - 26 abr 2026):
- 1640 reviews totales
- 32,5% son 1-2 estrellas (533 quejas críticas en 3 meses)
- TrustScore actual: 3,5/5
- Tendencia: estable mes a mes (problema crónico, no estacional)

TOP 6 patterns de quejas (frecuencia):
1. Espera >2 semanas (105 casos, 20%): pedido parado en tránsito sin updates.
2. Refund tardío o ausente (56 casos, 11%): cliente devolvió, no recibe dinero.
3. Wrong/missing item (48 casos, 9%): pedido parcial, item incorrecto.
4. Talla incorrecta (35 casos, 7%): inconsistencia entre lotes mismo M.
5. Calidad inconsistente (34 casos, 6%): cremalleras rotas, costuras, manchas.
6. Aduana/duty no comunicado (13 casos, 2,4%): incluye 4 casos de UK duty fraud.

Idiomas: inglés 57%, español 11%, francés 11%, italiano 2,5%, otros 18%.

Señales de escalado a humano (palabras clave):
- "OCU", "Trustpilot", "Instagram público"
- "abogado", "denuncia", "policía"
- "estafa", "scam", "fraud"
- "legal action", "Trading Standards", "regulator"
- Cliente con valor pedido >300€
- Cliente menciona >3 emails sin respuesta
- Mención FedEx duty UK (riesgo legal abierto)`,
  },
];

export function selectKnowledge(category: string): KbChunk[] {
  return knowledgeBase.filter(
    (k) => k.category === "always" || k.category === category,
  );
}

export function buildAugmentedPrompt(
  basePrompt: string,
  category: string,
): string {
  const chunks = selectKnowledge(category);
  const knowledge = chunks
    .map((c) => `### ${c.title}\n${c.content}`)
    .join("\n\n---\n\n");

  return `${basePrompt}

# KNOWLEDGE BASE — contexto retrieved para esta categoría: ${category}

${knowledge}`;
}
