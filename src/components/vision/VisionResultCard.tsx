"use client";
import React from "react";
import { LabSkinMetricsCard } from "./LabSkinMetricsCard";

interface VisionResultCardProps {
  vision: {
    summary?: string;
    aiSummary?: string;
    measurements?: Record<string, unknown>;
    [key: string]: unknown;
  };
  lab?: {
    L_mean: number;
    a_mean: number;
    b_mean: number;
    uniformity: number;
    brightness?: number;
    redness?: number;
    yellowness?: number;
  } | null;
  beforeLab?: {
    L_mean: number;
    a_mean: number;
    b_mean: number;
    uniformity: number;
  } | null;
}

export function VisionResultCard({ vision, lab, beforeLab }: VisionResultCardProps) {
  return (
    <div className="p-4 rounded-2xl bg-gray-50 shadow-sm w-full max-w-2xl">
      <h2 className="text-lg font-bold mb-3 text-gray-800">Vision診断結果</h2>

      {/* 既存Vision出力 */}
      <div className="mb-4 text-sm text-gray-700">
        {vision.summary || vision.aiSummary || "解析中…"}
      </div>

      {/* LAB分析結果 */}
      {lab && <LabSkinMetricsCard metrics={lab} beforeMetrics={beforeLab} />}
    </div>
  );
}
