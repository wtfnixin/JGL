import "./globals.css";
import InspectGuard from "@/components/InspectGuard";

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
      <body suppressHydrationWarning>
        <InspectGuard />
        {children}
      </body>
    </html>
  );
}
