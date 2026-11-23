/**
 * Generates every app icon + splash image from one logo definition.
 *
 *   npm run icons
 *
 * Change the logo or brand colours here, run the script, then rebuild the app
 * (icons are native assets: they only update in a new build, not via hot reload).
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const BRAND_BLUE = '#1C6FD1';
const LIGHT_BLUE = '#A9C7EE';

const here = dirname(fileURLToPath(import.meta.url));
const images = join(here, '..', 'images');

/**
 * The logo (a receipt with a euro sign) on a 1024×1024 canvas.
 * At scale 1 the receipt spans 39% of the width and 57% of the height.
 *
 * mono = true → single-colour version for Android themed icons: the euro sign
 * and lines are cut out of the receipt (transparent) instead of drawn in blue.
 */
function logoSvg({ scale = 1, background = null, mono = false, cornerRadius = 0 } = {}) {
  const receipt =
    'M312 260 Q312 220 352 220 L672 220 Q712 220 712 260 L712 804 L672 774 L632 804 L592 774 ' +
    'L552 804 L512 774 L472 804 L432 774 L392 804 L352 774 L312 804 Z';
  const euroArc = 'M589.8 392.2 A110 110 0 1 0 589.8 547.8';
  const euroBars = 'M372 445 H540 M372 495 H540';
  const lines = 'M392 650 H632 M392 700 H572';

  const details = (arcColor, lineColor) => `
    <g fill="none" stroke-linecap="round">
      <path d="${euroArc}" stroke="${arcColor}" stroke-width="34"/>
      <path d="${euroBars}" stroke="${arcColor}" stroke-width="26"/>
      <path d="${lines}" stroke="${lineColor}" stroke-width="22"/>
    </g>`;

  const glyph = mono
    ? `<defs><mask id="cut">
         <path d="${receipt}" fill="#fff"/>${details('#000', '#000')}
       </mask></defs>
       <path d="${receipt}" fill="#fff" mask="url(#cut)"/>`
    : `<path d="${receipt}" fill="#fff"/>${details(BRAND_BLUE, LIGHT_BLUE)}`;

  const bg = background
    ? `<rect width="1024" height="1024" rx="${cornerRadius}" fill="${background}"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${bg}
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">${glyph}</g>
</svg>`;
}

async function render(name, svg, size, { opaque = false } = {}) {
  let image = sharp(Buffer.from(svg)).resize(size, size);
  if (opaque) image = image.flatten({ background: BRAND_BLUE });
  await image.png().toFile(join(images, name));
  console.log(`✓ assets/images/${name} (${size}×${size})`);
}

// Main icon (Expo Go, iOS, store listing). Full-bleed and opaque: stores reject transparency.
await render('icon.png', logoSvg({ scale: 1.15, background: BRAND_BLUE }), 1024, { opaque: true });

// Android adaptive icon layers. The launcher crops them into a circle, squircle, etc.
// Only the centre 66/108 (~61%) is guaranteed visible, so the glyph is kept smaller.
await render('android-icon-background.png', logoSvg({ scale: 0, background: BRAND_BLUE }), 512);
await render('android-icon-foreground.png', logoSvg({ scale: 0.72 }), 512);
// Android 13+ "themed icons": the system recolours this using only its alpha channel.
await render('android-icon-monochrome.png', logoSvg({ scale: 0.72, mono: true }), 432);

// Splash screen image (transparent; the background colour is set in app.json).
await render('splash-icon.png', logoSvg({ scale: 0.85 }), 1024);

// Web favicon: bigger glyph, rounded square.
await render('favicon.png', logoSvg({ scale: 1.15, background: BRAND_BLUE, cornerRadius: 224 }), 48);

// Keep an editable SVG of the logo for design tools.
await writeFile(join(here, 'logo.svg'), logoSvg({ scale: 0.85 }) + '\n');
console.log('✓ assets/source/logo.svg');
