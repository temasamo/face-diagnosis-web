import React from "react";

interface VisionResults {
  success: boolean;
  diff?: {
    measurements?: {
      faceWidth?: { before: number; after: number; change: number; unit: string };
      faceHeight?: { before: number; after: number; change: number; unit: string };
      eyeDistance?: { before: number; after: number; change: number; unit: string };
      eyebrowToEyeDistance?: { before: number; after: number; change: number; unit: string };
      faceLiftAngle?: { before: number; after: number; change: number; unit: string };
      lowerFaceRatio?: { before: number; after: number; change: number; unit: string };
    };
    detectionConfidence?: { before: number; after: number };
  };
  comment?: string;
}

interface FaceMeshMetrics {
  faceWidthChange: number;
  faceHeightChange: number;
  faceLineAngle: number;
  cheekVolume: number;
  symmetryIndex: number;
  eyeLiftAngle: number;
  mouthCornerAngle: number;
  lowerFaceRatio: number;
  jawCurve: number;
  chinAsymmetry: number;
  balanceRatio?: number;
  midFaceHarmony?: number;
}

interface PrecisionResultCardProps {
  vision: VisionResults;
  faceMesh: FaceMeshMetrics;
}

export default function PrecisionResultCard({ vision, faceMesh }: PrecisionResultCardProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-6">
      <h3 className="text-lg font-semibold text-blue-700 mb-4">
        📏 精密数値測定結果（Vision＋FaceMesh統合）
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        {/* Vision API既存項目 */}
        <Metric 
          label="顔の幅" 
          value={vision.diff?.measurements?.faceWidth?.after} 
          diff={vision.diff?.measurements?.faceWidth?.change} 
          unit={vision.diff?.measurements?.faceWidth?.unit} 
        />
        <Metric 
          label="顔の長さ" 
          value={vision.diff?.measurements?.faceHeight?.after} 
          diff={vision.diff?.measurements?.faceHeight?.change} 
          unit={vision.diff?.measurements?.faceHeight?.unit} 
        />
        <Metric 
          label="目の間隔" 
          value={vision.diff?.measurements?.eyeDistance?.change} 
          unit={vision.diff?.measurements?.eyeDistance?.unit} 
        />
        <Metric 
          label="眉と目の距離" 
          value={vision.diff?.measurements?.eyebrowToEyeDistance?.change} 
          unit={vision.diff?.measurements?.eyebrowToEyeDistance?.unit} 
        />
        <Metric 
          label="フェイスリフト角度" 
          value={vision.diff?.measurements?.faceLiftAngle?.change} 
          unit={vision.diff?.measurements?.faceLiftAngle?.unit} 
        />
        <Metric 
          label="下顔面比率" 
          value={vision.diff?.measurements?.lowerFaceRatio?.change} 
          unit={vision.diff?.measurements?.lowerFaceRatio?.unit} 
        />
        <Metric 
          label="AI総合判定" 
          value={vision.comment ? "分析完了" : "データなし"} 
        />
        <Metric 
          label="検出信頼度" 
          value={vision.diff?.detectionConfidence?.after ? (vision.diff.detectionConfidence.after * 100).toFixed(1) : "N/A"} 
          unit="%" 
        />

        {/* FaceMesh拡張項目 */}
        <Metric 
          label="フェイスライン角度" 
          value={faceMesh.faceLineAngle.toFixed(2)} 
          unit="°" 
        />
        <Metric 
          label="頬の膨らみ度" 
          value={faceMesh.cheekVolume.toFixed(2)} 
        />
        <Metric 
          label="顔の左右対称性スコア" 
          value={faceMesh.symmetryIndex.toFixed(3)} 
        />
        <Metric 
          label="目尻リフト角度" 
          value={faceMesh.eyeLiftAngle.toFixed(2)} 
          unit="°" 
        />
        <Metric 
          label="口角角度" 
          value={faceMesh.mouthCornerAngle.toFixed(2)} 
          unit="°" 
        />
        <Metric 
          label="頬下ライン曲率" 
          value={faceMesh.jawCurve.toFixed(2)} 
        />
        <Metric 
          label="顔全体バランス比" 
          value={faceMesh.balanceRatio?.toFixed(3) || "N/A"} 
        />
        <Metric 
          label="鼻・口位置バランス" 
          value={faceMesh.midFaceHarmony?.toFixed(3) || "N/A"} 
        />
        <Metric 
          label="顎ライン非対称度" 
          value={faceMesh.chinAsymmetry.toFixed(2)} 
          unit="%" 
        />
      </div>
    </div>
  );
}

interface MetricProps {
  label: string;
  value: string | number | undefined;
  diff?: number;
  unit?: string;
}

function Metric({ label, value, diff, unit }: MetricProps) {
  return (
    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
      <div className="font-semibold text-gray-700">{label}</div>
      <div className="text-blue-600 mt-1">
        {value ?? "-"}
        {unit}
      </div>
      {diff !== undefined && (
        <div className="text-xs text-gray-500">
          変化量: {diff > 0 ? "+" : ""}{diff}{unit}
        </div>
      )}
    </div>
  );
}
