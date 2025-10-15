import { NextRequest, NextResponse } from "next/server";
import vision from "@google-cloud/vision";

// Google Cloud Vision API クライアント初期化
const client = new vision.ImageAnnotatorClient({
  projectId: "lunar-planet-475206",
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
});

export async function POST(req: NextRequest) {
  try {
    // リクエストから画像データを取得
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: "画像データがありません。" },
        { status: 400 }
      );
    }

    // Base64データからdata:image/...の部分を除去
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    // Vision APIに送信
    const [result] = await client.faceDetection({
      image: { content: base64Data },
    });

    const faces = result.faceAnnotations || [];

    // 結果を整形
    const response = faces.map((face, i) => ({
      id: i + 1,
      joyLikelihood: face.joyLikelihood,
      sorrowLikelihood: face.sorrowLikelihood,
      angerLikelihood: face.angerLikelihood,
      surpriseLikelihood: face.surpriseLikelihood,
      detectionConfidence: face.detectionConfidence,
    }));

    return NextResponse.json({ faces: response });
  } catch (error: any) {
    console.error("Vision API Error:", error);
    return NextResponse.json({
      error: "Vision APIとの通信に失敗しました。",
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
