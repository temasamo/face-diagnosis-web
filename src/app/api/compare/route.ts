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

    // Vision API呼び出し（Before / After）- 複数の分析を実行
    const [beforeRes] = await visionClient.annotateImage({
      image: { content: clean(before) },
      features: [
        { type: 'FACE_DETECTION', maxResults: 10 },
        { type: 'LANDMARK_DETECTION', maxResults: 10 },
        { type: 'IMAGE_PROPERTIES', maxResults: 1 }
      ]
    });
    const [afterRes] = await visionClient.annotateImage({
      image: { content: clean(after) },
      features: [
        { type: 'FACE_DETECTION', maxResults: 10 },
        { type: 'LANDMARK_DETECTION', maxResults: 10 },
        { type: 'IMAGE_PROPERTIES', maxResults: 1 }
      ]
    });

    const beforeFaces = beforeRes.faceAnnotations || [];
    const afterFaces = afterRes.faceAnnotations || [];

    if (beforeFaces.length === 0 || afterFaces.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "顔を検出できませんでした。画像の品質や顔の位置を確認してください。" 
      });
    }

    // 差分抽出（美容効果分析用）
    const beforeFace = beforeFaces[0];
    const afterFace = afterFaces[0];

    // 画像の明度・彩度分析
    const beforeColors = beforeRes.imagePropertiesAnnotation?.dominantColors?.colors || [];
    const afterColors = afterRes.imagePropertiesAnnotation?.dominantColors?.colors || [];
    
    const diff = {
      // 表情の変化
      joy: afterFace.joyLikelihood !== beforeFace.joyLikelihood ? 
        `${beforeFace.joyLikelihood} → ${afterFace.joyLikelihood}` : "変化なし",
      anger: afterFace.angerLikelihood !== beforeFace.angerLikelihood ? 
        `${beforeFace.angerLikelihood} → ${afterFace.angerLikelihood}` : "変化なし",
      sorrow: afterFace.sorrowLikelihood !== beforeFace.sorrowLikelihood ? 
        `${beforeFace.sorrowLikelihood} → ${afterFace.sorrowLikelihood}` : "変化なし",
      surprise: afterFace.surpriseLikelihood !== beforeFace.surpriseLikelihood ? 
        `${beforeFace.surpriseLikelihood} → ${afterFace.surpriseLikelihood}` : "変化なし",
      
      // 顔の角度・位置変化
      headTilt: Math.round((afterFace.panAngle || 0) - (beforeFace.panAngle || 0)),
      roll: Math.round((afterFace.rollAngle || 0) - (beforeFace.rollAngle || 0)),
      tilt: Math.round((afterFace.tiltAngle || 0) - (beforeFace.tiltAngle || 0)),
      
      // 顔の境界ボックス（サイズ・位置の変化）
      boundingBox: {
        before: beforeFace.boundingPoly?.vertices || [],
        after: afterFace.boundingPoly?.vertices || []
      },
      
      // ランドマーク（顔の特徴点）
      landmarks: {
        before: beforeFace.landmarks?.length || 0,
        after: afterFace.landmarks?.length || 0
      },
      
      // 検出信頼度
      detectionConfidence: {
        before: beforeFace.detectionConfidence || 0,
        after: afterFace.detectionConfidence || 0
      },
      
      // 画像の明度・彩度（肌の艶・血色の指標）
      imageProperties: {
        before: {
          dominantColors: beforeColors.slice(0, 3).map(c => ({
            color: c.color,
            score: c.score
          }))
        },
        after: {
          dominantColors: afterColors.slice(0, 3).map(c => ({
            color: c.color,
            score: c.score
          }))
        }
      }
    };

    // OpenAIコメント生成（美容効果測定特化）
    const prompt = `
あなたは美容・エステ専門のAIカウンセラーです。
以下の詳細な顔解析データのBefore/Afterの差分をもとに、美容効果の変化を日本語で専門的に分析してください。

【分析対象データ】
- 表情の変化: ${JSON.stringify({
    joy: diff.joy,
    anger: diff.anger,
    sorrow: diff.sorrow,
    surprise: diff.surprise
  }, null, 2)}
- 顔の角度変化: 左右${diff.headTilt}度、回転${diff.roll}度、上下${diff.tilt}度
- 顔の検出精度: Before ${(diff.detectionConfidence.before * 100).toFixed(1)}% → After ${(diff.detectionConfidence.after * 100).toFixed(1)}%
- ランドマーク検出数: Before ${diff.landmarks.before}個 → After ${diff.landmarks.after}個
- 画像の色調変化: 主要色の変化を分析

【美容効果分析のポイント】
以下の観点から物理的な変化を分析してください：
1. 肌の質感・艶（ツヤ、ハリ、透明感、血色）
2. シワ・たるみ（ほうれい線、目尻、口元、額）
3. 顔の輪郭・立体感（フェイスライン、頬の位置、顎のライン）
4. 目の印象（クマ、目の下のたるみ、目の開き、目尻）
5. 全体的な若々しさ・リフトアップ効果
6. 肌の明るさ・血色の改善

【出力条件】
- 美容・エステ効果の物理的変化に焦点を当てる
- 具体的な改善ポイントを指摘する（例：「ほうれい線が浅くなり」「頬のハリが向上し」）
- 専門的だが分かりやすい表現を使用
- 250文字以内で簡潔に
- ポジティブで励ましのトーン
- マッサージ、オイル、パック等の美容施術効果を想定した分析
`;

    const aiRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
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
