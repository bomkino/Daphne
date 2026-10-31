// The film's leaf (src/leaf.ts) must draw exactly the logo's leaves (brand/tools/mark.mjs).
//   node scripts/check-leaf.ts
import { readFileSync } from "node:fs";
import { leafBracket } from "../src/leaf.ts";

const logo = JSON.parse(readFileSync(new URL("../src/data/logo.json", import.meta.url), "utf8"));
const base = { N: 64, ...logo.LEAF, ...logo.HERO_LEAF };
const L = leafBracket({ ...base, side: -1, x0: -logo.gapL });
const R = leafBracket({ ...base, side: 1, x0: logo.wordW + logo.gapR });
const ok = L.d === logo.check.left && R.d === logo.check.right && L.stalk === logo.check.leftStalk;
console.log(ok ? "leaf.ts matches mark.mjs" : "leaf.ts differs from mark.mjs");
if (!ok) process.exit(1);
