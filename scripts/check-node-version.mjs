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

const currentVersion = process.versions.node.split('.').map(Number);
const minimumVersion = minimumPatchedVersions.get(currentVersion[0]);

if (!minimumVersion || compareVersion(currentVersion, minimumVersion) < 0) {
  const supportedVersions = [...minimumPatchedVersions.values()]
    .map((version) => version.join('.'))
    .join(', ');

  console.error(
    `Unsupported Node.js ${process.versions.node}. ` +
      `Use a patched supported release (${supportedVersions}).`,
  );
  process.exit(1);
}

console.log(`Node.js ${process.versions.node} satisfies the security baseline.`);
