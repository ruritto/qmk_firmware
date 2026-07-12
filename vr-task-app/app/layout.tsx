import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VRプロジェクト タスク管理",
  description: "VRプロジェクトチームのタスク・スケジュール共有アプリ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      {/* body を flex にすると横幅の広い子 (ガント) がページ幅を押し広げるため block のまま */}
      <body className="min-h-full">{children}</body>
    </html>
  );
}
