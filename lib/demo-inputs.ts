export type DemoInput = {
  id: string;
  label: string;
  language: string;
  scenario: string;
  email: string;
  expected_category: string;
  expected_escalation: boolean;
  pitch_note: string;
};

export const demoInputs: DemoInput[] = [
  {
    id: "demo-1",
    label: "Shipping delay (español)",
    language: "🇪🇸 ES",
    scenario: "Cliente española, pedido parado 22 días",
    email: `Hola, llevo 3 semanas esperando mi pedido #1234 y nadie me responde. He mandado 4 emails y solo recibo respuestas automáticas. Si en una semana no llega, voy a poner una reclamación en la OCU. Gracias.`,
    expected_category: "shipping_delay",
    expected_escalation: true,
    pitch_note: "Demuestra detección de OCU como señal de escalado + tono honest sobre el retraso",
  },
  {
    id: "demo-2",
    label: "Return broken (français)",
    language: "🇫🇷 FR",
    scenario: "Cliente francesa, problema con label de devolución de Reveni",
    email: `Bonjour, je veux retourner mon pull mais le lien que m'a envoyé Reveni ne fonctionne pas, il me génère une étiquette pour les États-Unis alors que je suis en France. Cela fait 2 semaines que j'écris sans réponse. C'est très décevant.`,
    expected_category: "return",
    expected_escalation: false,
    pitch_note: "Demuestra multi-idioma + reconocer problema Reveni + ofrecer label correcta directa",
  },
  {
    id: "demo-3",
    label: "Duty UK alert (English)",
    language: "🇬🇧 EN",
    scenario: "Cliente UK con problema de duty no pagado por Scuffers",
    email: `Hi team, I just received a threat of legal action from FedEx demanding I pay £45 in customs duty for my order #1235. Your website clearly states Scuffers covers UK duty. This is the second time this happens. I'm considering reporting this as misleading advertising.`,
    expected_category: "legal_risk",
    expected_escalation: true,
    pitch_note: "Caso legalmente sensible (UK duty fraud). Demuestra escalación inmediata + reconocimiento del problema crítico",
  },
  {
    id: "demo-4",
    label: "Sizing wrong (italiano)",
    language: "🇮🇹 IT",
    scenario: "Cliente italiano, talla incorrecta",
    email: `Ciao, ho ordinato una felpa taglia M ma è arrivata stretta come una S. Vorrei cambiarla con la L. Posso farlo gratis o devo pagare la spedizione di ritorno?`,
    expected_category: "sizing",
    expected_escalation: false,
    pitch_note: "Caso simple bien resuelto. Demuestra tono natural italiano + política clara de devolución",
  },
  {
    id: "demo-5",
    label: "Customs Chile shock (español LatAm)",
    language: "🇨🇱 ES (Chile)",
    scenario: "Cliente Chile, sticker shock por aduana FedEx",
    email: `Compré una sudadera por 130 euros y FedEx me cobró 105 euros más de impuestos en Chile, casi el precio de otra sudadera. En la web no avisaban de esto. ¿Pueden hacer algo? No es justo.`,
    expected_category: "customs_duty",
    expected_escalation: false,
    pitch_note: "Demuestra honestidad sobre impuestos LatAm + propuesta de mejora UX pre-checkout",
  },
];
