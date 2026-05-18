import React, { useMemo } from 'react';
import { FlaskConical, Droplets, TriangleAlert, ShoppingCart } from 'lucide-react';
import { useLabSupplies } from '../../../hooks/LaboratoryHooks/useLabSupplies';
import { useLabReagents } from '../../../hooks/LaboratoryHooks/useLabReagents';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusLabel = (status: string) => {
  if (status === 'critical')    return 'Critical';
  if (status === 'warning')     return 'Low stock';
  if (status === 'out-of-stock') return 'Out of stock';
  return 'Normal';
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const CardSkeleton: React.FC = () => (
  <div className="bg-white border border-gray-200 rounded-2xl p-[18px] flex flex-col gap-3 animate-pulse">
    <div className="flex justify-between items-start">
      <div className="w-[38px] h-[38px] rounded-[10px] bg-gray-100" />
      <div className="h-5 w-24 rounded-full bg-gray-100" />
    </div>
    <div className="space-y-2">
      <div className="h-3 w-28 rounded bg-gray-100" />
      <div className="h-7 w-16 rounded bg-gray-100" />
      <div className="h-3 w-36 rounded bg-gray-100" />
      <div className="mt-2 h-[3px] rounded-full bg-gray-100" />
    </div>
    <hr className="border-gray-100" />
    <div className="flex gap-1.5">
      <div className="h-5 w-20 rounded-full bg-gray-100" />
      <div className="h-5 w-20 rounded-full bg-gray-100" />
    </div>
  </div>
);

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  icon:      React.ElementType;
  iconBg:    string;
  iconColor: string;
  badge:     string;
  badgeBg:   string;
  label:     string;
  value:     number | string;
  sub:       string;
  barColor:  string;
  barPct:    number;           // 0–100
  chips:     { text: string; style?: string }[];
}

