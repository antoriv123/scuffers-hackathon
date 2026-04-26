import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scuffers Customer Trust Engine",
  description: "AI Builder demo — Hackathon UDIA × ESIC × Scuffers",
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
