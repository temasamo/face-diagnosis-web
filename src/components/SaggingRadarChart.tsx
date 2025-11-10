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

  // 各項目の最大値と最小値を計算（全項目を通して）
  const getAllValues = () => {
    const allValues: number[] = [];
    labels.forEach((_, index) => {
      allValues.push(getValue(index, true)); // Before
      allValues.push(getValue(index, false)); // After
    });
    return allValues;
  };

  const allValues = getAllValues();
  const globalMin = Math.min(...allValues);
  const globalMax = Math.max(...allValues);
  const globalRange = globalMax - globalMin;

  // 値を0-100%の範囲に正規化（各項目ごとに独立して正規化）
  const normalizeToPercent = (value: number, index: number): number => {
    // 各項目の最大値と最小値を計算
    const beforeValue = getValue(index, true);
    const afterValue = getValue(index, false);
    const itemMin = Math.min(beforeValue, afterValue);
    const itemMax = Math.max(beforeValue, afterValue);
    const itemRange = itemMax - itemMin;

    if (itemRange === 0) {
      // 変化がない場合は50%に設定
      return 50;
    }

    // 値を0-100%の範囲に正規化
    // 注意: これらの指標は「減少が改善」なので、値が小さいほど良い
    // レーダーチャートでは外側が良いので、値が小さいほど外側に表示
    const normalized = ((itemMax - value) / itemRange) * 100;
    return Math.max(0, Math.min(100, normalized));
  };

  // Beforeを基準（100%）として、Afterの変化率を計算
  // 各項目の値をパーセンテージで正規化して表示
  const getNormalizedValue = (before: number, after: number, isBefore: boolean, index: number) => {
    if (isBefore) {
      // Beforeは常に100%（基準線）
      return 100;
    } else {
      // AfterはBeforeに対する変化率（%）
      if (before === 0) return 100; // ゼロ除算を防ぐ
      
      // BeforeとAfterの値を正規化
      const beforeNormalized = normalizeToPercent(before, index);
      const afterNormalized = normalizeToPercent(after, index);
      
      // Beforeを100%として、Afterの変化率を計算
      if (beforeNormalized === 0) return 100; // ゼロ除算を防ぐ
      const changePercent = (afterNormalized / beforeNormalized) * 100;
      
      // 改善している場合（値が減った = afterNormalized > beforeNormalized）は外側に表示
      if (afterNormalized > beforeNormalized) {
        // 改善している場合: 100%以上に設定
        return Math.min(150, 100 + (afterNormalized - beforeNormalized) * 2);
      } else if (afterNormalized < beforeNormalized) {
        // 悪化している場合: 100%未満に設定
        return Math.max(50, changePercent);
      } else {
        // 変化なし
        return 100;
      }
    }
  };

  // 四角形の頂点の角度（4つの項目）
  const angleStep = (2 * Math.PI) / 4;
  const centerX = 200;
  const centerY = 200;
  const radius = 150;

  // 各頂点の座標を計算（変化率を0-100%の範囲にマッピング）
  const getPoint = (index: number, normalizedPercent: number) => {
    const angle = (index * angleStep) - (Math.PI / 2); // 上から開始
    // 変化率を半径にマッピング（100%が最大半径、0%が中心、150%も最大半径）
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
      const before = getValue(index, true);
      const after = getValue(index, false);
      
      const normalizedPercent = getNormalizedValue(before, after, isBefore, index);
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
          ※ Beforeを100%として、Afterの変化率を表示しています。改善している項目は外側に表示されます。
        </p>
      </div>
    </div>
  );
}

