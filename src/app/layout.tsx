import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ととのう筋トレ | 筋トレと回復",
  description: "体調と相談しながら自分との約束を守るコンディショニング＆筋トレ記録",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
