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
    // 環境変数の確認
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.error("Google Cloud認証情報が設定されていません");
      return NextResponse.json({ 
        error: "Google Cloud認証情報が設定されていません。環境変数を確認してください。" 
      }, { status: 500 });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI APIキーが設定されていません");
      return NextResponse.json({ 
        error: "OpenAI APIキーが設定されていません。環境変数を確認してください。" 
      }, { status: 500 });
    }

    const { before, after } = await req.json();
    
    if (!before || !after) {
      return NextResponse.json({ error: "画像が不足しています。" }, { status: 400 });
    }

    // Base64データからdata:image/...の部分を除去
    const clean = (img: string) => img.replace(/^data:image\/\w+;base64,/, "");

    // 画像データの検証
    console.log("画像データ検証:", {
      beforeLength: before.length,
      afterLength: after.length,
      beforeCleanLength: clean(before).length,
      afterCleanLength: clean(after).length,
      beforePrefix: before.substring(0, 30),
      afterPrefix: after.substring(0, 30)
    });

    // Vision API呼び出し（Before / After）- 複数の分析を実行
    console.log("Before画像のVision API呼び出し開始");
    const [beforeRes] = await visionClient.annotateImage({
      image: { content: clean(before) },
      features: [
        { type: 'FACE_DETECTION', maxResults: 10 },
        { type: 'LANDMARK_DETECTION', maxResults: 10 },
        { type: 'IMAGE_PROPERTIES', maxResults: 1 }
      ]
    });
    console.log("Before画像のVision API呼び出し完了:", beforeRes.faceAnnotations?.length || 0, "個の顔を検出");

    console.log("After画像のVision API呼び出し開始");
    const [afterRes] = await visionClient.annotateImage({
      image: { content: clean(after) },
      features: [
        { type: 'FACE_DETECTION', maxResults: 10 },
        { type: 'LANDMARK_DETECTION', maxResults: 10 },
        { type: 'IMAGE_PROPERTIES', maxResults: 1 }
      ]
    });
    console.log("After画像のVision API呼び出し完了:", afterRes.faceAnnotations?.length || 0, "個の顔を検出");

    const beforeFaces = beforeRes.faceAnnotations || [];
    const afterFaces = afterRes.faceAnnotations || [];

    if (beforeFaces.length === 0 || afterFaces.length === 0) {
      console.error("顔検出失敗:", {
        beforeFaces: beforeFaces.length,
        afterFaces: afterFaces.length,
        beforeImageSize: clean(before).length,
        afterImageSize: clean(after).length,
        beforeImagePreview: clean(before).substring(0, 50) + "...",
        afterImagePreview: clean(after).substring(0, 50) + "...",
        beforeResFull: JSON.stringify(beforeRes, null, 2),
        afterResFull: JSON.stringify(afterRes, null, 2)
      });
      return NextResponse.json({ 
        success: false, 
        message: `顔を検出できませんでした。Before: ${beforeFaces.length}個, After: ${afterFaces.length}個の顔を検出。画像の品質や顔の位置を確認してください。詳細: ${JSON.stringify({beforeFaces: beforeFaces.length, afterFaces: afterFaces.length})}` 
      });
    }

    // 差分抽出（美容効果分析用）
    const beforeFace = beforeFaces[0];
    const afterFace = afterFaces[0];

    // 画像の明度・彩度分析
    const beforeColors = beforeRes.imagePropertiesAnnotation?.dominantColors?.colors || [];
    const afterColors = afterRes.imagePropertiesAnnotation?.dominantColors?.colors || [];

    // 精密な数値測定関数
    const calculateFaceWidth = (face: { boundingPoly?: { vertices?: Array<{ x?: number; y?: number }> } }) => {
      const vertices = face.boundingPoly?.vertices || [];
      if (vertices.length >= 4) {
        const left = vertices[0].x || vertices[3].x || 0;
        const right = vertices[1].x || vertices[2].x || 0;
        return Math.abs(right - left);
      }
      return 0;
    };

    const calculateFaceHeight = (face: { boundingPoly?: { vertices?: Array<{ x?: number; y?: number }> } }) => {
      const vertices = face.boundingPoly?.vertices || [];
      if (vertices.length >= 4) {
        const top = vertices[0].y || vertices[1].y || 0;
        const bottom = vertices[2].y || vertices[3].y || 0;
        return Math.abs(bottom - top);
      }
      return 0;
    };

    const calculateEyeDistance = (face: { landmarks?: Array<{ type?: string; position?: { x: number; y: number } }> }) => {
      const landmarks = face.landmarks || [];
      const leftEye = landmarks.find((l) => l.type === 'LEFT_EYE');
      const rightEye = landmarks.find((l) => l.type === 'RIGHT_EYE');
      
      if (leftEye && rightEye && leftEye.position && rightEye.position) {
        const dx = leftEye.position.x - rightEye.position.x;
        const dy = leftEye.position.y - rightEye.position.y;
        return Math.sqrt(dx * dx + dy * dy);
      }
      return 0;
    };

    const calculateEyebrowToEyeDistance = (face: { landmarks?: Array<{ type?: string; position?: { x: number; y: number } }> }) => {
      const landmarks = face.landmarks || [];
      const leftEyebrow = landmarks.find((l) => l.type === 'LEFT_OF_LEFT_EYEBROW');
      const leftEye = landmarks.find((l) => l.type === 'LEFT_EYE');
      
      if (leftEyebrow && leftEye && leftEyebrow.position && leftEye.position) {
        const dx = leftEyebrow.position.x - leftEye.position.x;
        const dy = leftEyebrow.position.y - leftEye.position.y;
        return Math.sqrt(dx * dx + dy * dy);
      }
      return 0;
    };

    const calculateFaceAngle = (face: { rollAngle?: number }) => {
      return Math.abs(face.rollAngle || 0);
    };

    // 数値計算
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const beforeFaceWidth = calculateFaceWidth(beforeFace as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const afterFaceWidth = calculateFaceWidth(afterFace as any);
    const faceWidthChange = Math.round((afterFaceWidth - beforeFaceWidth) * 0.1); // ピクセルをmmに変換（概算）

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const beforeFaceHeight = calculateFaceHeight(beforeFace as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const afterFaceHeight = calculateFaceHeight(afterFace as any);
    const faceHeightChange = Math.round((afterFaceHeight - beforeFaceHeight) * 0.1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const beforeEyeDistance = calculateEyeDistance(beforeFace as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const afterEyeDistance = calculateEyeDistance(afterFace as any);
    const eyeDistanceChange = Math.round((afterEyeDistance - beforeEyeDistance) * 0.1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const beforeEyebrowToEye = calculateEyebrowToEyeDistance(beforeFace as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const afterEyebrowToEye = calculateEyebrowToEyeDistance(afterFace as any);
    const eyebrowToEyeChange = Math.round((afterEyebrowToEye - beforeEyebrowToEye) * 0.1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const beforeFaceAngle = calculateFaceAngle(beforeFace as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const afterFaceAngle = calculateFaceAngle(afterFace as any);
    const faceAngleChange = Math.round((afterFaceAngle - beforeFaceAngle) * 10) / 10; // 小数点1桁まで
    
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
      
      // 精密な数値測定結果
      measurements: {
        faceWidth: {
          before: beforeFaceWidth,
          after: afterFaceWidth,
          change: faceWidthChange,
          unit: "mm"
        },
        faceHeight: {
          before: beforeFaceHeight,
          after: afterFaceHeight,
          change: faceHeightChange,
          unit: "mm"
        },
        eyeDistance: {
          before: beforeEyeDistance,
          after: afterEyeDistance,
          change: eyeDistanceChange,
          unit: "mm"
        },
        eyebrowToEyeDistance: {
          before: beforeEyebrowToEye,
          after: afterEyebrowToEye,
          change: eyebrowToEyeChange,
          unit: "mm"
        },
        faceAngle: {
          before: beforeFaceAngle,
          after: afterFaceAngle,
          change: faceAngleChange,
          unit: "度"
        }
      },
      
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

    // 変化があった項目のみを抽出
    const significantChanges = [];
    
    if (diff.measurements.faceWidth.change !== 0) {
      significantChanges.push(`顔の幅: ${diff.measurements.faceWidth.change}mm ${diff.measurements.faceWidth.change > 0 ? '増加' : '減少'}`);
    }
    if (diff.measurements.faceHeight.change !== 0) {
      significantChanges.push(`顔の長さ: ${diff.measurements.faceHeight.change}mm ${diff.measurements.faceHeight.change > 0 ? '増加' : '減少'}`);
    }
    if (diff.measurements.eyeDistance.change !== 0) {
      significantChanges.push(`目の間隔: ${diff.measurements.eyeDistance.change}mm ${diff.measurements.eyeDistance.change > 0 ? '拡大' : '縮小'}`);
    }
    if (diff.measurements.eyebrowToEyeDistance.change !== 0) {
      significantChanges.push(`眉毛と目の距離: ${diff.measurements.eyebrowToEyeDistance.change}mm ${diff.measurements.eyebrowToEyeDistance.change > 0 ? '拡大' : '縮小'}`);
    }
    if (diff.measurements.faceAngle.change !== 0) {
      significantChanges.push(`フェイスライン角度: ${diff.measurements.faceAngle.change}度 ${diff.measurements.faceAngle.change > 0 ? 'シャープ化' : '丸み増加'}`);
    }

    // 表情変化の確認
    const expressionChanges = [];
    if (diff.joy !== "変化なし") expressionChanges.push(`喜び: ${diff.joy}`);
    if (diff.anger !== "変化なし") expressionChanges.push(`怒り: ${diff.anger}`);
    if (diff.sorrow !== "変化なし") expressionChanges.push(`悲しみ: ${diff.sorrow}`);
    if (diff.surprise !== "変化なし") expressionChanges.push(`驚き: ${diff.surprise}`);

    // OpenAIコメント生成（変化項目のみに焦点）
    const prompt = `
あなたは美容・エステ専門のAIカウンセラーです。
以下の変化データをもとに、美容効果の変化を具体的な数値とともに日本語で分析してください。

【検出された変化】
${significantChanges.length > 0 ? significantChanges.map(change => `- ${change}`).join('\n') : '- 数値的な変化は検出されませんでした'}

${expressionChanges.length > 0 ? `【表情変化】\n${expressionChanges.map(change => `- ${change}`).join('\n')}` : ''}

【分析条件】
- 変化があった項目のみを具体的に分析する
- 変化がない項目は言及しない
- 必ず具体的な数値（mm、度）を含める
- 美容・エステ効果の物理的変化に焦点を当てる
- 専門的だが分かりやすい表現を使用
- 400文字以内で簡潔に
- 必ず完全な文章で終了する（途中で切れないように）
- ポジティブで励ましのトーン
- 改行を適切に入れて読みやすくする
- マッサージ、オイル、パック等の美容施術効果を想定した分析
`;

    const aiRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
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
