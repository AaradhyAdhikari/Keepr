import type { Metadata, Viewport } from "next";
import RegisterSW from "@/components/RegisterSW";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reel Vault",
  description: "Auto-sorted, searchable library of your saved Instagram reels",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#111827" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
