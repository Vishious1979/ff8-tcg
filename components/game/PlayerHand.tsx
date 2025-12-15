import { Card, Player } from "@/types/game";

type PlayerHandProps = {
  player: Player;
  cards: Card[];
  currentPlayer: Player;
  selectedIndex: number | null;
  onSelectCard: (idx: number) => void;
  imageBaseUrl: string;
  cardWidth: number;
  cardHeight: number;
};

export default function PlayerHand({
  player,
  cards,
  currentPlayer,
  selectedIndex,
  onSelectCard,
  imageBaseUrl,
  cardWidth,
  cardHeight,
}: PlayerHandProps) {
  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {cards.map((card, idx) => {
        const isSelectable = player === currentPlayer;
        const isSelected = selectedIndex === idx;

        return (
          <div
            key={idx}
            onClick={() => isSelectable && onSelectCard(idx)}
            className={`border ${
              isSelected ? "border-yellow-400" : "border-slate-600"
            } cursor-pointer`}
            style={{ width: cardWidth, height: cardHeight }}
          >
            {card.image_name ? (
              <img
                src={`${imageBaseUrl}/${card.image_name}`}
                alt={card.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            ) : (
              <span className="text-xs block text-center px-1">
                {card.name}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
