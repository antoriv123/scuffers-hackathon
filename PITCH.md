# Pitch · scuffers® AI Ops Control Tower

## Hook (15s)

"Acabo de cargar vuestro dataset oficial — 180 pedidos. Mi sistema barre la Shipping API que publicasteis hace minutos en 10 segundos y revela que **22,8% de los pedidos del lanzamiento tienen problemas detectables**. **8 están retenidos en aduana — exactamente el riesgo legal UK que vuestros clientes citan en Trustpilot**. El sistema lo detecta como acciones P0 sin que nadie tenga que mirar."

## Problema (15s)

Durante un drop, ops no puede revisar 180 pedidos + 22 SKUs + 18 tickets + 5 campañas a la vez. Cada minuto que tardáis en pausar una campaña agotada son cientos de euros + un cliente furioso. La realidad: Trustpilot tiene 533 quejas críticas vuestras solo en 3 meses.

## Solución (30s)

Pipeline en 4 capas:

1. **Carga 6 CSVs** tolerantes a noise (orders, customers, inventory, tickets, campaigns, order_items).
2. **5 scorers determinísticos** con cross-feature joins generan candidatos de acción.
3. **Shipping API en directo** enriquece el modelo: barrido de 200 órdenes activas en 10 segundos, ajusta urgencia/impacto/evidencia y emerge acciones sintéticas que el modelo base no veía.
4. **Claude Sonnet** enriquece el reasoning final con tono *"As Always With Love"* — pero el ranking es determinístico, defendible, auditable.

Output: top 10 acciones con tier P0–P3 y score 3D (urgencia × 0,40 + impacto × 0,35 + evidencia × 0,25). Cada acción cita números concretos del data_snapshot.

## Cómo cambia la decisión gracias a la API

- **17 rankings cambiados** tras cruzar Shipping API.
- **9 acciones sintéticas** que el modelo base no detectaba.
- ORD-10521 sube a P0 porque la API marca `customs_hold` (riesgo legal UK).
- ORD-10547 + ORD-10412 emergen como `exception` con `out_of_stock_at_hub` y `carrier_issue`.
- ORD-10440 sube por `delayed` con `address_issue` + 2 intentos de entrega + `requires_manual_review=true`.

La API no sustituye mi análisis. **Lo enriquece. Y mi sistema funciona también si la API cae** — fallback automático a score base.

## Por qué es defendible

- Determinístico = transparente, sin alucinación. Cada score se calcula con una fórmula visible.
- Claude solo enriquece reasoning, no decide ranking.
- Score 3D con explicación literal de cada dimensión.
- Vistas adicionales (Pedidos / Clientes / SKUs / Tickets / Campañas) permiten auditar manualmente.
- Tolerancia a fallos: timeout 90s en LLM, retry+fallback en Shipping API, cache 60s para evitar re-fetch.

## Cierre (15s)

"MVP en pocas horas con vuestros datos reales. Una semana más: cron cada 5 min en producción, webhook a Slack para los P0, calculador de duty UK pre-checkout que reduce el riesgo legal abierto que tenéis en Trustpilot. Estáis aquí porque queréis a alguien que ENTREGUE. Yo entrego."

---

## 3 preguntas que pueden hacerme + respuestas (máx 30s)

### P: "¿Y si los datos son mucho más volumen, 100K pedidos?"

R: "El loader es streaming-ready, parser línea a línea. Los scorers son O(n) con joins por hash maps. A 100K pedidos sigue corriendo en <5 segundos en CPU normal. Para Shipping API no consulto todos — solo los activos (status NOT IN delivered/cancelled), con cap 200 y cache 60s. Si necesitarais más, lo paralelizo con worker threads o lo migro a un cron pre-calculado."

### P: "¿Por qué no usar ML clásico?"

R: "Porque el dataset es pequeño y el problema es operativo, no predictivo. ML aquí sería overengineering. Las reglas que aplico son las que ops ya aplica mentalmente — solo las hago explícitas, ponderadas y rápidas. Cuando tengáis 18 meses de datos históricos os monto un modelo de demand forecasting encima. Hoy no es necesario."

### P: "¿Cuánto tarda en producción real?"

R: "Determinístico, 300 ms con 180 pedidos. Shipping API sweep, 10 s para 180 órdenes con concurrency 8. LLM enricher 30–60 s la primera llamada (cache miss), 5–10 s las siguientes. Si lo deployáis serverless con cron cada 5 min, ops team siempre tiene un top 10 actualizado y un Slack alert para cada P0 que emerge."

### P: "¿Qué pasa si la Shipping API cae?"

R: "Fallback automático. Cada llamada tiene timeout 5 s, retry 1× en 429, y si falla todo se devuelve `null` y el candidato se procesa con score base. El sistema sigue dando top 10 sin la API. Lo verifiqué con un curl forzando 500 — el endpoint /api/analyze sigue respondiendo con `_meta.fallback_used=true` y los rankings se mantienen. Cero hard dependency."
