import { Composition, Folder } from "remotion";
import { Film, FilmProps } from "./film/Film";
import { DURATION, FPS } from "./story";

// One composition per cut and size, named <Cut>-<width>x<height>, which is how
// scripts/render.mjs finds them. Each size is laid out on its own, not cropped.
const SIZES = [
  { id: "1920x1080", width: 1920, height: 1080 },
  { id: "1080x1920", width: 1080, height: 1920 },
];
const CUTS: { id: string; props: FilmProps }[] = [
  // the lead cut: Daphne tells it herself, in words on screen, over the score
  { id: "Daphne", props: { voice: "her", text: "story", narrated: false, sting: true } },
  // the alternate: pitch.dog tells it
  { id: "DaphneUs", props: { voice: "us", text: "story", narrated: false, sting: true } },
  // narrated: Manali's takes over the bed, with subtitles for sound-off viewing
  { id: "DaphneNarrated", props: { voice: "her", text: "captions", narrated: true, sting: true } },
  { id: "DaphneUsNarrated", props: { voice: "us", text: "captions", narrated: true, sting: true } },
];

export const RemotionRoot: React.FC = () => (
  <>
    {CUTS.map((cut) => (
      <Folder key={cut.id} name={cut.id}>
        {SIZES.map((size) => (
          <Composition
            key={size.id}
            id={`${cut.id}-${size.id}`}
            component={Film}
            defaultProps={cut.props}
            durationInFrames={DURATION}
            fps={FPS}
            width={size.width}
            height={size.height}
          />
        ))}
      </Folder>
    ))}
  </>
);
