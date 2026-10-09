import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "Rebate Calculator | Microfinance",
  description:
    "Instantly calculate advance-kisti rebates for microfinance products — Jagoron, Agrossor, Buniyed and MFCE — with a full 299-rate database. Works offline.",
  applicationName: "Rebate Calculator",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rebate Calculator",
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#f6f8f6] text-slate-900 antialiased">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
