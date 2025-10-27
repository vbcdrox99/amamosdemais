import { Bell, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const Header = () => {
  const [logoSrc, setLogoSrc] = useState("/AMAMOS DE MAIS.png");

  return (
    <header className="fixed top-0 left-0 right-0 z-[1100] bg-black/80 backdrop-blur border-b border-white/20 pt-safe">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center justify-center">
          <img
            src={logoSrc}
            alt="Amamos de Mais"
            className="h-7 w-auto"
            onError={() => setLogoSrc("/placeholder.svg")}
          />
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-emerald-400 to-sky-500 bg-clip-text text-transparent">
          AMAMOS DE MAIS
        </h1>
      </div>
    </header>
  );
};
