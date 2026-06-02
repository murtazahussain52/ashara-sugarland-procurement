import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ashara Sugarland — Procurement",
  description: "Procurement management for Ashara Sugarland",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
