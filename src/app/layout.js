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
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
