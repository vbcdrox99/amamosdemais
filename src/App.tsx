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
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

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
            <Route path="/criar" element={<CreateEvent />} />
            <Route path="/enquetes" element={<Polls />} />
            <Route path="/memorias" element={<Memories />} />
            <Route path="/perfil" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ConnectionStatus />
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
