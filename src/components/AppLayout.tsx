import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useLocation } from "react-router-dom";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border/70 px-4 shrink-0 bg-background/95 backdrop-blur-md">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">AI generation suite</span>
          </header>
          {!isSupabaseConfigured && (
            <div className="px-4 py-2 text-xs bg-destructive/10 text-destructive border-b border-destructive/20">
              Supabase не настроен: задайте VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY при сборке (см. SETUP.md).
            </div>
          )}
          <main key={location.pathname} className="flex-1 overflow-auto animate-fade-in bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
