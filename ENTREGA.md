# scuffers® AI Ops Control Tower — Entrega

**Candidato**: Antonio Rivero Toledo · `SCF-2026-9964`
**Reto**: Scuffers AI Ops Control Tower (UDIA × ESIC × Scuffers · 28 abril 2026)

---

## 1. Resumen ejecutivo

Sistema de priorización operativa para Scuffers durante un lanzamiento de alta demanda. Toma 6 CSVs (orders, customers, inventory, support_tickets, campaigns, order_items), cruza datos vía 5 scorers determinísticos, enriquece con la **Shipping API publicada en vivo durante el reto**, y devuelve **top 10 acciones priorizadas** con scoring 3D (urgencia / impacto / evidencia) y tier P0–P3.

**Resultados sobre el dataset oficial (180 órdenes, 5 campañas, 18 tickets)**:

- **17 rankings cambiados** tras cruzar Shipping API.
- **9 acciones sintéticas** que el modelo base no detectaba.
- **22,8 % de pedidos del lanzamiento con problemas detectables**.
- **8 pedidos en `customs_hold`** = riesgo legal UK directo (Trustpilot lo confirma).
- **€9.900 en spend** en campañas activas apuntando a SKUs sin stock.
- **5 SKUs en stock crítico**, **5 VIPs en riesgo**, **8 tickets urgent** abiertos.
- Latencia: **0,3 s en determinístico**, **3,2 s con Shipping API**, **30–60 s con LLM** (cache miss).

La API enriquece el modelo, no lo sustituye. Si la API cae, fallback automático.

---

## 2. Enfoque / arquitectura

```
[6 CSVs (180 orders, 120 customers, 22 SKUs, 18 tickets, 5 campaigns)]
            ↓
[Loader robusto · tolerante a noise / formatos inconsistentes / status no estándar]
            ↓
[Normalizers · enriched joins (order ↔ customer ↔ inventory ↔ ticket ↔ campaign)]
            ↓
[5 scorers determinísticos · stock, customer, order, ticket, campaign overload]
            ↓
[generateCandidates · cross-feature joins → ~30 acciones candidatas]
            ↓
[Shipping API sweep · 200 órdenes activas · concurrency 8 · cache 60s · retry+fallback]
            ↓
[recalculateScoresWithShipping · boost urgencia/impacto/evidencia + alerts]
            ↓
[generateShippingDrivenCandidates · 9 acciones sintéticas extra]
            ↓
[selectTopN(10) con diversidad forzada por owner]
            ↓
[attachScoreDimensions · score 3D + tier P0–P3]
            ↓
[enrichCandidatesWithLLM (opcional) · Claude Sonnet 4.6 vía CLI · timeout 90s + fallback]
            ↓
[10 acciones finales con title, reason, expected_impact, confidence, owner, automation_possible]
```

### Sistema de scoring (3 dimensiones)

| Dimensión | Peso | Qué mide |
|---|---|---|
| **Urgencia** | 0,40 | Tiempo restante antes de que el problema escale |
| **Impacto** | 0,35 | € + clientes + reputación en juego |
| **Evidencia** | 0,25 | Número de señales convergentes |

**Tiers**: P0 (≥85, inmediato) · P1 (≥70, esta hora) · P2 (≥55, este turno) · P3 (<55, monitoreo).

### Stack

- **Next.js 16** (App Router) + **TypeScript estricto** + **Tailwind**
- **Claude Sonnet 4.6** vía Claude Code CLI (sin `ANTHROPIC_API_KEY` requerida en local)
- Resiliencia: timeout 90 s, retry 1×, fallback determinístico, cache shipping 60 s
- Cero dependencias pesadas (sin LangChain, sin frameworks ML)

### Dos pantallas

- **`/`** — Fake homepage de Scuffers + chat widget. Demuestra el frontal del cliente.
- **`/ops`** — Control Tower interno. Lo que ve operations cuando el bot escala.

---

## 3. Repositorio

🔗 **https://github.com/antoriv123/scuffers-hackathon**

Branch principal: `main`. Build CI verde. README con instrucciones completas.

---

## 4. Demo en vivo

🔗 **https://scuffers-control-tower-fzzbulfes-antoriv-icloudcoms-projects.vercel.app/**

- `/` → homepage con chat widget Scuffers
- `/ops` → Control Tower (la entrega principal)

Variables de entorno en producción: `CANDIDATE_ID=SCF-2026-9964`. La Shipping API se invoca contra el endpoint oficial publicado durante el reto. En Vercel serverless el modo LLM hace fallback automático a determinístico (Claude CLI no disponible en el runtime); el modo determinístico es 100 % funcional con todas las features incluidas la Shipping API live.

---

## 5. Vídeo de presentación

🔗 **[PENDIENTE — añadir URL Loom de 90 s]**

Sigue el guion de `DEMO_SCRIPT.md` del repositorio.

---

## 6. Top 10 acciones priorizadas (snapshot actual)

JSON completo en `/tmp/scuffers-pitch/top10-entrega.json` (también disponible vía `GET /api/analyze?llm=false&top=10`).

