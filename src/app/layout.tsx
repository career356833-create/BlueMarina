import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { DevAuditFloatingButton } from "@/components/dev-audit/DevAuditFloatingButton";
import { PwaRegister } from "@/components/PwaRegister";
import { devAuditEnabled } from "@/lib/dev-audit/audit-data";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Blue Marina - 바다낚시 · 해양레저 포털",
  description: "물때, 해양정보, 어종백과, 보트지식, 조종면허 학습을 제공하는 대한민국 해양레저 포털",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BluePass"
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#050F19",
  colorScheme: "light"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {process.env.NODE_ENV === "development" ? (
          <Script id="blue-marina-dev-sw-reset" strategy="beforeInteractive">
            {`if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    if (!registrations.length) return;
    var wasControlled = Boolean(navigator.serviceWorker.controller);
    Promise.all(registrations.map(function (registration) { return registration.unregister(); }))
      .then(function () { if (wasControlled) window.location.reload(); })
      .catch(function () {});
  }).catch(function () {});
}`}
          </Script>
        ) : null}
        <PwaRegister />
        {children}
        {devAuditEnabled ? <DevAuditFloatingButton /> : null}
      </body>
    </html>
  );
}
