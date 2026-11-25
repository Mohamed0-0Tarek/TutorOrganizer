import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { AiConfigProvider } from "@/components/features/AiConfig";
import { PwaPrompts } from "@/components/features/PwaPrompts";
import { AuthProvider } from "@/data/auth/AuthProvider";
import { I18nProvider } from "@/i18n/I18nProvider";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "مدير المدرس", template: "%s · مدير المدرس" },
  description: "دفترك الخاص: حصص، حضور، مدفوعات وإحصائيات.",
  applicationName: "Tutor Manager",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
  },
  appleWebApp: {
    capable: true,
    title: "مدير المدرس",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F3EDE3",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`}>
      <body className="min-h-dvh antialiased">
        <I18nProvider>
          <AiConfigProvider enabled={process.env.AI_ENABLED !== "false"}>
            <AuthProvider>
              <PwaPrompts />
              {children}
            </AuthProvider>
          </AiConfigProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
