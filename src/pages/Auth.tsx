import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuthRole } from "@/hooks/useAuthRole";

const Auth = () => {
  const { toast } = useToast();
  const [accountNumber, setAccountNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();
  const { session, level, flags, profile } = useAuthRole();

  useEffect(() => {
    if (session) navigate("/", { replace: true });
  }, [session]);

  // Helper: normaliza para apenas dígitos
  const onlyDigits = (value: string) => value.replace(/\D/g, "").slice(0, 32);
  // Mapeia número para um email técnico invisível (apenas para o Supabase)
  const numberToEmail = (digits: string) => `${digits}@example.com`;

  // Diagnostic: teste simples de conectividade com a API (opcional)
  const testConnectivity = async () => {
    if (!supabase) {
      const msg = "Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.";
      setErrorMsg(msg);
      toast({ title: "Supabase não configurado", description: msg });
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      // Timeout de segurança para evitar spinner infinito
      const timeoutMs = 15000;
      let timeoutHandle: number | undefined;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = window.setTimeout(() => {
          reject(new Error("Tempo de conexão esgotado. Verifique sua rede ou tente novamente."));
        }, timeoutMs);
      });

      const queryPromise = supabase.from("profiles").select("id").limit(1);
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      if (timeoutHandle) clearTimeout(timeoutHandle);
      const { error } = result ?? {};
      if (error) {
        setErrorMsg(error.message);
        toast({ title: "API respondeu com erro", description: error.message });
      } else {
        toast({ title: "Conexão OK", description: "Consulta simples funcionou." });
      }
    } catch (e: any) {
      const msg = e?.message ?? "Falha inesperada ao consultar.";
      setErrorMsg(msg);
      toast({ title: "Erro de conexão", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    if (!supabase) {
      const msg = "Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.";
      setErrorMsg(msg);
      toast({ title: "Supabase não configurado", description: msg });
      return;
    }
    // Validação: use apenas dígitos (ajuste o tamanho conforme sua regra)
    const digitsOnly = onlyDigits(accountNumber);
    if (!/^\d{4,32}$/.test(digitsOnly)) {
      const msg = "Use apenas dígitos (mín. 4).";
      setErrorMsg(msg);
      toast({ title: "Número inválido", description: msg });
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signUp({
        email: numberToEmail(digitsOnly),
        password,
        // Guarda o número nos metadados para uso interno
        options: { data: { account_number: digitsOnly } },
      });
      if (error) {
        setErrorMsg(error.message);
        toast({ title: "Erro ao cadastrar", description: error.message });
      } else {
        toast({ title: "Cadastro criado", description: "Se sua conta estiver pendente, aguarde aprovação do ADMIN." });
      }
    } catch (e: any) {
      const msg = e?.message ?? "Falha inesperada ao cadastrar.";
      setErrorMsg(msg);
      toast({ title: "Erro de conexão", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    if (!supabase) {
      const msg = "Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.";
      setErrorMsg(msg);
      toast({ title: "Supabase não configurado", description: msg });
      return;
    }
    const digitsOnly = onlyDigits(accountNumber);
    if (!/^\d{4,32}$/.test(digitsOnly)) {
      const msg = "Use apenas dígitos (mín. 4).";
      setErrorMsg(msg);
      toast({ title: "Número inválido", description: msg });
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      // Timeout de segurança para evitar spinner infinito em rede instável
      const timeoutMs = 20000;
      let timeoutHandle: number | undefined;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = window.setTimeout(() => {
          reject(new Error("Tempo de conexão esgotado. Verifique sua rede ou tente novamente."));
        }, timeoutMs);
      });

      const signInPromise = supabase.auth.signInWithPassword({ email: numberToEmail(digitsOnly), password });
      const { error } = await Promise.race([signInPromise, timeoutPromise]) as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (error) {
        setErrorMsg(error.message);
        toast({ title: "Erro ao entrar", description: error.message });
      } else {
        // Confirma sessão imediatamente para evitar atraso de atualização
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) {
          setErrorMsg(sessionErr.message);
          toast({ title: "Sessão não carregou", description: sessionErr.message });
        } else if (!sessionData?.session) {
          setErrorMsg("Sessão não foi estabelecida após login.");
          toast({ title: "Sessão não ativa", description: "Tente novamente ou verifique a conexão." });
        } else {
          toast({ title: "Login realizado", description: "Se sua conta estiver pendente, aguarde aprovação do ADMIN." });
          // Redireciona para a Home após login
          navigate("/", { replace: true });
        }
      }
    } catch (e: any) {
      const msg = e?.message ?? "Falha inesperada ao entrar.";
      setErrorMsg(msg);
      toast({ title: "Erro de conexão", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!supabase) {
      const msg = "Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.";
      setErrorMsg(msg);
      toast({ title: "Supabase não configurado", description: msg });
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const redirectTo = window.location.origin + "/";
      const { error, data } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) {
        setErrorMsg(error.message);
        toast({ title: "Erro OAuth", description: error.message });
      } else if (data?.url) {
        toast({ title: "Redirecionando para Google", description: "Conclua o login no provedor." });
        window.location.assign(data.url);
      }
    } catch (e: any) {
      const msg = e?.message ?? "Falha inesperada no OAuth.";
      setErrorMsg(msg);
      toast({ title: "Erro de conexão", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setErrorMsg(error.message);
        toast({ title: "Erro ao sair", description: error.message });
      } else {
        toast({ title: "Sessão encerrada" });
      }
    } catch (e: any) {
      const msg = e?.message ?? "Falha inesperada ao sair.";
      setErrorMsg(msg);
      toast({ title: "Erro de conexão", description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-14 pb-20 px-4 flex items-center justify-center">
      <Card className="max-w-md w-full bg-card border-border">
      <CardHeader>
          <CardTitle className="text-foreground">Acessar</CardTitle>
          <CardDescription>Cadastre-se com número e senha. A conta só é liberada após aprovação.</CardDescription>
      </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">Entrar</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">Cadastrar</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="space-y-3 pt-3">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Seu número (apenas dígitos)"
                value={accountNumber}
                onChange={(e) => setAccountNumber(onlyDigits(e.target.value))}
              />
              <Input type="password" placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button
                size="lg"
                variant="outline"
                className="w-full border-white/30 text-white hover:bg-white/10 bg-gradient-to-r from-emerald-600/30 to-sky-600/30"
                onClick={signIn}
                disabled={loading}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Entrando...
                  </span>
                ) : (
                  "Entrar"
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full border-white/30 text-white hover:bg-white/10"
                onClick={signInWithGoogle}
                disabled={loading}
              >
                Entrar com Google
              </Button>
              {errorMsg && (
                <p className="text-xs text-red-400/90">{errorMsg}</p>
              )}
          </TabsContent>
          <TabsContent value="signup" className="space-y-3 pt-3">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Seu número (apenas dígitos)"
                value={accountNumber}
                onChange={(e) => setAccountNumber(onlyDigits(e.target.value))}
              />
              <Input type="password" placeholder="Crie uma senha" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button
                size="lg"
                variant="outline"
                className="w-full border-white/30 text-white hover:bg-white/10 bg-gradient-to-r from-emerald-600/30 to-sky-600/30"
                onClick={signUp}
                disabled={loading}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cadastrando...
                  </span>
                ) : (
                  "Cadastrar"
                )}
              </Button>
              {errorMsg && (
                <p className="text-xs text-red-400/90">{errorMsg}</p>
              )}
              <p className="text-xs text-muted-foreground">Use apenas dígitos para o número. Após cadastrar, aguarde aprovação de um ADMIN.</p>
            </TabsContent>
            <div className="pt-4 flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={testConnectivity}
                disabled={loading}
              >
                Testar conexão com Supabase
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={signOut}
                disabled={loading}
              >
                Sair
              </Button>
              <div className="text-xs text-muted-foreground">
                <p> Sessão: {session ? `on (${session.user?.email ?? session.user?.id})` : "off"} | Nível: {level} </p>
                <p> Flags: admin={String(flags.isAdmin)} approved={String(flags.isApproved)} </p>
                {profile && (
                  <p> Perfil: role={profile.role} status={profile.status} nome={profile.full_name ?? "(sem nome)"} </p>
                )}
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;