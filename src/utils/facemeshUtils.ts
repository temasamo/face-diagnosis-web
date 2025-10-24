// src/utils/facemeshUtils.ts

export type Landmark = { x: number; y: number; z: number };

interface FaceMetrics {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/**
 * FaceMeshのランドマーク座標をpx単位に変換し、顔の寸法を計算
 */
export function computeFaceMetrics(landmarks: Landmark[], imageWidth: number, imageHeight: number): FaceMetrics {
  if (!landmarks || landmarks.length === 0) {
    throw new Error("ランドマークが存在しません。");
  }

  // 正規化座標 → ピクセル変換
  const points = landmarks.map(p => ({
    x: p.x * imageWidth,
    y: p.y * imageHeight,
  }));

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = maxX - minX;
  const height = maxY - minY;

  const centerX = (maxX + minX) / 2;
  const centerY = (maxY + minY) / 2;

  return { width, height, centerX, centerY };
}

/**
 * Before/After画像の顔の差異を補正して変化率を計算
 */
export function compareFaceMetrics(before: FaceMetrics, after: FaceMetrics) {
  // アラインメント補正（顔の中心を一致）
  const dx = after.centerX - before.centerX;
  const dy = after.centerY - before.centerY;

  // 比率補正（画像サイズ差を無視する）
  const widthChange = ((after.width - before.width) / before.width) * 100;
  const heightChange = ((after.height - before.height) / before.height) * 100;

  // 実際の誤差が±3%以内なら信頼できる
  const reliability =
    Math.abs(widthChange) < 3 && Math.abs(heightChange) < 3 ? "高" : "低";

  return {
    widthChange: parseFloat(widthChange.toFixed(2)),
    heightChange: parseFloat(heightChange.toFixed(2)),
    dx: parseFloat(dx.toFixed(2)),
    dy: parseFloat(dy.toFixed(2)),
    reliability,
  };
}

/**
 * 統合処理：Before/AfterのFaceMeshデータから結果を返す
 */
export function analyzeFaceMeshDifference(
  beforeLandmarks: Landmark[],
  afterLandmarks: Landmark[],
  imageWidth: number,
  imageHeight: number
) {
  const beforeMetrics = computeFaceMetrics(beforeLandmarks, imageWidth, imageHeight);
  const afterMetrics = computeFaceMetrics(afterLandmarks, imageWidth, imageHeight);

  return compareFaceMetrics(beforeMetrics, afterMetrics);
}
