import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkyPrint — your zenith, the night you arrived",
  description:
    "Enter your birth date, time, and city. We compute the exact point in the sky your zenith was pointing toward when you were born, then tell you what's really out there.",
  openGraph: {
    title: "SkyPrint",
    description: "Your zenith, the night you arrived.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
