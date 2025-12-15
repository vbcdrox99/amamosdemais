import { Bell, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuthRole } from "@/hooks/useAuthRole";
import { Link } from "react-router-dom";

export const Header = () => {
  const [logoSrc, setLogoSrc] = useState("/logo-caps.png");
  const { flags } = useAuthRole();

  return (
    <header className="fixed top-0 left-0 right-0 z-[1100] bg-black/80 backdrop-blur border-b border-white/20 pt-safe">
      <div className="flex items-center justify-between h-14 px-4">
        <Link to="/" className="flex items-center justify-center">
          <img
            src={logoSrc}
            alt="CAPS"
            className="h-5 w-auto"
            onError={() => setLogoSrc("/placeholder.svg")}
          />
        </Link>

        <h1 className="text-2xl sm:text-3xl md:text-4xl leading-none tracking-wide font-extrabold bg-gradient-to-r from-emerald-400 to-sky-500 bg-clip-text text-transparent">
          <Link to="/" className="inline-block">CAPS</Link>
        </h1>

        <div className="flex items-center gap-2">
          {!flags.isAuthenticated && (
            <Button asChild size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <Link to="/auth">Entrar</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
