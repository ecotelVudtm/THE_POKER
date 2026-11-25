import { useEffect, useRef, useState } from 'react';
import { soundEngine } from '../../services/soundEngine';
import { VoxelIcon3D } from '../VoxelIcon3D';
import { PixelSuitIcon, suitCharToSuit } from '../PixelSuitIcon';

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
    desc: '10 - J - Q - K - A cùng một chất. Tay bài mạnh tuyệt đối.',
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
    desc: '5 lá liên tiếp khác chất (A-2-3-4-5 là sảnh nhỏ nhất).',
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

function BookMiniCard({ card }: { card: MiniCardSpec }) {
  const isRed = card.suit === '♥' || card.suit === '♦';
  const suitEnum = suitCharToSuit(card.suit) ?? 'SPADES';
  return (
    <div
      className={`flex h-11 w-8 flex-col items-center justify-between border px-0.5 py-0.5 font-mono leading-none ${
        card.highlight
          ? 'border-surface-wood bg-content-primary shadow-[1px_1px_0_rgba(0,0,0,0.35)]'
          : 'border-surface-wood/30 bg-content-secondary/40 opacity-65'
      }`}
    >
      <span
        className={`self-start text-[9px] font-extrabold ${
          isRed ? 'text-status-danger' : 'text-content-inverse'
        }`}
      >
        {card.rank}
      </span>
      <span className="mb-0.5 flex items-center justify-center">
        <PixelSuitIcon
          suit={suitEnum}
          size={12}
          className={isRed ? 'text-status-danger' : 'text-content-inverse'}
        />
      </span>
    </div>
  );
}

const SPREADS = [
  { id: 'hands', label: 'I. 10 BỘ BÀI' },
  { id: 'rules', label: 'II. CƯỢC & SỚI' },
  { id: 'time_via', label: 'III. GIỜ & VÍA' },
  { id: 'items', label: 'IV. 5 ĐỒ VẬT' },
  { id: 'skills', label: 'V. 6 LÁ PHÉP' },
] as const;

type SpreadId = (typeof SPREADS)[number]['id'];

