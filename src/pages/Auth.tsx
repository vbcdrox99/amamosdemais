import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signUpWithPhone, signInWithPhone } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ensureProfileForCurrentUser } from "@/lib/profile";
import { normalizePhoneNumber } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Auth = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullNameSignup, setFullNameSignup] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setLoading(true);
    const { error } = await signUpWithPhone(phone, password);
    setLoading(false);
    if (error) {
      toast({ title: "Erro no cadastro", description: error.message });
      return;
    }
    await ensureProfileForCurrentUser(fullNameSignup.trim() || undefined, phone);
    toast({ title: "Cadastro realizado", description: "Aguarde aprovação do admin para acessar o app." });
    // Fica na tela de auth; admin precisa aprovar
  };

  const handleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithPhone(phone, password);
    setLoading(false);
    if (error) {
      toast({ title: "Erro no login", description: error.message });
      return;
    }
    await ensureProfileForCurrentUser(undefined, phone);
    // Verifica aprovação
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) {
      toast({ title: "Erro", description: "Não foi possível obter usuário autenticado." });
      return;
    }
    const { data: prof } = await supabase.from("profiles").select("is_approved").eq("id", userId).maybeSingle();
    // Admin por telefone/email tem acesso mesmo sem aprovação
    const adminPhone = normalizePhoneNumber(phone) === "11996098995";
    const adminEmail = (data.user?.email?.toLowerCase() ?? "") === "dotaplaybrasil111@gmail.com";
    if (!prof?.is_approved && !(adminPhone || adminEmail)) {
      toast({ title: "Acesso pendente", description: "Seu cadastro aguarda aprovação do admin." });
      return;
    }
    toast({ title: adminPhone || adminEmail ? "Login admin" : "Login efetuado", description: adminPhone || adminEmail ? "Bem-vindo, admin!" : "Bem-vindo!" });
    // Garante que permissões e navegação reflitam imediatamente o estado aprovado
    // Faz um redirect duro para montar novamente com estado atualizado
    window.location.assign("/");
  };

  return (
    <div className="min-h-screen pt-14 pb-20 px-4 flex items-center justify-center">
      <Card className="max-w-md w-full bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Acesso</CardTitle>
          <CardDescription>Cadastre-se ou entre com telefone e senha.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="phone-login">Telefone</Label>
                <Input id="phone-login" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex: 11987654321" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-login">Senha</Label>
                <Input id="password-login" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="flex">
                <Button className="flex-1" variant="outline" onClick={handleSignIn} disabled={loading}>Login</Button>
              </div>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="phone-signup">Telefone</Label>
                <Input id="phone-signup" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex: 11987654321" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name-signup">Nome ou Apelido</Label>
                <Input id="name-signup" type="text" value={fullNameSignup} onChange={(e) => setFullNameSignup(e.target.value)} placeholder="Seu nome ou apelido" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signup">Senha</Label>
                <Input id="password-signup" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="flex">
                <Button className="flex-1" onClick={handleSignUp} disabled={loading}>Criar conta</Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;