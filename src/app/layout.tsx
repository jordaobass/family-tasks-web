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
  title: "Tarefas da Família",
  description: "Sistema de gerenciamento de tarefas domésticas para toda a família",
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
