import { copyFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const exePath = resolve('dist/Just Watching Diorama 0.1.0.exe');
const scrPath = resolve('dist/Just Watching Diorama.scr');

await stat(exePath);
await copyFile(exePath, scrPath);

console.log(`Wrote ${scrPath}`);
