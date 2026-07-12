import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "スクラップボード",
  description: "自分専用のコルクボード風スクラップブック",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // iPad Safari でフォーム入力時に勝手にズームしないように
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
