import { SkinId, WinEffectId } from '../types/game';

export type SkinTier = 'FREE' | 'BASIC' | 'HAT' | 'AURA' | 'LEGENDARY';

export interface SkinCatalogEntry {
  id: SkinId;
  name: string;
  tier: SkinTier;
  tierLabel: string;
  price: number;
  desc: string;
  /** 3D Voxel visual styling */
  shirtColor: string;
  sleeveColor: string;
  hairColor: string;
  accentColor?: string;
  glassesColor?: string;
  hatStyle?: 'none' | 'fedora' | 'cowboy' | 'crown' | 'sage' | 'disco' | 'tophat';
  auraEffect?: 'none' | 'fireflies' | 'neon_blink';
  specialAnim?: 'none' | 'check_watch' | 'conjure_doves';
}

export const SKIN_CATALOG: SkinCatalogEntry[] = [
  {
    id: 'DEFAULT',
    name: 'Thanh Niên Sới Bạc',
    tier: 'FREE',
    tierLabel: 'MẶC ĐỊNH',
    price: 0,
    desc: 'Trang phục khởi đầu mộc mạc chuẩn phong cách dân chơi đời thường.',
    shirtColor: '#2563eb',
    sleeveColor: '#2563eb',
    hairColor: '#2b1d14',
    hatStyle: 'none',
    auraEffect: 'none',
    specialAnim: 'none',
  },
  // Tier 1: 1,000+ Chip (glasses, hair color, shirt color)
  {
    id: 'SUNGLASSES_COOL',
    name: 'Kính Râm Ngầu Lòi',
    tier: 'BASIC',
    tierLabel: 'CƠ BẢN · 1K+',
    price: 1000,
    desc: 'Kính râm đen bí ẩn, tóc đen tuyền cùng áo sơ mi xanh than lịch lãm.',
    shirtColor: '#1e293b',
    sleeveColor: '#334155',
    hairColor: '#0f172a',
    glassesColor: '#090d16',
    hatStyle: 'none',
    auraEffect: 'none',
    specialAnim: 'none',
  },
  {
    id: 'RED_HOODIE',
    name: 'Hoodie Đỏ Rực Lửa',
    tier: 'BASIC',
    tierLabel: 'CƠ BẢN · 1K+',
    price: 2500,
    desc: 'Áo khoác đỏ nổi bật, mái tóc nâu hạt dẻ và kính gọng bạc cá tính.',
    shirtColor: '#b91c1c',
    sleeveColor: '#991b1b',
    hairColor: '#7c2d12',
    glassesColor: '#94a3b8',
    accentColor: '#f8fafc',
    hatStyle: 'none',
    auraEffect: 'none',
    specialAnim: 'none',
  },
  {
    id: 'GOLD_SHIRT',
    name: 'Sơ Mi Lụa Hoàng Kim',
    tier: 'BASIC',
    tierLabel: 'CƠ BẢN · 1K+',
    price: 5000,
    desc: 'Tóc bạch kim vuốt ngược, áo lụa vàng óng và cặp kính hổ phách.',
    shirtColor: '#d97706',
    sleeveColor: '#b45309',
    hairColor: '#fde047',
    glassesColor: '#f59e0b',
    hatStyle: 'none',
    auraEffect: 'none',
    specialAnim: 'none',
  },
  // Tier 2: 10,000+ Chip (extra 3D block hats / crowns)
  {
    id: 'FEDORA_BOSS',
    name: 'Ông Trùm Mũ Phớt',
    tier: 'HAT',
    tierLabel: 'HẠNG SANG · 10K+',
    price: 10000,
    desc: 'Đội mũ phớt Mafia 3D viền vàng, vest đen quyền lực và kính râm.',
    shirtColor: '#18181b',
    sleeveColor: '#27272a',
    hairColor: '#1c1917',
    glassesColor: '#09090b',
    accentColor: '#eab308',
    hatStyle: 'fedora',
    auraEffect: 'none',
    specialAnim: 'none',
  },
  {
    id: 'COWBOY_ACE',
    name: 'Cao Bồi Miền Tây',
    tier: 'HAT',
    tierLabel: 'HẠNG SANG · 10K+',
    price: 20000,
    desc: 'Mũ cao bồi vành rộng 3D chất lừ cùng áo ghi-lê da bò bụi bặm.',
    shirtColor: '#92400e',
    sleeveColor: '#fef3c7',
    hairColor: '#451a03',
    accentColor: '#dc2626',
    hatStyle: 'cowboy',
    auraEffect: 'none',
    specialAnim: 'none',
  },
  {
    id: 'CAPTAIN_CROWN',
    name: 'Vương Miện Đế Vương',
    tier: 'HAT',
    tierLabel: 'HẠNG SANG · 10K+',
    price: 35000,
    desc: 'Vương miện vàng đính ngọc đỏ 3D đỉnh đầu cùng áo choàng hoàng gia.',
    shirtColor: '#581c87',
    sleeveColor: '#6b21a8',
    hairColor: '#facc15',
    accentColor: '#fbbf24',
    hatStyle: 'crown',
    auraEffect: 'none',
    specialAnim: 'none',
  },
  // Tier 3: 50,000+ Chip (glowing orbiting fireflies, blinking neon hat)
  {
    id: 'FIREFLY_SAGE',
    name: 'Đạo Sĩ Đom Đóm',
    tier: 'AURA',
    tierLabel: 'HUYỀN ẢO · 50K+',
    price: 50000,
    desc: 'Nón lá trúc huyền bí với đàn đom đóm phát sáng bay lượn quanh người.',
    shirtColor: '#065f46',
    sleeveColor: '#047857',
    hairColor: '#e2e8f0',
    accentColor: '#a3e635',
    hatStyle: 'sage',
    auraEffect: 'fireflies',
    specialAnim: 'none',
  },
  {
    id: 'NEON_DISCO',
    name: 'Dân Chơi Mũ Neon',
    tier: 'AURA',
    tierLabel: 'HUYỀN ẢO · 50K+',
    price: 75000,
    desc: 'Mũ tiệc & kính phát sáng nhấp nháy đổi màu liên tục kèm tinh thể Neon bay quanh.',
    shirtColor: '#312e81',
    sleeveColor: '#4338ca',
    hairColor: '#38bdf8',
    glassesColor: '#22d3ee',
    accentColor: '#f472b6',
    hatStyle: 'disco',
    auraEffect: 'neon_blink',
    specialAnim: 'none',
  },
  // Tier 4: 100,000+ Chip (special idle animations!)
  {
    id: 'TYCOON_WATCH',
    name: 'Đại Gia Đồng Hồ Vàng',
    tier: 'LEGENDARY',
    tierLabel: 'HUYỀN THOẠI · 100K+',
    price: 100000,
    desc: 'Vest trắng thượng lưu — định kỳ giơ cả 2 tay lên soi đồng hồ vàng lấp lánh!',
    shirtColor: '#f8fafc',
    sleeveColor: '#e2e8f0',
    hairColor: '#1e293b',
    glassesColor: '#eab308',
    accentColor: '#f59e0b',
    hatStyle: 'fedora',
    auraEffect: 'none',
    specialAnim: 'check_watch',
  },
  {
    id: 'GRAND_MAGICIAN',
    name: 'Nhà Ảo Thuật Đại Tài',
    tier: 'LEGENDARY',
    tierLabel: 'HUYỀN THOẠI · 100K+',
    price: 150000,
    desc: 'Mũ chóp cao ảo thuật — định kỳ vung tay hô biến đàn chim bồ câu trắng bay ra!',
    shirtColor: '#0f172a',
    sleeveColor: '#1e1b4b',
    hairColor: '#020617',
    accentColor: '#ef4444',
    hatStyle: 'tophat',
    auraEffect: 'fireflies',
    specialAnim: 'conjure_doves',
  },
];

