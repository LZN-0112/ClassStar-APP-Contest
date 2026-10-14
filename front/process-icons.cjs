const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, 'icon-source.png');
const RES_DIR = path.resolve(__dirname, 'android', 'app', 'src', 'main', 'res');

// Launcher icon sizes for each density
const launcherConfigs = {
  'mipmap-mdpi':   48,
  'mipmap-hdpi':   72,
  'mipmap-xhdpi':  96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

// Splash screen icon sizes
const splashConfigs = {
  'drawable':             { w: 480,  h: 800,  iconRatio: 0.35 },
  'drawable-port-hdpi':   { w: 480,  h: 800,  iconRatio: 0.35 },
  'drawable-port-xhdpi':  { w: 720,  h: 1280, iconRatio: 0.30 },
  'drawable-port-xxhdpi': { w: 1080, h: 1920, iconRatio: 0.28 },
  'drawable-port-xxxhdpi':{ w: 1440, h: 2560, iconRatio: 0.25 },
  'drawable-land-hdpi':   { w: 800,  h: 480,  iconRatio: 0.35 },
  'drawable-land-xhdpi':  { w: 1280, h: 720,  iconRatio: 0.30 },
  'drawable-land-xxhdpi': { w: 1920, h: 1080, iconRatio: 0.28 },
  'drawable-land-xxxhdpi':{ w: 2560, h: 1440, iconRatio: 0.25 },
};

async function findCornerRadius(buffer) {
  const img = sharp(buffer);
  const meta = await img.metadata();
  const { width: w, height: h } = meta;
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;

  // Scan from corners to find where white background ends
  function isWhite(idx) {
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    return r >= 245 && g >= 245 && b >= 245;
  }

  // Scan diagonally from top-left corner
  let cornerRadius = 0;
  const maxScan = Math.min(w, h) / 2;
  for (let d = 0; d < maxScan; d++) {
    const idx = (d * w + d) * channels;
    if (!isWhite(idx)) {
      cornerRadius = d;
      break;
    }
  }

  // Also scan from other corners for accuracy
  let cornerRadius2 = 0;
  for (let d = 0; d < maxScan; d++) {
    const idx = (d * w + (w - 1 - d)) * channels;
    if (!isWhite(idx)) {
      cornerRadius2 = d;
      break;
    }
  }

  let cornerRadius3 = 0;
  for (let d = 0; d < maxScan; d++) {
    const idx = ((h - 1 - d) * w + d) * channels;
    if (!isWhite(idx)) {
      cornerRadius3 = d;
      break;
    }
  }

  let cornerRadius4 = 0;
  for (let d = 0; d < maxScan; d++) {
    const idx = ((h - 1 - d) * w + (w - 1 - d)) * channels;
    if (!isWhite(idx)) {
      cornerRadius4 = d;
      break;
    }
  }

  // Use the minimum corner radius found
  const cr = Math.min(cornerRadius, cornerRadius2, cornerRadius3, cornerRadius4);
  console.log(`Corner radius detected: ${cr}px (image: ${w}x${h})`);
  return { cr, w, h };
}

async function cropToIcon(buffer, cr) {
  const img = sharp(buffer);
  const meta = await img.metadata();
  const { width: w, height: h } = meta;

  // Crop to the rounded icon area (remove white border)
  // Add a small padding to avoid cutting into the icon
  const padding = Math.max(2, Math.floor(cr * 0.02));
  const cropX = cr - padding;
  const cropY = cr - padding;
  const cropW = w - 2 * (cr - padding);
  const cropH = h - 2 * (cr - padding);

  console.log(`Cropping to: x=${cropX}, y=${cropY}, w=${cropW}, h=${cropH}`);
  return await img.extract({ left: cropX, top: cropY, width: cropW, height: cropH }).png().toBuffer();
}

async function main() {
  console.log('=== Processing icons ===');
  console.log(`Source: ${SRC}`);

  // Read source image
  const srcBuffer = fs.readFileSync(SRC);

  // Detect corner radius and crop
  const { cr } = await findCornerRadius(srcBuffer);
  const cropped = await cropToIcon(srcBuffer, cr);

  // Save cropped icon for reference
  const croppedPath = path.resolve(__dirname, 'icon-cropped.png');
  fs.writeFileSync(croppedPath, cropped);
  console.log(`Saved cropped icon: ${croppedPath}`);

  // Generate launcher icons (full icon with background for older devices)
  console.log('\n=== Generating launcher icons ===');
  for (const [density, size] of Object.entries(launcherConfigs)) {
    const dir = path.join(RES_DIR, density);
    fs.mkdirSync(dir, { recursive: true });

    // ic_launcher.png - full icon with blue background (for pre-26 devices)
    const outPath = path.join(dir, 'ic_launcher.png');
    await sharp(cropped)
      .resize(size, size, { fit: 'fill' })
      .png()
      .toFile(outPath);
    console.log(`  ${density}/ic_launcher.png: ${size}x${size}`);

    // ic_launcher_foreground.png - foreground layer for Adaptive Icon
    // System crops foreground to ~66% safe zone, so scale icon to 66% of canvas
    // and center it with transparent padding
    const fgSize = Math.floor(size * 0.66);
    const fgIcon = await sharp(cropped)
      .resize(fgSize, fgSize, { fit: 'fill' })
      .png()
      .toBuffer();
    // Create transparent canvas at full size, center the scaled icon
    const fgOutPath = path.join(dir, 'ic_launcher_foreground.png');
    await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: fgIcon, gravity: 'center' }])
      .png()
      .toFile(fgOutPath);
    console.log(`  ${density}/ic_launcher_foreground.png: ${fgSize}x${fgSize} on ${size}x${size} canvas`);
  }

  // Generate splash screen icons
  console.log('\n=== Generating splash icons ===');
  const bgColor = '#A8D4F5';

  for (const [density, cfg] of Object.entries(splashConfigs)) {
    const dir = path.join(RES_DIR, density);
    fs.mkdirSync(dir, { recursive: true });
    const iconSize = Math.floor(Math.min(cfg.w, cfg.h) * cfg.iconRatio);

    // Create background
    const bgSvg = `<svg width="${cfg.w}" height="${cfg.h}"><rect width="100%" height="100%" fill="${bgColor}"/></svg>`;

    // Resize icon and add rounded corners (radius = 40% of icon size, matching launcher icon style)
    const cornerRadius = Math.floor(iconSize * 0.40);
    const roundedIcon = await sharp(cropped)
      .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .composite([{
        input: Buffer.from(`<svg><rect x="0" y="0" width="${iconSize}" height="${iconSize}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white"/></svg>`),
        blend: 'dest-in'
      }])
      .png()
      .toBuffer();

    const outPath = path.join(dir, 'splash.png');
    await sharp(Buffer.from(bgSvg))
      .composite([{ input: roundedIcon, gravity: 'center' }])
      .png()
      .toFile(outPath);
    console.log(`  ${density}: ${cfg.w}x${cfg.h} (icon: ${iconSize}px, radius: ${cornerRadius}px) -> ${outPath}`);
  }

  console.log('\n=== Done! ===');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
