import { FaceMesh } from "@mediapipe/face_mesh";
import { Results } from "@mediapipe/face_mesh";

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

// 静的画像からランドマークを取得（ブラウザサイド専用）
export async function analyzeWithFaceMesh(base64Image: string): Promise<{
  faceLiftAngle: { before: number; after: number; diff: number };
  lowerFaceRatio: { before: number; after: number; diff: number };
  aiSummary: {
    trend: string;
    liftScore: number;
    comment: string;
  };
} | { error: string }> {
  try {
    // ブラウザ環境チェック
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return { error: "FaceMesh処理はブラウザ環境でのみ実行可能です" };
    }

    // Base64 → Image変換
    const img = new Image();
    img.src = base64Image;
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    // FaceMesh初期化
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    
    faceMesh.setOptions({
      staticImageMode: true,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
    });

    // ランドマーク検出
    const landmarks = await new Promise<any[]>((resolve, reject) => {
      faceMesh.onResults((results: Results) => {
        if (!results.multiFaceLandmarks?.length) {
          reject(new Error("顔が検出されませんでした"));
          return;
        }
        resolve(results.multiFaceLandmarks[0]);
      });
      
      // Canvasに画像を描画してFaceMeshに送信
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
    });

    // 各指標の計算
    const faceLiftAngle = calcFaceLiftAngle(landmarks);
    const lowerFaceRatio = calcLowerFaceRatio(landmarks);
    
    // ダミーデータ（実際のBefore/After比較は別途実装）
    const beforeAngle = faceLiftAngle;
    const afterAngle = faceLiftAngle + (Math.random() - 0.5) * 2; // ランダムな変化
    const beforeRatio = lowerFaceRatio;
    const afterRatio = lowerFaceRatio + (Math.random() - 0.5) * 0.1; // ランダムな変化
    
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
    
    return {
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
  } catch (error) {
    console.error("FaceMesh解析エラー:", error);
    return {
      error: error instanceof Error ? error.message : "FaceMesh解析に失敗しました",
    };
  }
}