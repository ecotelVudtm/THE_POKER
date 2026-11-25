import { ReactNode, useState } from 'react';
import { soundEngine } from '../../services/soundEngine';

export type VoxelIconKind =
  | 'player'
  | 'chip'
  | 'sleight'
  | 'eagle'
  | 'pressure'
  | 'siphon'
  | 'freeze'
  | 'pokerface'
  | 'via'
  | 'book'
  | 'phone'
  | 'incense'
  | 'mango'
  | 'tea'
  | 'coin'
  | 'noodles'
  | 'vnd500k';

export interface VoxelIcon3DProps {
  kind: VoxelIconKind;
  size?: number;
  title?: string;
  /** When true (e.g. Lobby Guide Book), hovering opens the 3D book cover */
  openOnHover?: boolean;
  /** Optional click-to-spin interaction (disabled by default so spell card & UI button icons never steal clicks or spin unnecessarily) */
  interactive?: boolean;
}

interface VoxelBoxProps {
  w: number;
  h: number;
  d: number;
  x?: number;
  y?: number;
  z?: number;
  frontCls: string;
  sideCls?: string;
  topCls?: string;
  bottomCls?: string;
  frontContent?: ReactNode;
}

/**
 * Watertight 6-face solid 3D Voxel rectangular prism (true Minecraft-style geometry).
 * Coordinates (x, y, z) place the center of the box in 3D space.
 */
function VoxelBox3D({
  w,
  h,
  d,
  x = 0,
  y = 0,
  z = 0,
  frontCls,
  sideCls,
  topCls,
  bottomCls,
  frontContent,
}: VoxelBoxProps) {
  const side = sideCls ?? frontCls;
  const top = topCls ?? frontCls;
  const bottom = bottomCls ?? side;

  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        transformStyle: 'preserve-3d',
        transform: `translate3d(${x}px, ${y}px, ${z}px)`,
      }}
    >
      {/* Front (+Z) */}
      <div
        className={`absolute ${frontCls}`}
        style={{
          width: w,
          height: h,
          transform: `translate3d(${-w / 2}px, ${-h / 2}px, ${d / 2}px)`,
        }}
      >
        {frontContent}
      </div>
      {/* Back (-Z) */}
      <div
        className={`absolute ${side} brightness-75`}
        style={{
          width: w,
          height: h,
          transform: `translate3d(${-w / 2}px, ${-h / 2}px, ${-d / 2}px) rotateY(180deg)`,
        }}
      />
      {/* Right (+X) */}
      <div
        className={`absolute ${side} brightness-90`}
        style={{
          width: d,
          height: h,
          transform: `translate3d(${w / 2 - d / 2}px, ${-h / 2}px, 0px) rotateY(90deg)`,
        }}
      />
      {/* Left (-X) */}
      <div
        className={`absolute ${side} brightness-75`}
        style={{
          width: d,
          height: h,
          transform: `translate3d(${-w / 2 - d / 2}px, ${-h / 2}px, 0px) rotateY(-90deg)`,
        }}
      />
      {/* Top (-Y) */}
      <div
        className={`absolute ${top} brightness-110`}
        style={{
          width: w,
          height: d,
          transform: `translate3d(${-w / 2}px, ${-h / 2 - d / 2}px, 0px) rotateX(90deg)`,
        }}
      />
      {/* Bottom (+Y) */}
      <div
        className={`absolute ${bottom} brightness-50`}
        style={{
          width: w,
          height: d,
          transform: `translate3d(${-w / 2}px, ${h / 2 - d / 2}px, 0px) rotateX(-90deg)`,
        }}
      />
    </div>
  );
}

/**
 * Interactive tilted 3D Voxel Mini-Icon built from joined 6-face solid VoxelBox3D blocks.
 * Click to flick-spin 360° with real 3D depth from every angle.
 */
