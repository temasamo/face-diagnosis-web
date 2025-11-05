"use client";

import React from "react";

interface FaceDiagnosisResultProps {
  data: {
    success: boolean;
    diff?: {
      measurements?: {
        faceWidth?: {
          before: number;
          after: number;
          change: number;
          unit: string;
        };
        faceHeight?: {
          before: number;
          after: number;
          change: number;
          unit: string;
        };
        eyeDistance?: {
          before: number;
          after: number;
          change: number;
          unit: string;
        };
        eyebrowToEyeDistance?: {
          before: number;
          after: number;
          change: number;
          unit: string;
        };
        faceLiftAngle?: {
          before: number;
          after: number;
          change: number;
          unit: string;
        };
        lowerFaceRatio?: {
          before: number;
          after: number;
          change: number;
          changePercent?: number;
          unit: string;
        };
      };
      skinAnalysis?: {
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
    };
    comment?: string;
    faceLiftIndex?: number;
    message?: string;
  };
}

export function FaceDiagnosisResult({ data }: FaceDiagnosisResultProps) {
  if (!data.success) {
    return (
      <div className="w-full bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-600">{data.message || "診断に失敗しました"}</p>
      </div>
    );
  }

  const measurements = data.diff?.measurements;
  const skinAnalysis = data.diff?.skinAnalysis;

  return (
    <div className="w-full bg-gray-50 rounded-xl p-6 shadow">
      <h2 className="text-lg font-bold mb-4 text-center text-gray-900">顔診断結果</h2>

      {/* 総合評価 */}
      {data.faceLiftIndex !== undefined && (
        <div className="mb-6 text-center">
          <p className="text-sm text-gray-800 mb-1">フェイスリフト指数</p>
          <p className="text-2xl font-bold text-blue-600">{data.faceLiftIndex}</p>
        </div>
      )}

      {/* 精密数値測定結果 */}
      {measurements && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-gray-900">
            精密数値測定結果
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {measurements.faceWidth && (
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-700 mb-1">顔の幅</p>
                <p className="font-semibold text-gray-900">
                  {measurements.faceWidth.after.toFixed(1)}
                  {measurements.faceWidth.unit}
                </p>
                {measurements.faceWidth.change !== 0 && (
                  <p
                    className={`text-xs mt-1 ${
                      measurements.faceWidth.change > 0
                        ? "text-green-600"
                        : "text-red-500"
                    }`}
                  >
                    {measurements.faceWidth.change > 0 ? "+" : ""}
                    {measurements.faceWidth.change.toFixed(1)}
                    {measurements.faceWidth.unit}
                  </p>
                )}
              </div>
            )}

            {measurements.faceHeight && (
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-700 mb-1">顔の長さ</p>
                <p className="font-semibold text-gray-900">
                  {measurements.faceHeight.after.toFixed(1)}
                  {measurements.faceHeight.unit}
                </p>
                {measurements.faceHeight.change !== 0 && (
                  <p
                    className={`text-xs mt-1 ${
                      measurements.faceHeight.change > 0
                        ? "text-green-600"
                        : "text-red-500"
                    }`}
                  >
                    {measurements.faceHeight.change > 0 ? "+" : ""}
                    {measurements.faceHeight.change.toFixed(1)}
                    {measurements.faceHeight.unit}
                  </p>
                )}
              </div>
            )}

            {measurements.eyeDistance && (
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-700 mb-1">目の間隔</p>
                <p className="font-semibold text-gray-900">
                  {measurements.eyeDistance.after.toFixed(1)}
                  {measurements.eyeDistance.unit}
                </p>
                {measurements.eyeDistance.change !== 0 && (
                  <p
                    className={`text-xs mt-1 ${
                      measurements.eyeDistance.change > 0
                        ? "text-green-600"
                        : "text-red-500"
                    }`}
                  >
                    {measurements.eyeDistance.change > 0 ? "+" : ""}
                    {measurements.eyeDistance.change.toFixed(1)}
                    {measurements.eyeDistance.unit}
                  </p>
                )}
              </div>
            )}

            {measurements.lowerFaceRatio && (
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-700 mb-1">下顔面比率</p>
                <p className="font-semibold text-gray-900">
                  {measurements.lowerFaceRatio.after.toFixed(3)}
                </p>
                {measurements.lowerFaceRatio.change !== 0 && (
                  <p
                    className={`text-xs mt-1 ${
                      measurements.lowerFaceRatio.change < 0
                        ? "text-green-600"
                        : "text-red-500"
                    }`}
                  >
                    {measurements.lowerFaceRatio.change > 0 ? "+" : ""}
                    {measurements.lowerFaceRatio.changePercent !== undefined
                      ? measurements.lowerFaceRatio.changePercent.toFixed(1)
                      : (measurements.lowerFaceRatio.change * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 肌の状態分析結果 */}
      {skinAnalysis && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-gray-900">
            肌の状態分析結果
          </h3>
          <div className="bg-white p-4 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-800">明度</span>
              <span className="font-semibold text-gray-900">
                {skinAnalysis.after.skinQuality.brightness}
              </span>
              {skinAnalysis.improvements.brightness !== 0 && (
                <span
                  className={`ml-2 ${
                    skinAnalysis.improvements.brightness > 0
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  {skinAnalysis.improvements.brightness > 0 ? "+" : ""}
                  {skinAnalysis.improvements.brightness}
                </span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-gray-800">彩度</span>
              <span className="font-semibold text-gray-900">
                {skinAnalysis.after.skinQuality.saturation}
              </span>
              {skinAnalysis.improvements.saturation !== 0 && (
                <span
                  className={`ml-2 ${
                    skinAnalysis.improvements.saturation < 0
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  {skinAnalysis.improvements.saturation > 0 ? "+" : ""}
                  {skinAnalysis.improvements.saturation}
                </span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-gray-800">均一性</span>
              <span className="font-semibold text-gray-900">
                {skinAnalysis.after.skinQuality.evenness}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-800">トーン</span>
              <span className="font-semibold text-gray-900">
                {skinAnalysis.after.skinQuality.tone}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* AIコメント */}
      {data.comment && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {data.comment}
          </p>
        </div>
      )}
    </div>
  );
}

