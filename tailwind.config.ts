import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Storefront (/) — original Scuffers brand
        scuffers: {
          cream: "#F5F5F0",
          "cream-soft": "#EDEDE6",
          black: "#0A0A0A",
          taupe: "#9B9B95",
          "taupe-soft": "#C9C9C2",
          border: "#E8E8E3",
          accent: "#3B2A1F",
        },
        // Editorial brutalist palette (matches presentation.html, used by /ops)
        editorial: {
          bg: "#ffffff",
          "bg-soft": "#f6f5f1",
          black: "#0a0a0a",
          "black-2": "#141414",
          ink: "#111111",
          muted: "#6b6b6b",
          line: "#e6e5e1",
          accent: "#2b7551",
          "accent-2": "#1f5a3d",
          "accent-soft": "#e7f1ec",
          p0: "#c1121f",
          p1: "#e07b00",
          p2: "#b69200",
          p3: "#2c5fb3",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
        serif: ["var(--font-playfair)", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
        helvetica: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SF Mono", "Menlo", "Consolas", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
        display: "-0.03em",
        editorial: "-0.02em",
      },
      borderRadius: {
        editorial: "4px",
      },
    },
  },
  plugins: [],
} satisfies Config;
