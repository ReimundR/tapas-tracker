import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CookieConsentBanner from './components/CookieConsentBanner'; // Import the banner component

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Tapas Tracker",
  description: "Tapas Tracker is a personal development tool designed to help you track and achieve your Tapas or goals consistently",
  generator: "Next.js",
  manifest: "/manifest.json",
  keywords: ["Tapas", "Spiritual", "Development"],
  authors: [
    { name: "Reimund Renner" },
  ],
  icons: [
    { rel: "apple-touch-icon", url: "icons/icon-192.png" },
    { rel: "icon", url: "icons/icon-192.png" },
  ],
};

export const viewport = {
  themeColor: "#FFFFFF",
};

const themeColor = [{ media: "(prefers-color-scheme: dark)", color: "#fff" }];

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="description" content={metadata.description} />
        <meta name="generator" content={metadata.generator} />
        <link rel="manifest" href={metadata.manifest} />
        <meta name="keywords" content={metadata.keywords.join(", ")} />
        {themeColor.map(({ media, color }, index) => (
          <meta key={index} name="theme-color" media={media} content={color} />
        ))}
        {metadata.authors.map(({ name, url }, index) => (
          <meta key={index} name="author" content={name} {...(url && { href: url })} />
        ))}
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, viewport-fit=cover" />
        {metadata.icons.map(({ rel, url }, index) => (
          <link key={index} rel={rel} href={url} />
        ))}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
