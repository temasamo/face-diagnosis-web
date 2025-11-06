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
    // 補正処理は決定論的（同じ入力画像なら同じ補正後の画像）なので一貫性が保たれる
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

    // 補正後の画像からランドマークを取得（撮影条件の違いを補正した状態で測定）
    // 補正後の画像は決定論的だが、Vision APIの結果には若干の揺らぎがある可能性がある
    // これはAPIの制約として受け入れる必要がある
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

    // 同一人物かどうかを判定する関数
    const checkSamePerson = (beforeLm: Landmarks, afterLm: Landmarks): { isSamePerson: boolean; confidence: number; warning?: string } => {
      // 重要なランドマークポイントを比較
      const keyLandmarks = [
        'NOSE_TIP',
        'MOUTH_CENTER',
        'CHIN_GNATHION',
        'LEFT_EYE',
        'RIGHT_EYE',
        'LEFT_EAR_TRAGION',
        'RIGHT_EAR_TRAGION',
        'CHIN_LEFT_GONION',
        'CHIN_RIGHT_GONION',
        'FOREHEAD_GLABELLA',
      ];

      let totalDistance = 0;
      let validPoints = 0;

      for (const key of keyLandmarks) {
        if (beforeLm[key] && afterLm[key]) {
          const dist = Math.hypot(
            afterLm[key].x - beforeLm[key].x,
            afterLm[key].y - beforeLm[key].y
          );
          totalDistance += dist;
          validPoints++;
        }
      }

      if (validPoints === 0) {
        return { isSamePerson: true, confidence: 0.5 }; // 判定不可の場合は警告なし
      }

      const avgDistance = totalDistance / validPoints;

      // 顔の特徴的な比率を比較
      const getFaceRatios = (lm: Landmarks) => {
        const eyeDistance = Math.hypot(
          lm.RIGHT_EYE.x - lm.LEFT_EYE.x,
          lm.RIGHT_EYE.y - lm.LEFT_EYE.y
        );
        const faceWidth = Math.abs(lm.RIGHT_EAR_TRAGION.x - lm.LEFT_EAR_TRAGION.x);
        const faceHeight = Math.abs(lm.CHIN_GNATHION.y - (lm.FOREHEAD_GLABELLA?.y || lm.LEFT_EYE.y));
        const noseToMouth = Math.hypot(
          lm.MOUTH_CENTER.x - lm.NOSE_TIP.x,
          lm.MOUTH_CENTER.y - lm.NOSE_TIP.y
        );

        return {
          eyeDistance,
          faceWidth,
          faceHeight,
          faceAspectRatio: faceWidth / (faceHeight || 1),
          eyeToFaceRatio: eyeDistance / (faceWidth || 1),
          noseToMouth,
        };
      };

      const beforeRatios = getFaceRatios(beforeLm);
      const afterRatios = getFaceRatios(afterLm);

      // 比率の差異を計算
      const ratioDifferences = {
        faceAspectRatio: Math.abs(beforeRatios.faceAspectRatio - afterRatios.faceAspectRatio),
        eyeToFaceRatio: Math.abs(beforeRatios.eyeToFaceRatio - afterRatios.eyeToFaceRatio),
        noseToMouth: Math.abs(beforeRatios.noseToMouth - afterRatios.noseToMouth) / (beforeRatios.noseToMouth || 1),
      };

      const avgRatioDiff = (ratioDifferences.faceAspectRatio + ratioDifferences.eyeToFaceRatio + ratioDifferences.noseToMouth) / 3;

      // 閾値: 正規化された距離が0.15以上、または比率の差異が0.2以上の場合、別人の可能性が高い
      const distanceThreshold = 0.15;
      const ratioThreshold = 0.2;

      const isSamePerson = avgDistance < distanceThreshold && avgRatioDiff < ratioThreshold;
      const confidence = Math.max(0, Math.min(1, 1 - (avgDistance / distanceThreshold) - (avgRatioDiff / ratioThreshold)));

      if (!isSamePerson) {
        return {
          isSamePerson: false,
          confidence,
          warning: 'BeforeとAfterの写真が別人ではないですか？顔の特徴が大きく異なるように見受けられます。',
        };
      }

      return { isSamePerson: true, confidence };
    };

    const personCheck = checkSamePerson(beforeNorm, afterNorm);

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
      personCheck: {
        isSamePerson: personCheck.isSamePerson,
        confidence: personCheck.confidence,
        warning: personCheck.warning,
      },
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