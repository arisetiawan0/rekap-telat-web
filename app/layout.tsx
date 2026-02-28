import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rekap Keterlambatan — Dashboard Analitik",
  description:
    "Sistem analitik keterlambatan karyawan. Upload data absensi Excel dan dapatkan insight mendalam secara instan.",
  keywords: ["rekap", "keterlambatan", "absensi", "karyawan", "analytics", "HR"],
  authors: [{ name: "CV Anugah Bhakti Sentosa" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
