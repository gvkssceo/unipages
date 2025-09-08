const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const publicDir = path.join(projectRoot, 'public');
  const logoPath = path.join(publicDir, 'logo.jpg');
  const iconsDir = path.join(publicDir, 'icons');

  if (!fs.existsSync(logoPath)) {
    console.error(`Source logo not found: ${logoPath}`);
    process.exit(1);
  }

  await ensureDir(iconsDir);

  const outputs = [
    { size: 192, name: 'icon-192.png' },
    { size: 512, name: 'icon-512.png' },
    { size: 512, name: 'maskable-512.png' },
  ];

  for (const { size, name } of outputs) {
    const dest = path.join(iconsDir, name);
    await sharp(logoPath)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(dest);
    console.log(`Generated ${dest}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


