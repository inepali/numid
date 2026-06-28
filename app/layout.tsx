import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "NumID | Your Phone Number. Your Permanent Email Address.",
  description: "Never change your public email again. Use your phone number as a permanent public email address and forward messages securely to any destination.",
  metadataBase: new URL("https://numid.dev"),
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "NumID | Your Phone Number. Your Permanent Email Address.",
    description: "Never change your public email again. Use your phone number as a permanent public email address and forward messages securely to any destination.",
    url: "https://numid.dev",
    siteName: "NumID",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NumID | Your Phone Number. Your Permanent Email Address.",
    description: "Never change your public email again. Use your phone number as a permanent public email address and forward messages securely to any destination.",
  }
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value || "dark";

  return (
    <html lang="en" className={theme} style={{ colorScheme: theme }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          body {
            font-family: 'Plus Jakarta Sans', sans-serif;
          }
          h1, h2, h3, h4, h5, h6, .font-display {
            font-family: 'Outfit', sans-serif;
          }
        `}</style>
      </head>
      <body className="antialiased min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
