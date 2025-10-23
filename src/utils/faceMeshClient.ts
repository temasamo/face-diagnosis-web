// src/utils/faceMeshClient.ts
export async function runFaceMesh(base64Image: string) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("FaceMesh解析開始...");

      // ✅ ここで動的 import（ESM対応）
      const mp = await import("@mediapipe/face_mesh");

      // ✅ Global export対応
      const FaceMesh = mp.FaceMesh || (window as any).FaceMesh;
      if (!FaceMesh) {
        throw new Error("FaceMesh モジュールが読み込めませんでした");
      }

      const faceMesh = new FaceMesh({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      let resultData: any = null;

      faceMesh.onResults((results: any) => {
        console.log("FaceMesh結果:", results);
        if (results.multiFaceLandmarks?.[0]) {
          resultData = {
            detectionConfidence: 1.0,
            landmarks: results.multiFaceLandmarks[0].length,
          };
        } else {
          resultData = { detectionConfidence: 0, landmarks: 0 };
        }
        resolve(resultData);
      });

      // base64画像 → canvas で送信
      const img = new Image();
      img.src = base64Image;
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0, img.width, img.height);
        await faceMesh.send({ image: canvas });
      };
    } catch (err) {
      console.error("❌ FaceMeshブラウザ解析エラー:", err);
      reject(err);
    }
  });
}