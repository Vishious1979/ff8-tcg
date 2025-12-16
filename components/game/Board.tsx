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
      {board.map((cell, idx) => {
        const borderColor =
          cell.owner === 1
            ? "border-blue-500"
            : cell.owner === 2
            ? "border-red-500"
            : "border-slate-600";

        return (
          <div
            key={idx}
            onClick={() => onCellClick(idx)}
            className={`relative border-2 ${borderColor} flex items-center justify-center cursor-pointer`}
            style={{ width: cellWidth, height: cellHeight }}
          >
            {cell.card ? (
              <>
                {cell.card.image_name ? (
                  <img
                    src={`${imageBaseUrl}/${cell.card.image_name}`}
                    alt={cell.card.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-center px-1">
                    {cell.card.name}
                  </span>
                )}

                {cell.owner && (
                  <div
                    className={`absolute top-1 left-1 text-[10px] px-1 rounded ${
                      cell.owner === 1
                        ? "bg-blue-600"
                        : "bg-red-600"
                    }`}
                  >
                    J{cell.owner}
                  </div>
                )}
              </>
            ) : (
              <span className="text-slate-500 text-xs">Vide</span>
            )}
          </div>
        );
      })}
    </div>
  );
}


