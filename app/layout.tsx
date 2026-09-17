import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kroma — Autonomous Data Analyst",
  description:
    "Local-first autonomous data analyst delivering instant Bento dashboards and executive intelligence with zero cloud exposure.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/app-icon.png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/app-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-[#212222] text-white antialiased selection:bg-[#FE6749]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
