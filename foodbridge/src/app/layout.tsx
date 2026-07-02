import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { HideNextDevTools } from "@/components/hide-next-devtools";
import { NavShell } from "@/components/nav-shell";
import { DevServerRecoveryBanner } from "@/hooks/useDevServerRecovery.tsx";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FoodBridge - Smart Urban Food Redistribution Network",
  description:
    "Production-grade platform connecting donors, NGOs, volunteers, and communities to reduce urban food waste and hunger in real time.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[radial-gradient(circle_at_top_right,_#d1fae5,_transparent_40%),radial-gradient(circle_at_bottom_left,_#fed7aa,_transparent_45%),linear-gradient(180deg,_#fffbeb,_#fef3c7)] text-amber-950">
        <AuthProvider>
          <HideNextDevTools />
          <DevServerRecoveryBanner />
          <NavShell />
          <div className="flex min-h-[calc(100vh-64px)] flex-col">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
