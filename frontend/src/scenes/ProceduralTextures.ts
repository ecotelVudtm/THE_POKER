import * as THREE from 'three';

const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Creates a crisp Minecraft-style pixel-art CanvasTexture using NearestFilter.
 */
function createPixelTexture(
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeat?: [number, number]
): THREE.CanvasTexture {
  const existing = textureCache.get(key);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  draw(ctx, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;

  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  textureCache.set(key, tex);
  return tex;
}

/** High-detail 64x64 handcrafted dark oak wood planks with knots & brass nail rivets */
export function getWoodTexture(): THREE.CanvasTexture {
  return createPixelTexture(
    'voxel_wood_hd',
    64,
    64,
    (ctx, w, h) => {
      const palette = ['#5c361d', '#6b4023', '#4f2d17', '#784828', '#633a1f'];
      for (let y = 0; y < h; y += 2) {
        const plankRow = Math.floor(y / 16);
        for (let x = 0; x < w; x += 2) {
          const grain = (x * 3 + y * 7 + plankRow * 11) % palette.length;
          ctx.fillStyle = palette[grain];
          ctx.fillRect(x, y, 2, 2);
        }
      }
      // Subtle horizontal wood grain streaks
      ctx.fillStyle = '#472814';
      for (let row = 0; row < 4; row++) {
        const y0 = row * 16;
        ctx.fillRect(4 + row * 8, y0 + 6, 18, 2);
        ctx.fillRect(36 - row * 6, y0 + 10, 14, 2);
      }
      // Crisp plank seam grooves
      ctx.fillStyle = '#331b0c';
      for (let y = 0; y < h; y += 16) {
        ctx.fillRect(0, y, w, 2);
      }
      // Vertical staggered plank joints + tiny iron nail rivets
      const joints = [20, 44, 12, 36];
      joints.forEach((jx, row) => {
        const y0 = row * 16;
        ctx.fillStyle = '#331b0c';
        ctx.fillRect(jx, y0, 2, 16);
        ctx.fillStyle = '#29150a';
        ctx.fillRect(jx - 4, y0 + 4, 2, 2);
        ctx.fillRect(jx - 4, y0 + 11, 2, 2);
        ctx.fillRect(jx + 4, y0 + 4, 2, 2);
        ctx.fillRect(jx + 4, y0 + 11, 2, 2);
      });
    },
    [4, 2]
  );
}

/** High-detail 256x192 woven emerald casino felt with double gold border, corner diamonds & center medallion */
export function getFeltTexture(): THREE.CanvasTexture {
  return createPixelTexture('voxel_felt_hd', 256, 192, (ctx, w, h) => {
    const greens = ['#156140', '#186c48', '#135739', '#1b734d'];
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const weave = ((x >> 1) + (y >> 1) * 3 + ((x & 2) === (y & 2) ? 1 : 0)) % greens.length;
        ctx.fillStyle = greens[weave];
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Outer stepped gold trim line
    ctx.fillStyle = '#eab308';
    ctx.fillRect(28, 20, w - 56, 3);
    ctx.fillRect(28, h - 23, w - 56, 3);
    ctx.fillRect(20, 28, 3, h - 56);
    ctx.fillRect(w - 23, 28, 3, h - 56);
    // Stepped outer corners
    const outerSteps: [number, number][] = [
      [23, 23],
      [w - 28, 23],
      [23, h - 28],
      [w - 28, h - 28],
    ];
    for (const [cx, cy] of outerSteps) {
      ctx.fillRect(cx, cy, 5, 5);
    }

    // Inner thin gold pinstripe border
    ctx.fillStyle = 'rgba(234, 179, 8, 0.45)';
    ctx.fillRect(34, 28, w - 68, 2);
    ctx.fillRect(34, h - 30, w - 68, 2);
    ctx.fillRect(28, 34, 2, h - 68);
    ctx.fillRect(w - 30, 34, 2, h - 68);

    // 4 Corner pixel diamond ornaments
    ctx.fillStyle = '#facc15';
    const diamonds: [number, number][] = [
      [38, 36],
      [w - 44, 36],
      [38, h - 42],
      [w - 44, h - 42],
    ];
    for (const [dx, dy] of diamonds) {
      ctx.fillRect(dx + 2, dy, 2, 6);
      ctx.fillRect(dx, dy + 2, 6, 2);
    }

    // Center inlaid pixel betting ring & subtle emblem
    ctx.fillStyle = 'rgba(234, 179, 8, 0.22)';
    const cx = w / 2;
    const cy = h / 2;
    ctx.fillRect(cx - 56, cy - 26, 112, 2);
    ctx.fillRect(cx - 56, cy + 24, 112, 2);
    ctx.fillRect(cx - 60, cy - 22, 2, 44);
    ctx.fillRect(cx + 58, cy - 22, 2, 44);
    // Tiny center star diamond
    ctx.fillStyle = 'rgba(250, 204, 21, 0.32)';
    ctx.fillRect(cx - 6, cy - 2, 12, 4);
    ctx.fillRect(cx - 2, cy - 6, 4, 12);
  });
}

/** 64x64 rich parquet voxel hardwood floor tiles */
export function getFloorTexture(): THREE.CanvasTexture {
  return createPixelTexture(
    'voxel_floor_hd',
    64,
    64,
    (ctx, w, h) => {
      const shades = ['#241710', '#2b1c14', '#1f130d', '#312017'];
      for (let y = 0; y < h; y += 4) {
        for (let x = 0; x < w; x += 4) {
          const tile = ((x >> 4) + (y >> 4)) % 2;
          const idx = (x * 3 + y * 5 + tile * 2) % shades.length;
          ctx.fillStyle = shades[idx];
          ctx.fillRect(x, y, 4, 4);
        }
      }
      ctx.fillStyle = '#150d08';
      for (let i = 0; i < w; i += 16) {
        ctx.fillRect(0, i, w, 2);
        ctx.fillRect(i, 0, 2, h);
      }
    },
    [12, 12]
  );
}

/** Pixel-art Bát Tràng ceramic bowl side texture */
export function getCeramicBowlTexture(): THREE.CanvasTexture {
  return createPixelTexture('voxel_ceramic_hd', 32, 16, (ctx, w, h) => {
    ctx.fillStyle = '#f2eadb';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(0, 1, w, 2);
    ctx.fillRect(0, h - 3, w, 2);
    for (let x = 2; x < w; x += 6) {
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(x, 5, 4, 6);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(x + 1, 7, 2, 2);
    }
  });
}

/** Pixel-art smartphone screen */
export function getPhoneScreenTexture(isDebt: boolean): THREE.CanvasTexture {
  return createPixelTexture(isDebt ? 'voxel_phone_debt_hd' : 'voxel_phone_idle_hd', 32, 56, (ctx, w, h) => {
    ctx.fillStyle = isDebt ? '#7c2d12' : '#0c243b';
    ctx.fillRect(0, 0, w, h);
    // Status bar
    ctx.fillStyle = isDebt ? '#f97316' : '#38bdf8';
    ctx.fillRect(2, 2, w - 4, 5);
    // App card
    ctx.fillStyle = isDebt ? '#fef08a' : '#e0f2fe';
    ctx.fillRect(6, 12, w - 12, 16);
    ctx.fillStyle = isDebt ? '#dc2626' : '#0284c7';
    ctx.fillRect(10, 16, w - 20, 8);
    // Keypad pixels
    ctx.fillStyle = isDebt ? '#fb923c' : '#1e3a5f';
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        ctx.fillRect(5 + col * 8, 31 + row * 5, 6, 3);
      }
    }
    // Call button
    ctx.fillStyle = isDebt ? '#ef4444' : '#22c55e';
    ctx.fillRect(4, 44, w - 8, 8);
  });
}

