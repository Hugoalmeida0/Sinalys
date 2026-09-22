import type { Metadata, Viewport } from "next";
import { Montserrat, Geist_Mono } from "next/font/google";
import { EmBreveProvider } from "@/components/ui/EmBreve";
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
  applicationName: "Sinalys",
  // O iOS ignora o manifest para instalação: quem define o modo standalone e
  // o ícone da tela de início são estas metatags.
  appleWebApp: {
    capable: true,
    title: "Sinalys",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // `cover` libera as env(safe-area-inset-*) usadas pela navegação inferior;
  // `resizes-content` faz o layout encolher quando o teclado virtual abre, em
  // vez de empurrar os elementos fixos para fora da tela.
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  // Pinta a barra de status do Android com o navy da marca.
  themeColor: "#0a2d6b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${montserrat.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* No root para alcançar também /login e /health, que ficam fora do AppShell. */}
        <EmBreveProvider>{children}</EmBreveProvider>
      </body>
    </html>
  );
}
