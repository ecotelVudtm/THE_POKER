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

/** 16x16 Minecraft-style dark oak wood plank texture */
export function getWoodTexture(): THREE.CanvasTexture {
  return createPixelTexture(
    'voxel_wood',
    32,
    32,
    (ctx, w, h) => {
      const palette = ['#5c361d', '#693e22', '#502e18', '#754627'];
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          const idx = (x * 3 + y * 5 + (y % 8 === 0 ? 2 : 0)) % palette.length;
          ctx.fillStyle = palette[idx];
          ctx.fillRect(x, y, 2, 2);
        }
      }
      // Crisp plank divider lines
      ctx.fillStyle = '#3b2110';
      ctx.fillRect(0, 0, w, 2);
      ctx.fillRect(0, 16, w, 2);
      ctx.fillRect(14, 0, 2, 16);
      ctx.fillRect(26, 16, 2, 16);
    },
    [4, 2]
  );
}

/** Pixel-art woven green casino felt with stepped pixel gold border */
export function getFeltTexture(): THREE.CanvasTexture {
  return createPixelTexture('voxel_felt', 128, 96, (ctx, w, h) => {
    const greens = ['#176644', '#1a704b', '#145c3d', '#1c764f'];
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        ctx.fillStyle = greens[(x * 7 + y * 11) % greens.length];
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Stepped zigzag pixel gold inner betting line
    ctx.fillStyle = '#eab308';
    ctx.fillRect(16, 12, w - 32, 2);
    ctx.fillRect(16, h - 14, w - 32, 2);
    ctx.fillRect(12, 16, 2, h - 32);
    ctx.fillRect(w - 14, 16, 2, h - 32);
    // Zigzag corners
    const corners: [number, number][] = [
      [14, 14],
      [w - 16, 14],
      [14, h - 16],
      [w - 16, h - 16],
    ];
    for (const [cx, cy] of corners) {
      ctx.fillRect(cx, cy, 2, 2);
    }

    // Subtle pixel emblem in center
    ctx.fillStyle = 'rgba(234, 179, 8, 0.28)';
    ctx.fillRect(w / 2 - 14, h / 2 - 4, 28, 2);
    ctx.fillRect(w / 2 - 10, h / 2 + 2, 20, 2);
  });
}

/** 32x32 voxel hardwood floor tiles */
export function getFloorTexture(): THREE.CanvasTexture {
  return createPixelTexture(
    'voxel_floor',
    32,
    32,
    (ctx, w, h) => {
      const shades = ['#211610', '#271a13', '#1c120d', '#2b1d15'];
      for (let y = 0; y < h; y += 4) {
        for (let x = 0; x < w; x += 4) {
          ctx.fillStyle = shades[(x + y * 3) % shades.length];
          ctx.fillRect(x, y, 4, 4);
        }
      }
      ctx.fillStyle = '#140c08';
      ctx.fillRect(0, 0, w, 2);
      ctx.fillRect(0, 16, w, 2);
    },
    [10, 10]
  );
}

/** Pixel-art Bát Tràng ceramic bowl side texture */
export function getCeramicBowlTexture(): THREE.CanvasTexture {
  return createPixelTexture('voxel_ceramic', 32, 16, (ctx, w, h) => {
    ctx.fillStyle = '#ece3d2';
    ctx.fillRect(0, 0, w, h);
    // Cobalt blue pixel bands
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(0, 2, w, 2);
    ctx.fillRect(0, h - 3, w, 2);
    // Pixel lotus dots
    for (let x = 2; x < w; x += 6) {
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(x, 6, 4, 4);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(x + 1, 7, 2, 2);
    }
  });
}

/** Pixel-art smartphone screen */
export function getPhoneScreenTexture(isDebt: boolean): THREE.CanvasTexture {
  return createPixelTexture(isDebt ? 'voxel_phone_debt' : 'voxel_phone_idle', 32, 56, (ctx, w, h) => {
    ctx.fillStyle = isDebt ? '#9a3412' : '#0f2942';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = isDebt ? '#f97316' : '#38bdf8';
    ctx.fillRect(2, 2, w - 4, 6);
    // Pixel icon block
    ctx.fillStyle = isDebt ? '#fef08a' : '#e0f2fe';
    ctx.fillRect(10, 16, 12, 12);
    ctx.fillStyle = isDebt ? '#dc2626' : '#0284c7';
    ctx.fillRect(12, 18, 8, 8);
    // Pixel button
    ctx.fillStyle = isDebt ? '#ef4444' : '#22c55e';
    ctx.fillRect(4, 38, w - 8, 10);
  });
}

/** Pixel-art Minecraft-style character face texture */
export function getVoxelFaceTexture(seed: number): THREE.CanvasTexture {
  return createPixelTexture(`voxel_face_${seed}`, 16, 16, (ctx) => {
    const skinTones = ['#f0c8a0', '#e5b88d', '#d9a77a', '#f2cfb0'];
    const hairColors = ['#291c14', '#4a3222', '#1f2937', '#6b3e26'];
    const skin = skinTones[seed % skinTones.length];
    const hair = hairColors[seed % hairColors.length];

    // Skin base
    ctx.fillStyle = skin;
    ctx.fillRect(0, 0, 16, 16);

    // Hair bangs across top
    ctx.fillStyle = hair;
    ctx.fillRect(0, 0, 16, 4);
    ctx.fillRect(0, 4, 2, 3);
    ctx.fillRect(14, 4, 2, 3);

    // Expressive Minecraft eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3, 7, 3, 2);
    ctx.fillRect(10, 7, 3, 2);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(4, 7, 2, 2);
    ctx.fillRect(10, 7, 2, 2);

    // Subtle smile / poker face mouth
    ctx.fillStyle = '#8c5a3c';
    ctx.fillRect(6, 12, 4, 1);
  });
}
