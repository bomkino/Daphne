import React from "react";
import { C, MARK } from "../brand/daphne";

type LeafData = { d: string; stalk: string; bbox: number[] };

// One of the logo's bay leaves, growing from its stalk to its tip (brand rule 1: things grow from where
// they're attached). A soft-edged wipe runs up the leaf while it rises to full size from its base, so
// nothing pops in or scales from its center. The mask is the leaf's whole box plus a margin, so the
// leaf can never be clipped.
export const GrowLeaf: React.FC<{ leaf: LeafData; p: number; fill: string; id: string; veinless?: boolean }> = ({ leaf, p, fill, id }) => {
  const [x0, y0, x1, y1] = leaf.bbox;
  const m = 140;
  const H = y1 - y0 + 2 * m;
  const soft = 0.16;
  const q = Math.max(0, Math.min(1, p));
  if (q <= 0) return null;
  const at = q * (1 + soft); // the growing edge, from the stalk (bottom) up
  const base = [(x0 + x1) / 2, y1];
  const sc = 0.82 + 0.18 * q;
  return (
    <g transform={`translate(${base[0]} ${base[1]}) scale(${sc}) translate(${-base[0]} ${-base[1]})`}>
      {q < 1 ? (
        <defs>
          <linearGradient id={`${id}-g`} gradientUnits="userSpaceOnUse" x1="0" y1={y1 + m} x2="0" y2={y1 + m - H}>
            <stop offset={Math.max(0, at - soft)} stopColor="#fff" />
            <stop offset={Math.min(1, at)} stopColor="#000" />
          </linearGradient>
          <mask id={`${id}-m`} maskUnits="userSpaceOnUse" x={x0 - m} y={y0 - m} width={x1 - x0 + 2 * m} height={H}>
            <rect x={x0 - m} y={y0 - m} width={x1 - x0 + 2 * m} height={H} fill={`url(#${id}-g)`} />
          </mask>
        </defs>
      ) : null}
      <g mask={q < 1 ? `url(#${id}-m)` : undefined} fill={fill}>
        <path fillRule="evenodd" d={leaf.d} />
        <path d={leaf.stalk} />
      </g>
    </g>
  );
};

// A plain leaf for the drifting background and the one leaf that falls at the end
export const LeafShape: React.FC<{ fill?: string; style?: React.CSSProperties; size: number }> = ({ fill = C.newLeaf, style, size }) => {
  const [x0, y0, x1, y1] = MARK.leaf.bbox;
  const w = x1 - x0, h = y1 - y0;
  return (
    <svg viewBox={`${x0} ${y0} ${w} ${h}`} width={(size * w) / h} height={size} style={{ overflow: "visible", ...style }}>
      <path fillRule="evenodd" d={MARK.leaf.d} fill={fill} />
    </svg>
  );
};
