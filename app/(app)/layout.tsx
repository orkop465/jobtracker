import { auth } from "@/auth";
import { SidebarNav } from "@/components/sidebar-nav";
import { ToastProvider } from "@/components/ui/toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <ToastProvider>
      <div className="min-h-screen bg-surface-0">
        <SidebarNav userEmail={session?.user?.email} />

        {/* Main content area — offset for sidebar on desktop, for header on mobile */}
        <main className="lg:ml-[220px] pt-14 lg:pt-0 min-h-screen">
          <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
