import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { DashboardLayout } from "@/components/dashboard-layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "User Dashboard",
  description: "Modern user dashboard with Next.js App Router",
  generator: "v0.dev",
};

export default function RootLayout({ children }) {
  return (
    <>
      <DashboardLayout>{children}</DashboardLayout>
    </>
  );
}
