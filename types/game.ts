// types/game.ts

export type Player = 1 | 2;

export type Card = {
  id: string;
  code: string;
  name: string;
  level: number;
  cost: number;
  value_top: number;
  value_right: number;
  value_bottom: number;
  value_left: number;
  image_name: string | null;
};

export type BoardCell = {
  card: Card | null;
  owner: Player | null;
};
