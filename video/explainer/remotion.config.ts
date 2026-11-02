/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
// Frames pass through JPEG on their way to the encoder; the default quality
// (80) leaves blocking on fine type and gradients.
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);

// A cloud container has no network for Remotion's own Chrome download, but has Playwright's headless shell.
// Point BROWSER at any Chrome or headless shell to use another one.
const shell = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
import { existsSync } from "node:fs";
if (process.env.BROWSER) Config.setBrowserExecutable(process.env.BROWSER);
else if (existsSync(shell)) Config.setBrowserExecutable(shell);
