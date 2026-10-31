// The faces the sting uses, from brand/fonts (CC0, the pitch.dog type system
// v3.0.0) and Figtree (SIL OFL) for the sample laurel's words, which are set in
// the face Daphne's Classic Gold preset uses. Renders wait until every face loads.
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

const css = `
@font-face { font-family: "PD Head"; src: url("${staticFile("fonts/pd-head.woff2")}") format("woff2"); font-weight: 265 900; }
@font-face { font-family: "PD Body"; src: url("${staticFile("fonts/pd-body-roman.woff2")}") format("woff2"); font-weight: 100 900; }
@font-face { font-family: "PD Body Alt"; src: url("${staticFile("fonts/pd-body-alt-roman.woff2")}") format("woff2"); font-weight: 100 900; }
@font-face { font-family: "PD Eyebrow"; src: url("${staticFile("fonts/pd-eyebrow-site.woff2")}") format("woff2"); font-weight: 100 900; }
@font-face { font-family: "Figtree"; src: url("${staticFile("fonts/figtree-latin.woff2")}") format("woff2"); font-weight: 300 900; }
`;

const faces = ['400 46px "PD Body Alt"', '500 32px "PD Eyebrow"', '400 27px "PD Body"', '700 20px "Figtree"', '800 20px "Figtree"'];

if (typeof document !== "undefined" && !document.getElementById("daphne-fonts")) {
  const style = document.createElement("style");
  style.id = "daphne-fonts";
  style.textContent = css;
  document.head.appendChild(style);
  const handle = delayRender("Loading Daphne's fonts");
  Promise.all(faces.map((face) => document.fonts.load(face)))
    .then((loaded) => {
      const missing = faces.filter((_, i) => loaded[i].length === 0);
      if (missing.length > 0) throw new Error(`Fonts did not load: ${missing.join(", ")}`);
      continueRender(handle);
    })
    .catch((err) => cancelRender(err));
}