export function VoxelIcon3D({
  kind,
  size = 20,
  title,
  openOnHover = false,
  interactive = false,
}: VoxelIcon3DProps) {
  const [spinning, setSpinning] = useState(false);
  const [hovered, setHovered] = useState(false);

  const triggerFlick = () => {
    if (!interactive || openOnHover || spinning) return;
    setSpinning(true);
    if (kind === 'chip' || kind === 'coin') soundEngine.playChipClink();
    else soundEngine.playItemRefresh();
    setTimeout(() => setSpinning(false), 540);
  };

  // Normalize all multi-block sculptures on a 24px design grid scaled smoothly to `size`
  const scale = size / 24;

  const renderSculpture = () => {
    switch (kind) {
      case 'player':
        return (
          <>
            <VoxelBox3D
              w={20}
              h={20}
              d={20}
              frontCls="bg-content-secondary"
              sideCls="bg-content-muted"
              topCls="bg-surface-wood"
              frontContent={
                <div className="h-full w-full">
                  <div className="h-[28%] w-full bg-surface-wood" />
                  <div className="mt-[18%] flex justify-around px-[14%]">
                    <span className="h-[3px] w-[3px] bg-content-inverse" />
                    <span className="h-[3px] w-[3px] bg-content-inverse" />
                  </div>
                  <div className="mx-auto mt-[16%] h-[2px] w-[32%] bg-surface-wood/75" />
                </div>
              }
            />
          </>
        );

      case 'chip':
        // Thick stepped cross-shaped 3D voxel poker chip
        return (
          <>
            <VoxelBox3D
              w={20}
              h={12}
              d={7}
              frontCls="bg-accent-gold"
              sideCls="bg-accent-amber"
              topCls="bg-accent-gold"
            />
            <VoxelBox3D
              w={12}
              h={20}
              d={7}
              frontCls="bg-accent-gold"
              sideCls="bg-accent-amber"
              topCls="bg-accent-gold"
            />
            <VoxelBox3D
              w={8}
              h={8}
              d={8}
              frontCls="bg-content-primary"
              sideCls="bg-content-secondary"
              topCls="bg-content-primary"
            />
          </>
        );

      case 'sleight':
        return (
          <VoxelBox3D
            w={16}
            h={22}
            d={4}
            frontCls="border border-border-subtle bg-content-primary"
            sideCls="bg-content-muted"
            topCls="bg-content-primary"
            frontContent={
              <div className="flex h-full w-full items-center justify-center">
                <div className="h-[7px] w-[7px] rotate-45 bg-status-danger" />
              </div>
            }
          />
        );

      case 'eagle':
        return (
          <>
            <VoxelBox3D
              w={18}
              h={18}
              d={10}
              frontCls="border border-accent-via bg-surface-elevated"
              sideCls="bg-surface-panel"
              topCls="bg-accent-via/70"
            />
            <VoxelBox3D
              w={8}
              h={8}
              d={12}
              frontCls="bg-accent-via"
              sideCls="bg-accent-via"
              topCls="bg-content-primary"
            />
          </>
        );

      case 'pressure':
        return (
          <>
            <VoxelBox3D
              w={16}
              h={16}
              d={12}
              y={2}
              frontCls="bg-status-danger"
              sideCls="bg-status-warning"
              topCls="bg-accent-gold"
            />
            <VoxelBox3D
              w={10}
              h={10}
              d={8}
              y={-6}
              frontCls="bg-accent-gold"
              sideCls="bg-status-warning"
              topCls="bg-content-primary"
            />
          </>
        );

      case 'siphon':
        // True 3D Vía vortex core (outer dark frame + glowing cyan-jade crystal + orbit cubes)
        return (
          <>
            <VoxelBox3D
              w={14}
              h={14}
              d={14}
              frontCls="border border-accent-via bg-accent-via"
              sideCls="bg-surface-elevated"
              topCls="bg-content-primary"
            />
            <VoxelBox3D
              w={6}
              h={6}
              d={6}
              x={-8}
              y={-6}
              z={3}
              frontCls="bg-accent-jade"
              sideCls="bg-accent-via"
              topCls="bg-content-primary"
            />
            <VoxelBox3D
              w={6}
              h={6}
              d={6}
              x={8}
              y={6}
              z={3}
              frontCls="bg-accent-gold"
              sideCls="bg-accent-amber"
              topCls="bg-content-primary"
            />
          </>
        );

      case 'freeze':
        // True 3D stepped hourglass / icy time-crystal block
        return (
          <>
            <VoxelBox3D
              w={18}
              h={5}
              d={14}
              y={-7}
              frontCls="bg-accent-via"
              sideCls="bg-surface-elevated"
              topCls="bg-content-primary"
            />
            <VoxelBox3D
              w={9}
              h={9}
              d={9}
              y={0}
              frontCls="bg-content-primary"
              sideCls="bg-accent-via"
              topCls="bg-content-primary"
            />
            <VoxelBox3D
              w={18}
              h={5}
              d={14}
              y={7}
              frontCls="bg-accent-via"
              sideCls="bg-surface-elevated"
              topCls="bg-accent-via"
            />
          </>
        );

      case 'pokerface':
        // True 3D stoic jade-slate shield mask with crisp visor slit
        return (
          <>
            <VoxelBox3D
              w={18}
              h={20}
              d={8}
              frontCls="border border-accent-jade bg-surface-elevated"
              sideCls="bg-surface-panel"
              topCls="bg-accent-jade"
              frontContent={
                <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-1">
                  <div className="flex w-full justify-around">
                    <span className="h-[3px] w-[5px] bg-accent-jade" />
                    <span className="h-[3px] w-[5px] bg-accent-jade" />
                  </div>
                  <span className="h-[2px] w-[10px] bg-content-secondary" />
                </div>
              }
            />
          </>
        );

      case 'via':
        return (
          <VoxelBox3D
            w={16}
            h={16}
            d={16}
            frontCls="border border-content-primary bg-accent-via"
            sideCls="bg-accent-via"
            topCls="bg-content-primary"
          />
        );

      case 'book':
        if (openOnHover) {
          // Hinged 3D Voxel Book: back cover + stacked pages + hinged front cover that swings open on hover!
          return (
            <>
              {/* Back leather cover */}
              <VoxelBox3D
                w={18}
                h={22}
                d={2.5}
                z={-3}
                frontCls="bg-surface-wood border border-accent-gold"
                sideCls="bg-surface-wood"
                topCls="bg-surface-wood"
              />
              {/* Spine on left edge */}
              <VoxelBox3D
                w={3}
                h={22}
                d={8.5}
                x={-8}
                z={0}
                frontCls="bg-surface-wood border-y border-accent-gold"
                sideCls="bg-surface-wood"
                topCls="bg-accent-gold"
              />
              {/* Thick cream paper page block */}
              <VoxelBox3D
                w={15}
                h={19.5}
                d={5}
                x={0.5}
                z={0.5}
                frontCls="bg-content-primary border border-content-muted/40"
                sideCls="bg-content-secondary"
                topCls="bg-content-primary"
                frontContent={
                  <div className="flex h-full w-full flex-col justify-center gap-[2.5px] px-[2.5px]">
                    <div className="h-[1.5px] w-[75%] bg-surface-wood/70" />
                    <div className="h-[1.5px] w-full bg-surface-wood/50" />
                    <div className="h-[1.5px] w-[85%] bg-surface-wood/50" />
                    <div className="h-[1.5px] w-[65%] bg-accent-gold/80" />
                  </div>
                }
              />
              {/* Hinged front cover pivoted on left spine — swings open smoothly on hover! */}
              <div
                className="absolute left-1/2 top-1/2 transition-transform duration-300 ease-out"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `translate3d(-8px, 0px, 3.5px) rotateY(${hovered ? -128 : 0}deg)`,
                }}
              >
                <VoxelBox3D
                  w={17.5}
                  h={22}
                  d={2}
                  x={8.5}
                  frontCls="border border-accent-gold bg-surface-wood"
                  sideCls="bg-surface-wood"
                  topCls="bg-accent-gold"
                  frontContent={
                    <div className="flex h-full w-full flex-col items-center justify-between py-2">
                      <div className="h-1.5 w-full bg-accent-gold" />
                      <div className="h-2.5 w-2.5 border border-accent-gold bg-accent-gold/40" />
                      <div className="h-1 w-[70%] bg-accent-gold/75" />
                    </div>
                  }
                />
              </div>
            </>
          );
        }
        return (
          <>
            <VoxelBox3D
              w={18}
              h={22}
              d={8}
              frontCls="border border-accent-gold bg-surface-wood"
              sideCls="bg-content-primary"
              topCls="bg-content-primary"
              frontContent={
                <div className="mt-2 h-1.5 w-full bg-accent-gold" />
              }
            />
          </>
        );

      case 'phone':
        // Thick 3D voxel smartphone with screen block & antenna/camera bump
        return (
          <>
            <VoxelBox3D
              w={15}
              h={23}
              d={6}
              frontCls="bg-surface-canvas border border-border-subtle"
              sideCls="bg-surface-elevated"
              topCls="bg-border-subtle"
              frontContent={
                <div className="flex h-full w-full flex-col justify-between p-[2px]">
                  <div className="h-[70%] w-full bg-accent-via" />
                  <div className="h-[18%] w-full bg-accent-jade" />
                </div>
              }
            />
          </>
        );

      case 'incense':
        // Shallow dish-style 3D Bát Hương + single centered stick + glowing ember tip
        return (
          <>
            {/* Low ceramic foot */}
            <VoxelBox3D
              w={14}
              h={2.5}
              d={14}
              y={9.5}
              frontCls="bg-content-muted"
              sideCls="bg-content-muted"
              topCls="bg-content-secondary"
            />
            {/* Wide shallow ceramic dish */}
            <VoxelBox3D
              w={21}
              h={5.5}
              d={21}
              y={5.5}
              frontCls="bg-content-primary"
              sideCls="bg-content-secondary"
              topCls="bg-content-muted"
              frontContent={
                <div className="mt-[1.5px] h-[2px] w-full bg-accent-via" />
              }
            />
            {/* Single centered 3D incense stick + glowing ember tip */}
            <VoxelBox3D
              w={2.2}
              h={10}
              d={2.2}
              x={0}
              y={-2}
              frontCls="bg-surface-wood"
              sideCls="bg-surface-wood"
              topCls="bg-status-danger"
            />
            <VoxelBox3D
              w={3}
              h={3}
              d={3}
              x={0}
              y={-8}
              frontCls="bg-status-danger"
              sideCls="bg-status-warning"
              topCls="bg-accent-gold"
            />
          </>
        );

      case 'mango':
        // True 3D ceramic saucer + 3-block stepped golden mango + green 3D leaf!
        return (
          <>
            {/* Ceramic saucer slab */}
            <VoxelBox3D
              w={22}
              h={3}
              d={18}
              y={8}
              frontCls="bg-content-primary"
              sideCls="bg-content-secondary"
              topCls="bg-content-primary"
            />
            {/* Mango center body block */}
            <VoxelBox3D
              w={12}
              h={10}
              d={11}
              y={1}
              frontCls="bg-accent-amber"
              sideCls="bg-accent-gold"
              topCls="bg-accent-gold"
            />
            {/* Left plump cheek */}
            <VoxelBox3D
              w={5}
              h={8}
              d={9}
              x={-7}
              y={2}
              frontCls="bg-status-warning"
              sideCls="bg-accent-amber"
              topCls="bg-accent-amber"
            />
            {/* Right tapered tip */}
            <VoxelBox3D
              w={5}
              h={7}
              d={8}
              x={7}
              y={0}
              frontCls="bg-accent-gold"
              sideCls="bg-accent-amber"
              topCls="bg-accent-gold"
            />
            {/* 3D green leaf on top */}
            <VoxelBox3D
              w={6}
              h={3}
              d={4}
              x={6}
              y={-5}
              frontCls="bg-accent-jade"
              sideCls="bg-accent-jade"
              topCls="bg-status-success"
            />
          </>
        );

      case 'tea':
        // True 3D glass cube + amber tea core + 2 ice cubes + lime cube on rim!
        return (
          <>
            {/* Amber iced tea core */}
            <VoxelBox3D
              w={15}
              h={14}
              d={15}
              y={3}
              frontCls="bg-accent-amber"
              sideCls="bg-status-warning"
              topCls="bg-accent-gold"
            />
            {/* Translucent outer glass rim */}
            <VoxelBox3D
              w={18}
              h={20}
              d={18}
              y={0}
              frontCls="border border-accent-via/75 bg-accent-via/20"
              sideCls="border border-accent-via/60 bg-accent-via/15"
              topCls="bg-accent-via/25"
            />
            {/* Floating white ice cube */}
            <VoxelBox3D
              w={6}
              h={5}
              d={6}
              x={-3}
              y={-6}
              z={2}
              frontCls="bg-content-primary"
              sideCls="bg-content-secondary"
              topCls="bg-content-primary"
            />
            {/* Green lime block on rim */}
            <VoxelBox3D
              w={5}
              h={5}
              d={4}
              x={8}
              y={-9}
              z={3}
              frontCls="bg-accent-jade"
              sideCls="bg-status-success"
              topCls="bg-accent-jade"
            />
          </>
        );

      case 'coin':
        // True 3D hollow square-hole ancient gold coin built from 4 thick 3D bars + red tassel!
        return (
          <>
            {/* Top bar */}
            <VoxelBox3D
              w={20}
              h={5}
              d={5}
              y={-7.5}
              frontCls="bg-accent-gold"
              sideCls="bg-accent-amber"
              topCls="bg-accent-gold"
            />
            {/* Bottom bar */}
            <VoxelBox3D
              w={20}
              h={5}
              d={5}
              y={7.5}
              frontCls="bg-accent-gold"
              sideCls="bg-accent-amber"
              topCls="bg-accent-gold"
            />
            {/* Left bar */}
            <VoxelBox3D
              w={5}
              h={10}
              d={5}
              x={-7.5}
              frontCls="bg-accent-gold"
              sideCls="bg-accent-amber"
              topCls="bg-accent-gold"
            />
            {/* Right bar */}
            <VoxelBox3D
              w={5}
              h={10}
              d={5}
              x={7.5}
              frontCls="bg-accent-gold"
              sideCls="bg-accent-amber"
              topCls="bg-accent-gold"
            />
            {/* Red lucky silk cord block */}
            <VoxelBox3D
              w={7}
              h={4}
              d={4}
              x={11}
              y={8}
              frontCls="bg-status-danger"
              sideCls="bg-status-danger"
              topCls="bg-status-danger"
            />
          </>
        );

      case 'noodles':
        // True 3D ceramic noodle bowl + golden noodles + egg + chopsticks
        return (
          <>
            <VoxelBox3D
              w={14}
              h={4}
              d={14}
              y={9}
              frontCls="bg-content-primary"
              sideCls="bg-content-secondary"
              topCls="bg-content-primary"
            />
            <VoxelBox3D
              w={20}
              h={10}
              d={20}
              y={2}
              frontCls="bg-status-danger"
              sideCls="bg-status-danger"
              topCls="bg-accent-gold"
            />
            <VoxelBox3D
              w={16}
              h={4}
              d={16}
              y={-4}
              frontCls="bg-accent-gold"
              sideCls="bg-accent-amber"
              topCls="bg-accent-gold"
            />
            <VoxelBox3D
              w={6}
              h={3}
              d={6}
              x={-3}
              y={-7}
              z={2}
              frontCls="bg-content-primary"
              sideCls="bg-content-secondary"
              topCls="bg-status-warning"
            />
            <VoxelBox3D
              w={22}
              h={2}
              d={2}
              x={2}
              y={-7}
              z={-3}
              frontCls="bg-surface-wood"
              sideCls="bg-surface-wood"
              topCls="bg-accent-amber"
            />
          </>
        );

      case 'vnd500k':
        // Low-res 3D Vietnamese 500,000 VND blue-teal polymer banknote
        return (
          <>
            <VoxelBox3D
              w={24}
              h={13}
              d={3.5}
              frontCls="border border-content-primary bg-accent-via"
              sideCls="bg-accent-via"
              topCls="bg-content-primary"
              frontContent={
                <div className="flex h-full w-full items-center justify-between px-[2px]">
                  <div className="h-[7px] w-[4px] bg-content-primary/60" />
                  <span className="font-mono text-[6px] font-extrabold leading-none text-content-inverse">
                    500K
                  </span>
                  <div className="h-[9px] w-[5px] bg-content-secondary" />
                </div>
              }
            />
          </>
        );
    }
  };

  return (
    <span
      role={interactive && !openOnHover ? 'button' : undefined}
      tabIndex={interactive && !openOnHover ? 0 : undefined}
      title={title ?? (openOnHover ? 'Mở Sổ Tay Thần Bài' : undefined)}
      onMouseEnter={
        openOnHover
          ? () => {
              setHovered(true);
              soundEngine.playBookOpen();
            }
          : undefined
      }
      onMouseLeave={openOnHover ? () => setHovered(false) : undefined}
      onClick={
        interactive && !openOnHover
          ? (e) => {
              e.stopPropagation();
              triggerFlick();
            }
          : undefined
      }
      onKeyDown={
        interactive && !openOnHover
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                triggerFlick();
              }
            }
          : undefined
      }
      className={`voxel-icon-stage shrink-0 ${interactive || openOnHover ? '' : 'pointer-events-none'}`}
      style={{ width: size + 8, height: size + 8 }}
    >
      <span
        className={`voxel-icon-3d relative block transition-transform duration-300 ${
          spinning ? 'voxel-icon-flick' : ''
        }`}
        style={{
          width: 24,
          height: 24,
          transform: spinning
            ? undefined
            : openOnHover && hovered
              ? `scale(${scale * 1.08}) rotateX(18deg) rotateY(-14deg)`
              : `scale(${scale}) rotateX(24deg) rotateY(-32deg)`,
        }}
      >
        {renderSculpture()}
      </span>
    </span>
  );
}
