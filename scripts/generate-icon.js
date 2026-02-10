/**
 * Script to generate plixmetrics.ico from the SVG icon.
 * Uses the 'sharp' and 'png-to-ico' libraries.
 * 
 * Usage: node scripts/generate-icon.js
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SVG_PATH = path.join(__dirname, '..', 'public', 'icon.svg');
const ICO_OUTPUT = path.join(__dirname, '..', 'public', 'plixmetrics.ico');
const PNG_OUTPUT = path.join(__dirname, '..', 'public', 'plixmetrics-256.png');

async function generateIcon() {
    console.log('[Icon] Reading SVG...');
    const svgBuffer = fs.readFileSync(SVG_PATH);

    // Generate PNG at multiple sizes for ICO
    const sizes = [16, 32, 48, 64, 128, 256];
    const pngBuffers = [];

    for (const size of sizes) {
        console.log(`[Icon] Generating ${size}x${size} PNG...`);
        const png = await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toBuffer();
        pngBuffers.push(png);
    }

    // Save 256px version separately (useful for other things)
    fs.writeFileSync(PNG_OUTPUT, pngBuffers[pngBuffers.length - 1]);
    console.log(`[Icon] Saved ${PNG_OUTPUT}`);

    // Build ICO file manually (ICO format is relatively simple)
    const icoBuffer = buildIco(pngBuffers, sizes);
    fs.writeFileSync(ICO_OUTPUT, icoBuffer);
    console.log(`[Icon] Saved ${ICO_OUTPUT}`);
    console.log('[Icon] Done!');
}

/**
 * Build a .ico file from PNG buffers.
 * ICO format: Header (6 bytes) + Directory entries (16 bytes each) + PNG data
 */
function buildIco(pngBuffers, sizes) {
    const numImages = pngBuffers.length;

    // ICO Header: 6 bytes
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);      // Reserved
    header.writeUInt16LE(1, 2);      // Type: 1 = ICO
    header.writeUInt16LE(numImages, 4); // Number of images

    // Directory entries: 16 bytes each
    const dirEntries = [];
    let dataOffset = 6 + (numImages * 16); // After header + all directory entries

    for (let i = 0; i < numImages; i++) {
        const entry = Buffer.alloc(16);
        const size = sizes[i] >= 256 ? 0 : sizes[i]; // 0 means 256 in ICO format
        entry.writeUInt8(size, 0);          // Width
        entry.writeUInt8(size, 1);          // Height
        entry.writeUInt8(0, 2);             // Color palette
        entry.writeUInt8(0, 3);             // Reserved
        entry.writeUInt16LE(1, 4);          // Color planes
        entry.writeUInt16LE(32, 6);         // Bits per pixel
        entry.writeUInt32LE(pngBuffers[i].length, 8);  // Size of PNG data
        entry.writeUInt32LE(dataOffset, 12);            // Offset to PNG data

        dirEntries.push(entry);
        dataOffset += pngBuffers[i].length;
    }

    return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

generateIcon().catch(err => {
    console.error('[Icon] Error:', err.message);
    process.exit(1);
});
