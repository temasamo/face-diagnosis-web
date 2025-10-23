// src/utils/faceMeshHelpers.ts
import { FaceMesh } from "@mediapipe/face_mesh";
import { createCanvas, loadImage } from "canvas";

// Type definitions for FaceMesh
interface FaceMeshResults {
  multiFaceLandmarks?: number[][][];
}

interface FaceMeshAnalysisResult {
  success: boolean;
  detectionConfidence: number;
  landmarks: number;
}

// 画像を静的にFaceMeshで解析する関数
export async function analyzeWithFaceMesh(base64Image: string): Promise<FaceMeshAnalysisResult> {
  return new Promise(async (resolve, reject) => {
    try {
      const faceMesh = new FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      const canvas = createCanvas(256, 256);
      const ctx = canvas.getContext("2d");
      const img = await loadImage(base64Image);
      ctx.drawImage(img, 0, 0, 256, 256);

      let resultsData: FaceMeshResults | null = null;

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results: unknown) => {
        resultsData = results as FaceMeshResults;
      });

      await faceMesh.send({ image: canvas as unknown as HTMLCanvasElement });
      if (!resultsData) throw new Error("FaceMesh解析結果が空です。");

      resolve({
        success: true,
        detectionConfidence:
          (resultsData as FaceMeshResults).multiFaceLandmarks?.[0]?.length ? 1.0 : 0.0,
        landmarks: (resultsData as FaceMeshResults).multiFaceLandmarks?.[0]?.length ?? 0,
      });
    } catch (error) {
      console.error("❌ FaceMesh解析失敗:", error);
      reject(error);
    }
  });
}