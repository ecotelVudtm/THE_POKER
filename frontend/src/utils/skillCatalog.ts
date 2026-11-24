import { MiniGameType, SkillMastery, SkillType } from '../types/game';
import { VoxelIconKind } from '../components/VoxelIcon3D';

export const MAX_EQUIPPED_SKILLS = 3;

export interface SkillCatalogEntry {
  type: SkillType;
  masteryKey: keyof SkillMastery;
  title: string;
  subtitle: string;
  fullName: string;
  iconKind: VoxelIconKind;
  viaCost: number;
  shopPrice: number;
  miniGameType: MiniGameType;
  miniGameLabel: string;
  requiresTarget: boolean;
  targetLabel?: string;
  shortDesc: string;
  borderCls: string;
  innerFrameCls: string;
  costBgCls: string;
  titleCls: string;
}

export const SKILL_CATALOG: SkillCatalogEntry[] = [
  {
    type: 'SLEIGHT_OF_HAND',
    masteryKey: 'sleightOfHand',
    title: 'TRÁO BÀI',
    subtitle: 'TAY ÁO',
    fullName: 'Tráo Bài Tay Áo',
    iconKind: 'sleight',
    viaCost: 35,
    shopPrice: 500,
    miniGameType: 'TIMING_BAR',
    miniGameLabel: 'Timing Bar',
    requiresTarget: false,
    shortDesc: 'Đổi 1 lá bài tẩy lấy lá mới từ bộ bài (hưởng vận may Bát Hương).',
    borderCls: 'border-border-gold bg-surface-panel',
    innerFrameCls: 'border-accent-gold/55 bg-surface-wood/35',
    costBgCls: 'bg-accent-gold text-content-inverse',
    titleCls: 'text-accent-gold',
  },
  {
    type: 'EAGLE_EYE',
    masteryKey: 'eagleEye',
    title: 'TÂM NHÃN',
    subtitle: 'ĐỌC VỊ',
    fullName: 'Tâm Nhãn Đọc Vị',
    iconKind: 'eagle',
    viaCost: 30,
    shopPrice: 800,
    miniGameType: 'BALANCE_CIRCLE',
    miniGameLabel: 'Bám Ô Di Chuyển',
    requiresTarget: false,
    shortDesc: 'Nhìn trộm lá bài chung sắp lật trong 4 giây (chỉ mình bạn thấy).',
    borderCls: 'border-accent-via bg-surface-panel',
    innerFrameCls: 'border-accent-via/55 bg-accent-via/10',
    costBgCls: 'bg-accent-via text-content-inverse',
    titleCls: 'text-accent-via',
  },
  {
    type: 'PRESSURE_AURA',
    masteryKey: 'pressureAura',
    title: 'KHÍ THẾ',
    subtitle: 'ÁP ĐẢO',
    fullName: 'Tỏa Khí Thế',
    iconKind: 'pressure',
    viaCost: 20,
    shopPrice: 400,
    miniGameType: 'RHYTHM_TAP',
    miniGameLabel: 'Rhythm Tap',
    requiresTarget: true,
    targetLabel: 'MỤC TIÊU (-10S):',
    shortDesc: 'Trừ 10 giây đồng hồ của 1 đối thủ và gây debuff Áp Lực.',
    borderCls: 'border-status-warning bg-surface-panel',
    innerFrameCls: 'border-status-danger/60 bg-status-danger/15',
    costBgCls: 'bg-status-warning text-content-inverse',
    titleCls: 'text-status-warning',
  },
  {
    type: 'VIA_SIPHON',
    masteryKey: 'viaSiphon',
    title: 'HÚT VÍA',
    subtitle: 'THU KHÍ',
    fullName: 'Hút Vía Đối Thủ',
    iconKind: 'siphon',
    viaCost: 20,
    shopPrice: 350,
    miniGameType: 'TIMING_BAR',
    miniGameLabel: 'Timing Bar',
    requiresTarget: true,
    targetLabel: 'HÚT VÍA AI:',
    shortDesc: 'Hút tối đa 25 Vía của 1 đối thủ và hồi ít nhất +15 Vía cho bản thân.',
    borderCls: 'border-accent-via bg-surface-panel',
    innerFrameCls: 'border-accent-jade/55 bg-accent-via/15',
    costBgCls: 'bg-accent-via text-content-inverse',
    titleCls: 'text-accent-via',
  },
  {
    type: 'TIME_FREEZE',
    masteryKey: 'timeFreeze',
    title: 'NGƯNG ĐỌNG',
    subtitle: 'THỜI GIAN',
    fullName: 'Ngưng Đọng Thời Gian',
    iconKind: 'freeze',
    viaCost: 25,
    shopPrice: 400,
    miniGameType: 'BALANCE_CIRCLE',
    miniGameLabel: 'Bám Ô Di Chuyển',
    requiresTarget: false,
    shortDesc: 'Kéo dài thêm +15 giây quỹ thời gian và +10 giây cho lượt đi hiện tại.',
    borderCls: 'border-accent-jade bg-surface-panel',
    innerFrameCls: 'border-accent-via/55 bg-accent-jade/10',
    costBgCls: 'bg-accent-jade text-content-inverse',
    titleCls: 'text-accent-jade',
  },
  {
    type: 'POKER_FACE',
    masteryKey: 'pokerFace',
    title: 'MẶT LẠNH',
    subtitle: 'TĨNH TÂM',
    fullName: 'Mặt Lạnh Tĩnh Tâm',
    iconKind: 'pokerface',
    viaCost: 20,
    shopPrice: 350,
    miniGameType: 'RHYTHM_TAP',
    miniGameLabel: 'Rhythm Tap',
    requiresTarget: false,
    shortDesc: 'Xóa Áp Lực và úp lại 1 lá bị Lộ Tẩy (hoặc bật 1 lớp Khiên nếu chưa lộ).',
    borderCls: 'border-accent-jade bg-surface-panel',
    innerFrameCls: 'border-accent-jade/55 bg-surface-elevated/60',
    costBgCls: 'bg-accent-jade text-content-inverse',
    titleCls: 'text-accent-jade',
  },
];

export const SKILL_CATALOG_BY_TYPE: Record<SkillType, SkillCatalogEntry> =
  SKILL_CATALOG.reduce(
    (acc, item) => {
      acc[item.type] = item;
      return acc;
    },
    {} as Record<SkillType, SkillCatalogEntry>
  );
