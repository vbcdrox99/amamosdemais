import { useState } from "react";
import { ArrowLeft, Upload, Calendar as CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

const CreateEvent = () => {
  const navigate = useNavigate();
  const [coverImage, setCoverImage] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen pb-20 pt-14">
      <div className="sticky top-14 z-10 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Criar Novo Rolê</h1>
        <div className="w-10" />
      </div>

      <form className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Cover Image */}
        <div className="space-y-2">
          <Label htmlFor="cover">Foto de Capa</Label>
          <Card className="relative h-48 overflow-hidden bg-card border-border border-dashed">
            {coverImage ? (
              <>
                <img
                  src={coverImage}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-3 right-3"
                  onClick={() => setCoverImage(null)}
                >
                  Remover
                </Button>
              </>
            ) : (
              <label
                htmlFor="cover"
                className="flex flex-col items-center justify-center h-full cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Clique para adicionar uma foto
                </span>
              </label>
            )}
            <input
              id="cover"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </Card>
        </div>

        {/* Event Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Nome do Rolê</Label>
          <Input
            id="name"
            placeholder="Ex: Churrasco na Laje do Zé"
            className="bg-input border-border"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            placeholder="Conte mais sobre o rolê..."
            className="bg-input border-border min-h-[120px] resize-none"
          />
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              className="bg-input border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Horário</Label>
            <Input
              id="time"
              type="time"
              className="bg-input border-border"
            />
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location">Local</Label>
          <Input
            id="location"
            placeholder="Ex: Vila Madalena, São Paulo"
            className="bg-input border-border"
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold"
          onClick={(e) => {
            e.preventDefault();
            // Here you would handle the form submission
            navigate("/");
          }}
        >
          Publicar Rolê!
        </Button>
      </form>
    </div>
  );
};

export default CreateEvent;
