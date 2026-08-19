import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { useSessionStore } from "@/store/useSessionStore";
import { Skeleton } from "@/components/ui/skeleton";
import { TEST_REGISTRY } from "@/features/assessment/registry";

interface TATCard {
  id: string;
  filename: string;
}

interface CardGridProps {
  version?: "indianized" | "globalized";
}

const CARD_SEQUENCE = [
  { id: "Card 1", label: "Picture 1" },
  { id: "Card 2", label: "Picture 2" },
  { id: "Card 3", label: "Picture 3 BM" },
  { id: "Card 4", label: "Picture 3 GF" },
  { id: "Card 5", label: "Picture 4" },
  { id: "Card 6", label: "Picture 5" },
  { id: "Card 7", label: "Picture 6 BM" },
  { id: "Card 8", label: "Picture 6 GF" },
  { id: "Card 9", label: "Picture 7 BM" },
  { id: "Card 10", label: "Picture 7 GF" },
  { id: "Card 11", label: "Picture 8 BM" },
  { id: "Card 12", label: "Picture 8 GF" },
  { id: "Card 13", label: "Picture 9 BM" },
  { id: "Card 14", label: "Picture 9 GF" },
  { id: "Card 15", label: "Picture 10" },
  { id: "Card 16", label: "Picture 11" },
  { id: "Card 19", label: "Picture 12 BG" },
  { id: "Card 17", label: "Picture 12 M" },
  { id: "Card 18", label: "Picture 12 F" },
  { id: "Card 21", label: "Picture 13 B" },
  { id: "Card 22", label: "Picture 13 G" },
  { id: "Card 20", label: "Picture 13 MF" },
  { id: "Card 23", label: "Picture 14" },
  { id: "Card 24", label: "Picture 15" },
  { id: "Card 25", label: "Picture 16 (Blank Card)" },
  { id: "Card 26", label: "Picture 17 BM" },
  { id: "Card 27", label: "Picture 17 GF" },
  { id: "Card 28", label: "Picture 18 B" },
  { id: "Card 29", label: "Picture 18 GF" },
  { id: "Card 30", label: "Picture 19" },
  { id: "Card 31", label: "Picture 20" },
];

const getCardCategory = (label: string) => {
  if (label.includes("BM")) return { text: "Boy-Male", color: "bg-blue-600", textColor: "text-white" };
  if (label.includes("GF")) return { text: "Girl-Female", color: "bg-red-600", textColor: "text-white" };
  if (label.includes("MF")) return { text: "Male-Female", color: "bg-purple-600", textColor: "text-white" };
  if (label.includes("BG")) return { text: "Boy-Girl", color: "bg-yellow-400", textColor: "text-slate-900" };
  if (label.endsWith(" M") || label.includes(" M ")) return { text: "Male", color: "bg-green-600", textColor: "text-white" };
  if (label.endsWith(" F") || label.includes(" F ")) return { text: "Female", color: "bg-amber-800", textColor: "text-white" };
  if (label.endsWith(" B") || label.includes(" B ")) return { text: "Boy", color: "bg-sky-400", textColor: "text-slate-900" };
  if (label.endsWith(" G") || label.includes(" G ")) return { text: "Girl", color: "bg-pink-500", textColor: "text-white" };
  return { text: "ALL", color: "bg-white", textColor: "text-slate-900" };
};

const LEGEND_CATEGORIES = [
  { text: "ALL", color: "bg-white" },
  { text: "Boy-Male", color: "bg-blue-600" },
  { text: "Girl-Female", color: "bg-red-600" },
  { text: "Male-Female", color: "bg-purple-600" },
  { text: "Boy-Girl", color: "bg-yellow-400" },
  { text: "Male", color: "bg-green-600" },
  { text: "Female", color: "bg-amber-800" },
  { text: "Boy", color: "bg-sky-400" },
  { text: "Girl", color: "bg-pink-500" },
];

export function CardGrid({ version = "indianized" }: CardGridProps) {
  const { selectedCards, toggleCard, testType } = useSessionStore();
  const testDef = TEST_REGISTRY.find((t: any) => t.slug === testType) || { name: "Assessment" };
  const [cards, setCards] = useState<TATCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCards() {
      try {
        const { data } = await apiClient.get<TATCard[]>(`/cards?version=${version}`);

        // Sort and map the data according to CARD_SEQUENCE
        const orderedCards: TATCard[] = [];
        CARD_SEQUENCE.forEach(seqItem => {
          const matchedCard = data.find(c => c.id === seqItem.id);
          if (matchedCard) {
            orderedCards.push(matchedCard);
          }
        });

        // Append any cards that are in data but not in CARD_SEQUENCE at the end
        data.forEach(c => {
          if (!CARD_SEQUENCE.some(seq => seq.id === c.id)) {
            orderedCards.push(c);
          }
        });

        setCards(orderedCards);
      } catch (error) {
        console.error("Failed to fetch cards:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCards();
  }, [version]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <h3 className="text-lg font-medium whitespace-nowrap">Select {testDef.name} Cards</h3>
          <div className="grid grid-cols-5 gap-x-5 gap-y-1.5 ml-0 md:ml-2">
            {LEGEND_CATEGORIES.map(cat => (
              <div key={cat.text} className="flex items-center gap-1.5 text-[10px] font-medium text-foreground/80">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cat.color} ${cat.color === 'bg-white' ? 'border border-slate-300' : ''}`} />
                <span className="whitespace-nowrap">{cat.text}</span>
              </div>
            ))}
          </div>
        </div>
        <Badge variant="secondary" className="w-fit">{selectedCards.length} Selected</Badge>
      </div>

      <div className="max-h-[calc(100vh-380px)] overflow-y-auto pr-4 pb-4">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-3">
          {cards.map((card) => {
            const isSelected = selectedCards.includes(card.id);
            const seqMatch = CARD_SEQUENCE.find(seq => seq.id === card.id);
            const displayLabel = seqMatch ? seqMatch.label : card.id.toUpperCase();
            const category = getCardCategory(displayLabel);
            return (
              <Card
                key={card.id}
                className={`cursor-pointer overflow-hidden transition-all hover:scale-[1.02] active:scale-95
                ${isSelected ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"}`}
                onClick={() => toggleCard(card.id)}
              >
                <div className="relative aspect-square bg-muted flex flex-col items-center justify-center overflow-hidden">
                  <div
                    className={`absolute top-0 left-0 z-20 w-16 h-16 opacity-80 ${category.color}`}
                    style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
                  />
                  <div className={`absolute top-1.5 left-2 z-30 font-bold text-lg leading-none ${category.textColor} drop-shadow-sm`}>
                    {seqMatch ? CARD_SEQUENCE.indexOf(seqMatch) + 1 : ""}
                  </div>

                  {isSelected && (
                    <div className="absolute top-2 right-2 z-10 bg-background/80 rounded-full">
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    </div>
                  )}

                  <div className={`w-full h-full relative transition-colors`}>
                    <img
                      src={`${apiClient.defaults.baseURL}/cards/image/${version}/${card.filename}`}
                      alt={card.id}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <span className="text-xs uppercase tracking-widest font-bold text-primary bg-background/80 px-3 py-1 rounded-full">
                          Selected
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="hidden absolute bottom-0 inset-x-0 bg-background/90 backdrop-blur-md p-2 text-center border-t border-primary/10">
                    <span className="text-sm font-medium tracking-tight whitespace-nowrap text-ellipsis overflow-hidden block">
                      {displayLabel}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

