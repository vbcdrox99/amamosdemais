import { Bell, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border pt-safe">
      <div className="flex items-center justify-between h-14 px-4">
        <h1 className="text-2xl font-bold text-foreground">CAPS</h1>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full" />
          </Button>
          
          <Button variant="ghost" size="icon">
            <MessageCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
