import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pendataan Alumni LEMHANNAS RI",
  description: "Sistem Pendataan Alumni LEMHANNAS RI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
