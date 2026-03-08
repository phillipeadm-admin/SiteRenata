import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/AuthContext';

export const metadata: Metadata = {
  title: 'GestãoPro — Controle de Processos',
  description: 'Sistema pessoal de gestão e controle de processos administrativos',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
