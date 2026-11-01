// Remotion's CLI config. The Node APIs ignore this file; scripts/render.mjs passes options itself.
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
// Frames pass through JPEG on their way to the encoder; the default quality (80)
// leaves blocking in dark gradients, and this film is almost all dark gradient.
Config.setJpegQuality(96);
Config.setOverwriteOutput(true);
// On machines where Remotion can't download its own Chrome (a locked-down cloud
// container), point it at one that's installed: BROWSER_EXECUTABLE=/path/to/chrome-headless-shell
if (process.env.BROWSER_EXECUTABLE) Config.setBrowserExecutable(process.env.BROWSER_EXECUTABLE);
