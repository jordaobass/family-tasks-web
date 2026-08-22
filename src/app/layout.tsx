import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/providers/auth-provider";
import { FamilyDataProvider } from "@/data";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "Tarefas da Família",
    template: "%s | Tarefas da Família"
  },
  description: "Sistema de gerenciamento de tarefas domésticas para toda a família. Organize, distribua e acompanhe tarefas com gamificação e pontos.",
  keywords: ["tarefas", "família", "organização", "casa", "doméstico", "gamificação", "pontos"],
  authors: [{ name: "NextTag" }],
  creator: "NextTag",
  publisher: "NextTag",
  metadataBase: new URL('https://family.jonathanschenker.com.br'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://family.jonathanschenker.com.br',
    title: 'Tarefas da Família',
    description: 'Sistema de gerenciamento de tarefas domésticas para toda a família',
    siteName: 'Tarefas da Família',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tarefas da Família',
    description: 'Sistema de gerenciamento de tarefas domésticas para toda a família',
  },
  // Painel doméstico com rotina e nomes de crianças não tem por que estar no
  // índice de busca. Enquanto as regras do Firestore estiverem abertas, isto ao
  // menos evita que o app seja encontrado sem querer.
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  icons: {
    icon: [
      { url: '/icon', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Tarefas da Família',
  },
  formatDetection: {
    telephone: false,
  },
};

// `viewportFit: 'cover'` para o painel usar a tela inteira em aparelho com notch.
// O zoom continua liberado de propósito: travar pinça é barreira de acessibilidade,
// e trancar a tela é papel do modo quiosque do aparelho, não do site.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#6d28d9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <FamilyDataProvider>{children}</FamilyDataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
