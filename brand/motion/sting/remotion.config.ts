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

// In a cloud container, point Remotion at the installed headless Chrome rather
// than downloading one (learned on Typecast). BROWSER=path overrides it.
import { existsSync } from "node:fs";
const shell = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const browser = process.env.BROWSER ?? (existsSync(shell) ? shell : null);
if (browser) Config.setBrowserExecutable(browser);
