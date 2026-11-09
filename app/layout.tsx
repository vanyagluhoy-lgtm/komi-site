import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Костюм Комі з шерпи на флісі | MAAAARKA",
  description: "Оверсайз худі та широкі штани з шерпи на флісі. Один розмір, 5 кольорів, 2300 грн. Навчальний проєкт.",
  openGraph: {
    title: "Костюм Комі | MAAAARKA",
    description: "Шерпа на флісі. Один розмір, 5 кольорів, 2300 грн.",
    images: ["/og.jpg"],
    locale: "uk_UA",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uk" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
