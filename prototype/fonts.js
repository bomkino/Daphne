// fonts.js — the curated font list (open-licensed Google Fonts, almost all under the SIL Open Font License) and the loaders.
// w: available weights; v: true = variable (any weight in range); it: has italics.
export const FONTS = [
  // sans
  { f: 'Figtree', c: 'Sans', w: [300, 900], v: 1, it: 1 },
  { f: 'Inter Tight', c: 'Sans', w: [100, 900], v: 1, it: 1 },
  { f: 'Manrope', c: 'Sans', w: [200, 800], v: 1 },
  { f: 'Montserrat', c: 'Sans', w: [100, 900], v: 1, it: 1 },
  { f: 'Jost', c: 'Sans', w: [100, 900], v: 1, it: 1 },
  { f: 'Archivo', c: 'Sans', w: [100, 900], v: 1, it: 1 },
  { f: 'Syne', c: 'Sans', w: [400, 800], v: 1 },
  { f: 'Space Grotesk', c: 'Sans', w: [300, 700], v: 1 },
  { f: 'Josefin Sans', c: 'Sans', w: [100, 700], v: 1, it: 1 },
  { f: 'Tenor Sans', c: 'Sans', w: [400] },
  { f: 'Outfit', c: 'Sans', w: [100, 900], v: 1 },
  // condensed / display
  { f: 'Bebas Neue', c: 'Condensed', w: [400] },
  { f: 'Oswald', c: 'Condensed', w: [200, 700], v: 1 },
  { f: 'Big Shoulders Display', c: 'Condensed', w: [100, 900], v: 1 },
  { f: 'Barlow Condensed', c: 'Condensed', w: [100, 200, 300, 400, 500, 600, 700, 800, 900], it: 1 },
  { f: 'Anton', c: 'Condensed', w: [400] },
  // classical serif / caps
  { f: 'Cinzel', c: 'Classical', w: [400, 900], v: 1 },
  { f: 'Cinzel Decorative', c: 'Classical', w: [400, 700, 900] },
  { f: 'Marcellus', c: 'Classical', w: [400] },
  { f: 'Marcellus SC', c: 'Classical', w: [400] },
  { f: 'Trajan-like: Forum', c: 'Classical', w: [400], alias: 'Forum' },
  { f: 'IM Fell English SC', c: 'Classical', w: [400] },
  { f: 'Cormorant SC', c: 'Classical', w: [300, 400, 500, 600, 700] },
  // serif
  { f: 'Cormorant Garamond', c: 'Serif', w: [300, 700], v: 1, it: 1 },
  { f: 'EB Garamond', c: 'Serif', w: [400, 800], v: 1, it: 1 },
  { f: 'Playfair Display', c: 'Serif', w: [400, 900], v: 1, it: 1 },
  { f: 'Bodoni Moda', c: 'Serif', w: [400, 900], v: 1, it: 1 },
  { f: 'Libre Baskerville', c: 'Serif', w: [400, 700], it: 1 },
  { f: 'Fraunces', c: 'Serif', w: [100, 900], v: 1, it: 1 },
  { f: 'Instrument Serif', c: 'Serif', w: [400], it: 1 },
  { f: 'DM Serif Display', c: 'Serif', w: [400], it: 1 },
  { f: 'Gloock', c: 'Serif', w: [400] },
  { f: 'Prata', c: 'Serif', w: [400] },
  { f: 'Young Serif', c: 'Serif', w: [400] },
  { f: 'Gilda Display', c: 'Serif', w: [400] },
  { f: 'Italiana', c: 'Serif', w: [400] },
  { f: 'Abril Fatface', c: 'Serif', w: [400] },
  // deco / character
  { f: 'Poiret One', c: 'Deco', w: [400] },
  { f: 'Limelight', c: 'Deco', w: [400] },
  { f: 'Federo', c: 'Deco', w: [400] },
  { f: 'Monoton', c: 'Deco', w: [400] },
  { f: 'Rye', c: 'Character', w: [400] },
  { f: 'UnifrakturMaguntia', c: 'Character', w: [400] },
  { f: 'Special Elite', c: 'Character', w: [400] },
  { f: 'Pirata One', c: 'Character', w: [400] },
].map((x) => ({ ...x, f: x.alias || x.f }));

const loaded = new Map();
export const fontInfo = (family) => FONTS.find((x) => x.f === family);

// Google Fonts CSS2 URL for a family: variable fonts ask for the full range, static ones for their weights
export function cssUrl(family) {
  const info = fontInfo(family), fam = encodeURIComponent(family).replace(/%20/g, '+');
  if (!info) return `https://fonts.googleapis.com/css2?family=${fam}&display=swap`;
  const ws = info.v ? [`${info.w[0]}..${info.w[info.w.length - 1]}`] : info.w;
  if (ws.length === 1 && ws[0] === 400 && !info.it) return `https://fonts.googleapis.com/css2?family=${fam}&display=swap`;
  const spec = info.it ? `ital,wght@${[0, 1].flatMap((i) => ws.map((w) => `${i},${w}`)).join(';')}` : `wght@${ws.join(';')}`;
  return `https://fonts.googleapis.com/css2?family=${fam}:${spec}&display=swap`;
}

// load a family (and wait for the weights in use). Unknown families are tried as plain Google Fonts names.
export async function loadFont(family, weights = [400]) {
  if (!family) return;
  if (!loaded.has(family)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = cssUrl(family);
    const p = new Promise((res) => { link.onload = res; link.onerror = res; });
    document.head.appendChild(link);
    loaded.set(family, p);
  }
  await loaded.get(family);
  await Promise.all(weights.map((w) => document.fonts.load(`${w} 100px "${family}"`).catch(() => null)));
}

// For PNG export: an SVG drawn into a canvas can't fetch fonts, so inline them as data URIs.
export async function embedFontCss(families) {
  const out = [];
  for (const fam of families) {
    try {
      const css = await (await fetch(cssUrl(fam))).text();
      const urls = [...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]))];
      let inlined = css;
      for (const u of urls) {
        const buf = await (await fetch(u)).arrayBuffer();
        let bin = ''; const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        inlined = inlined.split(u).join(`data:font/woff2;base64,${btoa(bin)}`);
      }
      out.push(inlined);
    } catch (e) { console.warn('font embed failed', fam, e); }
  }
  return out.join('\n');
}

// For the font picker: each family's own name drawn in that family, at a few kilobytes. Google Fonts can subset to just
// the letters asked for (text=), so every name loads in a handful of small requests. The faces get a "pv " prefix so
// they never stand in for the real, full fonts the laurel itself uses.
let previewDone = null;
export function loadPreviewFonts(families) {
  if (previewDone) return previewDone;
  const chars = [...new Set(families.join('') + 'AaBbCc0123456789')].join('');
  const chunks = [];
  for (let i = 0; i < families.length; i += 12) chunks.push(families.slice(i, i + 12));
  previewDone = Promise.all(chunks.map(async (fs) => {
    const url = `https://fonts.googleapis.com/css2?${fs.map((f) => 'family=' + encodeURIComponent(f).replace(/%20/g, '+')).join('&')}&text=${encodeURIComponent(chars)}&display=swap`;
    try {
      const r = await fetch(url); if (!r.ok) return;
      const css = (await r.text()).replace(/font-family:\s*'([^']+)'/g, (m, f) => `font-family: 'pv ${f}'`);
      const st = document.createElement('style'); st.dataset.preview = '1'; st.textContent = css; document.head.appendChild(st);
    } catch (e) { /* the names fall back to the interface font */ }
  }));
  return previewDone;
}
