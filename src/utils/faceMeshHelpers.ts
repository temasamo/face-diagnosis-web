// src/utils/faceMeshHelpers.ts
import { FaceMesh } from "@mediapipe/face_mesh";
import { createCanvas, loadImage } from "canvas";

// 画像を静的にFaceMeshで解析する関数
export async function analyzeWithFaceMesh(base64Image: string) {
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

      let resultsData: any = null;

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results: any) => {
        resultsData = results;
      });

      await faceMesh.send({ image: canvas });
      if (!resultsData) throw new Error("FaceMesh解析結果が空です。");

      resolve({
        success: true,
        detectionConfidence:
          resultsData.multiFaceLandmarks?.[0]?.length ? 1.0 : 0.0,
        landmarks: resultsData.multiFaceLandmarks?.[0]?.length ?? 0,
      });
    } catch (error) {
      console.error("❌ FaceMesh解析失敗:", error);
      reject(error);
    }
  });
}