export const SKIN_CATALOG_BY_ID: Record<SkinId, SkinCatalogEntry> = SKIN_CATALOG.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<SkinId, SkinCatalogEntry>
);

export interface WinEffectCatalogEntry {
  id: WinEffectId;
  name: string;
  price: number;
  tag: string;
  desc: string;
  badgeCls: string;
}

export const WIN_EFFECT_CATALOG: WinEffectCatalogEntry[] = [
  {
    id: 'NONE',
    name: 'Mặc Định',
    price: 0,
    tag: 'CƠ BẢN',
    desc: 'Hiện tên người thắng và số chip ăn được bay lên từ giữa bàn.',
    badgeCls: 'border-border-subtle text-content-muted',
  },
  {
    id: 'CONFETTI',
    name: 'Pháo Giấy Ngũ Sắc',
    price: 3000,
    tag: 'LỄ HỘI',
    desc: 'Pháo giấy khối vuông ngũ sắc bắn tung tóe từ giữa bàn rồi bay lả tả xuống mặt nỉ.',
    badgeCls: 'border-accent-gold text-accent-gold',
  },
  {
    id: 'DOVES',
    name: 'Đàn Chim Bồ Câu',
    price: 8000,
    tag: 'ẢO THUẬT',
    desc: 'Đàn chim bồ câu trắng 3D vỗ cánh bay vút lên từ giữa bàn theo vòng xoắn.',
    badgeCls: 'border-content-primary text-content-primary',
  },
  {
    id: 'TORNADO',
    name: 'Lốc Xoáy Hoàng Kim',
    price: 15000,
    tag: 'PHONG BÃO',
    desc: 'Cơn lốc xoáy khí lưu và bụi vàng cuộn mạnh từ tâm bàn bốc lên không trung.',
    badgeCls: 'border-accent-jade text-accent-jade',
  },
  {
    id: 'FIRE_BURST',
    name: 'Hỏa Diệm Bùng Nổ',
    price: 25000,
    tag: 'RỰC CHÁY',
    desc: 'Cột lửa 3D rực cháy bùng lên dữ dội kèm vòng lửa lan tỏa ngay giữa bàn.',
    badgeCls: 'border-status-warning text-status-warning',
  },
  {
    id: 'LIGHTNING',
    name: 'Sấm Sét Giáng Thế',
    price: 40000,
    tag: 'TỐI THƯỢNG',
    desc: 'Những tia sét điện xanh trắng bắn mạnh lên từ tâm bàn kèm tia lửa điện chói lòa!',
    badgeCls: 'border-accent-via text-accent-via',
  },
];

export const WIN_EFFECT_BY_ID: Record<WinEffectId, WinEffectCatalogEntry> =
  WIN_EFFECT_CATALOG.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<WinEffectId, WinEffectCatalogEntry>
  );
