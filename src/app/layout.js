import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Toolbox Sklad",
  description: "Анализатор инвентаря и продаж",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
        <nav className="nav">
          <div className="nav-container">
            <Link href="/" className="nav-logo">
              Toolbox Sklad
            </Link>
            <div className="nav-links">
              <Link href="/" className="nav-link">
                Анализатор инвентаря
              </Link>
              <Link href="/sales-analysis" className="nav-link">
                Анализ продаж
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
