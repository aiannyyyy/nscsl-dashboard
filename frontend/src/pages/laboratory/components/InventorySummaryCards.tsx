import React from 'react';
import { FlaskConical, Droplets, TriangleAlert, ShoppingCart } from 'lucide-react';

const cards = [
  {
    Icon: FlaskConical,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    badge: '↑ 12% vs yesterday',
    badgeBg: 'bg-green-50 text-green-600',
    label: 'Supplies used today',
    value: 134,
    sub: 'items dispensed, 8 categories',
    barColor: 'bg-blue-600',
    barWidth: 'w-[72%]',
    chips: [
      { text: 'Alcohol 70% — 40 units', style: '' },
      { text: 'Gloves — 30 pcs', style: '' },
      { text: '+6 more', style: '' },
    ],
  },
  {
    Icon: Droplets,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
    badge: '↓ 5% vs yesterday',
    badgeBg: 'bg-red-50 text-red-600',
    label: 'Reagents used today',
    value: 27,
    sub: 'consumed across 5 tests',
    barColor: 'bg-green-600',
    barWidth: 'w-[45%]',
    chips: [
      { text: 'Acetone 1L — 3 units', style: '' },
      { text: 'Alpha D-Gal — 2 units', style: '' },
      { text: '+5 more', style: '' },
    ],
  },
  {
    Icon: TriangleAlert,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    badge: 'Needs attention',
    badgeBg: 'bg-amber-50 text-amber-600',
    label: 'Low stock alerts',
    value: 35,
    sub: 'items below reorder threshold',
    barColor: 'bg-amber-500',
    barWidth: 'w-[88%]',
    chips: [
      { text: '32 Critical',  style: 'bg-red-50 text-red-600 border-red-200' },
      { text: '3 Low stock',  style: 'bg-amber-50 text-amber-600 border-amber-200' },
    ],
  },
  {
    Icon: ShoppingCart,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    badge: '5 pending',
    badgeBg: 'bg-gray-100 text-gray-500',
    label: 'Pending restock orders',
    value: 5,
    sub: 'awaiting approval or delivery',
    barColor: 'bg-red-500',
    barWidth: 'w-[30%]',
    chips: [
      { text: '2 Awaiting approval', style: 'bg-amber-50 text-amber-600 border-amber-200' },
      { text: '3 In transit',        style: 'bg-green-50 text-green-600 border-green-200' },
    ],
  },
];

export const InventorySummaryCards: React.FC = () => {
  return (
    <div className="grid grid-cols-4 gap-3">
      {cards.map((card) => {
        const { Icon } = card;
        return (
          <div
            key={card.label}
            className="bg-white border border-gray-200 rounded-2xl p-[18px] flex flex-col gap-3"
          >
            {/* Top: icon + badge */}
            <div className="flex justify-between items-start">
              <div className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center ${card.iconBg}`}>
                <Icon size={18} className={card.iconColor} />
              </div>
              <span className={`text-[11px] font-medium px-[10px] py-[3px] rounded-full whitespace-nowrap ${card.badgeBg}`}>
                {card.badge}
              </span>
            </div>

            {/* Value */}
            <div>
              <p className="text-xs text-gray-400 mb-1">{card.label}</p>
              <p className="text-[28px] font-semibold text-gray-900 leading-none">{card.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
              <div className="mt-2 h-[3px] rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full rounded-full ${card.barColor} ${card.barWidth}`} />
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Chips */}
            <div className="flex flex-wrap gap-1.5">
              {card.chips.map((chip) => (
                <span
                  key={chip.text}
                  className={`text-[11px] px-[10px] py-[3px] rounded-full border border-gray-200 bg-gray-50 text-gray-500 ${chip.style}`}
                >
                  {chip.text}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};