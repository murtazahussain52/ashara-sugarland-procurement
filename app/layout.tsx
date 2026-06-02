import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anjuman e Imadi Sugarland TX",
  description: "Procurement Management · Anjuman e Imadi Sugarland TX",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