/** Detailed 16x16 Minecraft-style character face with eyebrows, iris highlights, nose & expression */
export function getVoxelFaceTexture(seed: number): THREE.CanvasTexture {
  return createPixelTexture(`voxel_face_hd_${seed}`, 16, 16, (ctx) => {
    const skinTones = ['#f0c8a0', '#e5b88d', '#d9a77a', '#f2cfb0'];
    const cheekTones = ['#e3ad82', '#d49d72', '#c88f64', '#e5b493'];
    const hairColors = ['#291c14', '#4a3222', '#1f2937', '#6b3e26'];
    const skin = skinTones[seed % skinTones.length];
    const cheek = cheekTones[seed % cheekTones.length];
    const hair = hairColors[seed % hairColors.length];

    ctx.fillStyle = skin;
    ctx.fillRect(0, 0, 16, 16);

    // Subtle jaw shading
    ctx.fillStyle = cheek;
    ctx.fillRect(0, 14, 16, 2);
    ctx.fillRect(2, 10, 2, 1);
    ctx.fillRect(12, 10, 2, 1);

    // Sculpted hair bangs & sideburns
    ctx.fillStyle = hair;
    ctx.fillRect(0, 0, 16, 3);
    ctx.fillRect(0, 3, 2, 4);
    ctx.fillRect(14, 3, 2, 4);
    ctx.fillRect(3, 3, 4, 1);
    ctx.fillRect(10, 3, 3, 1);

    // Expressive eyebrows
    ctx.fillStyle = hair;
    ctx.fillRect(3, 5, 3, 1);
    ctx.fillRect(10, 5, 3, 1);

    // Eyes with crisp white sclera & dark pupils
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3, 7, 3, 2);
    ctx.fillRect(10, 7, 3, 2);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(4, 7, 2, 2);
    ctx.fillRect(10, 7, 2, 2);

    // Nose pixel
    ctx.fillStyle = cheek;
    ctx.fillRect(7, 9, 2, 2);

    // Mouth / slight smirk or mustache for personality
    if (seed % 3 === 1) {
      // Cool goatee/mustache
      ctx.fillStyle = hair;
      ctx.fillRect(5, 11, 6, 1);
      ctx.fillRect(6, 13, 4, 1);
    }
    ctx.fillStyle = '#7c4a30';
    ctx.fillRect(6, 12, 4, 1);
  });
}