function renderLeftPageBody(spread: SpreadId) {
  if (spread === 'hands') {
    return (
      <div>
        <h2 className="border-b-2 border-surface-wood/30 pb-2 font-display text-base font-extrabold tracking-widest text-surface-wood">
          CHƯƠNG I · BỘ BÀI MẠNH (1–5)
        </h2>
        <p className="mt-1.5 text-[11px] italic text-content-inverse/70">
          Ghép 5 lá mạnh nhất từ 2 lá tẩy và 5 lá chung trên bàn.
        </p>
        <div className="mt-3 divide-y divide-surface-wood/20">
          {HAND_RANKINGS.slice(0, 5).map((hand) => (
            <div key={hand.order} className="flex items-center justify-between gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs font-extrabold text-content-inverse">
                  {hand.order}. {hand.viName}{' '}
                  <span className="font-normal text-content-inverse/60">({hand.enName})</span>
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-content-inverse/75">
                  {hand.desc}
                </p>
              </div>
              <div className="flex shrink-0 gap-0.5">
                {hand.cards.map((c, idx) => (
                  <BookMiniCard key={idx} card={c} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (spread === 'rules') {
    return (
      <div className="space-y-4">
        <h2 className="border-b-2 border-surface-wood/30 pb-2 font-display text-base font-extrabold tracking-widest text-surface-wood">
          CHƯƠNG II · VÒNG CƯỢC &amp; MỨC SỚI
        </h2>
        <div className="space-y-2 text-xs leading-relaxed text-content-inverse/85">
          <p>
            <strong>1. Pre-Flop:</strong> Mỗi người nhận 2 lá bài tẩy bí mật. Hai người sau Dealer
            đặt mù nhỏ (SB) và mù lớn (BB).
          </p>
          <p>
            <strong>2. Flop:</strong> Lật 3 lá bài chung đầu tiên giữa bàn.
          </p>
          <p>
            <strong>3. Turn:</strong> Lật lá bài chung thứ 4.
          </p>
          <p>
            <strong>4. River:</strong> Lật lá bài chung cuối cùng (thứ 5).
          </p>
          <p>
            <strong>5. Showdown:</strong> Những người còn lại lật bài so tay mạnh nhất ăn Pot (tự
            động chia Side Pot khi có người All-In).
          </p>
        </div>
        <div className="border-t border-surface-wood/25 pt-3">
          <div className="font-mono text-xs font-extrabold text-surface-wood">
            8 MỨC SỚI (MANG TỐI ĐA · SB / BB)
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] text-content-inverse/85">
            <div>• 500 — 10 / 20</div>
            <div>• 50K — 1,000 / 2,000</div>
            <div>• 1K — 20 / 40</div>
            <div>• 100K — 2,000 / 4,000</div>
            <div>• 5K — 100 / 200</div>
            <div>• 500K — 10K / 20K</div>
            <div>• 10K — 200 / 400</div>
            <div>• 1TR — 20K / 40K</div>
          </div>
        </div>
      </div>
    );
  }

  if (spread === 'time_via') {
    return (
      <div className="space-y-4">
        <h2 className="border-b-2 border-surface-wood/30 pb-2 font-display text-base font-extrabold tracking-widest text-surface-wood">
          CHƯƠNG III · ĐỒNG HỒ BÀN CHƠI
        </h2>
        <div className="space-y-3 text-xs leading-relaxed text-content-inverse/85">
          <p>
            Mỗi ván chơi bạn được cấp quỹ thời gian <strong>03:00 (3 phút)</strong> và giới hạn{' '}
            <strong>20 giây mỗi lượt đi</strong>.
          </p>
          <p>
            Đồng hồ chỉ chạy khi đến lượt bạn, hoặc khi bạn đang mở Điện Thoại / chơi Mini-game
            tuyệt kỹ. Qua ván mới quỹ thời gian tự động hồi đầy lại <strong>03:00</strong>.
          </p>
          <p className="border-l-2 border-surface-wood pl-3 italic">
            Cứu nguy giờ chót: Nếu cạn sạch 00:00 mà bạn đang có <strong>Ly Trà Đá</strong>, ly sẽ
            tự động vỡ để tặng thêm <strong>+30 giây</strong>!
          </p>
        </div>
      </div>
    );
  }

  if (spread === 'items') {
    return (
      <div>
        <h2 className="border-b-2 border-surface-wood/30 pb-2 font-display text-base font-extrabold tracking-widest text-surface-wood">
          CHƯƠNG IV · ĐỒ VẬT (1–3)
        </h2>
        <p className="mt-1.5 text-[11px] italic text-content-inverse/70">
          Thắng mỗi 3 ván được tặng 1 món (tối đa 3 món trên bàn). Bấm vào đồ để Sử dụng hoặc Ném
          thùng rác.
        </p>
        <div className="mt-3 divide-y divide-surface-wood/20">
          {[
            {
              icon: 'incense' as const,
              name: '1. Bát Hương Mini',
              note: '1–5 nén · 100 Vía/nén',
              desc: 'Sẵn 1 nén (80% Đôi). Nén 2→5: 70% 2 Đôi → 60% Tam → 50% Sảnh → 40% Thùng (cấp thấp +2% mỗi lần thắp, max 100%). 4 lượt không thắp hương cháy hết.',
            },
            {
              icon: 'mango' as const,
              name: '2. Quả Xoài May Mắn',
              note: 'Bị động · 2 lần',
              desc: 'Tự động đỡ hộ mỗi khi bạn trượt Mini-game bị Lộ Tẩy (tự trừ 1 lần, dùng hết 2 lần sẽ biến mất).',
            },
            {
              icon: 'tea' as const,
              name: '3. Ly Trà Đá',
              note: '3 ngụm · 1 lần/vòng',
              desc: 'Mỗi lần uống +20 giây lượt & quỹ giờ. Nếu cạn 00:00 sẽ tự vỡ cứu nguy +30 giây.',
            },
          ].map((item) => (
            <div key={item.name} className="flex items-start gap-3 py-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-surface-wood/30 bg-surface-canvas/90">
                <VoxelIcon3D kind={item.icon} size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs font-extrabold text-content-inverse">
                  {item.name}{' '}
                  <span className="font-normal text-surface-wood">· {item.note}</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-content-inverse/80">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="border-b-2 border-surface-wood/30 pb-2 font-display text-base font-extrabold tracking-widest text-surface-wood">
        CHƯƠNG V · LÁ PHÉP (1–3)
      </h2>
      <p className="mt-1.5 text-[11px] italic text-content-inverse/70">
        Mua cộng dồn lượt dùng ở Cửa Hàng ngoài sảnh. Mang tối đa 3 lá phép mỗi trận.
      </p>
      <div className="mt-3 divide-y divide-surface-wood/20">
        {[
          {
            art: '/assets/spells/sleight_of_hand.jpg',
            name: '1. Tráo Bài Tay Áo',
            cost: '35 Vía · 500 Chip · Timing Bar',
            desc: 'Đổi 1 lá bài tẩy chưa bị lộ lấy lá mới từ bộ bài (hưởng vận may Bát Hương).',
          },
          {
            art: '/assets/spells/eagle_eye.jpg',
            name: '2. Tâm Nhãn Đọc Vị',
            cost: '30 Vía · 800 Chip · Bám Ô',
            desc: 'Giữ chuột bám sát ô di chuyển 2.5s để nhìn trộm lá chung sắp lật trong 4 giây.',
          },
          {
            art: '/assets/spells/pressure_aura.jpg',
            name: '3. Tỏa Khí Thế',
            cost: '20 Vía · 400 Chip · Rhythm Tap',
            desc: 'Chọn 1 đối thủ, bấm chuẩn 2/3 nhịp để trừ 10 giây đồng hồ và gắn Áp Lực.',
          },
        ].map((s) => (
          <div key={s.name} className="flex items-start gap-3 py-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden border border-surface-wood/40 bg-surface-canvas">
              <img
                src={s.art}
                alt={s.name}
                draggable={false}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-xs font-extrabold text-content-inverse">{s.name}</div>
              <div className="font-mono text-[10px] font-bold text-surface-wood">{s.cost}</div>
              <p className="mt-1 text-[11px] leading-snug text-content-inverse/80">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderRightPageBody(spread: SpreadId) {
  if (spread === 'hands') {
    return (
      <div>
        <h2 className="border-b-2 border-surface-wood/30 pb-2 font-display text-base font-extrabold tracking-widest text-surface-wood">
          BỘ BÀI PHỔ THÔNG (6–10)
        </h2>
        <p className="mt-1.5 text-[11px] italic text-content-inverse/70">
          Khi trùng bộ bài, người có lá phụ (kicker) cao hơn sẽ thắng.
        </p>
        <div className="mt-3 divide-y divide-surface-wood/20">
          {HAND_RANKINGS.slice(5, 10).map((hand) => (
            <div key={hand.order} className="flex items-center justify-between gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs font-extrabold text-content-inverse">
                  {hand.order}. {hand.viName}{' '}
                  <span className="font-normal text-content-inverse/60">({hand.enName})</span>
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-content-inverse/75">
                  {hand.desc}
                </p>
              </div>
              <div className="flex shrink-0 gap-0.5">
                {hand.cards.map((c, idx) => (
                  <BookMiniCard key={idx} card={c} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (spread === 'rules') {
    return (
      <div className="space-y-4">
        <h2 className="border-b-2 border-surface-wood/30 pb-2 font-display text-base font-extrabold tracking-widest text-surface-wood">
          MỆNH GIÁ 6 MÀU CHIP
        </h2>
        <div className="divide-y divide-surface-wood/20 font-mono text-xs">
          {[
            { name: 'Chip Đen Vàng', value: '25,000', cls: 'bg-surface-canvas' },
            { name: 'Chip Tím', value: '5,000', cls: 'bg-accent-purple' },
            { name: 'Chip Vàng', value: '1,000', cls: 'bg-accent-gold' },
            { name: 'Chip Đỏ', value: '500', cls: 'bg-status-danger' },
            { name: 'Chip Xanh Dương', value: '100', cls: 'bg-accent-via' },
            { name: 'Chip Xanh Lá', value: '25', cls: 'bg-accent-jade' },
          ].map((chip) => (
            <div key={chip.name} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-block h-3.5 w-7 border border-content-inverse ${chip.cls}`}
                />
                <span className="font-bold text-content-inverse">{chip.name}</span>
              </div>
              <span className="font-extrabold text-surface-wood">{chip.value}</span>
            </div>
          ))}
        </div>
        <p className="border-l-2 border-surface-wood pl-3 text-xs leading-relaxed text-content-inverse/80">
          Số chip dư vượt quá mức sới vẫn được giữ an toàn trong tài khoản ngoài sảnh. Thắng/thua
          mỗi ván chỉ cộng trừ đúng phần chênh lệch!
        </p>
      </div>
    );
  }

  if (spread === 'time_via') {
    return (
      <div className="space-y-4">
        <h2 className="border-b-2 border-surface-wood/30 pb-2 font-display text-base font-extrabold tracking-widest text-surface-wood">
          NĂNG LƯỢNG VÍA &amp; CHUỖI THẮNG
        </h2>
        <div className="space-y-3 text-xs leading-relaxed text-content-inverse/85">
          <p>
            <strong>Vía (0–100):</strong> Khởi đầu trận với <strong>30 Vía</strong>. Nếu đang có{' '}
            <strong>Bát Mì Tôm</strong> trên bàn, giới hạn Vía tối đa tăng lên <strong>120</strong>.
          </p>
          <ul className="list-disc space-y-1 pl-4">
            <li>
              <strong>Qua mỗi vòng cược</strong> (còn theo bài): <strong>+10 Vía</strong>.
            </li>
            <li>
              <strong>Thắng ván bài:</strong> <strong>+20 Vía</strong>.
            </li>
            <li>
              <strong>Bỏ bài (Fold):</strong> <strong>+5 Vía</strong>.
            </li>
            <li>
              <strong>Tố bài (Raise):</strong> <strong>+5 Vía</strong> mỗi lần tố thêm ít nhất bằng
              mức Small Blind.
            </li>
            <li>
              <strong>Chuỗi 3 ván thắng liên tiếp:</strong> thưởng ngay <strong>+50 Vía</strong>!
            </li>
          </ul>
          <p className="border-l-2 border-surface-wood pl-3 italic">
            Mẹo: Dùng Vía linh hoạt để kích hoạt các Lá Phép hoặc tích đủ 100 Vía thắp thêm nén
            nhang cầu may cho kỹ năng Tráo Bài.
          </p>
        </div>
      </div>
    );
  }

  if (spread === 'items') {
    return (
      <div>
        <h2 className="border-b-2 border-surface-wood/30 pb-2 font-display text-base font-extrabold tracking-widest text-surface-wood">
          ĐỒ VẬT (4–5) &amp; VAY NGOÀI SẢNH
        </h2>
        <p className="mt-1.5 text-[11px] italic text-content-inverse/70">
          Mỗi món chỉ có 1 công dụng duy nhất — bàn đủ 3 món thưởng nóng +500 Chip.
        </p>
        <div className="mt-3 divide-y divide-surface-wood/20">
          {[
            {
              icon: 'coin' as const,
              name: '4. Đồng Xu Hộ Mệnh',
              note: 'Bị động',
              desc: 'Tự kích hoạt khi thua All-In với tỉ lệ thắng ban đầu < 25%, hoàn lại 15% số chip cược.',
            },
            {
              icon: 'noodles' as const,
              name: '5. Bát Mì Tôm',
              note: '3 miếng · Max Vía 120',
              desc: 'Nâng Max Vía lên 120 khi còn trên bàn. Mỗi lần thắng ăn 1 miếng, ăn hết 3 lần sẽ biến mất.',
            },
            {
              icon: 'phone' as const,
              name: 'Điện Thoại (Chỉ ngoài Sảnh)',
              note: 'Vay & Trả Nợ',
              desc: 'Bấm mục Vay Nóng ở góc trên sảnh để vay nóng 2K / 5K / 10K Chip hoặc trả khoản vay lưu trong tài khoản.',
            },
          ].map((item) => (
            <div key={item.name} className="flex items-start gap-3 py-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-surface-wood/30 bg-surface-canvas/90">
                <VoxelIcon3D kind={item.icon} size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs font-extrabold text-content-inverse">
                  {item.name}{' '}
                  <span className="font-normal text-surface-wood">· {item.note}</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-content-inverse/80">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="border-b-2 border-surface-wood/30 pb-2 font-display text-base font-extrabold tracking-widest text-surface-wood">
        LÁ PHÉP (4–6) &amp; PHÍM TẮT
      </h2>
      <div className="mt-2 divide-y divide-surface-wood/20">
        {[
          {
            art: '/assets/spells/via_siphon.jpg',
            name: '4. Hút Vía Đối Thủ',
            cost: '20 Vía · 350 Chip · Timing Bar',
            desc: 'Hút tối đa 25 Vía của 1 đối thủ và hồi ít nhất +15 Vía cho bản thân.',
          },
          {
            art: '/assets/spells/time_freeze.jpg',
            name: '5. Ngưng Đọng Thời Gian',
            cost: '25 Vía · 400 Chip · Bám Ô',
            desc: 'Cộng +15 giây quỹ thời gian và +10 giây cho lượt đi hiện tại.',
          },
          {
            art: '/assets/spells/poker_face.jpg',
            name: '6. Mặt Lạnh Tĩnh Tâm',
            cost: '20 Vía · 350 Chip · Rhythm Tap',
            desc: 'Xóa Áp Lực và úp lại 1 lá bị Lộ Tẩy (hoặc bật Khiên chống Lộ Tẩy).',
          },
        ].map((s) => (
          <div key={s.name} className="flex items-start gap-3 py-2.5">
            <div className="h-12 w-12 shrink-0 overflow-hidden border border-surface-wood/40 bg-surface-canvas">
              <img
                src={s.art}
                alt={s.name}
                draggable={false}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-xs font-extrabold text-content-inverse">{s.name}</div>
              <div className="font-mono text-[10px] font-bold text-surface-wood">{s.cost}</div>
              <p className="mt-0.5 text-[11px] leading-snug text-content-inverse/80">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 border-t border-surface-wood/25 pt-2.5 text-[11px] leading-relaxed text-content-inverse/80">
        <strong className="text-status-danger">Lộ Tẩy:</strong> Trượt Mini-game hoặc quá 6 giây sẽ
        lật ngửa 1 lá tẩy (lá đã lộ không thể Tráo Bài).
        <div className="mt-1.5 font-mono text-[10px] text-surface-wood">
          <strong>[SPACE]</strong> Mini-game · <strong>[F3]</strong> Bảng FPS &amp; Ping
        </div>
      </div>
    </div>
  );
}

export function GuideBookModal({ open, onClose }: GuideBookModalProps) {
  const [activeSpread, setActiveSpread] = useState<SpreadId>('hands');
  const [flipState, setFlipState] = useState<{
    from: SpreadId;
    to: SpreadId;
    dir: 'forward' | 'backward';
    key: number;
  } | null>(null);
  const flipTimerRef = useRef<number | null>(null);
  const flipSeqRef = useRef<number>(1);

  useEffect(() => {
    return () => {
      if (flipTimerRef.current !== null) {
        window.clearTimeout(flipTimerRef.current);
      }
    };
  }, []);

  if (!open) return null;

  const currentTargetSpread = flipState ? flipState.to : activeSpread;
  const spreadIndex = SPREADS.findIndex((s) => s.id === currentTargetSpread);

  // Determine exact static base pages underneath the 3D turning parchment sheet
  const baseLeftSpread = flipState
    ? flipState.dir === 'forward'
      ? flipState.from
      : flipState.to
    : activeSpread;
  const baseRightSpread = flipState
    ? flipState.dir === 'forward'
      ? flipState.to
      : flipState.from
    : activeSpread;

  const baseLeftIdx = SPREADS.findIndex((s) => s.id === baseLeftSpread);
  const baseRightIdx = SPREADS.findIndex((s) => s.id === baseRightSpread);

  const goToSpread = (id: SpreadId) => {
    const originSpread = flipState ? flipState.to : activeSpread;
    if (id === originSpread) return;

    const fromIdx = SPREADS.findIndex((s) => s.id === originSpread);
    const toIdx = SPREADS.findIndex((s) => s.id === id);
    const dir: 'forward' | 'backward' = toIdx > fromIdx ? 'forward' : 'backward';

    if (flipTimerRef.current !== null) {
      window.clearTimeout(flipTimerRef.current);
    }

    soundEngine.playBookOpen();
    setActiveSpread(originSpread);
    setFlipState({ from: originSpread, to: id, dir, key: flipSeqRef.current++ });

    flipTimerRef.current = window.setTimeout(() => {
      setActiveSpread(id);
      setFlipState(null);
      flipTimerRef.current = null;
    }, 445);
  };

  return (
    <div
      onClick={onClose}
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-surface-canvas/85 p-4"
    >
      {/* Open Leather-Bound Book Container (fixed uniform book height on every spread!) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[82vh] max-h-[650px] min-h-[480px] w-full max-w-5xl flex-col"
      >
        {/* Top Ribbon Bookmarks sticking out from the top of the book */}
        <div className="flex items-end justify-between px-4">
          <div className="flex gap-1">
            {SPREADS.map((s) => {
              const isActive = currentTargetSpread === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToSpread(s.id)}
                  className={`border-x-2 border-t-2 px-3 py-1.5 font-mono text-[11px] font-extrabold tracking-wider transition ${
                    isActive
                      ? 'border-border-gold bg-content-primary text-content-inverse'
                      : 'border-border-gold/50 bg-surface-wood text-content-secondary hover:bg-surface-elevated hover:text-accent-gold'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="border-x-2 border-t-2 border-border-gold bg-surface-wood px-3.5 py-1.5 font-mono text-[11px] font-extrabold text-accent-gold hover:bg-accent-gold hover:text-content-inverse"
          >
            GẤP SÁCH [X]
          </button>
        </div>

        {/* Leather Hardcover Outer Binding */}
        <div className="flex flex-1 overflow-hidden border-4 border-border-gold bg-surface-wood p-2.5 shadow-[8px_10px_0_rgba(0,0,0,0.85)]">
          {/* Open 2-Page 3D Parchment Spread (identical page heights & widths!) */}
          <div className="book-spread-stage relative grid flex-1 grid-cols-1 overflow-hidden border-2 border-surface-wood bg-content-primary text-content-inverse md:grid-cols-2">
            {/* ==================== STATIC LEFT PAGE ==================== */}
            <div className="flex h-full flex-col overflow-hidden border-b-2 border-surface-wood/30 md:border-b-0 md:border-r-4 md:border-surface-wood/35">
              <div className="flex-1 overflow-y-auto px-7 py-6">
                {renderLeftPageBody(baseLeftSpread)}
              </div>

              {/* Left Page Footer */}
              <div className="flex items-center justify-between border-t border-surface-wood/20 px-7 py-2.5 font-mono text-[11px] text-content-inverse/65">
                <button
                  type="button"
                  disabled={spreadIndex <= 0}
                  onClick={() => goToSpread(SPREADS[spreadIndex - 1].id)}
                  className="font-extrabold text-surface-wood hover:underline disabled:cursor-not-allowed disabled:opacity-30"
                >
                  &lt; LẬT TRANG TRƯỚC
                </button>
                <span>Trang {baseLeftIdx * 2 + 1}</span>
              </div>
            </div>

            {/* ==================== STATIC RIGHT PAGE ==================== */}
            <div className="flex h-full flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-7 py-6">
                {renderRightPageBody(baseRightSpread)}
              </div>

              {/* Right Page Footer */}
              <div className="flex items-center justify-between border-t border-surface-wood/20 px-7 py-2.5 font-mono text-[11px] text-content-inverse/65">
                <span>Trang {baseRightIdx * 2 + 2}</span>
                <button
                  type="button"
                  disabled={spreadIndex >= SPREADS.length - 1}
                  onClick={() => goToSpread(SPREADS[spreadIndex + 1].id)}
                  className="font-extrabold text-surface-wood hover:underline disabled:cursor-not-allowed disabled:opacity-30"
                >
                  LẬT TRANG SAU &gt;
                </button>
              </div>
            </div>

            {/* ==================== REAL 3D TWO-SIDED TURNING PARCHMENT SHEET ==================== */}
            {flipState && (
              <div
                key={flipState.key}
                className={`book-flip-sheet pointer-events-none absolute inset-y-0 z-30 hidden w-1/2 md:block ${
                  flipState.dir === 'forward'
                    ? 'left-1/2 book-flip-forward'
                    : 'left-0 book-flip-backward'
                }`}
              >
                {/* Front Face (outgoing page lifting off the book) */}
                <div className="book-flip-face absolute inset-0 flex flex-col overflow-hidden border-x border-surface-wood/35 bg-content-primary">
                  <div className="flex-1 overflow-hidden px-7 py-6">
                    {flipState.dir === 'forward'
                      ? renderRightPageBody(flipState.from)
                      : renderLeftPageBody(flipState.from)}
                  </div>
                  <div className="flex items-center justify-between border-t border-surface-wood/20 px-7 py-2.5 font-mono text-[11px] text-content-inverse/65">
                    <span>
                      Trang{' '}
                      {SPREADS.findIndex((s) => s.id === flipState.from) * 2 +
                        (flipState.dir === 'forward' ? 2 : 1)}
                    </span>
                  </div>
                </div>

                {/* Back Face (incoming page landing flat on the opposite side of the spine!) */}
                <div className="book-flip-face-back absolute inset-0 flex flex-col overflow-hidden border-x border-surface-wood/35 bg-content-primary">
                  <div className="flex-1 overflow-hidden px-7 py-6">
                    {flipState.dir === 'forward'
                      ? renderLeftPageBody(flipState.to)
                      : renderRightPageBody(flipState.to)}
                  </div>
                  <div className="flex items-center justify-between border-t border-surface-wood/20 px-7 py-2.5 font-mono text-[11px] text-content-inverse/65">
                    <span>
                      Trang{' '}
                      {SPREADS.findIndex((s) => s.id === flipState.to) * 2 +
                        (flipState.dir === 'forward' ? 1 : 2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
