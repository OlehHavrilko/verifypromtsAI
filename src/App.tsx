import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SavedPrompts from "./pages/SavedPrompts";
import Settings from "./pages/Settings";
import Promo from "./pages/Promo";
import Pricing from "./pages/Pricing";
import PromptChat from "./pages/PromptChat";
import ImageAnalyzerPage from "./pages/ImageAnalyzerPage";
import TextToolsPage from "./pages/TextToolsPage";
import Observability from "./pages/Observability";
import AdminPrompts from "./pages/AdminPrompts";
import AdminEvals from "./pages/AdminEvals";
import AdminApiKeys from "./pages/AdminApiKeys";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
              {/* Public pages — no sidebar */}
              <Route path="/promo" element={<Promo />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pricing" element={<Pricing />} />

              {/* App pages — with sidebar */}
              <Route path="/" element={<AppLayout><Index /></AppLayout>} />
              <Route path="/app" element={<AppLayout><Index /></AppLayout>} />
              <Route path="/app/images" element={<AppLayout><ImageAnalyzerPage /></AppLayout>} />
              <Route path="/app/text-tools" element={<AppLayout><TextToolsPage /></AppLayout>} />
              <Route path="/chat" element={<AppLayout><PromptChat /></AppLayout>} />
              <Route path="/prompts" element={<AppLayout><SavedPrompts /></AppLayout>} />
              <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
              <Route path="/admin/observability" element={<AppLayout><Observability /></AppLayout>} />
              <Route path="/admin/prompts" element={<AppLayout><AdminPrompts /></AppLayout>} />
              <Route path="/admin/evals" element={<AppLayout><AdminEvals /></AppLayout>} />
              <Route path="/admin/api-keys" element={<AppLayout><AdminApiKeys /></AppLayout>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
