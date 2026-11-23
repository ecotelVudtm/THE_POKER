import { useState } from 'react';
import { VoxelIcon3D } from '../VoxelIcon3D';

export interface GuideBookModalProps {
  open: boolean;
  onClose: () => void;
}

interface MiniCardSpec {
  rank: string;
  suit: '♠' | '♥' | '♦' | '♣';
  highlight?: boolean;
}

interface HandRankEntry {
  order: number;
  viName: string;
  enName: string;
  desc: string;
  cards: MiniCardSpec[];
}

const HAND_RANKINGS: HandRankEntry[] = [
  {
    order: 1,
    viName: 'Sảnh Chúa',
    enName: 'Royal Flush',
    desc: '10 - J - Q - K - A cùng một chất. Tay bài mạnh tuyệt đối!',
    cards: [
      { rank: '10', suit: '♠', highlight: true },
      { rank: 'J', suit: '♠', highlight: true },
      { rank: 'Q', suit: '♠', highlight: true },
      { rank: 'K', suit: '♠', highlight: true },
      { rank: 'A', suit: '♠', highlight: true },
    ],
  },
  {
    order: 2,
    viName: 'Thùng Phá Sảnh',
    enName: 'Straight Flush',
    desc: '5 lá liên tiếp nhau và cùng một chất.',
    cards: [
      { rank: '5', suit: '♥', highlight: true },
      { rank: '6', suit: '♥', highlight: true },
      { rank: '7', suit: '♥', highlight: true },
      { rank: '8', suit: '♥', highlight: true },
      { rank: '9', suit: '♥', highlight: true },
    ],
  },
  {
    order: 3,
    viName: 'Tứ Quý',
    enName: 'Four of a Kind',
    desc: '4 lá cùng giá trị + 1 lá lẻ (kicker).',
    cards: [
      { rank: 'K', suit: '♠', highlight: true },
      { rank: 'K', suit: '♥', highlight: true },
      { rank: 'K', suit: '♦', highlight: true },
      { rank: 'K', suit: '♣', highlight: true },
      { rank: '9', suit: '♠', highlight: false },
    ],
  },
  {
    order: 4,
    viName: 'Cù Lũ',
    enName: 'Full House',
    desc: '1 bộ Sám Cô (3 lá giống nhau) kết hợp 1 Đôi.',
    cards: [
      { rank: 'Q', suit: '♠', highlight: true },
      { rank: 'Q', suit: '♥', highlight: true },
      { rank: 'Q', suit: '♦', highlight: true },
      { rank: '7', suit: '♣', highlight: true },
      { rank: '7', suit: '♠', highlight: true },
    ],
  },
  {
    order: 5,
    viName: 'Thùng',
    enName: 'Flush',
    desc: '5 lá bất kỳ cùng một chất (không cần liên tiếp).',
    cards: [
      { rank: 'A', suit: '♦', highlight: true },
      { rank: 'J', suit: '♦', highlight: true },
      { rank: '8', suit: '♦', highlight: true },
      { rank: '5', suit: '♦', highlight: true },
      { rank: '2', suit: '♦', highlight: true },
    ],
  },
  {
    order: 6,
    viName: 'Sảnh',
    enName: 'Straight',
    desc: '5 lá liên tiếp nhau khác chất (A-2-3-4-5 là sảnh nhỏ nhất).',
    cards: [
      { rank: '6', suit: '♣', highlight: true },
      { rank: '7', suit: '♦', highlight: true },
      { rank: '8', suit: '♥', highlight: true },
      { rank: '9', suit: '♠', highlight: true },
      { rank: '10', suit: '♣', highlight: true },
    ],
  },
  {
    order: 7,
    viName: 'Sám Cô',
    enName: 'Three of a Kind',
    desc: '3 lá cùng giá trị + 2 lá lẻ.',
    cards: [
      { rank: 'J', suit: '♠', highlight: true },
      { rank: 'J', suit: '♥', highlight: true },
      { rank: 'J', suit: '♣', highlight: true },
      { rank: '9', suit: '♦', highlight: false },
      { rank: '4', suit: '♠', highlight: false },
    ],
  },
  {
    order: 8,
    viName: 'Thú (2 Đôi)',
    enName: 'Two Pair',
    desc: '2 đôi khác nhau + 1 lá lẻ.',
    cards: [
      { rank: 'A', suit: '♠', highlight: true },
      { rank: 'A', suit: '♦', highlight: true },
      { rank: '8', suit: '♥', highlight: true },
      { rank: '8', suit: '♣', highlight: true },
      { rank: 'K', suit: '♠', highlight: false },
    ],
  },
  {
    order: 9,
    viName: 'Một Đôi',
    enName: 'One Pair',
    desc: '2 lá cùng giá trị + 3 lá lẻ.',
    cards: [
      { rank: '10', suit: '♥', highlight: true },
      { rank: '10', suit: '♣', highlight: true },
      { rank: 'A', suit: '♠', highlight: false },
      { rank: '7', suit: '♦', highlight: false },
      { rank: '3', suit: '♣', highlight: false },
    ],
  },
  {
    order: 10,
    viName: 'Mậu Thầu',
    enName: 'High Card',
    desc: 'Không ghép được bộ nào — so lá lớn nhất làm chuẩn.',
    cards: [
      { rank: 'A', suit: '♠', highlight: true },
      { rank: 'Q', suit: '♦', highlight: false },
      { rank: '9', suit: '♣', highlight: false },
      { rank: '5', suit: '♥', highlight: false },
      { rank: '2', suit: '♠', highlight: false },
    ],
  },
];

