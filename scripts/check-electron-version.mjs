import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const minimumPatchedVersions = new Map([
  [22, [22, 23, 4]],
  [24, [24, 22, 1]],
  [26, [26, 12, 1]],
]);

function compareVersion(left, right) {
  for (let index = 0; index < 3; index += 1) {
    const difference = left[index] - right[index];
    if (difference !== 0) return difference;
  }
  return 0;
}

const require = createRequire(import.meta.url);
const { version: electronVersion } = require('electron/package.json');

let electronPath;
try {
  electronPath = require('electron');
} catch (error) {
  console.error(`Unable to install or locate Electron ${electronVersion}.`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const result = spawnSync(electronPath, ['-p', 'process.versions.node'], {
  encoding: 'utf8',
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  windowsHide: true,
});

if (result.error || result.status !== 0) {
  console.error(`Unable to inspect the Node.js runtime embedded in Electron ${electronVersion}.`);
  console.error(result.error?.message ?? result.stderr.trim());
  process.exit(1);
}

const embeddedNodeVersion = result.stdout.trim();
const currentVersion = embeddedNodeVersion.split('.').map(Number);
const minimumVersion = minimumPatchedVersions.get(currentVersion[0]);

if (!minimumVersion || compareVersion(currentVersion, minimumVersion) < 0) {
  const supportedVersions = [...minimumPatchedVersions.values()]
    .map((version) => version.join('.'))
    .join(', ');

  console.error(
    `Electron ${electronVersion} embeds vulnerable or unsupported Node.js ${embeddedNodeVersion}. ` +
      `Desktop launch and packaging are blocked until Electron embeds a patched release ` +
      `(${supportedVersions}).`,
  );
  process.exit(1);
}

console.log(
  `Electron ${electronVersion} embeds Node.js ${embeddedNodeVersion}, which satisfies the security baseline.`,
);
