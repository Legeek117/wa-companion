// Re-nomme les médias stockés avec l'extension ".bin" vers leur vraie extension
// (déterminée par les magic bytes), puis met à jour mediaUrl en base.
//
// Usage (dans le conteneur) :
//   docker exec amda-backend node scripts/fix-media-ext.mjs
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();
const UPLOADS_ROOT = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');

function sniffExtension(filePath) {
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const head = Buffer.alloc(16);
    const n = fs.readSync(fd, head, 0, 16, 0);
    const b = head.subarray(0, n);
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
    if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
    if (b.subarray(0, 6).toString('latin1') === 'GIF87a' || b.subarray(0, 6).toString('latin1') === 'GIF89a') return 'gif';
    if (b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
    if (b.subarray(0, 4).toString('latin1') === 'OggS') return 'ogg';
    if (b.subarray(0, 3).toString('latin1') === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return 'mp3';
    if (b.subarray(0, 4).toString('latin1') === 'ftyp') {
      const brand = b.subarray(8, 12).toString('latin1');
      return brand.includes('M4A') ? 'm4a' : brand.includes('qt') ? 'mov' : 'mp4';
    }
    if (b.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
    if (b.subarray(0, 4).toString('latin1') === 'PK\u0003\u0004') return 'zip';
    return null;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function parseUrl(mediaUrl) {
  const m = /^\/api\/media\/([^/]+)\/(.+)$/.exec(mediaUrl || '');
  return m ? { sub: m[1], file: m[2] } : null;
}

async function fixRows(rows, update) {
  let fixed = 0;
  let missing = 0;
  for (const row of rows) {
    const parsed = parseUrl(row.mediaUrl);
    if (!parsed) continue;
    const abs = path.join(UPLOADS_ROOT, parsed.sub, parsed.file);
    if (!fs.existsSync(abs)) {
      console.log('MISSING', abs);
      missing++;
      continue;
    }
    const ext = sniffExtension(abs);
    if (!ext || ext === 'bin' || parsed.file.toLowerCase().endsWith('.' + ext)) continue;
    const newFile = parsed.file.replace(/\.bin$/i, '.' + ext);
    const newUrl = row.mediaUrl.replace(/\.bin$/i, '.' + ext);
    fs.renameSync(abs, path.join(UPLOADS_ROOT, parsed.sub, newFile));
    await update(row.id, newUrl);
    console.log('FIXED', parsed.file, '->', newFile);
    fixed++;
  }
  return { fixed, missing };
}

console.log('Scanning media files with .bin extension...');

const whatsapp = await prisma.whatsappMessage.findMany({
  where: { mediaUrl: { contains: '.bin' } },
  select: { id: true, mediaUrl: true },
});
const r1 = await fixRows(whatsapp, (id, mediaUrl) =>
  prisma.whatsappMessage.update({ where: { id }, data: { mediaUrl } })
);

const deleted = await prisma.deletedMessage.findMany({
  where: { mediaUrl: { contains: '.bin' } },
  select: { id: true, mediaUrl: true },
});
const r2 = await fixRows(deleted, (id, mediaUrl) =>
  prisma.deletedMessage.update({ where: { id }, data: { mediaUrl } })
);

console.log(
  `DONE — whatsapp_messages: ${r1.fixed} fixed / ${r1.missing} missing; deleted_messages: ${r2.fixed} fixed / ${r2.missing} missing`
);
await prisma.$disconnect();