"use client";

import React from "react";

interface RadarChartProps {
  measurements: {
    faceWidth: { before: number; after: number };
    faceHeight: { before: number; after: number };
    eyeDistance: { before: number; after: number };
    eyebrowToEyeDistance: { before: number; after: number };
    faceLiftAngle: { before: number; after: number };
    lowerFaceRatio: { before: number; after: number };
  };
}

export function RadarChart({ measurements }: RadarChartProps) {
  // 各項目のラベル
  const labels = [
    "顔の幅",
    "顔の長さ",
    "目の間隔",
    "眉毛と目の距離",
    "フェイスリフト角度",
    "下顔面比率",
  ];

  // 各項目の値を取得
  const values = {
    faceWidth: [measurements.faceWidth.before, measurements.faceWidth.after],
    faceHeight: [measurements.faceHeight.before, measurements.faceHeight.after],
    eyeDistance: [measurements.eyeDistance.before, measurements.eyeDistance.after],
    eyebrowToEyeDistance: [
      measurements.eyebrowToEyeDistance.before,
      measurements.eyebrowToEyeDistance.after,
    ],
    faceLiftAngle: [measurements.faceLiftAngle.before, measurements.faceLiftAngle.after],
    lowerFaceRatio: [
      measurements.lowerFaceRatio.before,
      measurements.lowerFaceRatio.after,
    ],
  };

  // Beforeを基準（100%）として、Afterの変化率を計算
  // 各項目のBefore値を基準として、Afterの相対的な変化を表示
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
      const key = Object.keys(values)[index] as keyof typeof values;
      const before = values[key][0];
      const after = values[key][1];
      const normalizedPercent = getNormalizedValue(before, after, isBefore);
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
      <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-100">
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
            fill="rgba(59, 130, 246, 0.15)"
            stroke="rgb(59, 130, 246)"
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
            <div className="w-4 h-4 bg-blue-500 rounded" style={{ opacity: 0.8 }}></div>
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

