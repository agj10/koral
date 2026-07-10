import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.join(__dirname, 'public', 'assets', 'koral-icon.svg');
const out192 = path.join(__dirname, 'public', 'assets', 'icon-192.png');
const out512 = path.join(__dirname, 'public', 'assets', 'icon-512.png');

async function convert() {
  await sharp(svgPath)
    .resize(192, 192)
    .png()
    .toFile(out192);
    
  await sharp(svgPath)
    .resize(512, 512)
    .png()
    .toFile(out512);
    
  console.log('Conversion successful!');
}

convert().catch(console.error);
