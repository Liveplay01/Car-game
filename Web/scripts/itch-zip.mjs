// Packs itch/index.html into itch/roundabout-timing-itch.zip: the one file the itch.io page needs.
import { readFileSync, writeFileSync } from 'node:fs';
import { crc32, deflateRawSync } from 'node:zlib';

const root = new URL('../itch/', import.meta.url);
const name = Buffer.from('index.html');
const data = readFileSync(new URL('index.html', root));
const packed = deflateRawSync(data, { level: 9 });
const crc = crc32(data);

const local = Buffer.alloc(30);
local.writeUInt32LE(0x04034b50, 0);
local.writeUInt16LE(20, 4);
local.writeUInt16LE(0x0800, 6); // UTF-8 names
local.writeUInt16LE(8, 8); // deflate
local.writeUInt32LE(crc, 14);
local.writeUInt32LE(packed.length, 18);
local.writeUInt32LE(data.length, 22);
local.writeUInt16LE(name.length, 26);

const central = Buffer.alloc(46);
central.writeUInt32LE(0x02014b50, 0);
central.writeUInt16LE(20, 4);
central.writeUInt16LE(20, 6);
central.writeUInt16LE(0x0800, 8);
central.writeUInt16LE(8, 10);
central.writeUInt32LE(crc, 16);
central.writeUInt32LE(packed.length, 20);
central.writeUInt32LE(data.length, 24);
central.writeUInt16LE(name.length, 28);

const entry = Buffer.concat([local, name, packed]);
const dir = Buffer.concat([central, name]);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(1, 8);
end.writeUInt16LE(1, 10);
end.writeUInt32LE(dir.length, 12);
end.writeUInt32LE(entry.length, 16);

const out = new URL('roundabout-timing-itch.zip', root);
writeFileSync(out, Buffer.concat([entry, dir, end]));
console.log(`itch/roundabout-timing-itch.zip (${entry.length + dir.length + end.length} bytes)`);
