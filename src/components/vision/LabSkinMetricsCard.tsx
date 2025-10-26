"use client";
import React from "react";

type Props = {
  metrics: {
    L_mean: number;
    a_mean: number;
    b_mean: number;
    uniformity: number;
    brightness?: number;
    redness?: number;
    yellowness?: number;
  } | null;
  beforeMetrics?: {
    L_mean: number;
    a_mean: number;
    b_mean: number;
    uniformity: number;
  } | null;
};

const MetricBox = ({ 
  label, 
  beforeValue,
  afterValue,
  unit, 
  color,
  description,
  isImprovement
}: { 
  label: string; 
  beforeValue?: number;
  afterValue: number;
  unit?: string; 
  color?: string;
  description: string;
  isImprovement: (change: number) => boolean;
}) => {
  const change = beforeValue ? afterValue - beforeValue : 0;
  const changePercent = beforeValue ? (change / beforeValue) * 100 : 0;
  const isGood = beforeValue ? isImprovement(change) : null;
  
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl shadow-md bg-white p-4 w-[160px]">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xs text-gray-400 text-center mb-2">{description}</p>
      
      <div className="text-center">
        <p className={`text-lg font-semibold ${color ?? "text-gray-800"}`}>
          {isNaN(afterValue) ? "-" : afterValue.toFixed(1)}
          {unit && <span className="text-xs ml-1">{unit}</span>}
        </p>
        
        {beforeValue && (
          <div className="mt-1">
            <p className="text-xs text-gray-500">
              Before: {beforeValue.toFixed(1)}{unit}
            </p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className={`text-xs font-medium ${
                change > 0 ? "text-green-600" : change < 0 ? "text-red-500" : "text-gray-500"
              }`}>
                {change > 0 ? "↗" : change < 0 ? "↘" : "→"} {Math.abs(changePercent).toFixed(1)}%
              </span>
              {isGood !== null && (
                <span className="text-lg">
                  {isGood ? "😃" : "😢"}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const LabSkinMetricsCard: React.FC<Props> = ({ metrics, beforeMetrics }) => {
  if (!metrics) return null;

  const { 
    L_mean, 
    a_mean, 
    b_mean, 
    uniformity,
    brightness = L_mean,
    redness = a_mean,
    yellowness = b_mean
  } = metrics;

  // 各項目の改善判定ロジック
  const isBrightnessImprovement = (change: number) => change > 0; // 明るさは上がるほど良い
  const isRednessImprovement = (change: number) => change < 0; // 赤みは下がるほど良い
  const isYellownessImprovement = (change: number) => change < 0; // 黄みは下がるほど良い
  const isUniformityImprovement = (change: number) => change > 0; // 均一性は上がるほど良い

  return (
    <div className="mt-4 flex flex-col items-start w-full">
      <h3 className="text-base font-semibold text-gray-700 mb-2">肌のLAB分析結果</h3>

      <div className="flex flex-wrap gap-3">
        <MetricBox 
          label="明るさ（L）" 
          beforeValue={beforeMetrics?.L_mean}
          afterValue={brightness} 
          color="text-blue-600"
          description="肌の明るさ・透明感"
          isImprovement={isBrightnessImprovement}
        />
        <MetricBox 
          label="赤み（a）" 
          beforeValue={beforeMetrics?.a_mean}
          afterValue={redness} 
          color="text-red-600"
          description="肌の血色・赤み具合"
          isImprovement={isRednessImprovement}
        />
        <MetricBox 
          label="黄み（b）" 
          beforeValue={beforeMetrics?.b_mean}
          afterValue={yellowness} 
          color="text-yellow-600"
          description="肌の黄ぐすみ・くすみ"
          isImprovement={isYellownessImprovement}
        />
        <MetricBox 
          label="均一性" 
          beforeValue={beforeMetrics?.uniformity ? beforeMetrics.uniformity * 100 : undefined}
          afterValue={uniformity * 100} 
          unit="%" 
          color="text-green-600"
          description="肌の色ムラ・均一性"
          isImprovement={isUniformityImprovement}
        />
      </div>

      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">📊 指標の意味</h4>
        <div className="text-xs text-blue-700 space-y-1">
          <p><strong>明るさ↑</strong>: 透明感・明るい肌質 😃</p>
          <p><strong>赤み↓</strong>: 血色改善・赤ら顔軽減 😃</p>
          <p><strong>黄み↓</strong>: くすみ改善・明るい肌色 😃</p>
          <p><strong>均一性↑</strong>: 色ムラ改善・均一な肌質 😃</p>
        </div>
        <div className="text-xs text-gray-600 mt-2">
          💡 <strong>表示について:</strong> 😃 = 改善、😢 = 悪化
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        ※値は0〜255基準のLAB色空間で算出。照明補正後の肌領域のみを分析しています。
      </p>
    </div>
  );
};
