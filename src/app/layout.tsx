import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Opslagstavlen",
  description: "Mobile-first Planka client",
  applicationName: "Opslagstavlen",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Opslagstavlen",
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da" className="h-full antialiased">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-rose-50 via-sky-50 to-blue-100 text-slate-900 font-sans">
        <div className="min-h-screen pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </body>
    </html>
  );
}
