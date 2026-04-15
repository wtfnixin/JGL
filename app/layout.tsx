import "./globals.css";

export const metadata = {
  title: "Jain's Got Latent",
  description: "Live event voting platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
