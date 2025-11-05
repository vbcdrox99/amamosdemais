import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthRole } from "@/hooks/useAuthRole";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

type FormValues = {
  full_name: string;
  phone?: string;
  address?: string;
};

const EditProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading, profile, permissions } = useAuthRole();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    defaultValues: {
      full_name: profile?.full_name ?? "",
      phone: profile?.phone ?? "",
      address: profile?.address ?? "",
    },
  });

  useEffect(() => {
    reset({
      full_name: profile?.full_name ?? "",
      phone: profile?.phone ?? "",
      address: profile?.address ?? "",
    });
  }, [profile, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!supabase) {
      toast({ title: "Supabase não configurado", description: "Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY." });
      return;
    }
    if (!permissions.canEditOwnProfile) {
      toast({ title: "Edição não permitida", description: "Sua conta precisa estar aprovada para editar o perfil." });
      return;
    }
    if (!profile?.id) {
      toast({ title: "Perfil não carregado", description: "Tente novamente mais tarde." });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: values.full_name,
        phone: values.phone ?? null,
        address: values.address ?? null,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message });
      return;
    }
    toast({ title: "Perfil atualizado", description: "Suas informações foram salvas com sucesso." });
    navigate("/perfil");
  };

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Carregando perfil...</div>;
  }

  return (
    <div className="min-h-screen pt-14 pb-20 px-4">
      <h2 className="text-2xl font-bold mb-4 text-foreground">Editar Perfil</h2>
      {!permissions.canEditOwnProfile && (
        <div className="mb-4 text-sm text-muted-foreground">Somente contas aprovadas podem editar o perfil.</div>
      )}
      <Card className="p-4 bg-card border-border max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1" htmlFor="full_name">Nome completo</label>
            <Input id="full_name" placeholder="Digite seu nome"
              {...register("full_name", { required: "Nome é obrigatório", minLength: { value: 2, message: "Mínimo de 2 caracteres" } })}
            />
            {errors.full_name && (
              <p className="text-xs text-red-500 mt-1">{errors.full_name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1" htmlFor="phone">Telefone</label>
            <Input id="phone" placeholder="(11) 99999-9999"
              {...register("phone", {
                pattern: { value: /^[0-9\s\-\+\(\)]{8,20}$/, message: "Telefone inválido" },
              })}
            />
            {errors.phone && (
              <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1" htmlFor="address">Endereço</label>
            <Input id="address" placeholder="Rua, número, bairro, cidade"
              {...register("address", { minLength: { value: 5, message: "Informe um endereço válido" } })}
            />
            {errors.address && (
              <p className="text-xs text-red-500 mt-1">{errors.address.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" disabled={saving || !permissions.canEditOwnProfile}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/perfil")}>Cancelar</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EditProfile;