import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WebXTerm Licensing Portal",
  description: "Centralised licensing, quota and entitlement control plane for WebXTerm",
  icons: { icon: "/favicon.ico" },
};

// Apply the saved theme before hydration to avoid a flash of the wrong theme.
const themeScript = `
try {
  var t = localStorage.getItem('lp_theme') || 'dark';
  if (t === 'dark') document.documentElement.classList.add('dark');
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
