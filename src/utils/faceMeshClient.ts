// src/utils/faceMeshClient.ts

// Type definitions for FaceMesh
interface FaceMeshResult {
  detectionConfidence: number;
  landmarks: unknown[]; // 468点すべて保持
}

interface Landmark {
  x: number;
  y: number;
  z: number;
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

// FaceMesh幾何学的測定関数
export function calculateFaceMetrics(landmarksBefore: Landmark[], landmarksAfter: Landmark[]): FaceMeshMetrics {
  const getDist = (a: Landmark, b: Landmark) =>
    Math.sqrt(
      Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2)
    );
  
  const getAngle = (a: Landmark, b: Landmark) => Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);

  // 顔の幅・高さ変化
  const widthBefore = getDist(landmarksBefore[234], landmarksBefore[454]);
  const widthAfter = getDist(landmarksAfter[234], landmarksAfter[454]);
  const heightBefore = getDist(landmarksBefore[10], landmarksBefore[152]);
  const heightAfter = getDist(landmarksAfter[10], landmarksAfter[152]);

  return {
    // ① フェイスライン角度（顎先と左右耳下の角度）
    faceLineAngle: getAngle(landmarksAfter[152], landmarksAfter[172]),
    
    // ② 頬の膨らみ度（頬骨と頬中央の距離）
    cheekVolume: getDist(landmarksAfter[234], landmarksAfter[123]) + getDist(landmarksAfter[454], landmarksAfter[352]),
    
    // ③ 下顔面比率（鼻下〜顎 ÷ 顔全体）
    lowerFaceRatio: getDist(landmarksAfter[2], landmarksAfter[152]) / getDist(landmarksAfter[10], landmarksAfter[152]),
    
    // ④ 顔の左右対称性スコア
    symmetryIndex: Math.abs(landmarksAfter[234].x - landmarksAfter[454].x),
    
    // ⑤ 目尻リフト角度
    eyeLiftAngle: getAngle(landmarksAfter[133], landmarksAfter[263]),
    
    // ⑥ 口角角度
    mouthCornerAngle: getAngle(landmarksAfter[61], landmarksAfter[291]),
    
    // ⑦ 頬下ライン曲率
    jawCurve: (getDist(landmarksAfter[234], landmarksAfter[152]) + getDist(landmarksAfter[454], landmarksAfter[152])) / 2,
    
    // ⑧ 顔全体バランス比（黄金比）
    balanceRatio: getDist(landmarksAfter[10], landmarksAfter[152]) / getDist(landmarksAfter[10], landmarksAfter[2]),
    
    // ⑨ 鼻・口位置バランス
    midFaceHarmony: getDist(landmarksAfter[2], landmarksAfter[13]) / getDist(landmarksAfter[10], landmarksAfter[152]),
    
    // ⑩ 顎ライン非対称度
    chinAsymmetry: Math.abs(landmarksAfter[172].y - landmarksAfter[397].y),
    
    // 基本変化量
    faceWidthChange: ((widthAfter - widthBefore) / widthBefore) * 100,
    faceHeightChange: ((heightAfter - heightBefore) / heightBefore) * 100,
  };
}

export async function runFaceMesh(base64Image: string): Promise<FaceMeshResult> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("FaceMesh解析開始...");

      const mp = await import("@mediapipe/face_mesh");
      const FaceMesh = mp.FaceMesh || (window as any).FaceMesh;
      if (!FaceMesh) throw new Error("FaceMesh モジュールが読み込めませんでした");

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
        if (results.multiFaceLandmarks?.[0]) {
          resultData = {
            detectionConfidence: 1.0,
            landmarks: results.multiFaceLandmarks[0], // ← 468点すべて保持
          };
        } else {
          resultData = { detectionConfidence: 0, landmarks: [] };
        }
        resolve(resultData);
      });

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