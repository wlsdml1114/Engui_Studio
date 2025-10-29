import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n/context";

export const metadata: Metadata = {
  title: "Speech Sequencer - EnguiStudio",
  description: "Arrange and sequence audio segments by speaker",
};

export default function SequencerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <I18nProvider>
      <div className="w-full h-screen overflow-hidden">
        {children}
      </div>
    </I18nProvider>
  );
}
