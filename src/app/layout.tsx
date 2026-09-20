import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "PURPO — Describe the outcome. Build the system.", template: "%s · PURPO" },
  description: "PURPO turns an idea into a working product: design, code, backend, data, media, automations, testing, and deployment.",
  openGraph: { title: "PURPO", description: "Tell PURPO what you want to build.", type: "website" },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
