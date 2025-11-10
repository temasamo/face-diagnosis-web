"use client";

import React from "react";

interface SkinRadarChartProps {
  skinAnalysis: {
    before: {
      skinQuality: {
        brightness: number;
        saturation: number;
        evenness: string;
        tone: string;
      };
      wrinkleVisibility: number;
      estimatedAge: string;
    };
    after: {
      skinQuality: {
        brightness: number;
        saturation: number;
        evenness: string;
        tone: string;
      };
      wrinkleVisibility: number;
      estimatedAge: string;
    };
    improvements: {
      brightness: number;
      saturation: number;
      evenness: boolean;
      tone: boolean;
      wrinkleVisibility: number;
      estimatedAge: boolean;
    };
  };
}

export function SkinRadarChart({ skinAnalysis }: SkinRadarChartProps) {
  // 各項目のラベル
  const labels = [
    "肌の明度",
    "肌の彩度",
    "肌の均一性",
    "肌のトーン",
    "シワの見えやすさ",
    "肌年齢印象",
  ];

  // 文字列を数値に変換する関数（より細かく数値化）
  const stringToNumber = (value: string, isEvenness: boolean = false, isTone: boolean = false, isAge: boolean = false): number => {
    if (isEvenness) {
      // 均一性: "非常に良好" -> 100, "良好" -> 80, "普通" -> 50, "やや悪い" -> 30, "悪い" -> 0
      if (value.includes("非常に良好") || value.includes("非常に良い")) return 100;
      if (value.includes("良好") || value.includes("良い")) return 80;
      if (value.includes("普通") || value.includes("中程度")) return 50;
      if (value.includes("やや悪い") || value.includes("やや不良")) return 30;
      if (value.includes("悪い") || value.includes("不良")) return 0;
      // デフォルト: 文字列の長さや内容から推測
      return 50;
    }
    if (isTone) {
      // トーン: "非常に明るい" -> 100, "明るい" -> 80, "普通" -> 50, "やや暗い" -> 30, "暗い" -> 0
      if (value.includes("非常に明るい") || value.includes("とても明るい")) return 100;
      if (value.includes("明るい") || value.includes("明")) return 80;
      if (value.includes("普通") || value.includes("中程度")) return 50;
      if (value.includes("やや暗い") || value.includes("少し暗い")) return 30;
      if (value.includes("暗い")) return 0;
      // デフォルト: 文字列の長さや内容から推測
      return 50;
    }
    if (isAge) {
      // 肌年齢印象: "20代" -> 100, "30代" -> 80, "40代" -> 60, "50代" -> 40, "60代" -> 20
      const ageMatch = value.match(/(\d+)代/);
      if (ageMatch) {
        const age = parseInt(ageMatch[1]);
        return Math.max(0, 100 - (age - 20) * 4);
      }
      return 50; // デフォルト値
    }
    return 50; // デフォルト値
  };

  // 各項目の値を取得（数値化）
  const getValue = (index: number, isBefore: boolean): number => {
    const key = labels[index];
    if (key === "肌の明度") {
      // 明度は数値なのでそのまま使用（0-255の範囲を0-100に正規化）
      const beforeValue = (skinAnalysis.before.skinQuality.brightness / 255) * 100;
      const afterValue = (skinAnalysis.after.skinQuality.brightness / 255) * 100;
      // 改善がある場合（brightnessが増加）は、そのまま使用（既に改善が反映されている）
      return isBefore ? Math.min(100, beforeValue) : Math.min(100, afterValue);
    }
    if (key === "肌の彩度") {
      // 彩度は数値なのでそのまま使用（0-255の範囲を0-100に正規化）
      const value = isBefore ? skinAnalysis.before.skinQuality.saturation : skinAnalysis.after.skinQuality.saturation;
      return Math.min(100, (value / 255) * 100);
    }
    if (key === "肌の均一性") {
      const beforeValue = stringToNumber(skinAnalysis.before.skinQuality.evenness, true);
      const afterValue = stringToNumber(skinAnalysis.after.skinQuality.evenness, true);
      // 改善がある場合は、数値を増やす（視覚的に分かりやすく）
      if (!isBefore && skinAnalysis.improvements.evenness) {
        // 改善がある場合は、Afterの値を増やす（最大100まで）
        return Math.min(100, Math.max(afterValue, beforeValue) + 15);
      }
      return isBefore ? beforeValue : afterValue;
    }
    if (key === "肌のトーン") {
      const beforeValue = stringToNumber(skinAnalysis.before.skinQuality.tone, false, true);
      const afterValue = stringToNumber(skinAnalysis.after.skinQuality.tone, false, true);
      // 改善がある場合は、数値を増やす（視覚的に分かりやすく）
      if (!isBefore && skinAnalysis.improvements.tone) {
        // 改善がある場合は、Afterの値を増やす（最大100まで）
        return Math.min(100, Math.max(afterValue, beforeValue) + 15);
      }
      return isBefore ? beforeValue : afterValue;
    }
    if (key === "シワの見えやすさ") {
      // シワの見えやすさは低い方が良いので、100から引く
      const value = isBefore ? skinAnalysis.before.wrinkleVisibility : skinAnalysis.after.wrinkleVisibility;
      return Math.max(0, 100 - value);
    }
    if (key === "肌年齢印象") {
      const beforeValue = stringToNumber(skinAnalysis.before.estimatedAge, false, false, true);
      const afterValue = stringToNumber(skinAnalysis.after.estimatedAge, false, false, true);
      // 改善がある場合は、数値を増やす（視覚的に分かりやすく）
      if (!isBefore && skinAnalysis.improvements.estimatedAge) {
        // 改善がある場合は、Afterの値を増やす（最大100まで）
        return Math.min(100, Math.max(afterValue, beforeValue) + 10);
      }
      return isBefore ? beforeValue : afterValue;
    }
    return 50;
  };

  // Beforeを基準（100%）として、Afterの変化率を計算
  const getNormalizedValue = (before: number, after: number, isBefore: boolean) => {
    if (isBefore) {
      // Beforeは常に100%（基準線）
      return 100;
    } else {
      // AfterはBeforeに対する変化率（%）
      if (before === 0) return 100; // ゼロ除算を防ぐ
      const changePercent = (after / before) * 100;
      // 変化率を0-200%の範囲に制限（極端な値の表示を防ぐ）
      return Math.max(0, Math.min(200, changePercent));
    }
  };

  // 六角形の頂点の角度（6つの項目）
  const angleStep = (2 * Math.PI) / 6;
  const centerX = 200;
  const centerY = 200;
  const radius = 150;

  // 各頂点の座標を計算（変化率を0-100%の範囲にマッピング）
  const getPoint = (index: number, normalizedPercent: number) => {
    const angle = (index * angleStep) - (Math.PI / 2); // 上から開始
    // 変化率を半径にマッピング（100%が最大半径、0%が中心、200%も最大半径）
    const r = Math.min(1, normalizedPercent / 100) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
    };
  };

  // BeforeとAfterのパスを生成
  const createPath = (isBefore: boolean) => {
    const points: { x: number; y: number }[] = [];

    labels.forEach((_, index) => {
      const key = labels[index];
      const before = getValue(index, true);
      const after = getValue(index, false);
      
      // 改善がある場合は、変化率を明示的に100%以上にする
      let normalizedPercent = getNormalizedValue(before, after, isBefore);
      
      if (!isBefore) {
        // 改善がある場合の処理
        if (key === "肌の明度" && skinAnalysis.improvements.brightness > 0) {
          // 明度が改善している場合、変化率を増やす
          normalizedPercent = Math.max(100, normalizedPercent + (skinAnalysis.improvements.brightness / before) * 100);
        } else if (key === "肌の彩度" && skinAnalysis.improvements.saturation > 0) {
          // 彩度が改善している場合、変化率を増やす
          normalizedPercent = Math.max(100, normalizedPercent + (skinAnalysis.improvements.saturation / before) * 100);
        } else if (key === "肌の均一性" && skinAnalysis.improvements.evenness) {
          // 均一性が改善している場合、変化率を110%以上にする
          normalizedPercent = Math.max(110, normalizedPercent);
        } else if (key === "肌のトーン" && skinAnalysis.improvements.tone) {
          // トーンが改善している場合、変化率を110%以上にする
          normalizedPercent = Math.max(110, normalizedPercent);
        } else if (key === "シワの見えやすさ" && skinAnalysis.improvements.wrinkleVisibility < 0) {
          // シワが減っている場合（改善）、変化率を増やす
          normalizedPercent = Math.max(100, normalizedPercent);
        } else if (key === "肌年齢印象" && skinAnalysis.improvements.estimatedAge) {
          // 肌年齢が改善している場合、変化率を110%以上にする
          normalizedPercent = Math.max(110, normalizedPercent);
        }
      }
      
      const point = getPoint(index, normalizedPercent);
      points.push(point);
    });

    // パスを閉じるために最初の点を追加
    points.push(points[0]);

    return points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");
  };

  const beforePath = createPath(true);
  const afterPath = createPath(false);

  // グリッド線（同心円）を描画（0%, 25%, 50%, 75%, 100%）
  const gridLines = [0, 0.25, 0.5, 0.75, 1.0].map((scale) => {
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = i * angleStep - Math.PI / 2;
      points.push({
        x: centerX + radius * scale * Math.cos(angle),
        y: centerY + radius * scale * Math.sin(angle),
      });
    }
    points.push(points[0]); // 閉じる

    const path = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    // 100%の基準線を強調表示
    const isBaseLine = scale === 1.0;

    return (
      <path
        key={scale}
        d={path}
        fill="none"
        stroke={isBaseLine ? "#9ca3af" : "#e5e7eb"}
        strokeWidth={isBaseLine ? 2 : 1}
        opacity={isBaseLine ? 0.7 : 0.5}
        strokeDasharray={isBaseLine ? "3,3" : "none"}
      />
    );
  });

  // 軸線を描画
  const axes = labels.map((_, index) => {
    const angle = index * angleStep - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return (
      <line
        key={index}
        x1={centerX}
        y1={centerY}
        x2={x}
        y2={y}
        stroke="#d1d5db"
        strokeWidth="1"
        opacity="0.5"
      />
    );
  });

  // ラベルを描画
  const labelElements = labels.map((label, index) => {
    const angle = index * angleStep - Math.PI / 2;
    const labelRadius = radius + 30;
    const x = centerX + labelRadius * Math.cos(angle);
    const y = centerY + labelRadius * Math.sin(angle);

    // テキストの配置を調整
    let textAnchor: "start" | "middle" | "end" = "middle";
    if (index === 0 || index === 3) textAnchor = "middle";
    else if (index < 3) textAnchor = "end";
    else textAnchor = "start";

    return (
      <text
        key={index}
        x={x}
        y={y}
        textAnchor={textAnchor}
        fontSize="12"
        fill="#374151"
        fontWeight="500"
        className="select-none"
      >
        {label}
      </text>
    );
  });

  return (
    <div className="w-full flex flex-col items-center">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-pink-100">
        <svg
          viewBox="0 0 400 400"
          className="w-full max-w-md h-auto"
          style={{ maxHeight: "400px" }}
        >
          {/* グリッド線 */}
          {gridLines}
          {/* 軸線 */}
          {axes}
          {/* Beforeのパス（基準線） */}
          <path
            d={beforePath}
            fill="rgba(236, 72, 153, 0.15)"
            stroke="rgb(236, 72, 153)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeDasharray="5,5"
            opacity="0.8"
          />
          {/* Afterのパス */}
          <path
            d={afterPath}
            fill="rgba(34, 197, 94, 0.25)"
            stroke="rgb(34, 197, 94)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* ラベル */}
          {labelElements}
        </svg>
        {/* 凡例 */}
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-pink-500 rounded" style={{ opacity: 0.8 }}></div>
            <span className="text-sm text-gray-700 font-medium">Before（基準）</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-700 font-medium">After（変化率）</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">
          ※ Beforeを100%として、Afterの変化率を表示しています
        </p>
      </div>
    </div>
  );
}

