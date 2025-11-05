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
import Profile from "./pages/Profile";
import Polls from "./pages/Polls";
import Memories from "./pages/Memories";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import EditProfile from "./pages/EditProfile";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { useAuthRole } from "@/hooks/useAuthRole";

const queryClient = new QueryClient();

// Indicador simples de conexão com Supabase
const ConnectionStatus = () => {
  const [status, setStatus] = useState<"checking" | "ok" | "error" | "missing">("checking");
  const [message, setMessage] = useState("Verificando conexão...");

  useEffect(() => {
    if (!supabase) {
      setStatus("missing");
      setMessage("Variáveis VITE_SUPABASE_URL/ANON_KEY ausentes");
      return;
    }
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) {
          setStatus("error");
          setMessage(`Erro de conexão: ${error.message}`);
        } else {
          setStatus("ok");
          setMessage("Conectado ao Supabase");
        }
      })
      .catch((e) => {
        setStatus("error");
        setMessage(`Falha na requisição: ${String(e)}`);
      });
  }, []);

  const bg = status === "ok" ? "bg-green-600" : status === "checking" ? "bg-yellow-600" : status === "missing" ? "bg-orange-600" : "bg-red-600";

  return (
    <div className={`fixed bottom-2 right-2 z-50 text-xs text-white px-3 py-1 rounded shadow ${bg}`}>
      {message}
    </div>
  );
};

// Indicador de status de autenticação (nível/role/status)
const AuthStatus = () => {
  const { loading, level, profile } = useAuthRole();
  if (loading) return null;
  const bg = level >= 3 ? "bg-indigo-600" : level >= 2 ? "bg-emerald-600" : "bg-gray-600";
  const text = profile
    ? `Nível ${level} • role ${profile.role} • status ${profile.status}`
    : `Nível ${level} • sem perfil`;
  return (
    <div className={`fixed bottom-2 left-2 z-50 text-xs text-white px-3 py-1 rounded shadow ${bg}`}>
      {text}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/evento/:id" element={<EventDetails />} />
            <Route path="/criar" element={<RouteGuard minLevel={2}><CreateEvent /></RouteGuard>} />
            <Route path="/enquetes" element={<RouteGuard minLevel={2}><Polls /></RouteGuard>} />
            <Route path="/memorias" element={<Memories />} />
            <Route path="/perfil" element={<RouteGuard minLevel={2}><Profile /></RouteGuard>} />
            <Route path="/perfil/editar" element={<RouteGuard minLevel={2}><EditProfile /></RouteGuard>} />
            <Route path="/admin" element={<RouteGuard minLevel={3}><Admin /></RouteGuard>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ConnectionStatus />
          <AuthStatus />
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
