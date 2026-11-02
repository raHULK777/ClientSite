import { Archivo, Saira_Stencil } from "next/font/google";

export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
  fallback: ["Arial Narrow", "Arial", "sans-serif"],
});

export const sairaStencil = Saira_Stencil({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-stencil",
  display: "swap",
  fallback: ["Impact", "Haettenschweiler", "sans-serif"],
});
