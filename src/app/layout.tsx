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
      <body className="min-h-full bg-gradient-to-br from-rose-50 via-sky-50 to-blue-100 text-slate-900 font-sans">
        <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden px-4 py-4 md:max-w-2xl lg:max-w-4xl">
          <div className="relative h-full overflow-hidden rounded-3xl border border-white/50 bg-white/60 shadow-xl backdrop-blur-xl">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
