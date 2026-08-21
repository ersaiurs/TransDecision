import "./globals.css";
import "leaflet/dist/leaflet.css";
import ThemeProvider from "./theme-provider";

export const metadata = {
  title: "SPK Transportasi",
  description: "Sistem Pendukung Keputusan SAW",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-white dark:bg-slate-900 transition-colors">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}