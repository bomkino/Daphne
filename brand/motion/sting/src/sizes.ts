import sizes from "./sizes.json";

// The three sizes the sting ships in, each with the safe area its type and logo
// stay inside. 9:16 keeps Instagram's caption zone clear at the bottom.
export type Size = {
  id: string;
  width: number;
  height: number;
  safe: { top: number; right: number; bottom: number; left: number };
};

export const SIZES = sizes as Size[];

export const sizeOf = (width: number, height: number): Size => {
  const size = SIZES.find((s) => s.width === width && s.height === height);
  if (!size) throw new Error(`No safe area for ${width}x${height} in sizes.json`);
  return size;
};
