// What this machine can take, measured rather than assumed. Pieces get made
// on the studio's 8 GB Mac mini, on bigger Macs and in cloud containers,
// whose memory limit can sit far below the host's.
//
//   npm run machine    the numbers, and the concurrency renders will use
//
// Renders get one Chrome tab per 2 GB of memory, at most one per core: 4 on
// the studio Mac. CONCURRENCY=n overrides it.
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GB = 2 ** 30;

// A container's memory limit (cgroup v2, then v1), or null outside one.
const containerLimit = () => {
  for (const file of [
    "/sys/fs/cgroup/memory.max",
    "/sys/fs/cgroup/memory/memory.limit_in_bytes",
  ]) {
    if (!existsSync(file)) continue;
    const bytes = Number(readFileSync(file, "utf8").trim());
    if (bytes > 0 && bytes < os.totalmem()) return bytes;
  }
  return null;
};

export const machine = () => {
  const limit = containerLimit();
  const memory = limit ?? os.totalmem();
  const cores = os.availableParallelism?.() ?? os.cpus().length;
  const asked = Math.floor(Number(process.env.CONCURRENCY));
  const measured = Math.max(1, Math.min(cores, Math.floor(memory / GB / 2)));
  return {
    memoryGB: memory / GB,
    cores,
    container: limit !== null || existsSync("/.dockerenv"),
    concurrency: asked > 0 ? asked : measured,
    overridden: asked > 0,
  };
};

// One line for the top of a render's log.
export const describe = (m) =>
  `${m.concurrency} Chrome tab${m.concurrency === 1 ? "" : "s"} ` +
  (m.overridden
    ? "(CONCURRENCY)"
    : `(${m.memoryGB.toFixed(0)} GB, ${m.cores} cores${m.container ? ", container" : ""}; CONCURRENCY=n overrides)`);

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  const m = machine();
  console.log(
    `Memory      ${m.memoryGB.toFixed(1)} GB${m.container ? " (container limit)" : ""}`,
  );
  console.log(`Cores       ${m.cores}`);
  console.log(
    `Platform    ${os.platform()} ${os.arch()}${m.container ? ", in a container" : ""}`,
  );
  console.log(`Renders     ${describe(m)}`);
}
