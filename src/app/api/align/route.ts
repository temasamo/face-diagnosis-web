import { NextResponse } from "next/server";
import vision from "@google-cloud/vision";

export async function POST(req: Request) {
  try {
    const { before, after } = await req.json();
    if (!before || !after) {
      return NextResponse.json({ error: "画像が不足しています。" }, { status: 400 });
    }

    const client = new vision.ImageAnnotatorClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
    });

    const clean = (b64: string) => b64.replace(/^data:image\/\w+;base64,/, "");

    // 両画像の顔ランドマーク取得
    const [beforeRes] = await client.faceDetection({ image: { content: clean(before) } });
    const [afterRes] = await client.faceDetection({ image: { content: clean(after) } });

    const beforeFace = beforeRes.faceAnnotations?.[0];
    const afterFace = afterRes.faceAnnotations?.[0];

    if (!beforeFace || !afterFace) {
      return NextResponse.json({ success: false, message: "顔が検出されませんでした。" });
    }

    // 座標抽出関数
    const getCenter = (f: any) => {
      const left = f.landmarks?.find((l: any) => l.type === "LEFT_EYE")?.position;
      const right = f.landmarks?.find((l: any) => l.type === "RIGHT_EYE")?.position;
      const nose = f.landmarks?.find((l: any) => l.type === "NOSE_TIP")?.position;

      if (!left || !right || !nose) return null;
      const eyeCenter = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
      return { x: (eyeCenter.x + nose.x) / 2, y: (eyeCenter.y + nose.y) / 2 };
    };

    // 顔のサイズ計算（目から顎までの距離）
    const getFaceSize = (f: any) => {
      const left = f.landmarks?.find((l: any) => l.type === "LEFT_EYE")?.position;
      const right = f.landmarks?.find((l: any) => l.type === "RIGHT_EYE")?.position;
      const chin = f.landmarks?.find((l: any) => l.type === "CHIN_GNATHION")?.position;
      
      if (!left || !right || !chin) return null;
      const eyeCenter = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
      return Math.sqrt(Math.pow(chin.x - eyeCenter.x, 2) + Math.pow(chin.y - eyeCenter.y, 2));
    };

    const beforeCenter = getCenter(beforeFace);
    const afterCenter = getCenter(afterFace);
    const beforeSize = getFaceSize(beforeFace);
    const afterSize = getFaceSize(afterFace);

    if (!beforeCenter || !afterCenter || !beforeSize || !afterSize) {
      return NextResponse.json({ success: false, message: "顔のランドマークが不完全です。" });
    }

    // スケール比率計算
    const scaleRatio = afterSize / beforeSize;

    return NextResponse.json({
      success: true,
      beforeCenter,
      afterCenter,
      beforeSize,
      afterSize,
      scaleRatio,
      beforeAngles: {
        roll: beforeFace.rollAngle || 0,
        tilt: beforeFace.tiltAngle || 0,
        pan: beforeFace.panAngle || 0,
      },
      afterAngles: {
        roll: afterFace.rollAngle || 0,
        tilt: afterFace.tiltAngle || 0,
        pan: afterFace.panAngle || 0,
      },
      // 補正に必要な情報
      alignment: {
        // 移動量（After基準でBeforeを移動）
        offsetX: afterCenter.x - beforeCenter.x,
        offsetY: afterCenter.y - beforeCenter.y,
        // 回転角度差
        rotationDiff: (afterFace.rollAngle || 0) - (beforeFace.rollAngle || 0),
        // スケール比率
        scale: scaleRatio,
      }
    });
  } catch (error: unknown) {
    console.error("Align Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
