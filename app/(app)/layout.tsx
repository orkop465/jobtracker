import { auth } from "@/auth";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { ToastProvider } from "@/components/ui/toast";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[var(--color-canvas)]">
        <SidebarNav userEmail={session?.user?.email} />
        <main className="lg:ml-[200px] pt-14 lg:pt-0 min-h-screen">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
