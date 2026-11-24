import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { AiConfigProvider } from "@/components/features/AiConfig";
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
  appleWebApp: { capable: true, title: "مدير المدرس", statusBarStyle: "default" },
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
            <AuthProvider>{children}</AuthProvider>
          </AiConfigProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
