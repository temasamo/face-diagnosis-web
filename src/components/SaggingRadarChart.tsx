"use client";

import React from "react";

interface SaggingRadarChartProps {
  data: {
    before: {
      MCD: number;
      JLA: number;
      CDI: number;
      JWR: number;
    };
    after: {
      MCD: number;
      JLA: number;
      CDI: number;
      JWR: number;
    };
    delta: {
      改善率_CDI: number;
      改善率_JLA: number;
      改善率_MCD?: number;
      改善率_JWR?: number;
    };
  };
}

export function SaggingRadarChart({ data }: SaggingRadarChartProps) {
  // 各項目のラベル（4つの主要指標）
  const labels = ["CDI", "JLA", "MCD", "JWR"];

  // 各項目の値を取得
  const getValue = (index: number, isBefore: boolean): number => {
    const key = labels[index];
    if (key === "CDI") {
      return isBefore ? data.before.CDI : data.after.CDI;
    }
    if (key === "JLA") {
      return isBefore ? data.before.JLA : data.after.JLA;
    }
    if (key === "MCD") {
      return isBefore ? data.before.MCD : data.after.MCD;
    }
    if (key === "JWR") {
      return isBefore ? data.before.JWR : data.after.JWR;
    }
    return 0;
  };

  // 改善率を取得
  const getImprovementRate = (index: number): number => {
    const key = labels[index];
    if (key === "CDI") {
      return data.delta.改善率_CDI || 0;
    }
    if (key === "JLA") {
      return data.delta.改善率_JLA || 0;
    }
    if (key === "MCD") {
      return data.delta.改善率_MCD || 0;
    }
    if (key === "JWR") {
      return data.delta.改善率_JWR || 0;
    }
    return 0;
  };

  // Beforeを基準（100%）として、Afterの変化率を計算
  const getNormalizedValue = (index: number, isBefore: boolean): number => {
    if (isBefore) {
      // Beforeは常に100%（基準線）
      return 100;
    } else {
      // AfterはBeforeに対する変化率（%）
      const before = getValue(index, true);
      const after = getValue(index, false);
      
      if (before === 0) return 100; // ゼロ除算を防ぐ
      
      // Beforeを100%として、Afterの変化率を計算
      const changePercent = (after / before) * 100;
      
      // 改善率を取得（正の値 = 改善、負の値 = 悪化）
      const improvementRate = getImprovementRate(index);
      
      // 改善している場合（改善率が正 = 値が減った = 改善）は外側に表示
      if (improvementRate > 0) {
        // 改善している場合: 100%を超えて表示（最大150%まで）
        // 改善率に応じて外側に表示（改善率が大きいほど外側）
        return Math.min(150, 100 + improvementRate * 0.5);
      } else if (improvementRate < 0) {
        // 悪化している場合: 100%未満に表示（最小50%まで）
        // 改善率が負の場合、値が増えているので悪化
        // changePercentは100%を超えるが、内側に表示するために100%から悪化分を引く
        const deteriorationRate = Math.abs(improvementRate); // 悪化率（絶対値）
        const displayPercent = 100 - deteriorationRate * 0.5; // 悪化率に応じて内側に表示
        return Math.max(50, displayPercent);
      } else {
        // 変化なし: 100%
        return 100;
      }
    }
  };

  // 四角形の頂点の角度（4つの項目）
  const angleStep = (2 * Math.PI) / 4;
  const centerX = 200;
  const centerY = 200;
  const radius = 150;

  // 各頂点の座標を計算（変化率を0-150%の範囲にマッピング）
  const getPoint = (index: number, normalizedPercent: number) => {
    const angle = (index * angleStep) - (Math.PI / 2); // 上から開始
    // 変化率を半径にマッピング（100%が基準半径、150%が最大半径、0%が中心）
    // 100%を超える場合は外側に表示
    const r = Math.min(1.5, normalizedPercent / 100) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
    };
  };

  // BeforeとAfterのパスを生成
  const createPath = (isBefore: boolean) => {
    const points: { x: number; y: number }[] = [];

    labels.forEach((_, index) => {
      const normalizedPercent = getNormalizedValue(index, isBefore);
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

  // グリッド線（同心円）を描画（0%, 25%, 50%, 75%, 100%, 125%, 150%）
  const gridLines = [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5].map((scale) => {
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < 4; i++) {
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
    // 150%の最大線も少し強調
    const isMaxLine = scale === 1.5;

    return (
      <path
        key={scale}
        d={path}
        fill="none"
        stroke={isBaseLine ? "#9ca3af" : isMaxLine ? "#cbd5e1" : "#e5e7eb"}
        strokeWidth={isBaseLine ? 2 : isMaxLine ? 1.5 : 1}
        opacity={isBaseLine ? 0.7 : isMaxLine ? 0.6 : 0.5}
        strokeDasharray={isBaseLine ? "3,3" : "none"}
      />
    );
  });

  // 軸線を描画（150%まで延長）
  const axes = labels.map((_, index) => {
    const angle = index * angleStep - Math.PI / 2;
    const x = centerX + radius * 1.5 * Math.cos(angle);
    const y = centerY + radius * 1.5 * Math.sin(angle);
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
    if (index === 0 || index === 2) textAnchor = "middle";
    else if (index === 1) textAnchor = "start";
    else textAnchor = "end";

    return (
      <text
        key={index}
        x={x}
        y={y}
        textAnchor={textAnchor}
        fontSize="14"
        fill="#374151"
        fontWeight="600"
        className="select-none"
      >
        {label}
      </text>
    );
  });

  return (
    <div className="w-full flex flex-col items-center">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <svg
          viewBox="0 0 400 400"
          className="w-full max-w-md h-auto"
          style={{ maxHeight: "400px" }}
        >
          {/* グリッド線 */}
          {gridLines}
          {/* 軸線 */}
          {axes}
          {/* Beforeの塗りつぶし - 先に描画 */}
          {beforePath && (
            <path
              d={beforePath}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="none"
            />
          )}
          {/* Afterの塗りつぶし */}
          {afterPath && (
            <path
              d={afterPath}
              fill="rgba(34, 197, 94, 0.2)"
              stroke="none"
            />
          )}
          {/* Beforeの線（基準線） - 塗りつぶしの後に描画して確実に見えるように */}
          {beforePath && (
            <path
              d={beforePath}
              fill="none"
              stroke="rgb(37, 99, 235)"
              strokeWidth="3.5"
              strokeLinejoin="round"
              strokeDasharray="10,5"
              opacity="1"
            />
          )}
          {/* Afterの線 - 最後に描画 */}
          {afterPath && (
            <path
              d={afterPath}
              fill="none"
              stroke="rgb(34, 197, 94)"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          )}
          {/* ラベル */}
          {labelElements}
        </svg>
        {/* 凡例 */}
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded" style={{ opacity: 0.8 }}></div>
            <span className="text-sm text-gray-700 font-medium">Before（基準）</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-700 font-medium">After（変化率）</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">
          ※ Beforeを100%（基準線）として、Afterの変化率を表示しています。改善している項目は100%を超えて外側に表示されます（最大150%まで）。
        </p>
      </div>
    </div>
  );
}

