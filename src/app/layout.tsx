import type { Metadata, Viewport } from "next";
import { Settings } from "luxon";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";

// Single-locale app (organization.locale is always "it-IT") - set once here
// rather than passing { locale: "it" } to every DateTime call site, so
// every cccc/LLLL weekday/month format renders in Italian by default.
Settings.defaultLocale = "it";

export const metadata: Metadata = {
  title: "American Barber Tattoo",
  description: "Prenota il tuo prossimo appuntamento.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "American Barber Tattoo",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="font-sans antialiased">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
