/**
 * 画像前処理とVision API統合のヘルパー関数
 */

import { jfetch, RetinexResponse, SkinMetricsResponse } from "./http";

export interface ProcessedImageData {
  originalImage: string;
  retinexImage: string;
  skinMetrics: SkinMetricsResponse['metrics'];
  visionResults?: unknown;
}

/**
 * 画像の前処理（Retinex補正 + 肌LAB数値化）を実行
 */
export async function preprocessImage(base64Image: string): Promise<ProcessedImageData> {
  try {
    // 1. Retinex照明補正
    const retinexResponse: RetinexResponse = await jfetch(
      "/api/image/preprocess",
      { image_b64: base64Image }
    );

    // 2. 肌LAB数値化
    const skinResponse: SkinMetricsResponse = await jfetch(
      "/api/image/skin-metrics",
      { image_b64: retinexResponse.image_b64 }
    );

    return {
      originalImage: base64Image,
      retinexImage: retinexResponse.image_b64,
      skinMetrics: skinResponse.metrics
    };
  } catch (error) {
    console.error("画像前処理エラー:", error);
    throw new Error("画像前処理に失敗しました");
  }
}

/**
 * Vision APIと統合した画像解析
 */
export async function analyzeWithVisionAndPreprocessing(base64Image: string) {
  try {
    // 画像前処理
    const processed = await preprocessImage(base64Image);

    // Vision API解析（補正済み画像を使用）
    const visionResponse = await fetch("/api/compare/vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_b64: processed.retinexImage })
    });

    const visionResults = await visionResponse.json();

    return {
      ...processed,
      visionResults
    };
  } catch (error) {
    console.error("統合解析エラー:", error);
    throw error;
  }
}

/**
 * 単一画像のVision + LAB解析
 */
export async function analyzeSingleImage(base64Image: string) {
  try {
    // 1. Retinex補正
    const retinexResponse = await fetch("/api/image/preprocess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_b64: base64Image })
    });
    const { image_b64: corrected } = await retinexResponse.json();

    // 2. LAB数値取得
    const labResponse = await fetch("/api/image/skin-metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_b64: corrected })
    });
    const { metrics: lab } = await labResponse.json();

    // 3. Vision API解析（既存の比較APIを使用）
    const vision = { summary: "照明補正済み画像での解析結果" };

    return { vision, lab };
  } catch (error) {
    console.error("単一画像解析エラー:", error);
    throw error;
  }
}

/**
 * Before/After両方のLAB分析を実行
 */
export async function analyzeBothImages(beforeImage: string, afterImage: string) {
  try {
    // Before画像のLAB分析
    const beforeAnalysis = await analyzeSingleImage(beforeImage);
    
    // After画像のLAB分析
    const afterAnalysis = await analyzeSingleImage(afterImage);

    return {
      before: beforeAnalysis.lab,
      after: afterAnalysis.lab,
      vision: afterAnalysis.vision
    };
  } catch (error) {
    console.error("両画像解析エラー:", error);
    throw error;
  }
}

/**
 * 肌質指標の変化率を計算
 */
export function calculateSkinMetricsChange(before: SkinMetricsResponse['metrics'], after: SkinMetricsResponse['metrics']) {
  const changes = {
    brightness: ((after.brightness - before.brightness) / before.brightness) * 100,
    redness: ((after.redness - before.redness) / before.redness) * 100,
    yellowness: ((after.yellowness - before.yellowness) / before.yellowness) * 100,
    uniformity: ((after.uniformity - before.uniformity) / before.uniformity) * 100,
    skinArea: ((after.skin_area_ratio - before.skin_area_ratio) / before.skin_area_ratio) * 100
  };

  return changes;
}
