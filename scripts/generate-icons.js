import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// 1. Generate the exact luxury LC emblem SVG matching the website's Hero card:
// - Deep dark background (#09090C to #121218)
// - Squircle / rounded-3xl container (#14141B) with #D4AF37 gold border and subtle gold glow
// - Classic Roman / Cinzel serif "LC" in glowing gold gradient (#FDF4C7 -> #D4AF37 -> #AA7A1E)
// - Bottom-right circular badge (#0A0A0C) with gold border (#D4AF37) containing the 4-point sparkle star!
function getEmblemSvg({ maskable = false }) {
  // If maskable, center the emblem within 80% safe zone (safe area diameter ~410px)
  const squircleSize = maskable ? 320 : 390;
  const radius = maskable ? 72 : 88;
  const strokeWidth = maskable ? 5 : 6;
  const badgeSize = maskable ? 64 : 76;
  const badgeRadius = badgeSize / 2;

  // Squircle position (centered at 256, 256)
  const sqX = 256 - squircleSize / 2;
  const sqY = 256 - squircleSize / 2;

  // Star badge position (anchored to bottom-right of squircle)
  const badgeX = sqX + squircleSize - badgeRadius * 0.75;
  const badgeY = sqY + squircleSize - badgeRadius * 0.75;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Luxury Gold Gradients -->
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF5D6" />
      <stop offset="30%" stop-color="#F3E5AB" />
      <stop offset="60%" stop-color="#D4AF37" />
      <stop offset="85%" stop-color="#B88A22" />
      <stop offset="100%" stop-color="#8C6510" />
    </linearGradient>

    <linearGradient id="goldBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F3E5AB" stop-opacity="0.95" />
      <stop offset="50%" stop-color="#D4AF37" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#AA7A1E" stop-opacity="0.6" />
    </linearGradient>

    <!-- Deep Midnight Luxury Background Gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#14141C" />
      <stop offset="50%" stop-color="#0D0D12" />
      <stop offset="100%" stop-color="#060608" />
    </radialGradient>

    <!-- Inner Squircle Surface Gradient -->
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1A1A24" />
      <stop offset="50%" stop-color="#14141B" />
      <stop offset="100%" stop-color="#0D0D13" />
    </linearGradient>

    <!-- Soft Golden Glow -->
    <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feColorMatrix type="matrix" values="
        1 0 0 0 0.83
        0 1 0 0 0.68
        0 0 1 0 0.21
        0 0 0 0.35 0" in="blur" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="badgeGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.8" />
    </filter>
  </defs>

  <!-- Full canvas background -->
  <rect width="512" height="512" fill="url(#bgGrad)" />

  <!-- Subtle ambient luxury light behind emblem -->
  <circle cx="256" cy="256" r="${maskable ? 180 : 210}" fill="#D4AF37" opacity="0.08" filter="url(#goldGlow)" />

  <!-- The Luxury Squircle Card (Identical to the website Hero Emblem) -->
  <g filter="url(#goldGlow)">
    <rect 
      x="${sqX}" 
      y="${sqY}" 
      width="${squircleSize}" 
      height="${squircleSize}" 
      rx="${radius}" 
      ry="${radius}" 
      fill="url(#cardGrad)" 
      stroke="url(#goldBorderGrad)" 
      stroke-width="${strokeWidth}" 
    />
  </g>

  <!-- Subtle inner hairline border inside squircle -->
  <rect 
    x="${sqX + 8}" 
    y="${sqY + 8}" 
    width="${squircleSize - 16}" 
    height="${squircleSize - 16}" 
    rx="${radius - 6}" 
    ry="${radius - 6}" 
    fill="none" 
    stroke="#F3E5AB" 
    stroke-width="1.2" 
    opacity="0.25" 
  />

  <!-- Subtle gold corner dots pattern inside squircle -->
  <g opacity="0.12" fill="#D4AF37">
    <circle cx="${sqX + 24}" cy="${sqY + 24}" r="2" />
    <circle cx="${sqX + 38}" cy="${sqY + 24}" r="1.5" />
    <circle cx="${sqX + 24}" cy="${sqY + 38}" r="1.5" />
    <circle cx="${sqX + squircleSize - 24}" cy="${sqY + 24}" r="2" />
    <circle cx="${sqX + 24}" cy="${sqY + squircleSize - 24}" r="2" />
  </g>

  <!-- Iconic Serif "LC" Wordmark (Vectorized Classical Roman Serif Typography) -->
  <g fill="url(#goldGradient)" transform="translate(${maskable ? '0, 0' : '0, 0'})">
    <!-- Letter L: Classical Serif Geometry -->
    <!-- Stem Serifs & Main Body -->
    <path d="
      M ${sqX + (maskable ? 60 : 75)} ${sqY + (maskable ? 85 : 105)}
      L ${sqX + (maskable ? 120 : 150)} ${sqY + (maskable ? 85 : 105)}
      L ${sqX + (maskable ? 120 : 150)} ${sqY + (maskable ? 100 : 122)}
      L ${sqX + (maskable ? 102 : 128)} ${sqY + (maskable ? 100 : 122)}
      L ${sqX + (maskable ? 102 : 128)} ${sqY + (maskable ? 200 : 242)}
      L ${sqX + (maskable ? 148 : 185)} ${sqY + (maskable ? 200 : 242)}
      C ${sqX + (maskable ? 165 : 205)} ${sqY + (maskable ? 200 : 242)} ${sqX + (maskable ? 172 : 215)} ${sqY + (maskable ? 190 : 230)} ${sqX + (maskable ? 176 : 220)} ${sqY + (maskable ? 175 : 210)}
      L ${sqX + (maskable ? 186 : 232)} ${sqY + (maskable ? 175 : 210)}
      L ${sqX + (maskable ? 186 : 232)} ${sqY + (maskable ? 218 : 265)}
      L ${sqX + (maskable ? 60 : 75)} ${sqY + (maskable ? 218 : 265)}
      L ${sqX + (maskable ? 60 : 75)} ${sqY + (maskable ? 200 : 242)}
      L ${sqX + (maskable ? 78 : 98)} ${sqY + (maskable ? 200 : 242)}
      L ${sqX + (maskable ? 78 : 98)} ${sqY + (maskable ? 100 : 122)}
      L ${sqX + (maskable ? 60 : 75)} ${sqY + (maskable ? 100 : 122)}
      Z
    " />

    <!-- Letter C: Classical Roman Arc with Fine Serifs -->
    <path d="
      M ${sqX + (maskable ? 260 : 315)} ${sqY + (maskable ? 115 : 140)}
      C ${sqX + (maskable ? 255 : 310)} ${sqY + (maskable ? 105 : 128)} ${sqX + (maskable ? 245 : 298)} ${sqY + (maskable ? 95 : 115)} ${sqX + (maskable ? 228 : 278)} ${sqY + (maskable ? 90 : 108)}
      C ${sqX + (maskable ? 195 : 238)} ${sqY + (maskable ? 80 : 96)} ${sqX + (maskable ? 162 : 198)} ${sqY + (maskable ? 110 : 132)} ${sqX + (maskable ? 162 : 198)} ${sqY + (maskable ? 152 : 185)}
      C ${sqX + (maskable ? 162 : 198)} ${sqY + (maskable ? 194 : 238)} ${sqX + (maskable ? 195 : 238)} ${sqY + (maskable ? 224 : 274)} ${sqX + (maskable ? 232 : 282)} ${sqY + (maskable ? 224 : 274)}
      C ${sqX + (maskable ? 250 : 304)} ${sqY + (maskable ? 224 : 274)} ${sqX + (maskable ? 262 : 318)} ${sqY + (maskable ? 212 : 258)} ${sqX + (maskable ? 270 : 328)} ${sqY + (maskable ? 198 : 240)}
      L ${sqX + (maskable ? 258 : 314)} ${sqY + (maskable ? 192 : 234)}
      C ${sqX + (maskable ? 250 : 304)} ${sqY + (maskable ? 204 : 248)} ${sqX + (maskable ? 240 : 292)} ${sqY + (maskable ? 210 : 256)} ${sqX + (maskable ? 228 : 278)} ${sqY + (maskable ? 210 : 256)}
      C ${sqX + (maskable ? 205 : 250)} ${sqY + (maskable ? 210 : 256)} ${sqX + (maskable ? 188 : 228)} ${sqY + (maskable ? 186 : 226)} ${sqX + (maskable ? 188 : 228)} ${sqY + (maskable ? 152 : 185)}
      C ${sqX + (maskable ? 188 : 228)} ${sqY + (maskable ? 118 : 144)} ${sqX + (maskable ? 205 : 250)} ${sqY + (maskable ? 94 : 114)} ${sqX + (maskable ? 228 : 278)} ${sqY + (maskable ? 94 : 114)}
      C ${sqX + (maskable ? 242 : 294)} ${sqY + (maskable ? 94 : 114)} ${sqX + (maskable ? 252 : 306)} ${sqY + (maskable ? 102 : 124)} ${sqX + (maskable ? 256 : 312)} ${sqY + (maskable ? 115 : 140)}
      Z
    " />
  </g>

  <!-- The Iconic Sparkle Star Badge at bottom-right of the squircle (Exact match with website emblem!) -->
  <g filter="url(#badgeGlow)">
    <!-- Dark circle container with gold border -->
    <circle 
      cx="${badgeX}" 
      cy="${badgeY}" 
      r="${badgeRadius}" 
      fill="#0A0A0E" 
      stroke="url(#goldBorderGrad)" 
      stroke-width="${maskable ? 3.5 : 4}" 
    />

    <!-- Inner gold ring -->
    <circle 
      cx="${badgeX}" 
      cy="${badgeY}" 
      r="${badgeRadius - 5}" 
      fill="none" 
      stroke="#D4AF37" 
      stroke-width="1" 
      opacity="0.3" 
    />

    <!-- The 4-Point Golden Star Sparkle -->
    <g transform="translate(${badgeX}, ${badgeY})">
      <path 
        d="
          M 0 ${-badgeRadius * 0.62}
          C ${badgeRadius * 0.08} ${-badgeRadius * 0.18} ${badgeRadius * 0.18} ${-badgeRadius * 0.08} ${badgeRadius * 0.62} 0
          C ${badgeRadius * 0.18} ${badgeRadius * 0.08} ${badgeRadius * 0.08} ${badgeRadius * 0.18} 0 ${badgeRadius * 0.62}
          C ${-badgeRadius * 0.08} ${badgeRadius * 0.18} ${-badgeRadius * 0.18} ${badgeRadius * 0.08} ${-badgeRadius * 0.62} 0
          C ${-badgeRadius * 0.18} ${-badgeRadius * 0.08} ${-badgeRadius * 0.08} ${-badgeRadius * 0.18} 0 ${-badgeRadius * 0.62}
          Z
        " 
        fill="url(#goldGradient)" 
      />
      <!-- Center bright star core -->
      <circle cx="0" cy="0" r="${badgeRadius * 0.12}" fill="#FFF8D6" />
    </g>
  </g>
</svg>`;
}

async function run() {
  const publicDir = path.resolve('public');

  console.log('Generating SVG icons matching the website LC emblem...');
  const standardSvg = getEmblemSvg({ maskable: false });
  const maskableSvg = getEmblemSvg({ maskable: true });

  // 1. Save standard icon.svg
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), standardSvg);
  console.log('✓ Wrote public/icon.svg');

  // 2. Generate PNGs using sharp
  // A. 512x512 standard
  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('✓ Generated public/pwa-512x512.png');

  // B. 192x192 standard
  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('✓ Generated public/pwa-192x192.png');

  // C. 512x512 maskable (safe-zone centered for Android)
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('✓ Generated public/pwa-maskable-512x512.png');

  // D. 180x180 Apple Touch Icon (iOS Safari)
  await sharp(Buffer.from(standardSvg))
    .resize(180, 180)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Generated public/apple-touch-icon.png');

  // E. Favicon ICO (standard 48x48 PNG format or ico)
  await sharp(Buffer.from(standardSvg))
    .resize(48, 48)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));
  console.log('✓ Generated public/favicon.ico');

  console.log('All icons generated successfully!');
}

run().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
