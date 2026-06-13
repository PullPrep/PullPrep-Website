import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "PullPrep | WoW Muscle Memory Trainer",
  description: "Aim Lab for World of Warcraft. Train your opener, rotation, cooldown timing, and proc reactions using your actual WoW keybinds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased dark`}>
      <body className="min-h-full bg-zinc-950 text-zinc-100 font-sans selection:bg-violet-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
