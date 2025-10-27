import { Card } from "@/components/ui/card";

interface MemoryAlbum {
  id: string;
  title: string;
  date: string;
  coverImage: string;
  photoCount: number;
}

const mockAlbums: MemoryAlbum[] = [
  {
    id: "1",
    title: "Praia em Maresias",
    date: "15/09/2024",
    coverImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80",
    photoCount: 24,
  },
  {
    id: "2",
    title: "Churrasco na Laje",
    date: "28/08/2024",
    coverImage: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80",
    photoCount: 18,
  },
  {
    id: "3",
    title: "Show do RBD",
    date: "10/08/2024",
    coverImage: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&q=80",
    photoCount: 31,
  },
  {
    id: "4",
    title: "Aniversário da Julia",
    date: "22/07/2024",
    coverImage: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600&q=80",
    photoCount: 42,
  },
];

const Memories = () => {
  return (
    <div className="pb-20 pt-16 px-4 max-w-2xl mx-auto">
      <h2 className="text-3xl font-extrabold bg-gradient-to-r from-emerald-400 to-sky-500 bg-clip-text text-transparent pt-4 pb-4">
        Memórias
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {mockAlbums.map((album) => (
          <Card
            key={album.id}
            className="overflow-hidden bg-card border-border hover:border-primary/50 transition-all cursor-pointer"
          >
            <div className="relative aspect-square overflow-hidden">
              <img
                src={album.coverImage}
                alt={album.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                <h3 className="font-bold text-foreground text-sm line-clamp-1">
                  {album.title}
                </h3>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{album.date}</span>
                  <span>{album.photoCount} fotos</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Memories;
