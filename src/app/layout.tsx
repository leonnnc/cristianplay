import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CristianPlay — Worship OS",
  description:
    "Dashboard futurista para buscar alabanzas, adoración, predicaciones y podcasts cristianos de YouTube, con playlists, favoritos y cola inteligente.",
  applicationName: "CristianPlay",
  keywords: [
    "alabanza",
    "adoración",
    "predicaciones",
    "música cristiana",
    "YouTube",
    "playlists",
  ],
};

export const viewport: Viewport = {
  themeColor: "#05060f",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} ${sora.variable}`}>
      <body>{children}</body>
    </html>
  );
}
