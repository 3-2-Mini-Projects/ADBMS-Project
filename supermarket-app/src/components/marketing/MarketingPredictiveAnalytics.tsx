"use client";

import React, { useMemo } from "react";
import {
  TrendingUp,
  Ticket,
  Sparkles,
} from "lucide-react";
import type { DailyTrendRow, MarketingSummaryRow } from "@/app/api/marketing/reports/route";

interface MarketingPredictiveAnalyticsProps {
  summary?: {
    total_coupons?: number;
    available_coupons?: number;
    redeemed_coupons?: number;
    expired_coupons?: number;
    coupon_redemption_rate?: number;
    redemption_rate?: number;
    discount_ratio_pct?: number;
    total_revenue?: number;
    total_discounts?: number;
    total_discounts_given?: number;
  } | null;
  dailyTrend: Array<{
    sale_date: string;
    total_sales: number;
    total_discount: number;
    transactions?: number;
  }>;
}

export function MarketingPredictiveAnalytics({
  summary,
  dailyTrend,
}: MarketingPredictiveAnalyticsProps) {
  // 1. Process Trend Data for the Past Performance Chart
  const trendPoints = useMemo(() => {
    return dailyTrend.map((d) => ({
      date: new Date(d.sale_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      sales: Number(d.total_sales || 0),
      discount: Number(d.total_discount || 0),
      transactions: Number(d.transactions || 0),
    }));
  }, [dailyTrend]);

  // 2. Predictive Calculations
  const forecast = useMemo(() => {
    const totalSales = trendPoints.reduce((acc, curr) => acc + curr.sales, 0);
    const count = Math.max(1, trendPoints.length);
    const avgDailySales = totalSales / count;
    const totalDiscounts = trendPoints.reduce((acc, curr) => acc + curr.discount, 0);
    const avgDailyDiscount = totalDiscounts / count;

    // Projected 30-day Run-rate
    const projectedMonthlySales = avgDailySales * 30;
    const projectedMonthlyDiscounts = avgDailyDiscount * 30;

    // Trend Direction: compare second half to first half
    const half = Math.floor(count / 2);
    const firstHalfAvg = half > 0 ? trendPoints.slice(0, half).reduce((a, b) => a + b.sales, 0) / half : avgDailySales;
    const secondHalfAvg = half > 0 ? trendPoints.slice(half).reduce((a, b) => a + b.sales, 0) / (count - half) : avgDailySales;
    const growthRatePct = firstHalfAvg > 0 ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100) : 5;

    // Future 3 periods projection points
    const lastSales = trendPoints.length > 0 ? trendPoints[trendPoints.length - 1].sales : avgDailySales;
    const projectedNext1 = Math.max(500, Math.round(lastSales * (1 + (growthRatePct / 100) * 0.3)));
    const projectedNext2 = Math.max(500, Math.round(projectedNext1 * (1 + (growthRatePct / 100) * 0.2)));
    const projectedNext3 = Math.max(500, Math.round(projectedNext2 * (1 + (growthRatePct / 100) * 0.15)));

    // Estimated lift if promotional discount is boosted by 5%
    const estimatedPromotionalLift = Math.round(projectedMonthlySales * 0.14);

    return {
      avgDailySales,
      avgDailyDiscount,
      projectedMonthlySales,
      projectedMonthlyDiscounts,
      growthRatePct,
      projectedPoints: [
        { label: "Day +1 (Est)", sales: projectedNext1 },
        { label: "Day +2 (Est)", sales: projectedNext2 },
        { label: "Day +3 (Est)", sales: projectedNext3 },
      ],
      estimatedPromotionalLift,
    };
  }, [trendPoints]);

  // 3. SVG Dimensions & Coordinates for Dual-Axis Performance & Forecast Chart
  const svgGraph = useMemo(() => {
    const width = 640;
    const height = 220;
    const paddingLeft = 45;
    const paddingRight = 45;
    const paddingTop = 25;
    const paddingBottom = 35;
    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    const allValues = [
      ...trendPoints.map((p) => p.sales),
      ...forecast.projectedPoints.map((p) => p.sales),
    ];
    const maxVal = Math.max(...allValues, 1000) * 1.15;

    const totalBars = trendPoints.length;
    const step = totalBars > 0 ? chartW / (totalBars + 3) : chartW / 4;
    const barW = Math.min(28, Math.max(12, step * 0.55));

    // Historical bars & points
    const bars = trendPoints.map((pt, i) => {
      const x = paddingLeft + i * step + step / 2;
      const barH = (pt.sales / maxVal) * chartH;
      const y = height - paddingBottom - barH;
      const discountH = (pt.discount / maxVal) * chartH;
      const discY = height - paddingBottom - discountH;
      return {
        ...pt,
        x,
        y,
        barH,
        discY,
      };
    });

    // Forecast projection path
    const lastBar = bars.length > 0 ? bars[bars.length - 1] : { x: paddingLeft, y: height - paddingBottom - 50 };
    const forecastCoords = forecast.projectedPoints.map((pt, i) => {
      const x = paddingLeft + (totalBars + i) * step + step / 2;
      const ptH = (pt.sales / maxVal) * chartH;
      const y = height - paddingBottom - ptH;
      return { ...pt, x, y };
    });

    let projectionPath = `M ${lastBar.x} ${lastBar.y}`;
    forecastCoords.forEach((pt) => {
      projectionPath += ` L ${pt.x} ${pt.y}`;
    });

    return {
      width,
      height,
      maxVal,
      bars,
      barW,
      forecastCoords,
      projectionPath,
      paddingBottom,
      heightMinusBottom: height - paddingBottom,
    };
  }, [trendPoints, forecast]);

  // 4. SVG Donut Chart Calculation for Voucher Conversion
  const donutChart = useMemo(() => {
    const total = Number(summary?.total_coupons || 0);
    const available = Number(summary?.available_coupons || 0);
    const redeemed = Number(summary?.redeemed_coupons || 0);
    const expired = Number(summary?.expired_coupons || 0);

    const safeTotal = Math.max(1, total);
    const radius = 38;
    const circumference = 2 * Math.PI * radius; // ~238.76

    const redeemedPct = (redeemed / safeTotal) * 100;
    const availablePct = (available / safeTotal) * 100;
    const expiredPct = (expired / safeTotal) * 100;

    const redeemedDash = (redeemed / safeTotal) * circumference;
    const availableDash = (available / safeTotal) * circumference;
    const expiredDash = (expired / safeTotal) * circumference;

    const redeemedOffset = 0;
    const availableOffset = -redeemedDash;
    const expiredOffset = -(redeemedDash + availableDash);

    return {
      radius,
      circumference,
      redeemedPct: Math.round(redeemedPct),
      availablePct: Math.round(availablePct),
      expiredPct: Math.round(expiredPct),
      redeemedDash,
      availableDash,
      expiredDash,
      redeemedOffset,
      availableOffset,
      expiredOffset,
      total,
      redeemed,
      available,
      expired,
    };
  }, [summary]);

  return (
    <div className="space-y-6">
      {/* 2 Forecast Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Daily Sales Velocity</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              Rs. {forecast.avgDailySales.toLocaleString(undefined, { maximumFractionDigits: 0 })}/day
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Predicted Monthly Run-Rate</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              Rs. {forecast.projectedMonthlySales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Visual Analytics Dual-Grid: SVG Trend Graph & Donut Conversion Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Dual-Axis Trend Graph + Projection (2 Columns) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span>Marketing Performance vs Past & Future Growth Projection</span>
              </h3>
            </div>

            {/* Graph Legend */}
            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" />
                <span>Sales Revenue</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span>Discounts Given</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 border-b-2 border-dashed border-amber-400 inline-block" />
                <span>Forecast Line</span>
              </span>
            </div>
          </div>

          {/* Pure SVG Responsive Canvas */}
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgGraph.width} ${svgGraph.height}`}
              className="w-full h-auto min-w-[540px] font-mono select-none"
            >
              <defs>
                <linearGradient id="salesBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Horizontal Reference Grid Lines */}
              {[0, 0.33, 0.66, 1].map((pct, idx) => {
                const y = svgGraph.heightMinusBottom - (pct * (svgGraph.height - 60));
                const labelVal = Math.round(svgGraph.maxVal * pct);
                return (
                  <g key={idx}>
                    <line
                      x1={40}
                      y1={y}
                      x2={svgGraph.width - 20}
                      y2={y}
                      stroke="#334155"
                      strokeDasharray="2 3"
                      strokeOpacity={0.5}
                    />
                    <text x={35} y={y + 3} fill="#64748b" fontSize={9} textAnchor="end">
                      {labelVal >= 1000 ? `${(labelVal / 1000).toFixed(1)}k` : labelVal}
                    </text>
                  </g>
                );
              })}

              {/* Baseline */}
              <line
                x1={40}
                y1={svgGraph.heightMinusBottom}
                x2={svgGraph.width - 20}
                y2={svgGraph.heightMinusBottom}
                stroke="#475569"
                strokeWidth={1.5}
              />

              {/* Historical Bars & Discount Markers */}
              {svgGraph.bars.map((bar, i) => (
                <g key={i}>
                  {/* Sales Bar */}
                  <rect
                    x={bar.x - svgGraph.barW / 2}
                    y={bar.y}
                    width={svgGraph.barW}
                    height={Math.max(2, bar.barH)}
                    rx={3}
                    fill="url(#salesBarGrad)"
                  />
                  {/* Sales Value on top of bar */}
                  <text
                    x={bar.x}
                    y={bar.y - 4}
                    fill="#93c5fd"
                    fontSize={8.5}
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {bar.sales >= 1000 ? `${(bar.sales / 1000).toFixed(1)}k` : bar.sales}
                  </text>
                  {/* Date label on X-axis */}
                  <text
                    x={bar.x}
                    y={svgGraph.heightMinusBottom + 14}
                    fill="#94a3b8"
                    fontSize={8.5}
                    textAnchor="middle"
                  >
                    {bar.date}
                  </text>
                  {/* Discount Marker if discount > 0 */}
                  {bar.discount > 0 && (
                    <circle
                      cx={bar.x}
                      cy={bar.discY}
                      r={3.5}
                      fill="#f43f5e"
                      stroke="#ffffff"
                      strokeWidth={1}
                    />
                  )}
                </g>
              ))}

              {/* Projected Future Trajectory (Dashed Gold Line & Dots) */}
              {svgGraph.projectionPath && (
                <path
                  d={svgGraph.projectionPath}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              )}

              {/* Forecast Points */}
              {svgGraph.forecastCoords.map((pt, i) => (
                <g key={i}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={4}
                    fill="#fbbf24"
                    stroke="#78350f"
                    strokeWidth={1.5}
                  />
                  <text
                    x={pt.x}
                    y={pt.y - 6}
                    fill="#fde047"
                    fontSize={8.5}
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {pt.sales >= 1000 ? `${(pt.sales / 1000).toFixed(1)}k` : pt.sales}
                  </text>
                  <text
                    x={pt.x}
                    y={svgGraph.heightMinusBottom + 14}
                    fill="#fbbf24"
                    fontSize={8}
                    textAnchor="middle"
                  >
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Right: Coupon Utilization Donut Chart (1 Column) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Ticket className="w-4 h-4 text-purple-400" />
              <span>Coupon Conversion Funnel</span>
            </h3>
          </div>

          {/* SVG Donut Circle */}
          <div className="flex items-center justify-center relative py-2">
            <svg width={140} height={140} viewBox="0 0 100 100" className="transform -rotate-90">
              {/* Background ring */}
              <circle
                cx={50}
                cy={50}
                r={donutChart.radius}
                fill="transparent"
                stroke="#1e293b"
                strokeWidth={12}
              />
              {/* Available Segment (Amber) */}
              {donutChart.availableDash > 0 && (
                <circle
                  cx={50}
                  cy={50}
                  r={donutChart.radius}
                  fill="transparent"
                  stroke="#f59e0b"
                  strokeWidth={12}
                  strokeDasharray={`${donutChart.availableDash} ${donutChart.circumference}`}
                  strokeDashoffset={donutChart.availableOffset}
                  strokeLinecap="round"
                />
              )}
              {/* Redeemed Segment (Emerald) */}
              {donutChart.redeemedDash > 0 && (
                <circle
                  cx={50}
                  cy={50}
                  r={donutChart.radius}
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth={12}
                  strokeDasharray={`${donutChart.redeemedDash} ${donutChart.circumference}`}
                  strokeDashoffset={donutChart.redeemedOffset}
                  strokeLinecap="round"
                />
              )}
              {/* Expired Segment (Rose) */}
              {donutChart.expiredDash > 0 && (
                <circle
                  cx={50}
                  cy={50}
                  r={donutChart.radius}
                  fill="transparent"
                  stroke="#f43f5e"
                  strokeWidth={12}
                  strokeDasharray={`${donutChart.expiredDash} ${donutChart.circumference}`}
                  strokeDashoffset={donutChart.expiredOffset}
                  strokeLinecap="round"
                />
              )}
            </svg>

            {/* Donut Center Metrics */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-mono font-black text-white">
                {donutChart.redeemedPct}%
              </span>
              <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
                Redeemed
              </span>
            </div>
          </div>

          {/* Donut Chart Legend */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300 font-sans">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Available & Ready</span>
              </span>
              <span className="font-bold text-amber-400">{donutChart.available} ({donutChart.availablePct}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300 font-sans">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Redeemed at POS</span>
              </span>
              <span className="font-bold text-emerald-400">{donutChart.redeemed} ({donutChart.redeemedPct}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300 font-sans">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Expired Unused</span>
              </span>
              <span className="font-bold text-rose-400">{donutChart.expired} ({donutChart.expiredPct}%)</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
