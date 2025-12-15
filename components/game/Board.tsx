import { BoardCell } from "@/types/game";

type BoardProps = {
  board: BoardCell[];
  onCellClick: (cellIndex: number) => void;
  imageBaseUrl: string;
  cellWidth: number;
  cellHeight: number;
};

export default function Board({
  board,
  onCellClick,
  imageBaseUrl,
  cellWidth,
  cellHeight,
}: BoardProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {board.map((cell, idx) => (
        <div
          key={idx}
          onClick={() => onCellClick(idx)}
          className="border border-slate-600 flex items-center justify-center cursor-pointer"
          style={{ width: cellWidth, height: cellHeight }}
        >
          {cell.card ? (
            cell.card.image_name ? (
              <img
                src={`${imageBaseUrl}/${cell.card.image_name}`}
                alt={cell.card.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            ) : (
              <span className="text-xs text-center px-1">
                {cell.card.name}
              </span>
            )
          ) : (
            <span className="text-slate-500 text-xs">Vide</span>
          )}
        </div>
      ))}
    </div>
  );
}
