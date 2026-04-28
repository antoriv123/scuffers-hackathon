"use client";

import { LoaderCircle } from "lucide-react";

export function HeroSkeleton() {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="cream-card p-5">
          <div className="w-24 h-3 rounded shimmer mb-4" />
          <div className="w-32 h-12 rounded shimmer" />
          <div className="mt-4 w-full h-1 rounded shimmer" />
        </div>
      ))}
    </section>
  );
}

export function LoadingHeader() {
  return (
    <div className="cream-card-soft px-4 py-3 mb-4 flex items-center gap-2 text-sm text-[#0A0A0A]">
      <LoaderCircle className="w-4 h-4 animate-spin text-[#2c5fb3]" />
      Analizando lanzamiento…{" "}
      <span className="text-[#6b6b6b] text-xs">(Claude tarda 30-60s la primera vez)</span>
    </div>
  );
}