function MiniPixelCard({ card }: { card: MiniCardSpec }) {
  const isRed = card.suit === '♥' || card.suit === '♦';
  return (
    <div
      className={`flex h-12 w-9 flex-col items-center justify-between border-2 px-0.5 py-0.5 font-mono leading-none transition-transform ${
        card.highlight
          ? '-translate-y-0.5 border-border-gold bg-content-primary shadow-[2px_2px_0_rgba(0,0,0,0.75)]'
          : 'border-border-subtle bg-content-secondary/75 opacity-75'
      }`}
    >
      <span
        className={`self-start text-[10px] font-extrabold ${
          isRed ? 'text-status-danger' : 'text-content-inverse'
        }`}
      >
        {card.rank}
      </span>
      <span
        className={`text-base leading-none ${
          isRed ? 'text-status-danger' : 'text-content-inverse'
        }`}
      >
        {card.suit}
      </span>
    </div>
  );
}

const TABS = [
  { id: 'hands', label: '1. 10 BỘ BÀI' },
  { id: 'rules', label: '2. VÒNG CƯỢC & CHIP' },
  { id: 'time_via', label: '3. ĐỒNG HỒ & VÍA' },
  { id: 'items', label: '4. 5 ĐỒ VẬT' },
  { id: 'skills', label: '5. TUYỆT KỸ & PHÍM' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function GuideBookModal({ open, onClose }: GuideBookModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('hands');

  if (!open) return null;

  const currentIndex = TABS.findIndex((t) => t.id === activeTab);

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-surface-canvas/82 p-4">
      <div className="voxel-panel-gold flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden">
        {/* Book Header */}
        <div className="flex items-center justify-between border-b-2 border-border-gold bg-surface-panel px-5 py-3">
          <div className="flex items-center gap-3">
            <VoxelIcon3D kind="book" size={22} title="Sổ Tay Thần Bài" />
            <div>
              <h2 className="font-display text-base font-extrabold tracking-widest text-accent-gold">
                SỔ TAY THẦN BÀI
              </h2>
              <div className="font-mono text-[10px] text-content-muted">
                HƯỚNG DẪN TRỰC QUAN · 10 BỘ BÀI · ĐỒ VẬT · TUYỆT KỸ
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="voxel-btn border-2 border-border-subtle bg-surface-canvas px-3 py-1 font-mono text-xs font-extrabold text-content-primary hover:border-border-gold hover:text-accent-gold"
          >
            ĐÓNG [X]
          </button>
        </div>

        {/* Chapter Tabs */}
        <div className="grid grid-cols-5 border-b-2 border-border-subtle bg-surface-canvas">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border-r border-border-subtle py-2.5 font-mono text-[11px] font-extrabold transition last:border-r-0 ${
                activeTab === tab.id
                  ? 'bg-accent-gold text-content-inverse'
                  : 'text-content-secondary hover:bg-surface-elevated hover:text-accent-gold'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto bg-surface-panel/95 p-5">
          {/* TAB 1: VISUAL 10 HAND RANKINGS */}
          {activeTab === 'hands' && (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b-2 border-border-gold/50 pb-2">
                <h3 className="font-mono text-sm font-extrabold tracking-wider text-accent-gold">
                  THỨ TỰ 10 BỘ BÀI TEXAS HOLD&apos;EM (TỪ MẠNH NHẤT ĐẾN YẾU NHẤT)
                </h3>
                <span className="font-mono text-[10px] text-content-muted">
                  Ghép 5 lá mạnh nhất từ 2 lá tẩy + 5 lá chung
                </span>
              </div>

              <div className="grid gap-2.5 md:grid-cols-2">
                {HAND_RANKINGS.map((hand) => (
                  <div
                    key={hand.order}
                    className="flex items-center justify-between gap-3 border-2 border-border-subtle bg-surface-canvas/80 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="bg-accent-gold px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-content-inverse">
                          #{hand.order}
                        </span>
                        <span className="font-mono text-xs font-extrabold text-accent-gold">
                          {hand.viName}
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-content-muted">
                        {hand.enName}
                      </div>
                      <p className="mt-1 text-[11px] leading-snug text-content-secondary">
                        {hand.desc}
                      </p>
                    </div>

                    {/* Visual 5-Card Voxel Hand */}
                    <div className="flex shrink-0 gap-1">
                      {hand.cards.map((c, idx) => (
                        <MiniPixelCard key={idx} card={c} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: BETTING ROUNDS & 4-COLOR CHIPS */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <h3 className="border-b-2 border-border-gold/50 pb-2 font-mono text-sm font-extrabold text-accent-gold">
                DIỄN BIẾN 1 VÁN BÀI &amp; MỆNH GIÁ 4 MÀU CHIP
              </h3>

              {/* Visual 5-Stage Flow */}
              <div className="grid grid-cols-5 gap-2 text-center font-mono">
                {[
                  { step: '1. PRE-FLOP', detail: 'Chia 2 lá tẩy' },
                  { step: '2. FLOP', detail: 'Lật 3 lá chung' },
                  { step: '3. TURN', detail: 'Lật lá thứ 4' },
                  { step: '4. RIVER', detail: 'Lật lá thứ 5' },
                  { step: '5. SHOWDOWN', detail: 'So bài ăn Pot' },
                ].map((s) => (
                  <div key={s.step} className="border-2 border-border-subtle bg-surface-canvas p-2.5">
                    <div className="text-[11px] font-extrabold text-accent-gold">{s.step}</div>
                    <div className="mt-1 text-[10px] text-content-secondary">{s.detail}</div>
                  </div>
                ))}
              </div>

              {/* Visual 4-Color Chip Denomination Legend */}
              <div className="border-2 border-border-subtle bg-surface-canvas/80 p-4">
                <div className="font-mono text-xs font-extrabold text-content-primary">
                  BẢNG MÀU CHỒNG CHIP TRÊN BÀN
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {[
                    { name: 'CHIP ĐEN VÀNG', value: '25,000', cls: 'bg-surface-canvas' },
                    { name: 'CHIP TÍM', value: '5,000', cls: 'bg-purple-600' },
                    { name: 'CHIP VÀNG', value: '1,000', cls: 'bg-accent-gold' },
                    { name: 'CHIP ĐỎ', value: '500', cls: 'bg-status-danger' },
                    { name: 'CHIP XANH DƯƠNG', value: '100', cls: 'bg-accent-via' },
                    { name: 'CHIP XANH LÁ', value: '25', cls: 'bg-accent-jade' },
                  ].map((chip) => (
                    <div
                      key={chip.name}
                      className="flex items-center gap-2.5 border border-border-subtle bg-surface-panel p-2.5"
                    >
                      <div className="flex flex-col gap-[2px]">
                        <span className={`block h-2 w-7 border-x-2 border-t border-content-primary ${chip.cls}`} />
                        <span className={`block h-2 w-7 border-x-2 border-t border-content-primary ${chip.cls}`} />
                        <span className={`block h-2 w-7 border-x-2 border-t border-content-primary ${chip.cls}`} />
                      </div>
                      <div className="font-mono">
                        <div className="text-[10px] text-content-muted">{chip.name}</div>
                        <div className="text-sm font-extrabold text-content-primary">
                          {chip.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-l-4 border-accent-gold bg-surface-canvas/70 px-4 py-3 text-xs text-content-secondary">
                <span className="font-mono font-extrabold text-content-primary">
                  SIDE POT &amp; LƯU TRỮ:
                </span>{' '}
                Hệ thống tự chia Main Pot / Side Pot khi có người ít chip đi All-In. Kết thúc trận,{' '}
                <strong className="text-accent-gold">CHỈ CÓ SỐ CHIP</strong> được lưu vĩnh viễn vào
                tài khoản của bạn!
              </div>
            </div>
          )}

          {/* TAB 3: TIME BANK CLOCK & VIA */}
          {activeTab === 'time_via' && (
            <div className="space-y-4">
              <h3 className="border-b-2 border-border-gold/50 pb-2 font-mono text-sm font-extrabold text-accent-gold">
                ĐỒNG HỒ QUỸ THỜI GIAN &amp; NĂNG LƯỢNG VÍA
              </h3>

              <div className="border-l-4 border-accent-gold bg-surface-canvas/75 px-4 py-3">
                <div className="font-mono text-xs font-extrabold text-accent-gold">
                  ĐỒNG HỒ BÀN (05:00 TỔNG · 20 GIÂY/LƯỢT)
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-content-secondary">
                  Mỗi người có 300 giây (05:00) cho cả trận và tối đa 20 giây mỗi lượt. Nút đồng hồ
                  chỉ nhấn xuống và đếm ngược khi <strong>đến lượt bạn</strong> hoặc khi bạn mở{' '}
                  <strong>Điện Thoại / Mini-game</strong>. Mỗi ván mới được hồi nhẹ +15 giây. Cạn
                  sạch 00:00 sẽ tự động Bỏ bài và bị loại (TIME_OUT).
                </p>
              </div>

              <div className="border-l-4 border-accent-via bg-surface-canvas/75 px-4 py-3">
                <div className="flex items-center gap-2 font-mono text-xs font-extrabold text-accent-via">
                  <VoxelIcon3D kind="via" size={16} />
                  NĂNG LƯỢNG VÍA (0 - 100)
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-content-secondary">
                  Khởi đầu với 30 Vía. Tự hồi <strong>+10 Vía</strong> sau mỗi vòng cược và{' '}
                  <strong>+20 Vía</strong> khi thắng ván. Đặc biệt:{' '}
                  <strong className="text-accent-gold">
                    thắng 3 ván liên tiếp sẽ được thưởng nóng +50% số Chip hiện có và +30 Vía!
                  </strong>
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: 5 EVERYDAY ITEMS */}
          {activeTab === 'items' && (
            <div className="space-y-3">
              <h3 className="border-b-2 border-border-gold/50 pb-2 font-mono text-sm font-extrabold text-accent-gold">
                5 ĐỒ VẬT QUEN THUỘC (MỖI 3 VÁN THẮNG TẶNG 1 MÓN)
              </h3>

              <div className="border-2 border-accent-jade bg-accent-jade/10 px-4 py-2.5 text-xs text-content-primary">
                <strong>Quy tắc nhận đồ:</strong> Mỗi trận mới bàn bắt đầu trống. Cứ thắng đủ{' '}
                <strong>3 ván trong bàn</strong>, hệ thống tặng ngẫu nhiên 1 món chưa có đặt ngay lên
                góc bàn của bạn (chỉ dùng trong trận đó; đủ 5 món thưởng +500 Chip).
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {[
                  {
                    icon: 'phone' as const,
                    name: '1. CHIẾC ĐIỆN THOẠI',
                    tag: 'VAY NÓNG',
                    desc: 'Vay gấp +2.000 / +5.000 Chip hoặc mua +60s thời gian. Lãi +15%/ván. Quá 3 ván không trả -> Anh Chủ Nợ gọi đòi nợ (+20% độ khó Mini-game). Vỡ nợ -> khóa 1 đồ vật 2 ván.',
                  },
                  {
                    icon: 'incense' as const,
                    name: '2. BÁT HƯƠNG MINI',
                    tag: '20 VÍA · HỒI 2 VÁN',
                    desc: 'Thắp nhang tạo khói trắng: nới rộng vùng xanh Mini-game +20% và tăng nhẹ vận may bốc bài trong ván.',
                  },
                  {
                    icon: 'mango' as const,
                    name: '3. QUẢ XOÀI MAY MẮN',
                    tag: '2 LẦN / TRẬN',
                    desc: 'Xóa ngay debuff Áp Lực / Đòi Nợ trong ván và bật Khiên Xoài tự động chặn 1 lần bị Lộ Tẩy.',
                  },
                  {
                    icon: 'tea' as const,
                    name: '4. LY TRÀ ĐÁ',
                    tag: 'HỒI 2 VÁN',
                    desc: 'Cộng ngay +20 giây vào đồng hồ cá nhân và làm chậm tốc độ Mini-game 15% ở lượt hiện tại.',
                  },
                  {
                    icon: 'coin' as const,
                    name: '5. ĐỒNG XU HỘ MỆNH',
                    tag: 'BỊ ĐỘNG',
                    desc: 'Tự kích hoạt khi bạn thua All-In với tỉ lệ thắng ban đầu < 25%, hoàn lại 15% số chip đã cược.',
                  },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="flex items-start gap-3 border-2 border-border-subtle bg-surface-canvas/80 p-3"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-border-subtle bg-surface-panel">
                      <VoxelIcon3D kind={item.icon} size={28} title={item.name} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1 font-mono">
                        <span className="text-xs font-extrabold text-accent-gold">{item.name}</span>
                        <span className="border border-border-subtle bg-surface-panel px-1.5 py-0.5 text-[9px] font-bold text-accent-via">
                          {item.tag}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-content-secondary">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: 3 SKILLS & CONTROLS */}
          {activeTab === 'skills' && (
            <div className="space-y-4">
              <h3 className="border-b-2 border-border-gold/50 pb-2 font-mono text-sm font-extrabold text-accent-gold">
                3 TUYỆT KỸ THẦN BÀI &amp; PHÍM TẮT
              </h3>

              <div className="space-y-2.5">
                {[
                  {
                    icon: 'sleight' as const,
                    name: 'TRÁO BÀI TAY ÁO · 30 VÍA (TIMING BAR)',
                    desc: 'Chọn 1 lá bài tẩy. Bấm Space / click khi kim chạy vào vùng xanh để tráo lấy lá mới từ bộ bài.',
                  },
                  {
                    icon: 'eagle' as const,
                    name: 'TÂM NHÃN ĐỌC VỊ · 50 VÍA (BALANCE)',
                    desc: 'Giữ chuột hoặc phím Space giữ khối sáng trong ô chuẩn suốt 2.5 giây. Thành công sẽ nhìn trộm lá bài sắp lật trong 4 giây (chỉ mình bạn thấy).',
                  },
                  {
                    icon: 'pressure' as const,
                    name: 'TỎA KHÍ THẾ · 25 VÍA (RHYTHM TAP)',
                    desc: 'Chọn 1 đối thủ. Bấm Space đúng tối thiểu 2/3 nhịp thu khung để trừ 10 giây đồng hồ của họ và gắn Áp Lực.',
                  },
                ].map((s) => (
                  <div
                    key={s.name}
                    className="flex items-start gap-3 border-2 border-border-subtle bg-surface-canvas/80 p-3"
                  >
                    <VoxelIcon3D kind={s.icon} size={20} />
                    <div>
                      <div className="font-mono text-xs font-extrabold text-accent-gold">
                        {s.name}
                      </div>
                      <p className="mt-1 text-[11px] text-content-secondary">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-l-4 border-status-danger bg-status-danger/10 px-4 py-3 text-xs text-content-secondary">
                <strong className="font-mono text-status-danger">HÌNH PHẠT LỘ TẨY:</strong> Mini-game
                trượt hoặc quá 6 giây sẽ lật ngửa công khai 1 lá bài tẩy của bạn (trừ khi có Khiên
                Quả Xoài). Mỗi lần dùng đều cộng EXP tăng cấp Lv.1 → Lv.10 trong trận giúp Mini-game
                dễ hơn!
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="border border-border-subtle bg-surface-canvas p-2.5">
                  <span className="text-accent-gold">[SPACE]</span> Thao tác nhanh trong Mini-Game
                </div>
                <div className="border border-border-subtle bg-surface-canvas p-2.5">
                  <span className="text-accent-gold">[F3]</span> Bật/tắt bảng FPS, Ping &amp; Server
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Book Footer Navigation */}
        <div className="flex items-center justify-between border-t-2 border-border-subtle bg-surface-canvas px-5 py-2.5 font-mono text-xs">
          <button
            type="button"
            disabled={currentIndex <= 0}
            onClick={() => setActiveTab(TABS[currentIndex - 1].id)}
            className="voxel-btn border border-border-subtle bg-surface-panel px-3 py-1 font-bold text-content-primary disabled:opacity-35"
          >
            &lt; TRANG TRƯỚC
          </button>
          <span className="text-content-muted">
            TRANG {currentIndex + 1} / {TABS.length}
          </span>
          <button
            type="button"
            disabled={currentIndex >= TABS.length - 1}
            onClick={() => setActiveTab(TABS[currentIndex + 1].id)}
            className="voxel-btn border border-border-gold bg-accent-gold px-3 py-1 font-extrabold text-content-inverse disabled:opacity-35"
          >
            TRANG SAU &gt;
          </button>
        </div>
      </div>
    </div>
  );
}