/**
 * Low-resolution recognizable Vietnamese 500,000 VND blue-teal polymer banknote texture.
 */
export function getVnd500kTexture(): THREE.CanvasTexture {
  return createPixelTexture('voxel_vnd_500k', 64, 30, (ctx, w, h) => {
    // Signature cyan-blue polymer paper base
    ctx.fillStyle = '#3b82a6';
    ctx.fillRect(0, 0, w, h);

    // Light polymer border & guilloche stripe accents
    ctx.fillStyle = '#cbe7f2';
    ctx.fillRect(0, 0, w, 2);
    ctx.fillRect(0, h - 2, w, 2);
    ctx.fillRect(0, 0, 2, h);
    ctx.fillRect(w - 2, 0, 2, h);

    ctx.fillStyle = '#57a8c9';
    ctx.fillRect(3, 3, w - 6, h - 6);
    ctx.fillStyle = '#2d688a';
    ctx.fillRect(3, 3, w - 6, 4);
    ctx.fillRect(3, h - 7, w - 6, 4);

    // Translucent polymer security window on left
    ctx.fillStyle = '#89c4dc';
    ctx.fillRect(6, 9, 9, 12);
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(8, 12, 5, 6);

    // Tiny red & gold national emblem pixel at top-center
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(28, 4, 5, 5);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(29, 5, 3, 3);

    // Creamy oval portrait block on right (instantly recognizable VND bill layout)
    ctx.fillStyle = '#e8dfc8';
    ctx.fillRect(42, 6, 15, 18);
    ctx.fillStyle = '#2c5368';
    ctx.fillRect(46, 9, 7, 6); // head silhouette
    ctx.fillRect(44, 16, 11, 7); // shoulders silhouette
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(47, 13, 5, 3); // beard/collar highlight

    // Bold low-res "500.000" text in middle-left
    ctx.fillStyle = '#0f293a';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('500000', 16, 16);
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 6px monospace';
    ctx.fillText('VND', 20, 24);
  });
}