| # | Tier | Score | Owner | Acción |
|---|---|---|---|---|
| 1 | P0 | 87 | commercial | Pausar `tiktok_paid CMP-778 → HOODIE-BLK-M` (€4.200 quemándose, 2 dispo vs 32 reservadas, sin ETA, 4.573 visitas/h) |
| 2 | P0 | 87 | commercial | Pausar `instagram_organic CMP-780 → ZIP-BLK-M` (€2.600, 6 vs 37 reservadas, sin ETA) |
| 3 | P0 | 87 | commercial | Pausar `tiktok_paid CMP-779 → TEE-WHT-S` (€3.100, 2 vs 40 reservadas) |
| 4 | P1 | 84 | warehouse | Restock urgente `HOODIE-BLK-M` (2 dispo, 32 reservadas, 4.573 visitas/h, sin ETA) |
| 5 | P2 | 67 | operations | Revisar manualmente `ORD-10521` — `customs_hold` confirmado por Shipping API → riesgo legal UK |
| 6 | P2 | 65 | customer_service | Contacto proactivo `ORD-10547` — `exception` con `out_of_stock_at_hub` (delay_risk 0,82) |
| 7 | P2 | 65 | customer_service | Contacto proactivo `ORD-10412` — `exception` con `carrier_issue` (delay_risk 0,75) |
| 8 | P2 | 59 | operations | Expedite `ORD-10440` — `delayed` con `address_issue`, 2 intentos de entrega |
| 9 | P2 | 59 | operations | Revisar manualmente `ORD-10411` — `customs_hold` (riesgo legal UK) |
| 10 | P3 | 50 | operations | Expedite `ORD-10543` — `delayed` con `address_issue` |

Cada acción incluye: `score_dimensions` con explicación literal, `_data_snapshot` con datos crudos, owner asignado, automation_possible flag.

---

## 7. Limitaciones conocidas

1. **Stock prediction es regresión simple** sobre `page_views_last_hour`, no ML. Para 18 meses de datos históricos, integraría modelo de demand forecasting.
2. **LLM enrichment local-only**: usa Claude Code CLI con suscripción Claude Max para evitar coste por API. En Vercel serverless el sistema cae a modo determinístico automáticamente. Para producción, swap a Anthropic API directa con `ANTHROPIC_API_KEY` (~$0,10/análisis con prompt caching).
3. **Shipping API tolerante pero no autenticada bidireccional**: read-only contra el endpoint del reto. En producción real necesitaría webhook bidireccional para refrescar status sin polling.
4. **Sin auth ni rate limiting**: el endpoint `/api/analyze` está abierto. En producción iría detrás de SSO + rate limit por equipo (operations vs marketing vs warehouse).
5. **Datos sintéticos**: la calibración de pesos del scoring está optimizada para el dataset del reto. Con datos reales de 6.000 pedidos/mes, los pesos deberían recalibrarse con A/B testing contra decisiones humanas históricas.
6. **No `expedite_shipping` automático**: el sistema lo recomienda pero no lo ejecuta. Producción real requeriría integración con Shopify Admin API + permisos del equipo de warehouse para forzar prioridad logística.

---

## 8. Diferenciadores (campos extra opcionales)

### Investigación previa

Análisis previo de **1.640 reviews Trustpilot recientes** de Scuffers para calibrar el modelo de impacto. Hallazgos críticos que informaron el diseño:

- 32 % son 1–2 estrellas en últimos 3 meses (problema crónico, no estacional).
- Reveni (proveedor de devoluciones) genera labels US para envíos a Dinamarca → fricción documentada.
- Reviews citan a María y Jorge (agentes de soporte) por nombre.
- Riesgo legal UK abierto: FedEx denuncia a clientes individuales por duty no pagado por Scuffers (cita literal del 29 ene 2026).

Esto justifica por qué el scorer da **boost +15 a impacto cuando `delay_reason === customs_hold`**: no es arbitrario, es un riesgo real documentado.

### Resiliencia

| Fallo | Comportamiento |
|---|---|
| Shipping API timeout (>5 s) | `null` + score base mantenido |
| Shipping API 429 | retry 1× tras 1 s |
| Shipping API 500 / red caída | fallback inmediato + `_meta.fallback_used=true` |
| LLM CLI tarda >90 s | fallback a `enrichDeterministic()` |
| LLM CLI no disponible (Vercel) | fallback automático a determinístico |
| CSV con headers faltantes / formato inconsistente | parser tolerante + `data_quality_warnings` en respuesta |
| Status no estándar (`payment_review`, `packed`) | normalizer los reconoce |

### Diversidad forzada en top 10

`selectTopN` aplica máx por `action_type` para evitar 10 `pause_campaign` aunque sean todos top score. Garantiza que aparezcan owners distintos: commercial, warehouse, operations, customer_service.

---

## 9. Cómo correr en local

```bash
git clone https://github.com/antoriv123/scuffers-hackathon
cd scuffers-hackathon
npm install
echo "USE_CLAUDE_CLI=true" > .env.local
echo "CANDIDATE_ID=SCF-2026-9964" >> .env.local
npm run dev
# Abre http://localhost:3000/ops
```
