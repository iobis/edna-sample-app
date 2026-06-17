import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const svg = fs.readFileSync(path.join(publicDir, 'dna.svg'));

const sizes = [
  [192, 'pwa-192x192.png'],
  [512, 'pwa-512x512.png'],
  [180, 'apple-touch-icon.png'],
];

for (const [size, filename] of sizes) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  fs.writeFileSync(path.join(publicDir, filename), resvg.render().asPng());
  console.log(`Wrote ${filename}`);
}
