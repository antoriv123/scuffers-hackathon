export type MockResponse = {
  category: string;
  language_detected: string;
  escalate_human: boolean;
  escalate_reason: string | null;
  reply: string;
  internal_notes: string;
  suggested_compensation: {
    refund: boolean;
    discount_next_order_pct: number;
    free_shipping_next: boolean;
  } | null;
};

const responses: Record<string, MockResponse> = {
  "demo-1-shipping-es": {
    category: "shipping_delay",
    language_detected: "es",
    escalate_human: true,
    escalate_reason:
      "Cliente menciona OCU como vía de reclamación legal. Caso a manos humanas inmediato.",
    reply: `Hola Marta,

Tienes toda la razón en estar enfadada. Tu pedido #1234 lleva 22 días vía FedEx y eso no debería pasar. Asumimos que ha habido un fallo nuestro y lo arreglamos hoy.

Te ofrezco dos opciones, eliges tú:

1. Refund inmediato del pedido completo (75€) + cupón del 10% para tu próxima compra. Lo proceso en cuanto me confirmes.

2. Reenvío express del mismo pedido desde Madrid mañana mismo, garantizado en 48h, con el mismo cupón del 10% como compensación.

Que sepas que hemos abierto incidencia con FedEx por tu pedido para que esto no vuelva a pasar. Y que tu queja la lleva un humano del equipo a partir de ahora — no más respuestas automáticas.

Cuéntame qué prefieres y en 30 minutos lo tienes resuelto.

As Always, With Love.
El equipo de Scuffers.`,
    internal_notes:
      "ALTA prioridad. Cliente menciona OCU = riesgo legal/reputacional. Pedido #1234 (75€, FedEx, 22 días). Verificar tracking real, abrir incidencia FedEx, asignar a humano (Jorge o María). Ya hay 4 emails previos sin respuesta. Compensar con dinero real, NO store credit.",
    suggested_compensation: {
      refund: true,
      discount_next_order_pct: 10,
      free_shipping_next: false,
    },
  },

  "demo-2-return-fr": {
    category: "return",
    language_detected: "fr",
    escalate_human: false,
    escalate_reason: null,
    reply: `Bonjour,

Tu as raison, c'est inacceptable d'attendre 2 semaines pour une réponse. Je m'en occupe maintenant.

Le problème vient de notre prestataire de retours (Reveni) qui a généré une étiquette US au lieu d'une étiquette France — c'est une erreur récurrente que nous sommes en train de corriger.

Voici ton étiquette correcte pour la France :
👉 https://returns.scuffers.com/label/{order_id}/FR

Le retour est gratuit (on assume nous-mêmes les frais à cause de notre erreur). Dépose le colis dans n'importe quel point relais France, et dès que la traçabilité confirme l'envoi, on lance le remboursement complet sans attendre la réception.

En plus, je t'envoie un code de 15% pour ta prochaine commande : THANKS-FF15

Désolés pour la galère, sincèrement.

As Always, With Love.
L'équipe Scuffers.`,
    internal_notes:
      "Caso típico fallo Reveni: label US para envío FR. Confirmar generación label FR vía Shopify Shipping API. Refund preventivo antes de recepción para reducir fricción. Aplicar código THANKS-FF15 (15%) por el doble fallo (Reveni + 2 sem sin respuesta). Marcar como pattern recurrente para acumular evidencia anti-Reveni.",
    suggested_compensation: {
      refund: true,
      discount_next_order_pct: 15,
      free_shipping_next: true,
    },
  },

  "demo-3-duty-uk-en": {
    category: "legal_risk",
    language_detected: "en",
    escalate_human: true,
    escalate_reason:
      "UK duty fraud risk — customer threatens misleading advertising report. Repeat case (second time). Critical legal exposure for Scuffers.",
    reply: `Hi,

You are right to be frustrated, and we owe you both an apology and an immediate resolution.

The duty charge from FedEx should have been covered by us as our website states. We are reimbursing the £45 in full to your original payment method today, plus a £45 credit on top as an apology for having to chase us twice.

A senior member of our team is taking ownership of your case directly. You will hear from a real person (not an automated reply) within the next 24 hours with confirmation of the refund and what we are doing to prevent this from happening to you or any other UK customer again.

We are also reviewing the FedEx duty handling process company-wide as a result of cases like yours. Your feedback is genuinely shaping how we operate.

We are sorry. As Always, With Love.
The Scuffers Team`,
    internal_notes:
      "🚨 CRÍTICO LEGAL. Cliente UK con duty FedEx no pagado por Scuffers. SEGUNDA vez ocurre con este cliente. Amenaza con reportar como misleading advertising — riesgo regulatorio. ESCALAR INMEDIATAMENTE a Jaime/Javier o legal. Refund duty + £45 extra de compensación. Abrir ticket interno: revisar política UK duty con FedEx, comprobar impacto en otros pedidos UK >£135. NO usar plantillas — humano senior responde personalmente.",
    suggested_compensation: {
      refund: true,
      discount_next_order_pct: 0,
      free_shipping_next: true,
    },
  },

  "demo-4-sizing-it": {
    category: "sizing",
    language_detected: "it",
    escalate_human: false,
    escalate_reason: null,
    reply: `Ciao,

Nessun problema, te la cambiamo subito con la L gratis.

Ecco l'etichetta di reso:
👉 https://returns.scuffers.com/label/{order_id}/IT

Spedisci la M in qualsiasi punto SDA o Poste Italiane (gratis), e appena ci arriva tracking, ti spediamo la L senza aspettare la verifica.

Tempo totale stimato: 3-5 giorni lavorativi se la deposito è oggi.

Grazie per la pazienza, ci si vede dentro a la FF FAM.

As Always, With Love.
Il team Scuffers.`,
    internal_notes:
      "Cambio talla simple Italia. Generar label IT vía Shopify Shipping. NO esperar recepción para mandar L (cliente FF FAM repeat, riesgo bajo). Tiempo estimado: 3-5 días si depósito hoy. Confirmar stock L disponible antes de enviar.",
    suggested_compensation: {
      refund: false,
      discount_next_order_pct: 0,
      free_shipping_next: true,
    },
  },

  "demo-5-customs-cl": {
    category: "customs_duty",
    language_detected: "es",
    escalate_human: false,
    escalate_reason: null,
    reply: `Hola,

Entiendo el cabreo y tienes razón en parte: deberíamos haber sido más claros antes de la compra.

Aquí va lo que es real, sin maquillar:

Los 105€ que te cobró FedEx son una mezcla de impuestos chilenos (IVA 19% + arancel) y la tarifa de manejo aduanero de FedEx. **Esos cargos no los podemos asumir nosotros porque van directos al gobierno chileno y al carrier — son ineludibles para cualquier importación**.

Lo que SÍ es nuestra responsabilidad es no haberte avisado en checkout. Eso lo arreglamos:

- Te mando 30€ de cupón para tu próxima compra como reconocimiento del fallo de comunicación.
- Estamos implementando un calculador de aduana en checkout para clientes LatAm en las próximas semanas, para que sepas el coste total real antes de pagar.

Tu sudadera la disfrutas, y la próxima vez no habrá sorpresas. Eso te lo prometo.

As Always, With Love.
El equipo de Scuffers.`,
    internal_notes:
      "Cliente Chile, sticker shock 105€ duty FedEx + impuestos. Honestidad: NO podemos cubrir duty gubernamental. SÍ asumimos el fallo de comunicación. 30€ cupón compensación. PUSH al equipo product: calculador duty pre-checkout para LatAm es prioridad alta — patrón visto en >10 reviews de Trustpilot ene-abr 2026 (Chile, Argentina, México).",
    suggested_compensation: {
      refund: false,
      discount_next_order_pct: 0,
      free_shipping_next: true,
    },
  },

  fallback: {
    category: "general",
    language_detected: "es",
    escalate_human: false,
    escalate_reason: null,
    reply: `[MODO DEMO sin API key]

Esto es un placeholder. Para ver respuestas reales generadas por Claude Sonnet 4.6:

1. Edita .env.local con tu ANTHROPIC_API_KEY real.
2. Reinicia el dev server.
3. Vuelve a generar respuesta.

Las 5 demos pre-cargadas tienen respuestas detalladas pre-generadas que sí funcionan en este modo. Pruébalas con los botones de arriba.`,
    internal_notes:
      "Modo demo activo (sin API key). Solo las 5 demos pre-cargadas tienen respuesta. Para emails libres, conectar Anthropic API.",
    suggested_compensation: null,
  },
};

export function findMockResponse(email: string): MockResponse {
  const normalized = email.trim().toLowerCase();

  if (normalized.includes("ocu") && normalized.includes("#1234")) {
    return responses["demo-1-shipping-es"];
  }
  if (normalized.includes("reveni") || (normalized.includes("étiquette") && normalized.includes("états-unis"))) {
    return responses["demo-2-return-fr"];
  }
  if (normalized.includes("misleading advertising") || (normalized.includes("fedex") && normalized.includes("£45"))) {
    return responses["demo-3-duty-uk-en"];
  }
  if (normalized.includes("felpa") || (normalized.includes("taglia") && normalized.includes("stretta"))) {
    return responses["demo-4-sizing-it"];
  }
  if (normalized.includes("chile") || (normalized.includes("105") && normalized.includes("fedex"))) {
    return responses["demo-5-customs-cl"];
  }

  return responses["fallback"];
}
