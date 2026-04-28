# scuffers® AI Ops Control Tower

Sistema interno de priorización para operaciones durante drops de alta demanda.

*As Always, With Love.*

---

## El problema

Durante un lanzamiento de capsule collection, ops Scuffers (~6.000 pedidos/mes, 50% internacional) enfrenta:

- Volumen elevado de pedidos en horas (180+ pedidos en este dataset)
- Presión sobre inventario (10 SKUs en stock crítico)
- Incidencias logísticas (FedEx / UPS / SEUR / Correos)
- Aumento de consultas (18 tickets, 8 urgent)

Sin un copiloto, cada minuto perdido = € quemados + clientes furiosos.

## Lo que hace el sistema

Pipeline en 3 pasos:

1. Carga 6 CSVs tolerantes a noise (orders, customers, inventory, tickets, campaigns, order_items).
2. Ejecuta 5 scorers determinísticos por dimensión + cross-feature joins.
3. Claude Sonnet 4.6 enriquece reasoning final.

Output: top 10 acciones priorizadas con tier P0–P3, cada una con urgencia / impacto / evidencia justificadas con datos concretos.

## Sistema de scoring (3 dimensiones)

- **Urgencia** (0–100): tiempo restante antes de que el problema escale.
- **Impacto** (0–100): € + clientes + reputación en juego.
- **Evidencia** (0–100): número de señales convergentes.

Score total: `urgencia × 0.40 + impacto × 0.35 + evidencia × 0.25`

Tiers:

- **P0** (≥85, inmediato)
- **P1** (≥70, esta hora)
- **P2** (≥55, este turno)
- **P3** (<55, monitoreo)

## Resultados sobre el dataset oficial (180 pedidos, 5 campañas, 18 tickets)

- **Top P0**: "Pausar CMP-778 TikTok very_high → HOODIE-BLK-M" — €4.200 ya quemados en producto sin stock.
- **3 campañas TikTok / IG quemando €9.900** en SKUs sin reposición confirmada.
- **VIP TCK-5505** con ticket urgent + negative (LTV €2.120) — escalado P0.
- **10 SKUs en stock crítico** identificados antes de oversell.
- **Latencia**: 0,3 s en determinístico, 30–60 s con LLM enrichment.

## Stack

Next.js 16 · Claude Sonnet 4.6 (vía CLI, sin API key) · TypeScript estricto · Tailwind · lucide-react. Cero dependencias pesadas.

## Cómo correr

```bash
cd scuffers-hackathon
npm install
npm run dev
```

Dos pantallas accesibles en `http://localhost:3000` (o el puerto que diga la consola):

- **`/`** — Fake homepage de Scuffers + chat widget abajo a la derecha. Demo del **Help@ Triage** (M3 del Customer Trust Engine). Resuelve FAQs reales en idioma del cliente: envíos, devoluciones, duty UK, tallas, tiendas. Escala automáticamente a humano (María/Jorge) si detecta legal/OCU/abogado.
- **`/ops`** — Dashboard interno **AI Ops Control Tower**. Lo que ve el equipo de soporte cuando el bot escala una conversación.

### Auth del chatbot · sin API key

El bot usa **tu suscripción Claude Max** vía `claude` CLI subprocess (mismo patrón que Pepita). Cero `ANTHROPIC_API_KEY`. Verifica:

```bash
which claude        # ~/.local/bin/claude
claude -p "hola"    # debe responder
cat .env.local      # USE_CLAUDE_CLI=true
```

### Flujo de la demo en vivo (90 s)

1. **0-15 s** · Abre `/`, scroll por hero + grid productos. *"Esto es la home de Scuffers, fake pero indistinguible"*.
2. **15-35 s** · Abre el chat (esquina inferior derecha) → escribe `¿Dónde está mi pedido #1234?` → respuesta en español personalizada (Marta, 22 días, hoodie negro), refund + 15% cupón en ~10 s.
3. **35-55 s** · Click en `Ver razonamiento` → drawer lateral con categoría detectada, RAG hits (3 reviews Trustpilot similares), latencia, coste, cache tokens.
4. **55-75 s** · Escribe `Esto es una estafa, voy a denunciar a la OCU` → bot detecta `legal_risk`, escala a María en <30 min (no intenta apaciguar).
5. **75-90 s** · Abre `/ops` → *"Esto es lo que ve María cuando el bot escala. Las dos mitades del Customer Trust Engine"*.

### Casos canónicos para probar

| Input | Categoría | Escala |
|---|---|---|
| `¿Dónde está mi pedido #1234?` | shipping_delay | NO |
| `Hi, will I pay UK duty over £150?` | customs_duty | NO |
| `Pedí talla M y me queda enorme` | return | NO |
| `Esto es una estafa, vais a OCU` | legal_risk | **YES** |
| `¿Qué tiendas tenéis?` | general | NO |


## Decisiones de diseño

- **Determinístico primero, LLM después**: scoring matemático defendible. Claude solo enriquece reasoning final, no decide ranking.
- **Tolerante a noise**: el loader maneja status no estándar (`payment_review`, `packed`), missing fields, formatos inconsistentes.
- **Diversidad forzada en top 10**: máx N acciones del mismo tipo. Aseguramos owners distintos (commercial / warehouse / customer_service / operations).
- **Score 3D explicable**: cada dimensión cita números concretos del `data_snapshot`, no es una caja negra.
- **Vistas explorables**: tabs adicionales para auditar manualmente pedidos, clientes, productos, tickets, campañas.

## Limitaciones honestas

- Stock prediction es regresión simple sobre `page_views_last_hour`, no ML.
- Datos sintéticos del briefing — la lógica de pesos puede ajustarse al dataset real.
- Sin auth real ni rate limiting.
- LLM enrichment cuesta ~$0,10 / análisis con suscripción Claude Code.

## Sources

- Dataset oficial del reto Scuffers AI Ops Control Tower (UDIA × ESIC, abril 2026).
- Briefing del reto recibido en el hackathon.
- Análisis previo de 1.640 reviews Trustpilot Scuffers (32 % son 1–2★ últimos 3 meses) que informó la calibración de impacto.
