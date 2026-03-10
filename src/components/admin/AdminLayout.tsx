import { ReactNode } from "react";
import { AdminSidebar, AdminMobileNav } from "./AdminSidebar";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminMobileNav />
        <header className="border-b bg-card px-4 py-3 md:px-6 md:py-4">
          <h1 className="text-lg md:text-2xl font-bold">{title}</h1>
          {description && (
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </header>
        <main className="flex-1 p-3 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
