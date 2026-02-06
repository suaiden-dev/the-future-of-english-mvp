import client1 from "@/assets/clients/client-1.jpeg";
import client2 from "@/assets/clients/client-2.jpeg";
import client3 from "@/assets/clients/client-3.jpeg";
import client4 from "@/assets/clients/client-4.jpeg";
import client5 from "@/assets/clients/client-5.jpeg";
import client6 from "@/assets/clients/client-6.jpeg";
import client8 from "@/assets/clients/client-8.jpeg";
import client9 from "@/assets/clients/client-9.jpeg";

// Adicione suas fotos aqui - basta adicionar ou remover da lista
// position: 'top' (padrão) ou 'center' para fotos que precisam de ajuste
const photos: { src: string; position?: 'top' | 'center' }[] = [
  { src: client1 },
  { src: client2 },
  { src: client3 },
  { src: client4 },
  { src: client5, position: 'center' },
  { src: client6 },
  { src: client8 },
  { src: client9 },
];

const ClientsSection = () => {
  // Calcula o número de colunas baseado na quantidade de fotos
  const getGridCols = () => {
    const count = photos.length;
    if (count <= 3) return "grid-cols-1 md:grid-cols-3";
    if (count <= 4) return "grid-cols-2 md:grid-cols-4";
    if (count <= 6) return "grid-cols-2 md:grid-cols-3";
    if (count <= 8) return "grid-cols-2 md:grid-cols-4";
    return "grid-cols-2 md:grid-cols-4 lg:grid-cols-5";
  };

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Nossos Clientes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Alunos que realizaram o sonho de estudar nos Estados Unidos
          </p>
        </div>

        <div className={`grid ${getGridCols()} gap-3 md:gap-4 max-w-5xl mx-auto`}>
          {photos.map((photo, index) => (
            <div
              key={index}
              className="aspect-square rounded-xl overflow-hidden opacity-0 animate-fade-up hover:scale-105 transition-transform duration-300 shadow-md"
              style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'forwards' }}
            >
              <img
                src={photo.src}
                alt={`Cliente ${index + 1}`}
                className={`w-full h-full object-cover ${photo.position === 'center' ? 'object-center' : 'object-top'}`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ClientsSection;
