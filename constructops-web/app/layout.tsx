import type { Metadata } from "next";
import type { ReactNode } from "react";

import { archivo, sairaStencil } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ConstructOps",
    template: "%s | ConstructOps",
  },
  description: "Multi-tenant operations platform for contractors.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${archivo.variable} ${sairaStencil.variable}`}>
      <body className="min-h-screen bg-paper font-body text-ink antialiased">{children}</body>
    </html>
  );
}
