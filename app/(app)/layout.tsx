import { auth } from "@/auth";
import { SidebarNav } from "@/components/sidebar-nav";
import { ToastProvider } from "@/components/ui/toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <ToastProvider>
      <div className="min-h-screen bg-surface-0">
        {/* Ambient background */}
        <div className="ambient-mesh" />
        <SidebarNav userEmail={session?.user?.email} />

        {/* Main content area */}
        <main className="lg:ml-[200px] pt-14 lg:pt-0 min-h-screen relative z-10">
          <div className="fixed inset-0 lg:left-[200px] pointer-events-none grid-bg opacity-15 z-0" />
          <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-6 lg:py-8 relative z-10">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
