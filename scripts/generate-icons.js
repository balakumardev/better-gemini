const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create a simple PNG with Google blue color and "BG" text representation
function createPNG(width, height) {
  // Google Blue: #4285f4 -> RGB(66, 133, 244)
  const r = 66, g = 133, b = 244;
  
  // Create raw image data (RGBA)
  const pixelData = Buffer.alloc(width * height * 4);
  
  // Create a simple design: blue background with a lighter center circle
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.4;
  const innerRadius = radius * 0.6;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      
      if (dist <= innerRadius) {
        // Inner circle - white "G" area hint
        pixelData[idx] = 255;     // R
        pixelData[idx + 1] = 255; // G
        pixelData[idx + 2] = 255; // B
        pixelData[idx + 3] = 255; // A
      } else if (dist <= radius) {
        // Outer ring - Google blue
        pixelData[idx] = r;       // R
        pixelData[idx + 1] = g;   // G
        pixelData[idx + 2] = b;   // B
        pixelData[idx + 3] = 255; // A
      } else {
        // Background - slightly lighter blue
        pixelData[idx] = 100;     // R
        pixelData[idx + 1] = 149; // G
        pixelData[idx + 2] = 237; // B (cornflower blue)
        pixelData[idx + 3] = 255; // A
      }
    }
  }
  
  // Add PNG filter bytes (filter type 0 = None for each row)
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0; // Filter byte
    pixelData.copy(rawData, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  
  // Compress with zlib
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  
  // Build PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  
  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  
  return Buffer.concat([length, typeBuffer, data, crc]);
}

// CRC32 calculation for PNG
function crc32(data) {
  let crc = 0xffffffff;
  const table = getCRC32Table();
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

let crcTable = null;
function getCRC32Table() {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }
  return crcTable;
}

// Main
const iconsDir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const sizes = [16, 48, 128];
for (const size of sizes) {
  const png = createPNG(size, size);
  const filepath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filepath, png);
  console.log(`Created ${filepath} (${png.length} bytes)`);
}

console.log('Done! All icons created.');

