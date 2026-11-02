import React, { useLayoutEffect, useMemo, useRef } from "react";
import { fitBox, useSvgText, VB } from "../lib/svg";

// A laurel drawn by Daphne's engine, grown on screen the way the brand grows things: from the stalks at
// the bottom up to the tips, each leaf rising from where it's attached as the growing edge passes it.
// The engine draws one branch and mirrors it, so both sides grow together. The words are the engine's
// own lines (outlined), and each can be shown on its own.
type Props = {
  file: string;
  vb: VB;
  cx: number;
  cy: number;
  height: number;
  p: number; // growth, 0..1
  lines?: number[]; // opacity of each line of words, in the engine's order
  rise?: number; // px the words rise from as they arrive
  sheen?: number; // a band of light across the metal, -0.2..1.2; outside that, none
  id: string;
  style?: React.CSSProperties;
};

type Part = { el: SVGPathElement; ax: number; ay: number; a: number };

export const GrowLaurel: React.FC<Props> = ({ file, vb, cx, cy, height, p, lines, rise = 0, sheen, id, style }) => {
  const text = useSvgText(file);
  const ref = useRef<HTMLDivElement>(null);
  const parts = useRef<{ leaves: Part[]; words: SVGPathElement[]; wedge: SVGPathElement | null; amin: number; amax: number; sheen: SVGRectElement | null } | null>(null);
  const box = fitBox(vb, cx, cy, height);
  const html = useMemo(() => (text ? text.replace("<svg ", '<svg style="width:100%;height:100%;overflow:visible;display:block" ') : ""), [text]);

  useLayoutEffect(() => {
    const host = ref.current;
    if (!host || !text) return;
    if (!parts.current) {
      const svg = host.querySelector("svg")!;
      const NS = "http://www.w3.org/2000/svg";
      const groups = [...svg.children].filter((c) => c.tagName === "g");
      const wreath = groups[0], words = groups[groups.length - 1];
      let defs = svg.querySelector("defs");
      if (!defs) { defs = document.createElementNS(NS, "defs"); svg.prepend(defs); }
      const [x, y, w, h] = vb;
      defs.insertAdjacentHTML(
        "beforeend",
        `<filter id="${id}-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${(h * 0.025).toFixed(2)}"/></filter>` +
          `<mask id="${id}-gm" maskUnits="userSpaceOnUse" x="${x - w}" y="${y - h}" width="${w * 3}" height="${h * 3}"><path id="${id}-wedge" fill="#fff" filter="url(#${id}-soft)"/></mask>` +
          `<linearGradient id="${id}-sh" gradientUnits="userSpaceOnUse" x1="${x}" y1="${y + h}" x2="${x + w}" y2="${y}"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff8e0" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
          `<mask id="${id}-shm" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><use href="#${id}-wreath-ink"/></mask>`,
      );
      wreath.setAttribute("mask", `url(#${id}-gm)`);
      // the light across the metal: a band clipped to the wreath's own shape
      wreath.setAttribute("id", `${id}-wreath-ink`);
      const band = document.createElementNS(NS, "rect");
      band.setAttribute("x", String(x - w));
      band.setAttribute("y", String(y));
      band.setAttribute("width", String(w * 0.5));
      band.setAttribute("height", String(h));
      band.setAttribute("fill", `url(#${id}-sh)`);
      band.setAttribute("style", "mix-blend-mode:screen");
      const bandG = document.createElementNS(NS, "g");
      bandG.setAttribute("mask", `url(#${id}-shm)`);
      bandG.append(band);
      wreath.after(bandG);
      const leaves: Part[] = [];
      wreath.querySelectorAll("path").forEach((el) => {
        const m = /^\s*M\s*([-\d.]+)[\s,]+([-\d.]+)/.exec(el.getAttribute("d") || "");
        if (!m) return;
        const ax = +m[1], ay = +m[2];
        leaves.push({ el, ax, ay, a: Math.atan2(Math.abs(ax), ay) });
      });
      const as = leaves.map((l) => l.a);
      parts.current = {
        leaves,
        words: [...words.querySelectorAll("path")] as SVGPathElement[],
        wedge: svg.querySelector(`#${id}-wedge`),
        amin: Math.min(...as),
        amax: Math.max(...as),
        sheen: band,
      };
    }
    const P = parts.current;
    // the growing edge, as an angle from straight down, sweeping up both sides
    const a0 = P.amin - 0.12, a1 = P.amax + 0.25;
    const phi = a0 + (a1 - a0) * Math.max(0, Math.min(1, p));
    const R = vb[3] * 2;
    const pts = (side: number) => {
      const out: string[] = [];
      for (let a = -0.2; a <= phi + 1e-6; a += 0.04) out.push(`${(side * Math.sin(a) * R).toFixed(2)} ${(Math.cos(a) * R).toFixed(2)}`);
      out.push(`${(side * Math.sin(phi) * R).toFixed(2)} ${(Math.cos(phi) * R).toFixed(2)}`);
      return out;
    };
    P.wedge?.setAttribute("d", p >= 1 ? `M${vb[0] - vb[2]} ${vb[1] - vb[3]}h${vb[2] * 3}v${vb[3] * 3}h${-vb[2] * 3}z` : p <= 0 ? "M0 0" : `M0 0L${pts(-1).join("L")}ZM0 0L${pts(1).join("L")}Z`);
    for (const l of P.leaves) {
      const t = Math.max(0, Math.min(1, (phi - l.a) / 0.32 + 0.1));
      const s = 1 - Math.pow(1 - t, 3);
      l.el.setAttribute("transform", s >= 1 ? "" : `translate(${l.ax} ${l.ay}) scale(${s.toFixed(4)}) translate(${-l.ax} ${-l.ay})`);
    }
    P.words.forEach((el, i) => {
      const o = lines ? (lines[i] ?? lines[lines.length - 1]) : 1;
      el.setAttribute("opacity", o.toFixed(3));
      el.setAttribute("transform", rise && o < 1 ? `translate(0 ${((1 - o) * rise) / box.k})` : "");
    });
    if (P.sheen) {
      const on = sheen !== undefined && sheen > -0.3 && sheen < 1.3;
      P.sheen.setAttribute("x", String(vb[0] - vb[2] * 0.5 + (on ? sheen! : -1) * vb[2] * 1.5));
      P.sheen.setAttribute("opacity", on ? "1" : "0");
    }
  });

  return (
    <div
      ref={ref}
      style={{ position: "absolute", left: box.left, top: box.top, width: box.width, height: box.height, ...style }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
