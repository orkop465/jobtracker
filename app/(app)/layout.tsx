import { auth } from "@/auth";
import { Fraunces, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { Topbar } from "@/components/app/topbar";
import { ToastProvider } from "@/components/ui/toast";
import "@/styles/design/base.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter-tight",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <ToastProvider>
      <div
        className={`${fraunces.variable} ${interTight.variable} ${jetbrainsMono.variable} app-shell-root`}
      >
        <SidebarNav
          userEmail={session?.user?.email}
          userName={session?.user?.name}
        />
        <div className="app-main">
          <Topbar />
          <div className="app-content">{children}</div>
        </div>
      </div>
    </ToastProvider>
  );
}
