import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/providers/auth-provider";
import { FirebaseDebug } from "@/components/common/FirebaseDebug";
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
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
          {children}
          <FirebaseDebug />
        </AuthProvider>
      </body>
    </html>
  );
}
