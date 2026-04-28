import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scuffers AI Ops Control Tower",
  description: "Sistema de priorización automática de acciones operativas durante lanzamientos. Hackathon UDIA × ESIC × Scuffers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
