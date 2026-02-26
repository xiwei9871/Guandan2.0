import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guandan Game",
  description: "A traditional Chinese card game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
