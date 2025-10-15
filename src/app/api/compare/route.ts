import { NextResponse } from "next/server";
import vision from "@google-cloud/vision";
import OpenAI from "openai";

// Google Cloud Vision API クライアント初期化
const visionClient = new vision.ImageAnnotatorClient({
  projectId: "lunar-planet-475206",
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
});

// OpenAI クライアント初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { before, after } = await req.json();
    
    if (!before || !after) {
      return NextResponse.json({ error: "画像が不足しています。" }, { status: 400 });
    }

    // Base64データからdata:image/...の部分を除去
    const clean = (img: string) => img.replace(/^data:image\/\w+;base64,/, "");

    // Vision API呼び出し（Before / After）
    const [beforeRes] = await visionClient.faceDetection({ 
      image: { content: clean(before) } 
    });
    const [afterRes] = await visionClient.faceDetection({ 
      image: { content: clean(after) } 
    });

    const beforeFaces = beforeRes.faceAnnotations || [];
    const afterFaces = afterRes.faceAnnotations || [];

    if (beforeFaces.length === 0 || afterFaces.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "顔を検出できませんでした。画像の品質や顔の位置を確認してください。" 
      });
    }

    // 差分抽出
    const beforeFace = beforeFaces[0];
    const afterFace = afterFaces[0];

    const diff = {
      joy: afterFace.joyLikelihood !== beforeFace.joyLikelihood ? 
        `${beforeFace.joyLikelihood} → ${afterFace.joyLikelihood}` : "変化なし",
      anger: afterFace.angerLikelihood !== beforeFace.angerLikelihood ? 
        `${beforeFace.angerLikelihood} → ${afterFace.angerLikelihood}` : "変化なし",
      sorrow: afterFace.sorrowLikelihood !== beforeFace.sorrowLikelihood ? 
        `${beforeFace.sorrowLikelihood} → ${afterFace.sorrowLikelihood}` : "変化なし",
      surprise: afterFace.surpriseLikelihood !== beforeFace.surpriseLikelihood ? 
        `${beforeFace.surpriseLikelihood} → ${afterFace.surpriseLikelihood}` : "変化なし",
      headTilt: Math.round((afterFace.panAngle || 0) - (beforeFace.panAngle || 0)),
      roll: Math.round((afterFace.rollAngle || 0) - (beforeFace.rollAngle || 0)),
      tilt: Math.round((afterFace.tiltAngle || 0) - (beforeFace.tiltAngle || 0)),
      detectionConfidence: {
        before: beforeFace.detectionConfidence || 0,
        after: afterFace.detectionConfidence || 0
      }
    };

    // OpenAIコメント生成
    const prompt = `
あなたは美容カウンセラーAIです。
以下の顔解析データのBefore/Afterの差分をもとに、印象の変化を日本語で自然に説明してください。

分析対象：
- 表情の変化: ${JSON.stringify({
    joy: diff.joy,
    anger: diff.anger,
    sorrow: diff.sorrow,
    surprise: diff.surprise
  }, null, 2)}
- 顔の角度変化: 左右${diff.headTilt}度、回転${diff.roll}度、上下${diff.tilt}度

条件：
- トーンはポジティブで自然に
- 「リラックス」「自信」「若々しさ」「明るさ」「印象変化」に触れる
- 150文字以内で簡潔に
- 具体的な変化を指摘する
`;

    const aiRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.7,
    });

    const comment = aiRes.choices[0].message.content || "分析結果を生成できませんでした。";

    return NextResponse.json({
      success: true,
      diff,
      comment,
      faceCount: {
        before: beforeFaces.length,
        after: afterFaces.length
      }
    });
  } catch (error: unknown) {
    console.error("Compare API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json({ 
      error: "比較分析に失敗しました。",
      details: errorMessage 
    }, { status: 500 });
  }
}
