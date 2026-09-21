import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const source = join(root, 'public', 'tito-icon-512.png');
const sizes = [32, 180, 192];

for (const size of sizes) {
  const out = join(root, 'public', `tito-icon-${size}.png`);
  await sharp(source).resize(size, size).png().toFile(out);
  console.log(`Generated ${out}`);
}

console.log('Icon generation complete.');
