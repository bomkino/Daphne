// Daphne's brand, as the video uses it. Colors and curves come from brand/README.md (the identity in
// bomkino/Daphne PR #2); the logo and leaves are the brand's own geometry, copied in by scripts/brand.mjs.
import { Easing } from "remotion";
import brand from "../data/brand.json";

export const C = {
  grove: "#12291E", // the ground: a laurel grove at night
  groveDeep: "#0B1B13", // vignettes and the frame's edges
  groveLift: "#1B3B2B", // the light at the grove's center
  paper: "#F3F6EF", // words on Grove, and the light card
  newLeaf: "#B8E59A", // leaves on Grove
  bay: "#1F5C3B", // leaves on Paper
  bloom: "#F59CC0", // her heart: once per frame
};

// Growth: quick to start and long to settle. Words: a gentle settle. No bounces, no overshoot.
export const grow = Easing.bezier(0.2, 0.7, 0.1, 1);
export const settle = Easing.bezier(0.33, 0, 0.15, 1);
export const glide = Easing.bezier(0.6, 0, 0.2, 1);

export const FONT = {
  display: '"PD Head", Georgia, serif',
  lead: '"PD Body Alt", system-ui, sans-serif',
  text: '"PD Body", system-ui, sans-serif',
  data: '"PD Eyebrow", ui-monospace, monospace',
};

export const MARK = brand;
