import { Composition, Folder } from "remotion";
import { Sting } from "./Sting";
import { SIZES } from "./sizes";
import timeline from "./timeline.json";

// One composition per ending and size, named Daphne<Ending>-<width>x<height>,
// which is how scripts/render.mjs finds them.
export const RemotionRoot: React.FC = () => (
  <>
    {(["intro", "outro"] as const).map((ending) => {
      const name = `Daphne${ending[0].toUpperCase()}${ending.slice(1)}`;
      return (
        <Folder key={ending} name={name}>
          {SIZES.map((size) => (
            <Composition
              key={size.id}
              id={`${name}-${size.id}`}
              component={Sting}
              defaultProps={{ ending }}
              durationInFrames={timeline.durationInFrames}
              fps={timeline.fps}
              width={size.width}
              height={size.height}
            />
          ))}
        </Folder>
      );
    })}
  </>
);
