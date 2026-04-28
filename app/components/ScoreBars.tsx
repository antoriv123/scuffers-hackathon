"use client";

type Bar = { label: string; value: number; color: string; tip: string };

export function ScoreBars({
  urgencia,
  impacto,
  evidencia,
  size = "sm",
}: {
  urgencia: number;
  impacto: number;
  evidencia: number;
  size?: "sm" | "lg";
}) {
  const bars: Bar[] = [
    {
      label: "Urgencia",
      value: clamp(urgencia),
      color: "#c1121f",
      tip: "Tiempo restante antes de que escale.",
    },
    {
      label: "Impacto",
      value: clamp(impacto),
      color: "#e07b00",
      tip: "€ + clientes afectados si no actuamos.",
    },
    {
      label: "Evidencia",
      value: clamp(evidencia),
      color: "#2c5fb3",
      tip: "# de señales convergentes en los datos.",
    },
  ];
  const widthClass = size === "lg" ? "w-full" : "w-[210px] max-w-full";
  const heightClass = size === "lg" ? "h-[6px]" : "h-[5px]";
  return (
    <div className={`flex flex-wrap gap-4 ${size === "lg" ? "gap-y-5" : "gap-y-3"}`}>
      {bars.map((b) => (
        <div key={b.label} className={`${widthClass} tooltip`}>
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] mb-1.5">
            <span className="text-[var(--muted)]">{b.label}</span>
            <span className="text-[var(--ink)] font-bold">{b.value}</span>
          </div>
          <div
            className={`relative ${heightClass} overflow-hidden border border-[var(--line)]`}
            style={{ background: "var(--bg-soft)" }}
          >
            <div
              className="absolute inset-y-0 left-0 transition-[width] duration-700"
              style={{
                width: `${b.value}%`,
                background: b.color,
              }}
            />
          </div>
          <span className="tooltip-content">{b.tip}</span>
        </div>
      ))}
    </div>
  );
}

function clamp(n: number) {
  if (Number.isNaN(n) || n === undefined || n === null) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
