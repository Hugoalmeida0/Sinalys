import type { Metadata, Viewport } from "next";
import { Montserrat, Geist_Mono } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sinalys",
  description: "Inteligência para relacionamentos duradouros",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // `cover` libera as env(safe-area-inset-*) usadas pela navegação inferior;
  // `resizes-content` faz o layout encolher quando o teclado virtual abre, em
  // vez de empurrar os elementos fixos para fora da tela.
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${montserrat.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
