import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "にゃんトレ | 筋トレと回復",
  description: "猫と一緒に続ける、筋トレと怪我の回復管理",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
