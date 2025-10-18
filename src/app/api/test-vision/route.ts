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

export async function POST(req: Request) {
  try {
    console.log("=== Vision API テスト開始 ===");
    
    // 環境変数の確認
    console.log("環境変数確認:", {
      hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
      clientEmailLength: process.env.GOOGLE_CLIENT_EMAIL?.length || 0,
      privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length || 0,
    });

    const { image } = await req.json();
    
    if (!image) {
      return NextResponse.json({ error: "画像データがありません。" }, { status: 400 });
    }

    console.log("画像データ:", {
      length: image.length,
      prefix: image.substring(0, 50),
      isBase64: image.startsWith('data:image/')
    });

    // Base64データからdata:image/...の部分を除去
    const cleanImage = image.replace(/^data:image\/\w+;base64,/, "");
    
    console.log("クリーン画像データ:", {
      length: cleanImage.length,
      prefix: cleanImage.substring(0, 50)
    });

    // シンプルな顔検出テスト
    console.log("Vision API呼び出し開始...");
    const [result] = await visionClient.faceDetection({
      image: { content: cleanImage },
    });

    console.log("Vision API呼び出し完了:", {
      faceCount: result.faceAnnotations?.length || 0,
      hasFaces: (result.faceAnnotations?.length || 0) > 0
    });

    const faces = result.faceAnnotations || [];
    
    return NextResponse.json({
      success: true,
      faceCount: faces.length,
      faces: faces.map((face, i) => ({
        id: i + 1,
        detectionConfidence: face.detectionConfidence,
        joyLikelihood: face.joyLikelihood,
        boundingPoly: face.boundingPoly
      })),
      debug: {
        imageLength: image.length,
        cleanImageLength: cleanImage.length,
        hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY
      }
    });

  } catch (error: unknown) {
    console.error("Vision API テストエラー:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json({
      success: false,
      error: "Vision APIテストに失敗しました。",
      details: errorMessage,
      stack: errorStack,
      debug: {
        hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
        clientEmailLength: process.env.GOOGLE_CLIENT_EMAIL?.length || 0,
        privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length || 0,
      }
    }, { status: 500 });
  }
}
