import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/context";
import { AppShell } from "@/components/layout/AppShell";
import { ToastContainer } from "@/components/ui/ToastContainer";

export const metadata: Metadata = {
  title: "Supermarket ADBMS - Multi-Branch Management System",
  description:
    "Enterprise Multi-Branch Supermarket Management System with POS billing, inventory, purchasing, loyalty, and audit reporting.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-200 selection:text-blue-900">
        <AppProvider>
          <AppShell>{children}</AppShell>
          <ToastContainer />
        </AppProvider>
      </body>
    </html>
  );
}
