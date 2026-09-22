import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import { FooterNav } from "@/components/footer-nav";
import { siteConfig } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.name}`,
  },
  description: "Established Since: 2010",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-neutral-200">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
              <div className="flex flex-col items-center pb-5 sm:flex-row sm:justify-between sm:pb-8">
                <p className="pb-4 text-center font-bold sm:pb-0 sm:text-left">
                  {siteConfig.name}
                </p>
                <FooterNav />
              </div>
              <div className="border-t border-neutral-200 pt-4 text-center text-xs text-neutral-400 sm:pt-6">
                © 2026 {siteConfig.name}
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
