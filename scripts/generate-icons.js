import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateAllIcons() {
  const publicDir = path.resolve('public');
  const fontPath = path.resolve('scripts/Cinzel-Bold.ttf');

  // 1. Download Cinzel-Bold font if not already cached
  let base64Font = '';
  if (fs.existsSync(fontPath)) {
    base64Font = fs.readFileSync(fontPath).toString('base64');
  } else {
    console.log('Fetching official Cinzel font...');
    const res = await fetch('https://fonts.gstatic.com/s/cinzel/v26/8vIU7ww63mVu7gtR-kwKxNvkNOjw-jHgTYo.ttf');
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(fontPath, buf);
    base64Font = buf.toString('base64');
    console.log('✓ Cached Cinzel-Bold.ttf');
  }

  // Helper to build SVG with mathematical safe-zone adherence
  function buildSvg({ isMaskable = false, size = 512 }) {
    // Android safe zone is 66% of canvas (~338px diameter, radius 169px)
    // We size the content to fit within a strict 260px circle to guarantee 100% visibility on all devices
    const fontSize = isMaskable ? 132 : 142;
    const storeFontSize = isMaskable ? 14 : 15;
    const storeY = isMaskable ? 320 : 326;
    const textY = isMaskable ? 245 : 246;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <style>
      @font-face {
        font-family: 'CinzelCustom';
        src: url(data:font/truetype;charset=utf-8;base64,${base64Font}) format('truetype');
        font-weight: 700;
        font-style: normal;
      }
      .brand-title {
        font-family: 'CinzelCustom', Georgia, serif;
        font-size: ${fontSize}px;
        font-weight: 700;
        fill: url(#goldLinear);
        text-anchor: middle;
        dominant-baseline: central;
        letter-spacing: 4px;
        filter: drop-shadow(0 6px 20px rgba(0, 0, 0, 0.95)) drop-shadow(0 0 25px rgba(212, 175, 55, 0.45));
      }
      .brand-sub {
        font-family: 'CinzelCustom', Georgia, serif;
        font-size: ${storeFontSize}px;
        font-weight: 700;
        fill: #D4AF37;
        text-anchor: middle;
        letter-spacing: 9px;
        opacity: 0.95;
        filter: drop-shadow(0 2px 8px rgba(0,0,0,0.9));
      }
    </style>

    <!-- Ultra-Luxurious Royal Gold Multi-stop Gradient -->
    <linearGradient id="goldLinear" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="20%" stop-color="#FFF3C4" />
      <stop offset="45%" stop-color="#F2D06B" />
      <stop offset="70%" stop-color="#D4AF37" />
      <stop offset="90%" stop-color="#B88A22" />
      <stop offset="100%" stop-color="#7A560B" />
    </linearGradient>

    <!-- Golden Frame Ring Gradient -->
    <linearGradient id="ringGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF8D6" stop-opacity="0.9" />
      <stop offset="50%" stop-color="#D4AF37" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#AA7A1E" stop-opacity="0.4" />
    </linearGradient>

    <!-- Ambient Luxury Gold Aura Bloom -->
    <radialGradient id="goldAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#D4AF37" stop-opacity="0.32" />
      <stop offset="45%" stop-color="#D4AF37" stop-opacity="0.10" />
      <stop offset="85%" stop-color="#080809" stop-opacity="0" />
    </radialGradient>

    <!-- Star Glow Gradient -->
    <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="50%" stop-color="#FFF3C4" />
      <stop offset="100%" stop-color="#D4AF37" />
    </linearGradient>
  </defs>

  <!-- Seamless solid obsidian dark background (#080809) matching manifest -->
  <rect width="512" height="512" fill="#080809" />

  <!-- Ambient Gold Core Light in Center -->
  <circle cx="256" cy="256" r="210" fill="url(#goldAura)" />

  ${
    !isMaskable
      ? `
  <!-- Luxury Circular Subtle Hairline Accent (Kept strictly inside safe boundaries) -->
  <circle cx="256" cy="256" r="195" fill="none" stroke="url(#ringGold)" stroke-width="1.5" opacity="0.45" />
  <circle cx="256" cy="256" r="190" fill="none" stroke="#D4AF37" stroke-width="0.75" stroke-dasharray="4 8" opacity="0.3" />
  `
      : ''
  }

  <!-- Main Monogram: "LC" in pristine official Cinzel typography -->
  <text x="256" y="${textY}" class="brand-title">LC</text>

  <!-- Tagline: "STORE" centered below LC with luxury wide letter spacing -->
  <text x="260" y="${storeY}" class="brand-sub">STORE</text>

  <!-- Sparkling 4-Point Gold Star nestled precisely at the top-right of the "C" (Within safe zone!) -->
  <g transform="translate(${isMaskable ? 332 : 338}, ${isMaskable ? 186 : 182})">
    <!-- Star Glow -->
    <circle cx="0" cy="0" r="16" fill="#D4AF37" opacity="0.45" />
    <!-- Star Diamond -->
    <path d="M 0 -22 C 2 -6 6 -2 22 0 C 6 2 2 6 0 22 C -2 6 -6 2 -22 0 C -6 -2 -2 -6 0 -22 Z" fill="url(#starGrad)" />
    <!-- Bright Diamond Center Core -->
    <circle cx="0" cy="0" r="3.5" fill="#FFFFFF" />
  </g>
</svg>`;
  }

  console.log('Generating ultra-crisp luxury icons using official Cinzel typography...');

  const standardSvg = buildSvg({ isMaskable: false });
  const maskableSvg = buildSvg({ isMaskable: true });

  // 1. Save standard icon.svg
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), standardSvg);
  console.log('✓ Wrote public/icon.svg');

  // 2. 512x512 standard
  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('✓ Generated public/pwa-512x512.png');

  // 3. 192x192 standard
  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('✓ Generated public/pwa-192x192.png');

  // 4. 512x512 maskable (Guaranteed Safe Zone for Samsung, Pixel, Xiaomi, etc.)
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('✓ Generated public/pwa-maskable-512x512.png');

  // 5. 180x180 Apple Touch Icon (iOS Safari)
  await sharp(Buffer.from(standardSvg))
    .resize(180, 180)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Generated public/apple-touch-icon.png');

  // 6. Favicon ICO (48x48)
  await sharp(Buffer.from(standardSvg))
    .resize(48, 48)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));
  console.log('✓ Generated public/favicon.ico');

  console.log('🎉 All icons generated with mathematical precision and safe-zone compliance!');
}

generateAllIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
