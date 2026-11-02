import { Composition, Folder } from "remotion";
import { Explainer } from "./Explainer";
import { SIZES } from "./sizes";
import { durationInFrames, fps } from "./timeline";

// One composition per size, named Explainer-<width>x<height>, which is how scripts/render.mjs finds them.
export const RemotionRoot: React.FC = () => (
  <Folder name="Explainer">
    {SIZES.map((size) => (
      <Composition key={size.id} id={`Explainer-${size.id}`} component={Explainer} durationInFrames={durationInFrames} fps={fps} width={size.width} height={size.height} />
    ))}
  </Folder>
);
