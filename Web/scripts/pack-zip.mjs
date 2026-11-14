// Packs every file of a wrapper folder into its zip: `node scripts/pack-zip.mjs itch roundabout-timing-itch.zip`.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { crc32, deflateRawSync } from 'node:zlib';

const [folder, zip] = process.argv.slice(2);
const root = new URL(`../${folder}/`, import.meta.url);
const files = readdirSync(root).filter((file) => !file.endsWith('.zip'));

const entries = [];
const dir = [];
let offset = 0;
for (const file of files) {
  const name = Buffer.from(file);
  const data = readFileSync(new URL(file, root));
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
  central.writeUInt32LE(offset, 42);

  const entry = Buffer.concat([local, name, packed]);
  entries.push(entry);
  dir.push(central, name);
  offset += entry.length;
}

const dirBytes = Buffer.concat(dir);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(dirBytes.length, 12);
end.writeUInt32LE(offset, 16);

const out = new URL(zip, root);
const bytes = Buffer.concat([...entries, dirBytes, end]);
writeFileSync(out, bytes);
console.log(`${folder}/${zip} (${bytes.length} bytes, ${files.join(', ')})`);
