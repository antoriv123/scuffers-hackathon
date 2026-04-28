"use client";
import { useState } from "react";
import ChatWidget from "./components/ChatWidget";

type Product = {
  id: string;
  name: string;
  price: number;
  tag?: string;
  category: string;
  swatch: string;
};

const PRODUCTS: Product[] = [
  { id: "p1", name: "Iconic Hoodie Cream", price: 95, category: "Hoodies", tag: "New", swatch: "#EDEDE6" },
  { id: "p2", name: "Washed Tee Black", price: 45, category: "T-Shirts", swatch: "#1A1A1A" },
  { id: "p3", name: "Knitwear Olive Oversized", price: 110, category: "Knitwear", tag: "Limited", swatch: "#5A5E3D" },
  { id: "p4", name: "Iconic Suede Boots Brown", price: 165, category: "Footwear", tag: "Drop FRI", swatch: "#7A4C2E" },
  { id: "p5", name: "Sweatpants Taupe", price: 75, category: "Pants", swatch: "#9B9B95" },
  { id: "p6", name: "Outerwear Beige", price: 195, category: "Outerwear", tag: "Limited", swatch: "#C9BFA8" },
  { id: "p7", name: "Iconic Tee Olive", price: 45, category: "T-Shirts", swatch: "#5A5E3D" },
  { id: "p8", name: "Hoodie Burgundy Oversized", price: 95, category: "Hoodies", tag: "Pop-Up Paris", swatch: "#5C1F22" },
];

const POPUPS = [
  {
    city: "Paris · Le Marais",
    address: "84 Rue de Turenne · 75003",
    dates: "10 APR — 10 MAY 2026",
    note: "L'Appartement",
    active: true,
  },
  {
    city: "Milano",
    address: "Brera District",
    dates: "Open Now",
    note: "Pop-up + Sales",
    active: true,
  },
  {
    city: "Amsterdam",
    address: "9 Streets",
    dates: "Permanent",
    note: "First international flagship",
    active: true,
  },
];

export default function Home() {
  return (
    <main className="scuffers-bg min-h-screen">
      <AnnouncementBar />
      <Nav />
      <Hero />
      <DropBanner />
      <ProductGrid products={PRODUCTS} />
      <PopUpStrip />
      <FFFamStrip />
      <Footer />
      <ChatWidget />
    </main>
  );
}

function AnnouncementBar() {
  const message =
    "FREE SHIPPING ON ORDERS OVER €100  ·  NEW DROP FRIDAY 18:00 CET  ·  POP-UP PARÍS LE MARAIS UNTIL 10 MAY  ·  AS ALWAYS, WITH LOVE";
  return (
    <div className="bg-scuffers-black text-scuffers-cream overflow-hidden py-2.5 text-[11px] tracking-[0.18em] uppercase font-medium">
      <div className="marquee-track">
        <span className="px-8">{message}</span>
        <span className="px-8">{message}</span>
        <span className="px-8">{message}</span>
        <span className="px-8">{message}</span>
      </div>
    </div>
  );
}

