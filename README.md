# Scuffers — Customer Trust Engine

Demo del hackathon **UDIA × ESIC × Scuffers** (28 abril 2026).

Triage automático de `help@scuffers.com` en 6 idiomas con detección de caso,
consulta de pedido y respuesta en tono *"As Always, With Love"*.

## Stack

- Next.js 15 (App Router) + TypeScript
- Anthropic SDK con prompt caching (Claude Sonnet 4.6)
- Mock data de Shopify (sin auth real para demo)
- Tailwind CSS

## Setup local

```bash
npm install
cp .env.example .env.local
# Edita .env.local con tu ANTHROPIC_API_KEY real
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Deploy a Vercel

```bash
npx vercel --prod
```

Recuerda configurar `ANTHROPIC_API_KEY` en variables de entorno de Vercel.

## Endpoints

- `POST /api/respond` — recibe `{ email }`, devuelve respuesta + categoría + escalado.
- `GET /api/track` — cron de tracking proactivo, detecta pedidos parados y riesgo duty UK.

## Casos demo precargados

1. **Shipping delay** (español) — pedido parado 22 días, cliente menciona OCU → escalado.
2. **Return broken** (français) — Reveni genera label US para envío Francia.
3. **Duty UK** (English) — FedEx demanda duty al cliente, riesgo legal Scuffers.
4. **Sizing** (italiano) — cambio de talla simple, auto-resuelto.
5. **Customs Chile** (español LatAm) — sticker shock 105€ extra, propuesta de transparencia pre-checkout.

## Datos clave de Scuffers (contexto del hackathon)

- 1640 reviews Trustpilot últimos 3 meses → **32,5% son 1-2 estrellas**.
- Stack confirmado: Shopify Plus + Klaviyo + Klarna + Netsuite + Reveni.
- Vacante real "AI Builder" en Teamtailor.
- Founders: Jaime Cruz Vega + Javier López Reinoso (Madrid 2018).

## Datos sensibles

Las API keys NO se commitean. `.env.local` está en `.gitignore`.

## Autor

Antonio Rivero Toledo — antoriv123 (GitHub)
