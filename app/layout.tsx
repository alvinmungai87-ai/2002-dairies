import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "2002 Dairies",
  description: "Fresh produce, dairy, and grocery supplies.",
  icons: {
    icon: "/logo.jpg", // Points to your logo file in the public folder
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}