const SummaryCard: React.FC<CardProps> = ({
  icon: Icon, iconBg, iconColor,
  badge, badgeBg,
  label, value, sub,
  barColor, barPct,
  chips,
}) => (
  <div className="bg-white border border-gray-200 rounded-2xl p-[18px] flex flex-col gap-3">
    <div className="flex justify-between items-start">
      <div className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center ${iconBg}`}>
        <Icon size={18} className={iconColor} />
      </div>
      <span className={`text-[11px] font-medium px-[10px] py-[3px] rounded-full whitespace-nowrap ${badgeBg}`}>
        {badge}
      </span>
    </div>

    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-[28px] font-semibold text-gray-900 leading-none">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      <div className="mt-2 h-[3px] rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(barPct, 100)}%` }}
        />
      </div>
    </div>

    <hr className="border-gray-100" />

    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.text}
          className={`text-[11px] px-[10px] py-[3px] rounded-full border border-gray-200 bg-gray-50 text-gray-500 ${chip.style ?? ''}`}
        >
          {chip.text}
        </span>
      ))}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const InventorySummaryCards: React.FC = () => {
  const { data: suppliesRes, isLoading: suppliesLoading } = useLabSupplies();
  const { data: reagentsRes, isLoading: reagentsLoading } = useLabReagents();

  const isLoading = suppliesLoading || reagentsLoading;

  const derived = useMemo(() => {
    const supplies = suppliesRes?.data ?? [];
    const reagents = reagentsRes?.data ?? [];

    // ── Card 1: Supplies ──────────────────────────────────────────────────────
    const totalSupplies = supplies.length;
    const normalSupplies = supplies.filter(s => s.status === 'normal').length;
    const supplyBarPct = totalSupplies > 0 ? (normalSupplies / totalSupplies) * 100 : 0;
    const topSupplies = supplies.slice(0, 2).map(s => ({
      text: `${s.description} — ${s.stock} ${s.unit}`,
    }));
    if (supplies.length > 2) topSupplies.push({ text: `+${supplies.length - 2} more` });

    // ── Card 2: Reagents ──────────────────────────────────────────────────────
    const totalReagents = reagents.length;
    const normalReagents = reagents.filter(r => r.status === 'normal').length;
    const reagentBarPct = totalReagents > 0 ? (normalReagents / totalReagents) * 100 : 0;
    const topReagents = reagents.slice(0, 2).map(r => ({
      text: `${r.description} — ${r.stock} ${r.unit}`,
    }));
    if (reagents.length > 2) topReagents.push({ text: `+${reagents.length - 2} more` });

    // ── Card 3: Low stock alerts ──────────────────────────────────────────────
    const allItems = [...supplies, ...reagents];
    const criticalItems  = allItems.filter(i => i.status === 'critical');
    const warningItems   = allItems.filter(i => i.status === 'warning');
    const outOfStock     = allItems.filter(i => i.status === 'out-of-stock');
    const alertCount     = criticalItems.length + warningItems.length + outOfStock.length;
    const alertBarPct    = allItems.length > 0 ? (alertCount / allItems.length) * 100 : 0;

    const alertChips: { text: string; style: string }[] = [];
    if (criticalItems.length)  alertChips.push({ text: `${criticalItems.length} Critical`,    style: 'bg-red-50 text-red-600 border-red-200' });
    if (warningItems.length)   alertChips.push({ text: `${warningItems.length} Low stock`,    style: 'bg-amber-50 text-amber-600 border-amber-200' });
    if (outOfStock.length)     alertChips.push({ text: `${outOfStock.length} Out of stock`,   style: 'bg-gray-100 text-gray-500 border-gray-200' });
    if (!alertChips.length)    alertChips.push({ text: 'All stocked', style: 'bg-green-50 text-green-600 border-green-200' });

    const alertBadgeBg = criticalItems.length > 0
      ? 'bg-red-50 text-red-600'
      : warningItems.length > 0
        ? 'bg-amber-50 text-amber-600'
        : 'bg-green-50 text-green-600';

    const alertBadge = criticalItems.length > 0
      ? 'Needs attention'
      : warningItems.length > 0
        ? 'Monitor closely'
        : 'All good';

    // ── Card 4: Totals overview ───────────────────────────────────────────────
    const totalTracked  = allItems.length;
    const totalNormal   = allItems.filter(i => i.status === 'normal').length;
    const stockBarPct   = totalTracked > 0 ? (totalNormal / totalTracked) * 100 : 0;

    return {
      supplies:    { total: totalSupplies, barPct: supplyBarPct,  chips: topSupplies  },
      reagents:    { total: totalReagents, barPct: reagentBarPct, chips: topReagents  },
      alerts:      { count: alertCount,    barPct: alertBarPct,   chips: alertChips,  badge: alertBadge, badgeBg: alertBadgeBg },
      overview:    { total: totalTracked,  normal: totalNormal,   barPct: stockBarPct },
    };
  }, [suppliesRes, reagentsRes]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-3">
      {/* Card 1 — Supplies */}
      <SummaryCard
        icon={FlaskConical}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
        badge={`${derived.supplies.total} tracked`}
        badgeBg="bg-blue-50 text-blue-600"
        label="Lab supplies"
        value={derived.supplies.total}
        sub="items currently tracked"
        barColor="bg-blue-600"
        barPct={derived.supplies.barPct}
        chips={derived.supplies.chips}
      />

      {/* Card 2 — Reagents */}
      <SummaryCard
        icon={Droplets}
        iconBg="bg-green-50"
        iconColor="text-green-600"
        badge={`${derived.reagents.total} tracked`}
        badgeBg="bg-green-50 text-green-600"
        label="Lab reagents"
        value={derived.reagents.total}
        sub="reagents currently tracked"
        barColor="bg-green-600"
        barPct={derived.reagents.barPct}
        chips={derived.reagents.chips}
      />

      {/* Card 3 — Alerts */}
      <SummaryCard
        icon={TriangleAlert}
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
        badge={derived.alerts.badge}
        badgeBg={derived.alerts.badgeBg}
        label="Low stock alerts"
        value={derived.alerts.count}
        sub="items below reorder threshold"
        barColor="bg-amber-500"
        barPct={derived.alerts.barPct}
        chips={derived.alerts.chips}
      />

      {/* Card 4 — Overview */}
      <SummaryCard
        icon={ShoppingCart}
        iconBg="bg-purple-50"
        iconColor="text-purple-600"
        badge={`${derived.overview.normal} normal`}
        badgeBg="bg-purple-50 text-purple-600"
        label="Total inventory"
        value={derived.overview.total}
        sub={`items tracked • ${derived.overview.normal} at normal stock`}
        barColor="bg-purple-500"
        barPct={derived.overview.barPct}
        chips={[
          { text: `${derived.overview.normal} Normal`,                                                  style: 'bg-green-50 text-green-600 border-green-200'  },
          { text: `${derived.overview.total - derived.overview.normal} Need attention`,                 style: 'bg-red-50 text-red-600 border-red-200'        },
        ]}
      />
    </div>
  );
};