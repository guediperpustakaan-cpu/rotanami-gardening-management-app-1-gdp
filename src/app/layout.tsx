import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rotanami — Catatan Kebun & Rotasi Tanaman",
  description:
    "Rotanami membantu pekebun rumahan dan petani skala kecil mengelola petak, mencatat riwayat tanam, merencanakan rotasi, dan menyimpan hasil uji tanah.",
};

export const viewport: Viewport = {
  themeColor: "#425a27",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={`${manrope.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-paper text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
