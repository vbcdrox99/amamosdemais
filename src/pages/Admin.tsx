import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  status: "pending" | "approved" | "blocked";
  role: "viewer" | "user" | "admin";
};

const Admin = () => {
  const { toast } = useToast();
  const [pending, setPending] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPending = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,status,role")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao carregar", description: error.message });
    } else {
      setPending((data ?? []) as Profile[]);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const updateUser = async (id: string, changes: Partial<Profile>, action: string) => {
    if (!supabase) return;
    const { error } = await supabase.from("profiles").update(changes).eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message });
      return;
    }
    // Log action
    await supabase.from("admin_logs").insert({ action, target_user_id: id });
    toast({ title: "Sucesso", description: "Atualização realizada" });
    loadPending();
  };

  return (
    <div className="min-h-screen pt-14 pb-20 px-4">
      <h2 className="text-2xl font-bold mb-4 text-foreground">Painel Administrativo</h2>
      <p className="text-sm text-muted-foreground mb-6">Aprovar cadastros, gerenciar níveis de acesso e moderar.</p>

      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Pendentes de Aprovação</h3>
          <Button variant="outline" onClick={loadPending} disabled={loading}>Atualizar</Button>
        </div>
        <div className="mt-4 space-y-3">
          {pending.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhum usuário pendente.</div>
          )}
          {pending.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded border border-white/10">
              <div>
                <div className="text-sm text-foreground font-medium">{p.full_name || p.phone || p.email}</div>
                <div className="text-xs text-muted-foreground">Status: {p.status} • Papel: {p.role}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => updateUser(p.id, { status: "approved", role: "user" }, "approve_user")}>Aprovar</Button>
                <Button size="sm" variant="destructive" onClick={() => updateUser(p.id, { status: "blocked" }, "block_user")}>Bloquear</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Admin;