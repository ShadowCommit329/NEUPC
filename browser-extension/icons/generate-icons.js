#!/usr/bin/env node

/**
 * Generate simple placeholder PNG icons for the browser extension
 * Creates valid PNG files with a simple colored square
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create a minimal PNG with a colored square
function createPNG(size, r, g, b) {
  // PNG signature
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); // width
  ihdrData.writeUInt32BE(size, 4); // height
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(2, 9); // color type (RGB)
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Create image data (RGB for each pixel)
  const rawData = [];
  for (let y = 0; y < size; y++) {
    rawData.push(0); // filter byte for each row
    for (let x = 0; x < size; x++) {
      // Create a simple gradient pattern
      const centerX = size / 2;
      const centerY = size / 2;
      const dist = Math.sqrt(
        Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
      );
      const maxDist = (Math.sqrt(2) * size) / 2;

      // Inner circle (N letter area)
      if (dist < size * 0.4) {
        // Dark background with gradient
        const factor = 0.2 + (1 - dist / (size * 0.4)) * 0.3;
        rawData.push(Math.round(r * factor));
        rawData.push(Math.round(g * factor));
        rawData.push(Math.round(b * factor));
      } else {
        // Outer ring
        rawData.push(r);
        rawData.push(g);
        rawData.push(b);
      }
    }
  }

  const rawBuffer = Buffer.from(rawData);
  const compressed = zlib.deflateSync(rawBuffer);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 implementation for PNG
function crc32(buffer) {
  let crc = 0xffffffff;

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }

  for (let i = 0; i < buffer.length; i++) {
    crc = table[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }

  return crc ^ 0xffffffff;
}

// Generate icons
const sizes = [16, 48, 128];
const iconsDir = __dirname;

// Use a nice blue color (similar to NeuPC branding)
const [r, g, b] = [59, 130, 246]; // Blue-500

sizes.forEach((size) => {
  const png = createPNG(size, r, g, b);
  const filename = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filename, png);
  console.log(`Created ${filename}`);
});

console.log('\nIcon generation complete!');
