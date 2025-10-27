import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-4">
        <h1 className="mb-3 text-5xl font-extrabold bg-gradient-to-r from-emerald-400 to-sky-500 bg-clip-text text-transparent">404</h1>
        <p className="mb-6 text-base text-muted-foreground">Oops! Página não encontrada</p>
        <Button asChild>
          <a href="/" className="">
            Voltar para Home
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
