import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import Home from "./pages/Home";
import EventDetails from "./pages/EventDetails";
import CreateEvent from "./pages/CreateEvent";
// Perfil removido para reconfiguração do acesso do zero
import Polls from "./pages/Polls";
import Memories from "./pages/Memories";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
// Editar Perfil removido
import Members from "./pages/Members";
import { useEffect } from "react";
// Conexão com banco removida
import { RouteGuard } from "@/components/auth/RouteGuard";
import { useAuthRole } from "@/hooks/useAuthRole";

const queryClient = new QueryClient();

// Indicador de conexão removido

// Indicador de status de autenticação simplificado
const AuthStatus = () => null;

const App = () => {
  const envOk = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
  // Remover overlays/elementos externos "Edit with Lovable" caso sejam injetados pelo navegador/terceiros
  useEffect(() => {
    const removeLovable = () => {
      try {
        document.querySelectorAll('[aria-label="Edit with Lovable"]').forEach((el) => (el as HTMLElement).remove());
        document.querySelectorAll('#lovable-badge, [id*="lovable-badge"], [class*="lovable-badge"], a[href*="lovable.dev"], a[href*="utm_source=lovable-badge"]').forEach((el) => (el as HTMLElement).remove());
        const all = Array.from(document.querySelectorAll<HTMLElement>('a,button,div,span'));
        all.forEach((el) => {
          const text = (el.innerText || el.textContent || "").trim();
          if (/Edit with Lovable/i.test(text)) el.remove();
          if (/Lovable/i.test(text)) {
            const anchor = el.closest('a');
            const href = anchor?.getAttribute('href') || '';
            if (/lovable\.dev|utm_source=lovable-badge/i.test(href)) (anchor as HTMLElement)?.remove();
          }
        });
      } catch {}
    };
    // Execução imediata e observador para futuras inserções
    removeLovable();
    const observer = new MutationObserver(() => removeLovable());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Header />
            {!envOk && (
              <div className="px-4 pt-16 pb-20 max-w-2xl mx-auto">
                <div className="rounded-xl border border-yellow-500/50 bg-yellow-500/10 p-4 text-yellow-200">
                  <div className="font-semibold mb-1">Configuração do Supabase ausente</div>
                  <div className="text-sm">
                    Adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no arquivo `.env.local` na raiz do projeto.
                    Após configurar, reinicie o servidor de desenvolvimento.
                  </div>
                </div>
              </div>
            )}
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/evento/:id" element={<EventDetails />} />
              <Route path="/criar" element={<RouteGuard minLevel={2}><CreateEvent /></RouteGuard>} />
              <Route path="/enquetes" element={<RouteGuard minLevel={2}><Polls /></RouteGuard>} />
              <Route path="/membros" element={<RouteGuard minLevel={1}><Members /></RouteGuard>} />
              <Route path="/memorias" element={<Memories />} />
              <Route path="/perfil" element={<RouteGuard minLevel={1}><Profile /></RouteGuard>} />
              <Route path="/admin" element={<RouteGuard minLevel={3}><Admin /></RouteGuard>} />
              <Route path="/auth" element={<Auth />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            {/* Sem indicador de conexão */}
            <AuthStatus />
            <BottomNav />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
