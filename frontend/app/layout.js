import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({ 
  subsets: ['latin'], 
  variable: '--font-serif',
  display: 'swap',
});

const mono = JetBrains_Mono({ 
  subsets: ['latin'], 
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  title: 'News Pulse - Topic Clustered News Timeline',
  description: 'Visual timeline of news topics clustered by story',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${mono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}