import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import MockSupabaseInterceptor from "@/app/components/MockSupabaseInterceptor";

export const metadata: Metadata = {
  title: "NumID | One Number. Your Whole Identity.",
  description: "Turn your phone number into a permanent, private email address (phone@numid.us), a shareable public directory profile, and a secure client-side E2EE vault for your sensitive credentials.",
  metadataBase: new URL("https://numid.dev"),
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "NumID | One Number. Your Whole Identity.",
    description: "Turn your phone number into a permanent, private email address (phone@numid.us), a shareable public directory profile, and a secure client-side E2EE vault for your sensitive credentials.",
    url: "https://numid.dev",
    siteName: "NumID",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NumID | One Number. Your Whole Identity.",
    description: "Turn your phone number into a permanent, private email address (phone@numid.us), a shareable public directory profile, and a secure client-side E2EE vault for your sensitive credentials.",
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
        <MockSupabaseInterceptor />
        {children}
      </body>
    </html>
  );
}
