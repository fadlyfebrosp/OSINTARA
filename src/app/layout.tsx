import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "OSINTARA — Discover Digital Footprints",
  description: "Public-source intelligence workspace."
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="id"><body>{children}</body></html>;
}
