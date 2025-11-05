// src/app/api/face/compare/route.ts
import { NextResponse } from "next/server";
import vision from "@google-cloud/vision";
import { alignImage, calculateAlignment } from "@/lib/imageAlignment";

// Google Cloud Vision API クライアント初期化
const visionClient = new vision.ImageAnnotatorClient({
  projectId: "lunar-planet-475206",
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
});

type Point = { x: number; y: number };
type Landmarks = Record<string, Point>;
type FaceRequest = { before: string; after: string }; // 画像（base64）を受け取る

export async function POST(req: Request) {
  try {
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "Google Cloud認証情報が設定されていません。" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as FaceRequest;
    const { before, after } = body;
    if (!before || !after) {
      return NextResponse.json(
        { error: "before / after の画像情報が不足しています。" },
        { status: 400 }
      );
    }

    // Base64データからdata:image/...の部分を除去
    const clean = (img: string) => img.replace(/^data:image\/\w+;base64,/, "");

    // 補正前のVision API呼び出し（補正情報取得のため）
    console.log("たるみ診断: 補正情報取得のため、Before/After画像のVision API呼び出し開始");
    const [beforeResForAlignment] = await visionClient.annotateImage({
      image: { content: clean(before) },
      features: [
        { type: "FACE_DETECTION", maxResults: 1 },
        { type: "LANDMARK_DETECTION", maxResults: 1 },
      ],
    });
    const [afterResForAlignment] = await visionClient.annotateImage({
      image: { content: clean(after) },
      features: [
        { type: "FACE_DETECTION", maxResults: 1 },
        { type: "LANDMARK_DETECTION", maxResults: 1 },
      ],
    });

    const beforeFaceForAlignment = beforeResForAlignment.faceAnnotations?.[0];
    const afterFaceForAlignment = afterResForAlignment.faceAnnotations?.[0];

    if (!beforeFaceForAlignment || !afterFaceForAlignment) {
      return NextResponse.json(
        { error: "顔を検出できませんでした。" },
        { status: 400 }
      );
    }

    // 自動補正: Before画像をAfter画像に合わせて補正
    let alignedBefore = before;
    try {
      const alignment = calculateAlignment(beforeFaceForAlignment, afterFaceForAlignment);
      if (alignment) {
        console.log("たるみ診断: 画像補正を実行中...", alignment);
        alignedBefore = await alignImage(before, after, alignment);
        console.log("たるみ診断: 画像補正完了");
      } else {
        console.log("たるみ診断: 補正情報の計算に失敗しましたが、補正なしで続行します");
      }
    } catch (error) {
      console.error("たるみ診断: 画像補正エラー（補正なしで続行）:", error);
      // 補正に失敗しても診断は続行
    }

    // 補正後の画像からランドマークを取得
    console.log("たるみ診断: 補正後の画像からランドマーク取得開始");
    const [beforeRes] = await visionClient.annotateImage({
      image: { content: clean(alignedBefore) },
      features: [
        { type: "FACE_DETECTION", maxResults: 1 },
        { type: "LANDMARK_DETECTION", maxResults: 1 },
      ],
    });
    const [afterRes] = await visionClient.annotateImage({
      image: { content: clean(after) },
      features: [
        { type: "FACE_DETECTION", maxResults: 1 },
        { type: "LANDMARK_DETECTION", maxResults: 1 },
      ],
    });

    const beforeFace = beforeRes.faceAnnotations?.[0];
    const afterFace = afterRes.faceAnnotations?.[0];

    if (!beforeFace || !afterFace || !beforeFace.landmarks || !afterFace.landmarks) {
      return NextResponse.json(
        { error: "ランドマークの取得に失敗しました。" },
        { status: 400 }
      );
    }

    // Vision APIのランドマーク形式を変換
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const convertLandmarks = (landmarks: any[]): Landmarks => {
      const landmarksMap: Landmarks = {};
      landmarks.forEach((landmark) => {
        if (landmark.type && landmark.position) {
          landmarksMap[String(landmark.type)] = {
            x: landmark.position.x || 0,
            y: landmark.position.y || 0,
          };
        }
      });
      return landmarksMap;
    };

    const beforeLandmarks = convertLandmarks(beforeFace.landmarks);
    const afterLandmarks = convertLandmarks(afterFace.landmarks);

    const normalize = (lm: Landmarks) => {
      const L = lm.LEFT_EYE;
      const R = lm.RIGHT_EYE;
      const d = Math.hypot(R.x - L.x, R.y - L.y);
      const theta = Math.atan2(R.y - L.y, R.x - L.x);
      const cos = Math.cos(-theta);
      const sin = Math.sin(-theta);
      const norm: Landmarks = {};
      for (const key in lm) {
        const x = lm[key].x - L.x;
        const y = lm[key].y - L.y;
        const xr = x * cos + y * sin;
        const yr = -x * sin + y * cos;
        norm[key] = { x: xr / d, y: yr / d };
      }
      return norm;
    };

    const beforeNorm = normalize(beforeLandmarks);
    const afterNorm = normalize(afterLandmarks);

    const metrics = (lm: Landmarks) => {
      const deg = (r: number) => (r * 180) / Math.PI;
      const angle = (a: Point, b: Point) => deg(Math.atan2(b.y - a.y, b.x - a.x));
      const jawLeft =
        Math.abs(
          angle(lm.CHIN_LEFT_GONION, lm.LEFT_EAR_TRAGION) -
          angle(lm.CHIN_LEFT_GONION, lm.CHIN_GNATHION)
        );
      const jawRight =
        Math.abs(
          angle(lm.CHIN_RIGHT_GONION, lm.RIGHT_EAR_TRAGION) -
          angle(lm.CHIN_RIGHT_GONION, lm.CHIN_GNATHION)
        );
      const JLA = (jawLeft + jawRight) / 2;
      const baseL = (lm.LEFT_EYE_LEFT_CORNER.y + lm.MOUTH_LEFT.y) / 2;
      const baseR = (lm.RIGHT_EYE_RIGHT_CORNER.y + lm.MOUTH_RIGHT.y) / 2;
      const CDI_L = lm.LEFT_CHEEK_CENTER.y - baseL;
      const CDI_R = lm.RIGHT_CHEEK_CENTER.y - baseR;
      const CDI = (CDI_L + CDI_R) / 2;
      const MCD = Math.abs(angle(lm.MOUTH_LEFT, lm.MOUTH_RIGHT));
      const jawWidth = Math.abs(lm.CHIN_RIGHT_GONION.x - lm.CHIN_LEFT_GONION.x);
      const earWidth = Math.abs(lm.RIGHT_EAR_TRAGION.x - lm.LEFT_EAR_TRAGION.x);
      const JWR = jawWidth / earWidth;
      return { MCD, JLA, CDI, CDI_L, CDI_R, JWR };
    };

    const beforeMetrics = metrics(beforeNorm);
    const afterMetrics = metrics(afterNorm);

    const ratio = (key: keyof typeof beforeMetrics) =>
      ((beforeMetrics[key] - afterMetrics[key]) / beforeMetrics[key]) * 100;

    const result = {
      before: beforeMetrics,
      after: afterMetrics,
      delta: {
        ΔMCD: afterMetrics.MCD - beforeMetrics.MCD,
        ΔJLA: afterMetrics.JLA - beforeMetrics.JLA,
        ΔCDI: afterMetrics.CDI - beforeMetrics.CDI,
        ΔJWR: afterMetrics.JWR - beforeMetrics.JWR,
        改善率_CDI: ratio("CDI"),
        改善率_JLA: ratio("JLA"),
        改善率_MCD: ratio("MCD"),
        改善率_JWR: ratio("JWR"),
      },
      score: (() => {
        const s = 50 + 0.6 * ratio("CDI") + 0.4 * ratio("JLA");
        return Math.round(Math.min(100, Math.max(0, s)));
      })(),
    };

    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    console.error("Face comparison error:", e);
    return NextResponse.json(
      { error: "たるみ比較処理中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}