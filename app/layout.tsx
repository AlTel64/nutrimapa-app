import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

const nunito = Nunito({ 
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-nunito',
});

export const metadata: Metadata = {
  title: 'NutriMapa - Alimentos Saudáveis',
  description: 'Radar de produtos saudáveis no seu bairro',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={nunito.variable}>
      <body style={{ margin: 0, fontFamily: 'var(--font-nunito), sans-serif' }}>
        {children}
      </body>
    </html>
  );
}