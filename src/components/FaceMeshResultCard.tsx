import React from "react";
import Image from "next/image";

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
  // 補正結果
  correctedWidthChange?: number;
  correctedHeightChange?: number;
  reliability?: string;
  dx?: number;
  dy?: number;
}

interface FaceMeshResultCardProps {
  faceMesh: FaceMeshMetrics;
}

export default function FaceMeshResultCard({ faceMesh }: FaceMeshResultCardProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-6">
      <h3 className="text-lg font-semibold text-blue-700 mb-4">
        🧠 精密数値測定結果（FaceMesh単独）
        {faceMesh.reliability && (
          <span className={`ml-2 text-sm px-2 py-1 rounded ${
            faceMesh.reliability === "高" 
              ? "bg-green-100 text-green-700" 
              : "bg-yellow-100 text-yellow-700"
          }`}>
            信頼度: {faceMesh.reliability}
          </span>
        )}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <MetricWithIllustration
          label="顔の幅変化"
          value={faceMesh.correctedWidthChange !== undefined ? 
            `${faceMesh.correctedWidthChange.toFixed(1)}%` : 
            `${(faceMesh.faceWidthChange * 100).toFixed(1)}%`}
          diff={faceMesh.correctedWidthChange !== undefined ? 
            `${faceMesh.correctedWidthChange.toFixed(1)}%` : 
            `${(faceMesh.faceWidthChange * 100).toFixed(1)}%`}
          image="/images/metrics/face-width.svg"
          desc={faceMesh.reliability === "高" ? "顔の横幅の変化率（補正済み）" : "顔の横幅の変化率"}
        />

        <MetricWithIllustration
          label="顔の長さ変化"
          value={faceMesh.correctedHeightChange !== undefined ? 
            `${faceMesh.correctedHeightChange.toFixed(1)}%` : 
            `${(faceMesh.faceHeightChange * 100).toFixed(1)}%`}
          diff={faceMesh.correctedHeightChange !== undefined ? 
            `${faceMesh.correctedHeightChange.toFixed(1)}%` : 
            `${(faceMesh.faceHeightChange * 100).toFixed(1)}%`}
          image="/images/metrics/face-height.svg"
          desc={faceMesh.reliability === "高" ? "顔の縦幅の変化率（補正済み）" : "顔の縦幅の変化率"}
        />

        <MetricWithIllustration
          label="フェイスライン角度"
          value={`${faceMesh.faceLineAngle.toFixed(2)}°`}
          image="/images/metrics/face-line.svg"
          desc="顎先から耳下までの傾き"
        />

        <MetricWithIllustration
          label="頬の膨らみ度"
          value={faceMesh.cheekVolume.toFixed(3)}
          image="/images/metrics/cheek-volume.svg"
          desc="頬骨と頬中央の距離"
        />

        <MetricWithIllustration
          label="顔の左右対称性スコア"
          value={faceMesh.symmetryIndex.toFixed(3)}
          image="/images/metrics/symmetry.svg"
          desc="左右バランスの整い度"
        />

        <MetricWithIllustration
          label="目尻リフト角度"
          value={`${faceMesh.eyeLiftAngle.toFixed(2)}°`}
          image="/images/metrics/eye-lift.svg"
          desc="目尻の上がり具合"
        />

        <MetricWithIllustration
          label="口角角度"
          value={`${faceMesh.mouthCornerAngle.toFixed(2)}°`}
          image="/images/metrics/mouth-corner.svg"
          desc="口角の傾き"
        />

        <MetricWithIllustration
          label="下顔面比率"
          value={faceMesh.lowerFaceRatio.toFixed(3)}
          image="/images/metrics/lower-face.svg"
          desc="鼻下〜顎の比率"
        />

        <MetricWithIllustration
          label="頬下ライン曲率"
          value={faceMesh.jawCurve.toFixed(3)}
          image="/images/metrics/jaw-curve.svg"
          desc="顎ラインの曲がり具合"
        />

        <MetricWithIllustration
          label="顎ライン非対称度"
          value={faceMesh.chinAsymmetry.toFixed(3)}
          image="/images/metrics/chin-asymmetry.svg"
          desc="顎の左右バランス"
        />

        {faceMesh.balanceRatio && (
          <MetricWithIllustration
            label="顔全体バランス比"
            value={faceMesh.balanceRatio.toFixed(3)}
            image="/images/metrics/balance-ratio.svg"
            desc="黄金比によるバランス"
          />
        )}

        {faceMesh.midFaceHarmony && (
          <MetricWithIllustration
            label="鼻・口位置バランス"
            value={faceMesh.midFaceHarmony.toFixed(3)}
            image="/images/metrics/mid-face.svg"
            desc="鼻と口の位置関係"
          />
        )}
      </div>
    </div>
  );
}

interface MetricWithIllustrationProps {
  label: string;
  value: string;
  diff?: string;
  desc: string;
  image: string;
}

function MetricWithIllustration({ label, value, diff, desc, image }: MetricWithIllustrationProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 flex flex-col items-center text-center">
      <div className="font-semibold text-gray-800 mb-1">{label}</div>
      <Image
        src={image}
        alt={label}
        width={60}
        height={60}
        className="mb-2 opacity-80"
      />
      <div className="text-blue-600 text-base font-medium">{value}</div>
      {diff && (
        <div
          className={`text-xs ${
            Number(diff) < 0 ? "text-green-600" : "text-red-500"
          }`}
        >
          変化量: {diff}
        </div>
      )}
      <div className="text-xs text-gray-500 mt-1">{desc}</div>
    </div>
  );
}
