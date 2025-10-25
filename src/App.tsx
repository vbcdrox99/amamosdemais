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

const queryClient = new QueryClient();

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
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
