import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#050b18',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'VoteSmart — The Intelligent Election Companion',
  description:
    'Your personal guide from registration to the ballot box. A multilingual, AI-powered election assistant for every Indian citizen.',
  keywords: 'voting, election, India, voter registration, polling station, ECI, election companion',
  openGraph: {
    title: 'VoteSmart — The Intelligent Election Companion',
    description: 'Your personal guide from registration to the ballot box.',
    type: 'website',
    locale: 'en_IN',
  },
  robots: 'index, follow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
