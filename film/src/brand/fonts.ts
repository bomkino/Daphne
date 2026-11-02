// The faces the film sets, loaded before any frame renders. PD Head, PD Body Alt
// and PD Eyebrow are the pitch.dog type system's CC0 binaries, as the Daphne brand
// uses them (brand/fonts). Figtree and Cinzel are the laurel presets' own faces
// (OFL), because the laurels on screen are made with Daphne's engine.
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

const faces: [string, string, FontFaceDescriptors][] = [
  ["PD Head", "fonts/pd-head.woff2", { weight: "265 900" }],
  ["PD Body Alt", "fonts/pd-body-alt-roman.woff2", { weight: "100 900" }],
  ["PD Eyebrow", "fonts/pd-eyebrow-site.woff2", { weight: "100 900" }],
  ["Figtree", "fonts/laurels/figtree-wght.woff2", { weight: "300 900" }],
  ["Cinzel", "fonts/laurels/cinzel-latin-600-normal.woff2", { weight: "600" }],
  ["Cinzel", "fonts/laurels/cinzel-latin-700-normal.woff2", { weight: "700" }],
];

const handle = delayRender("Loading Daphne's fonts");
Promise.all(
  faces.map(([family, file, desc]) => {
    const face = new FontFace(family, `url(${staticFile(file)})`, desc);
    document.fonts.add(face);
    return face.load();
  }),
)
  .then(() =>
    Promise.all(
      ['300 60px "PD Head"', '400 60px "PD Body Alt"', '500 30px "PD Eyebrow"', '800 30px "Figtree"', '700 30px "Figtree"'].map((f) =>
        document.fonts.load(f),
      ),
    ),
  )
  .then(() => continueRender(handle))
  .catch((err) => cancelRender(err));
