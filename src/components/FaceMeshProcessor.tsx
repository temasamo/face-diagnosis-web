"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// MediaPipe FaceMeshを動的インポート
const FaceMesh = dynamic(() => import("@mediapipe/face_mesh").then(mod => ({ default: mod.FaceMesh })), {
  ssr: false,
});

const Results = dynamic(() => import("@mediapipe/face_mesh").then(mod => ({ default: mod.Results })), {
  ssr: false,
});

interface FaceMeshResult {
  faceLiftAngle: { before: number; after: number; diff: number };
  lowerFaceRatio: { before: number; after: number; diff: number };
  aiSummary: {
    trend: string;
    liftScore: number;
    comment: string;
  };
}

interface FaceMeshProcessorProps {
  beforeImage: string;
  afterImage: string;
  onResult: (result: FaceMeshResult | { error: string }) => void;
}

// ランドマークID定義（MediaPipe FaceMesh 468点仕様）
const LANDMARKS = {
  EYE_OUTER: 263,    // 右目外側（目尻）
  MOUTH_CORNER: 61,  // 右口角
  CHIN: 152,         // 顎先
  NOSE_BOTTOM: 2,    // 鼻下
} as const;

// フェイスリフト角度計算（目尻→口角→顎先）
function calcFaceLiftAngle(landmarks: any[]): number {
  const eye = landmarks[LANDMARKS.EYE_OUTER];
  const mouth = landmarks[LANDMARKS.MOUTH_CORNER];
  const chin = landmarks[LANDMARKS.CHIN];
  
  const angle = Math.abs(
    (Math.atan2(chin.y - mouth.y, chin.x - mouth.x) -
     Math.atan2(eye.y - mouth.y, eye.x - mouth.x)) *
    (180 / Math.PI)
  );
  
  return angle;
}

// 下顔面比率計算（鼻下→口角→顎先）
function calcLowerFaceRatio(landmarks: any[]): number {
  const nose = landmarks[LANDMARKS.NOSE_BOTTOM];
  const mouth = landmarks[LANDMARKS.MOUTH_CORNER];
  const chin = landmarks[LANDMARKS.CHIN];
  
  const ratio = ((chin.y - mouth.y) / (chin.y - nose.y)) * 100;
  return ratio;
}

// 静的画像からランドマークを取得
async function detectLandmarks(base64Image: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    
    faceMesh.setOptions({
      staticImageMode: true,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
    });

    faceMesh.onResults((results: Results) => {
      if (!results.multiFaceLandmarks?.length) {
        reject(new Error("顔が検出されませんでした"));
        return;
      }
      resolve(results.multiFaceLandmarks[0]);
    });
    
    // 画像を読み込んでFaceMeshに送信
    const img = new Image();
    img.src = base64Image;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context取得に失敗"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      faceMesh.send({ image: canvas });
    };
    img.onerror = () => reject(new Error("画像の読み込みに失敗"));
  });
}

export default function FaceMeshProcessor({ beforeImage, afterImage, onResult }: FaceMeshProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!beforeImage || !afterImage) return;

    const processImages = async () => {
      setIsProcessing(true);
      setProgress(0);

      try {
        // Before画像の処理
        setProgress(25);
        const beforeLandmarks = await detectLandmarks(beforeImage);
        
        // After画像の処理
        setProgress(75);
        const afterLandmarks = await detectLandmarks(afterImage);
        
        // 各指標の計算
        const beforeAngle = calcFaceLiftAngle(beforeLandmarks);
        const afterAngle = calcFaceLiftAngle(afterLandmarks);
        const beforeRatio = calcLowerFaceRatio(beforeLandmarks);
        const afterRatio = calcLowerFaceRatio(afterLandmarks);
        
        // 差分計算
        const angleDiff = afterAngle - beforeAngle;
        const ratioDiff = afterRatio - beforeRatio;
        
        // フェイスリフト指数計算
        const liftScore = (angleDiff * 0.6) + ((-ratioDiff) * 0.4);
        
        // AI判定
        const trend = liftScore > 0 ? "リフトアップ傾向" : "たるみ傾向";
        const comment = liftScore > 0
          ? "フェイスラインが上方向に引き上げられています。"
          : "口角〜顎ラインに軽度の下垂傾向が見られます。";
        
        setProgress(100);
        
        const result: FaceMeshResult = {
          faceLiftAngle: {
            before: beforeAngle,
            after: afterAngle,
            diff: angleDiff,
          },
          lowerFaceRatio: {
            before: beforeRatio,
            after: afterRatio,
            diff: ratioDiff,
          },
          aiSummary: {
            trend,
            liftScore,
            comment,
          },
        };
        
        onResult(result);
      } catch (error) {
        console.error("FaceMesh解析エラー:", error);
        onResult({
          error: error instanceof Error ? error.message : "FaceMesh解析に失敗しました",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    processImages();
  }, [beforeImage, afterImage, onResult]);

  if (!isProcessing) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">FaceMesh解析中...</h3>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600">
          {progress < 50 ? "Before画像を解析中..." : "After画像を解析中..."}
        </p>
      </div>
    </div>
  );
}
