import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Samehadaku REST API - Anime Data Scraping API",
  description: "REST API lengkap untuk scraping data anime dari Samehadaku.how. Mendukung 16 endpoints dengan fitur pencarian, streaming, download batch, dan intelligent caching.",
  keywords: [
    "samehadaku",
    "anime api",
    "rest api",
    "anime scraper",
    "anime data",
    "streaming api",
    "batch download",
    "anime search",
    "next.js api",
    "typescript api"
  ],
  authors: [{ name: "Samehadaku API Team" }],
  creator: "Samehadaku API",
  publisher: "Samehadaku API",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Samehadaku REST API - Anime Data Scraping API",
    description: "REST API lengkap untuk scraping data anime dari Samehadaku.how dengan 16 endpoints, intelligent caching, dan rate limiting.",
    url: "http://localhost:3000",
    siteName: "Samehadaku REST API",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/api-preview.png",
        width: 1200,
        height: 630,
        alt: "Samehadaku REST API Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Samehadaku REST API - Anime Data Scraping API",
    description: "REST API lengkap untuk scraping data anime dari Samehadaku.how dengan 16 endpoints dan fitur canggih.",
    images: ["/api-preview.png"],
    creator: "@samehadaku_api",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
  category: "API",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#667eea" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        backgroundColor: '#f8f9fa',
        color: '#333'
      }}>
        {children}
      </body>
    </html>
  );
}