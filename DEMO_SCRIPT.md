# Demo Script · 90 segundos cronometrados

*Setup: pantalla en `localhost:3005/ops`, dashboard ya cargado, tab "Acciones" activo. Modo determinístico ON para arranque rápido.*

---

**0–8s** — Apunta hero strip:
> "Hace 12 minutos cargué vuestros 6 CSVs y conecté vuestra Shipping API. Lo que veis es 180 pedidos, 22 SKUs, 18 tickets analizados en 10 segundos."

**8–20s** — Apunta "€10.700 EN RIESGO" + "10 SKUs CRÍTICOS":
> "Spend en campañas activas apuntando a productos cuyo stock disponible es menor que las reservas. El sistema cruza inventory con campaigns en tiempo real."

**20–35s** — Click en TOP 1 (Pausar CMP-778). Modal abre:
> "Acción P0. Score 92. Tres señales convergentes: campaña TikTok very_high → HOODIE-BLK-M con 2 unidades disponibles, 32 reservadas, sin ETA. Ya €4.200 gastados quemándose. Si yo no lo paro, lo van a comprar 12 personas que no van a recibir nada."

**35–55s** — Cierra modal. Scroll a una P0 con shipping_alert (ORD-10521 customs_hold):
> "Aquí ya entra vuestra Shipping API. ORD-10521 con `customs_hold` confirmado. **Esto es exactamente el riesgo legal UK del que vuestros propios clientes hablan en Trustpilot — tenéis 8 pedidos así ahora mismo**. El sistema lo eleva a P0 sin que nadie tenga que mirar."

**55–70s** — Click tab "Pedidos" y filtra por `delay_risk > 0.5`:
> "Cualquiera puede auditar. La API revela 22,8% de los pedidos activos con problemas detectables. **17 rankings del top 10 cambiaron** cuando crucé con la API. **9 acciones nuevas emergieron** que el modelo base no veía."

**70–82s** — Vuelve "Acciones". Toggle modo LLM:
> "El ranking es determinístico. Si quiero que Claude reescriba las razones en tono Scuffers, activo este toggle. Tarda 10 segundos en cache caliente."

**82–90s** — Cuando vuelve LLM. Apunta footer `scuffers® · As Always With Love`:
> "Stack mínimo. La API enriquece, no sustituye. 10 céntimos por análisis con LLM. Cero coste en determinístico. Si la API cae, fallback automático. Esto va a producción como cron cada 5 min y un webhook a Slack."

---

## Backup paths si algo falla

| Síntoma | Acción inmediata |
|---|---|
| LLM tarda >60s | Toggle a determinístico, decir: "Aquí lo tenéis en modo determinístico, mucho más rápido para producción" |
| Shipping API cae mid-demo | Decir: "Fallback automático activo. Veis `_meta.fallback_used=true` en la respuesta. Cero hard dependency con la API." |
| Servidor muere | `npm run dev` en otra terminal, mismo puerto 3005 |
| Modal no abre | F5 (recargar página), vuelve a estado limpio |
| Pantalla negra | Demo desde móvil con la URL Vercel preview |

---

## Cifras a memorizar antes del pitch

- **180 pedidos** analizados
- **22,8 %** con problemas de envío detectables
- **15 P0 críticos** (delay_risk > 0,7)
- **8 en customs_hold** = riesgo legal UK
- **17 rankings cambiados** por la API
- **9 acciones sintéticas** generadas
- **VIP top: ORD-10520 con LTV €1.333** bloqueado en hub
- **Latencia**: 0,3 s determinístico · 10 s sweep API · 30–60 s LLM (1ª) · 5–10 s siguientes
