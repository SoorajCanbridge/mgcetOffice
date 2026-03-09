'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import ModuleAccessGuard from '@/components/ModuleAccessGuard';
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"

export default function AppLayout({ children }) {
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <AppSidebar />
        <div className="flex flex-col w-full">
          <AppHeader />
          <main className="flex-1 p-6">
            <ModuleAccessGuard>
              {children}
            </ModuleAccessGuard>
          </main>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
