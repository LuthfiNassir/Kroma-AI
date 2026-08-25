import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kroma — Transform Spreadsheets into Visual Intelligence",
  description: "Local-first autonomous data analyst delivering instant Bento dashboards and executive intelligence with zero cloud exposure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#212222] text-white antialiased selection:bg-[#FE6749]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
