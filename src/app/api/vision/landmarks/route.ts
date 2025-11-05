import { NextResponse } from "next/server";
import vision from "@google-cloud/vision";

// Google Cloud Vision API クライアント初期化
const visionClient = new vision.ImageAnnotatorClient({
  projectId: "lunar-planet-475206",
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
});

/**
 * 画像からランドマークを取得するAPI
 * Vision APIのランドマークを /api/face/compare で使用する形式に変換
 */
export async function POST(req: Request) {
  try {
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "Google Cloud認証情報が設定されていません。" },
        { status: 500 }
      );
    }

    const { image } = await req.json();

    if (!image) {
      return NextResponse.json(
        { error: "画像データがありません。" },
        { status: 400 }
      );
    }

    // Base64データからdata:image/...の部分を除去
    const clean = (img: string) => img.replace(/^data:image\/\w+;base64,/, "");
    const base64Data = clean(image);

    // Vision API呼び出し
    const [result] = await visionClient.annotateImage({
      image: { content: base64Data },
      features: [
        { type: "FACE_DETECTION", maxResults: 1 },
        { type: "LANDMARK_DETECTION", maxResults: 1 },
      ],
    });

    const faces = result.faceAnnotations || [];

    if (faces.length === 0) {
      return NextResponse.json(
        { error: "顔を検出できませんでした。" },
        { status: 400 }
      );
    }

    const face = faces[0];
    const landmarks = face.landmarks || [];

    // Vision APIのランドマーク形式を /api/face/compare で使用する形式に変換
    // Record<string, { x: number; y: number }> 形式に変換
    const landmarksMap: Record<string, { x: number; y: number }> = {};

    landmarks.forEach((landmark) => {
      if (landmark.type && landmark.position) {
        landmarksMap[landmark.type] = {
          x: landmark.position.x || 0,
          y: landmark.position.y || 0,
        };
      }
    });

    return NextResponse.json({
      success: true,
      landmarks: landmarksMap,
    });
  } catch (error: unknown) {
    console.error("Landmarks API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "ランドマーク取得に失敗しました。",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

