import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Expense Tracker | Modern Ledger",
  description: "Manage your income, expenses, receivables, and payables with elegance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} antialiased selection:bg-emerald-500/30 selection:text-emerald-100 font-sans`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
