
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Library from "@/components/Library";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EnguiStudio - AI Content Creation",
  description: "Create amazing content with the power of AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased custom-scrollbar`}
      >
        <div className="flex h-screen bg-background text-foreground">
          <Sidebar />
          <main className="flex-1 flex flex-col overflow-hidden custom-scrollbar">
            {children}
          </main>
          <Library />
        </div>
      </body>
    </html>
  );
}