function Nav() {
  const [cart] = useState(0);
  return (
    <nav className="sticky top-0 z-30 bg-scuffers-cream/90 backdrop-blur border-b border-scuffers-border">
      <div className="max-w-[1400px] mx-auto px-5 md:px-10 py-4 flex items-center gap-6">
        <button className="md:hidden -ml-1 p-1" aria-label="Menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
        <a href="/" className="font-black tracking-tightest text-2xl md:text-[28px]" style={{ letterSpacing: "-0.06em" }}>
          SCUFFERS®
        </a>
        <ul className="hidden md:flex items-center gap-7 text-[13px] font-medium tracking-wide ml-6">
          <li><a href="#shop" className="hover:opacity-60 transition-opacity">SHOP</a></li>
          <li><a href="#drops" className="hover:opacity-60 transition-opacity">DROPS</a></li>
          <li><a href="#stores" className="hover:opacity-60 transition-opacity">STORES</a></li>
          <li><a href="#fffam" className="hover:opacity-60 transition-opacity">FF FAM</a></li>
          <li>
            <a href="/ops" className="text-scuffers-taupe hover:text-scuffers-black text-[11px] tracking-widest">
              [internal · ops]
            </a>
          </li>
        </ul>
        <div className="ml-auto flex items-center gap-4 text-[13px]">
          <button aria-label="Search" className="hover:opacity-60">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
          </button>
          <button aria-label="Account" className="hidden md:block hover:opacity-60">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
            </svg>
          </button>
          <button aria-label="Cart" className="hover:opacity-60 relative">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 7h14l-1.5 11.5a2 2 0 0 1-2 1.7H8.5a2 2 0 0 1-2-1.7L5 7Z" />
              <path d="M9 7V5a3 3 0 1 1 6 0v2" />
            </svg>
            {cart > 0 && (
              <span className="absolute -top-1 -right-1 bg-scuffers-black text-scuffers-cream text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {cart}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative bg-scuffers-cream-soft border-b border-scuffers-border overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-5 md:px-10 pt-8 md:pt-14 pb-12 md:pb-20 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="text-[11px] tracking-[0.22em] uppercase text-scuffers-taupe mb-5">
            FW26 · Madrid
          </div>
          <h1 className="scuffers-h1 text-[18vw] md:text-[9vw] leading-[0.85] mb-6">
            AS<br />ALWAYS,<br />WITH<br /><em className="font-serif italic font-black">LOVE</em>
          </h1>
          <p className="max-w-md text-[15px] leading-relaxed text-scuffers-black/75 mb-7">
            Streetwear mediterráneo desde 2018. Drops semanales, 6.000 envíos al mes, 250K+ FF FAM en redes. Sin influencers pagados, sin atajos.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#shop" className="inline-flex items-center justify-center bg-scuffers-black text-scuffers-cream px-7 py-3.5 text-[13px] tracking-[0.16em] uppercase font-semibold hover:opacity-85 transition-opacity">
              Shop the drop
            </a>
            <a href="#stores" className="inline-flex items-center justify-center border border-scuffers-black text-scuffers-black px-7 py-3.5 text-[13px] tracking-[0.16em] uppercase font-semibold hover:bg-scuffers-black hover:text-scuffers-cream transition-colors">
              Find a store
            </a>
          </div>
        </div>
        <div className="relative aspect-[4/5] md:aspect-[3/4] order-first md:order-last">
          <div className="absolute inset-0 bg-gradient-to-br from-scuffers-taupe-soft via-scuffers-cream to-scuffers-cream-soft" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-[18vw] md:text-[14vw] font-black text-scuffers-black/[0.05] tracking-tightest leading-none select-none">
              FF FAM
            </div>
          </div>
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-[11px] tracking-[0.18em] uppercase">
            <span className="font-semibold">Lookbook FW26</span>
            <span className="text-scuffers-taupe">@scuffers.co</span>
          </div>
          <div className="absolute top-6 right-6 bg-scuffers-black text-scuffers-cream px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase font-semibold">
            New
          </div>
        </div>
      </div>
    </section>
  );
}

function DropBanner() {
  return (
    <section id="drops" className="bg-scuffers-black text-scuffers-cream py-10 md:py-12 border-b border-scuffers-black">
      <div className="max-w-[1400px] mx-auto px-5 md:px-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div>
          <div className="text-[11px] tracking-[0.22em] uppercase text-scuffers-taupe mb-2">
            Next drop
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tightest">
            Friday 03/05 · 18:00 CET
          </h2>
        </div>
        <div className="flex items-center gap-6 text-center">
          <div>
            <div className="text-3xl md:text-4xl font-black tabular-nums">04</div>
            <div className="text-[10px] uppercase tracking-widest text-scuffers-taupe mt-1">Days</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-black tabular-nums">12</div>
            <div className="text-[10px] uppercase tracking-widest text-scuffers-taupe mt-1">Hrs</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-black tabular-nums">38</div>
            <div className="text-[10px] uppercase tracking-widest text-scuffers-taupe mt-1">Min</div>
          </div>
          <a href="#fffam" className="ml-3 hidden md:inline-block border border-scuffers-cream px-5 py-3 text-[12px] tracking-[0.16em] uppercase font-semibold hover:bg-scuffers-cream hover:text-scuffers-black transition-colors">
            Notify me
          </a>
        </div>
      </div>
    </section>
  );
}

function ProductGrid({ products }: { products: Product[] }) {
  return (
    <section id="shop" className="max-w-[1400px] mx-auto px-5 md:px-10 py-12 md:py-20">
      <div className="flex items-end justify-between mb-8 md:mb-12">
        <div>
          <div className="text-[11px] tracking-[0.22em] uppercase text-scuffers-taupe mb-2">
            Just dropped
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tightest">FW26 — Selection</h2>
        </div>
        <a href="#shop" className="hidden md:inline text-[12px] tracking-[0.16em] uppercase font-semibold border-b border-scuffers-black pb-1 hover:opacity-60">
          View all 86 →
        </a>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <article className="scuffers-product-card group">
      {product.tag && <span className="product-tag">{product.tag}</span>}
      <div
        className="aspect-[4/5] w-full"
        style={{
          background: `linear-gradient(135deg, ${product.swatch} 0%, ${product.swatch}dd 100%)`,
        }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <div
            className="text-5xl md:text-7xl font-black tracking-tightest select-none"
            style={{ color: product.swatch === "#EDEDE6" ? "#0a0a0a08" : "#ffffff10" }}
          >
            S
          </div>
        </div>
      </div>
      <div className="p-3 md:p-4 bg-scuffers-cream">
        <div className="text-[10px] uppercase tracking-widest text-scuffers-taupe mb-1">
          {product.category}
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[14px] md:text-[15px] font-semibold leading-tight">
            {product.name}
          </h3>
          <span className="text-[14px] font-medium tabular-nums">€{product.price}</span>
        </div>
      </div>
    </article>
  );
}

function PopUpStrip() {
  return (
    <section id="stores" className="bg-scuffers-cream-soft border-y border-scuffers-border py-12 md:py-20">
      <div className="max-w-[1400px] mx-auto px-5 md:px-10">
        <div className="flex items-end justify-between mb-8 md:mb-12">
          <div>
            <div className="text-[11px] tracking-[0.22em] uppercase text-scuffers-taupe mb-2">
              IRL
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tightest">Stores & Pop-Ups</h2>
          </div>
          <a href="#stores" className="hidden md:inline text-[12px] tracking-[0.16em] uppercase font-semibold border-b border-scuffers-black pb-1 hover:opacity-60">
            See all 8 →
          </a>
        </div>
        <div className="grid md:grid-cols-3 gap-4 md:gap-5">
          {POPUPS.map((s) => (
            <article key={s.city} className="bg-scuffers-cream border border-scuffers-border p-6 md:p-8">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-1.5 h-1.5 bg-scuffers-black rounded-full" />
                <span className="text-[10px] tracking-[0.22em] uppercase font-semibold">
                  {s.active ? "Live now" : "Closed"}
                </span>
              </div>
              <h3 className="text-2xl font-black tracking-tightest mb-2">{s.city}</h3>
              <div className="text-[14px] text-scuffers-black/75 mb-4">{s.address}</div>
              <div className="text-[11px] tracking-[0.16em] uppercase text-scuffers-taupe mb-1">{s.dates}</div>
              <div className="text-[13px] italic">{s.note}</div>
            </article>
          ))}
        </div>
        <div className="mt-8 text-[13px] text-scuffers-taupe">
          Madrid · Barcelona · Valencia · Las Rozas Village · La Roca Village · Amsterdam · Milano · Paris pop-up.
        </div>
      </div>
    </section>
  );
}

function FFFamStrip() {
  return (
    <section id="fffam" className="bg-scuffers-black text-scuffers-cream py-16 md:py-24">
      <div className="max-w-[900px] mx-auto px-5 md:px-10 text-center">
        <div className="text-[11px] tracking-[0.22em] uppercase text-scuffers-taupe mb-4">
          Friends & Family
        </div>
        <h2 className="text-4xl md:text-6xl font-black tracking-tightest mb-6 leading-[0.95]">
          Join 250K+ FF FAM.<br />
          <span className="font-serif italic">As Always, With Love.</span>
        </h2>
        <p className="text-[15px] text-scuffers-cream/70 max-w-md mx-auto mb-8">
          Drops semanales, acceso temprano y pop-ups antes que nadie. Cero spam.
        </p>
        <form className="flex flex-col md:flex-row gap-2 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            placeholder="your@email.com"
            className="flex-1 bg-transparent border border-scuffers-cream/40 px-4 py-3.5 text-[14px] focus:outline-none focus:border-scuffers-cream placeholder:text-scuffers-cream/40"
          />
          <button
            type="submit"
            className="bg-scuffers-cream text-scuffers-black px-7 py-3.5 text-[12px] tracking-[0.16em] uppercase font-semibold hover:opacity-85 transition-opacity"
          >
            Join FF FAM
          </button>
        </form>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-scuffers-cream border-t border-scuffers-border py-14">
      <div className="max-w-[1400px] mx-auto px-5 md:px-10 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2 md:col-span-2">
          <div className="font-black tracking-tightest text-2xl mb-4" style={{ letterSpacing: "-0.06em" }}>
            SCUFFERS®
          </div>
          <p className="text-[13px] text-scuffers-black/70 max-w-xs leading-relaxed">
            Streetwear from Madrid since 2018. Founded by Jaime Cruz Vega & Javier López Reinoso. As Always, With Love.
          </p>
        </div>
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase font-semibold mb-4">Shop</div>
          <ul className="space-y-2 text-[13px]">
            <li><a href="#" className="hover:opacity-60">New In</a></li>
            <li><a href="#" className="hover:opacity-60">Hoodies</a></li>
            <li><a href="#" className="hover:opacity-60">Footwear</a></li>
            <li><a href="#" className="hover:opacity-60">Outerwear</a></li>
            <li><a href="#" className="hover:opacity-60">Sale</a></li>
          </ul>
        </div>
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase font-semibold mb-4">Help</div>
          <ul className="space-y-2 text-[13px]">
            <li><a href="#" className="hover:opacity-60">Shipping</a></li>
            <li><a href="#" className="hover:opacity-60">Returns</a></li>
            <li><a href="#" className="hover:opacity-60">Sizing Guide</a></li>
            <li><a href="#" className="hover:opacity-60">Customs & Duty</a></li>
            <li><a href="#" className="hover:opacity-60">Track my order</a></li>
          </ul>
        </div>
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase font-semibold mb-4">Contact</div>
          <ul className="space-y-2 text-[13px]">
            <li><span className="text-scuffers-taupe">help@scuffers.com</span></li>
            <li><a href="#" className="hover:opacity-60">@scuffers.co</a></li>
            <li><a href="/ops" className="hover:opacity-60 text-scuffers-taupe">Internal · /ops</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto px-5 md:px-10 mt-12 pt-6 border-t border-scuffers-border flex flex-col md:flex-row gap-3 md:items-center md:justify-between text-[11px] text-scuffers-taupe tracking-wide">
        <span>© 2026 Scuffers Partners SL · Pozuelo de Alarcón, Madrid</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-scuffers-black">Privacy</a>
          <a href="#" className="hover:text-scuffers-black">Terms</a>
          <span className="text-scuffers-taupe-soft">demo · hackathon UDIA × ESIC</span>
        </div>
      </div>
    </footer>
  );
}
