import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/context";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
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
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
        <AppProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Header />
              <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
                {children}
              </main>
            </div>
          </div>
          <ToastContainer />
        </AppProvider>
      </body>
    </html>
  );
}
