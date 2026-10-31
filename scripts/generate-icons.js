import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateAllIcons() {
  const publicDir = path.resolve('public');
  const fontPath = path.resolve('scripts/Cinzel-Bold.ttf');

  if (!fs.existsSync(fontPath)) {
    console.log('Fetching official Cinzel font...');
    const res = await fetch('https://fonts.gstatic.com/s/cinzel/v26/8vIU7ww63mVu7gtR-kwKxNvkNOjw-jHgTYo.ttf');
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(fontPath, buf);
  }
  const base64Font = fs.readFileSync(fontPath).toString('base64');

  // Generator function creating the full-bleed white luxury badge icon
  function buildSvg({ isMaskable = false }) {
    // Standard icon fills almost the entire canvas (446x446 squircle)
    // Maskable icon fits safely inside Android's adaptive crop zone (350x350 squircle)
    const cardSize = isMaskable ? 350 : 446;
    const cardRadius = isMaskable ? 80 : 100;
    const cardX = (512 - cardSize) / 2;
    const cardY = (512 - cardSize) / 2;

    const fontSize = isMaskable ? 148 : 188;
    const textY = isMaskable ? 250 : 252;
    
    // Subtitle text
    const subY = isMaskable ? 320 : 346;
    const subSize = isMaskable ? 14 : 17;

    // Star sparkle position
    const starX = isMaskable ? 342 : 368;
    const starY = isMaskable ? 308 : 332;
    const starScale = isMaskable ? 0.9 : 1.15;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <style>
      @font-face {
        font-family: 'CinzelLuxury';
        src: url(data:font/truetype;charset=utf-8;base64,${base64Font}) format('truetype');
        font-weight: 700;
        font-style: normal;
      }
      .brand-title {
        font-family: 'CinzelLuxury', Georgia, serif;
        font-size: ${fontSize}px;
        font-weight: 700;
        fill: url(#goldEmbossGrad);
        text-anchor: middle;
        dominant-baseline: central;
        letter-spacing: 4px;
        filter: drop-shadow(0 6px 14px rgba(180, 135, 28, 0.25));
      }
      .brand-sub {
        font-family: 'CinzelLuxury', Georgia, serif;
        font-size: ${subSize}px;
        font-weight: 700;
        fill: #8B6914;
        text-anchor: middle;
        letter-spacing: 9px;
        opacity: 0.95;
      }
    </style>

    <!-- High-Contrast 24K Royal Gold Gradient on White -->
    <linearGradient id="goldEmbossGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8A6415" />
      <stop offset="25%" stop-color="#C59B27" />
      <stop offset="50%" stop-color="#D4AF37" />
      <stop offset="75%" stop-color="#B8860B" />
      <stop offset="100%" stop-color="#7A560B" />
    </linearGradient>

    <!-- Metallic Gold Border Gradient -->
    <linearGradient id="goldBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C59B27" stop-opacity="0.95" />
      <stop offset="50%" stop-color="#D4AF37" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#9E781A" stop-opacity="0.85" />
    </linearGradient>

    <!-- Pure White Card Surface -->
    <linearGradient id="whiteCard" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#FFFFFF" />
    </linearGradient>

    <!-- Star Glow Gradient -->
    <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E5C158" />
      <stop offset="50%" stop-color="#D4AF37" />
      <stop offset="100%" stop-color="#9E781A" />
    </linearGradient>

    <!-- Card Drop Shadow Filter -->
    <filter id="cardShadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#B8860B" flood-opacity="0.18" />
    </filter>
  </defs>

  <!-- Full Canvas Background (Pure White #FFFFFF) -->
  <rect width="512" height="512" fill="#FFFFFF" />

  <!-- The White Luxury Squircle Card with Gold Border -->
  <g filter="url(#cardShadow)">
    <rect 
      x="${cardX}" 
      y="${cardY}" 
      width="${cardSize}" 
      height="${cardSize}" 
      rx="${cardRadius}" 
      ry="${cardRadius}" 
      fill="url(#whiteCard)" 
      stroke="url(#goldBorderGrad)" 
      stroke-width="${isMaskable ? 6 : 7}" 
    />
  </g>

  <!-- Inner Subtle Hairline Gold Border -->
  <rect 
    x="${cardX + (isMaskable ? 10 : 12)}" 
    y="${cardY + (isMaskable ? 10 : 12)}" 
    width="${cardSize - (isMaskable ? 20 : 24)}" 
    height="${cardSize - (isMaskable ? 20 : 24)}" 
    rx="${cardRadius - (isMaskable ? 8 : 10)}" 
    ry="${cardRadius - (isMaskable ? 8 : 10)}" 
    fill="none" 
    stroke="#D4AF37" 
    stroke-width="1.5" 
    opacity="0.4" 
  />

  <!-- Corner Gold Diamond Micro-Accents inside card -->
  <g opacity="0.65" fill="#C59B27">
    <circle cx="${cardX + (isMaskable ? 26 : 32)}" cy="${cardY + (isMaskable ? 26 : 32)}" r="3" />
    <circle cx="${cardX + cardSize - (isMaskable ? 26 : 32)}" cy="${cardY + (isMaskable ? 26 : 32)}" r="3" />
    <circle cx="${cardX + (isMaskable ? 26 : 32)}" cy="${cardY + cardSize - (isMaskable ? 26 : 32)}" r="3" />
    <circle cx="${cardX + cardSize - (isMaskable ? 26 : 32)}" cy="${cardY + cardSize - (isMaskable ? 26 : 32)}" r="3" />
  </g>

  <!-- Main Monogram: "LC" in Pristine Official Cinzel Gold Typography -->
  <text x="256" y="${textY}" class="brand-title">LC</text>

  <!-- Subtitle: "OFFICIAL STORE" centered under LC -->
  <text x="261" y="${subY}" class="brand-sub">LC STORE</text>

  <!-- Iconic 4-Point Golden Star Sparkle Badge Accent -->
  <g transform="translate(${starX}, ${starY}) scale(${starScale})">
    <circle cx="0" cy="0" r="16" fill="#D4AF37" opacity="0.18" />
    <path d="M 0 -22 C 2 -6 6 -2 22 0 C 6 2 2 6 0 22 C -2 6 -6 2 -22 0 C -6 -2 -2 -6 0 -22 Z" fill="url(#starGrad)" />
    <circle cx="0" cy="0" r="3" fill="#FFFFFF" />
  </g>
</svg>`;
  }

  console.log('Generating full-bleed luxury LC icons with large centered emblem...');

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

  // 4. 512x512 maskable (Guaranteed Safe Zone for Android adaptive icons)
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

  console.log('✨ All luxury icons generated successfully!');
}

generateAllIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
