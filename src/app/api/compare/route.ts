import { NextResponse } from "next/server";
import vision from "@google-cloud/vision";
import OpenAI from "openai";
import { alignImage, calculateAlignment } from "@/lib/imageAlignment";

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


    // 補正前のVision API呼び出し（補正情報取得のため）
    console.log("補正情報取得のため、Before画像のVision API呼び出し開始");
    const [beforeResForAlignment] = await visionClient.annotateImage({
      image: { content: clean(before) },
      features: [
        { type: 'FACE_DETECTION', maxResults: 1 },
        { type: 'LANDMARK_DETECTION', maxResults: 1 },
      ]
    });
    console.log("補正情報取得完了");

    // 自動補正: Before画像をAfter画像に合わせて補正
    let alignedBefore = before;
    try {
      const beforeFaceForAlignment = beforeResForAlignment.faceAnnotations?.[0];
      const [afterResForAlignment] = await visionClient.annotateImage({
        image: { content: clean(after) },
        features: [
          { type: 'FACE_DETECTION', maxResults: 1 },
          { type: 'LANDMARK_DETECTION', maxResults: 1 },
        ]
      });
      const afterFaceForAlignment = afterResForAlignment.faceAnnotations?.[0];

      if (beforeFaceForAlignment && afterFaceForAlignment) {
        const alignment = calculateAlignment(beforeFaceForAlignment, afterFaceForAlignment);
        if (alignment) {
          console.log("画像補正を実行中...", alignment);
          alignedBefore = await alignImage(before, after, alignment);
          console.log("画像補正完了");
        } else {
          console.log("補正情報の計算に失敗しましたが、補正なしで続行します");
        }
      }
    } catch (error) {
      console.error("画像補正エラー（補正なしで続行）:", error);
      // 補正に失敗しても診断は続行
    }

    // Vision API呼び出し（補正後のBefore / After）- 詳細な顔分析を実行
    console.log("補正後のBefore画像のVision API呼び出し開始");
    const [beforeRes] = await visionClient.annotateImage({
      image: { content: clean(alignedBefore) },
      features: [
        { type: 'FACE_DETECTION', maxResults: 10 },
        { type: 'LANDMARK_DETECTION', maxResults: 10 },
        { type: 'IMAGE_PROPERTIES', maxResults: 1 },
        { type: 'TEXT_DETECTION', maxResults: 1 } // シミやシワのテキスト検出にも対応
      ]
    });
    console.log("補正後のBefore画像のVision API呼び出し完了:", beforeRes.faceAnnotations?.length || 0, "個の顔を検出");

    console.log("After画像のVision API呼び出し開始");
    const [afterRes] = await visionClient.annotateImage({
      image: { content: clean(after) },
      features: [
        { type: 'FACE_DETECTION', maxResults: 10 },
        { type: 'LANDMARK_DETECTION', maxResults: 10 },
        { type: 'IMAGE_PROPERTIES', maxResults: 1 },
        { type: 'TEXT_DETECTION', maxResults: 1 } // シミやシワのテキスト検出にも対応
      ]
    });
    console.log("After画像のVision API呼び出し完了:", afterRes.faceAnnotations?.length || 0, "個の顔を検出");

    const beforeFaces = beforeRes.faceAnnotations || [];
    const afterFaces = afterRes.faceAnnotations || [];

    if (beforeFaces.length === 0 || afterFaces.length === 0) {
      console.error("顔検出失敗:", {
        beforeFaces: beforeFaces.length,
        afterFaces: afterFaces.length,
        beforeImageSize: clean(alignedBefore).length,
        afterImageSize: clean(after).length,
        beforeImagePreview: clean(alignedBefore).substring(0, 50) + "...",
        afterImagePreview: clean(after).substring(0, 50) + "...",
        beforeResFull: JSON.stringify(beforeRes, null, 2),
        afterResFull: JSON.stringify(afterRes, null, 2)
      });
      return NextResponse.json({ 
        success: false, 
        message: `顔を検出できませんでした。Before: ${beforeFaces.length}個, After: ${afterFaces.length}個の顔を検出。画像の品質や顔の位置を確認してください。詳細: ${JSON.stringify({beforeFaces: beforeFaces.length, afterFaces: afterFaces.length})}` 
      });
    }

    // 差分抽出（美容効果分析用）- 補正後の画像の結果を使用
    const beforeFace = beforeFaces[0];
    const afterFace = afterFaces[0];

    // 画像の明度・彩度分析
    const beforeColors = beforeRes.imagePropertiesAnnotation?.dominantColors?.colors || [];
    const afterColors = afterRes.imagePropertiesAnnotation?.dominantColors?.colors || [];

    // 肌の状態分析関数（シワ・シミ・肌質の評価）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analyzeSkinCondition = (face: any, colors: any[]) => {
      // 肌の明度・彩度から肌質を評価
      const skinTone = colors.length > 0 ? colors[0] : null;
      const brightness = skinTone && skinTone.color && 
        typeof skinTone.color.red === 'number' && 
        typeof skinTone.color.green === 'number' && 
        typeof skinTone.color.blue === 'number' 
        ? (skinTone.color.red + skinTone.color.green + skinTone.color.blue) / 3 
        : 0;
      const saturation = skinTone && skinTone.color && 
        typeof skinTone.color.red === 'number' && 
        typeof skinTone.color.green === 'number' && 
        typeof skinTone.color.blue === 'number' 
        ? Math.sqrt(
            Math.pow(skinTone.color.red - brightness, 2) + 
            Math.pow(skinTone.color.green - brightness, 2) + 
            Math.pow(skinTone.color.blue - brightness, 2)
          ) 
        : 0;

      // 顔の角度からシワの見えやすさを評価
      const headTilt = Math.abs(face.panAngle || 0) + Math.abs(face.rollAngle || 0) + Math.abs(face.tiltAngle || 0);
      const wrinkleVisibility = Math.min(headTilt / 30, 1); // 角度が大きいほどシワが見えやすい

      // 肌の質感評価（明度と彩度から）
      const skinQuality = {
        brightness: Math.round(brightness),
        saturation: Math.round(saturation),
        evenness: saturation < 30 ? '良好' : saturation < 60 ? '普通' : '不均一',
        tone: brightness > 200 ? '明るい' : brightness > 150 ? '普通' : '暗い'
      };

      return {
        skinQuality,
        wrinkleVisibility: Math.round(wrinkleVisibility * 100),
        estimatedAge: face.joyLikelihood === 'VERY_LIKELY' ? '若々しい' : 
                     face.angerLikelihood === 'VERY_LIKELY' ? '疲れている' : '普通'
      };
    };

    // Before/Afterの肌状態分析
    const beforeSkinAnalysis = analyzeSkinCondition(beforeFace, beforeColors);
    const afterSkinAnalysis = analyzeSkinCondition(afterFace, afterColors);

    // 精密な数値測定関数（顔の幅 = 目の外側間距離）
    const calculateFaceWidth = (face: { landmarks?: Array<{ type?: string; position?: { x: number; y: number } }> }) => {
      const landmarks = face.landmarks || [];
      
      // 最優先: 目の外側から外側の距離を使用
      const leftEye = landmarks.find((l) => l.type === 'LEFT_EYE_OUTER_CORNER');
      const rightEye = landmarks.find((l) => l.type === 'RIGHT_EYE_OUTER_CORNER');
      
      if (leftEye && rightEye && leftEye.position && rightEye.position) {
        const dx = rightEye.position.x - leftEye.position.x;
        const dy = rightEye.position.y - leftEye.position.y;
        const width = Math.sqrt(dx * dx + dy * dy);
        console.log("顔の幅計算詳細（目外側間）:", { 
          leftEye: leftEye.position, 
          rightEye: rightEye.position, 
          width 
        });
        return width;
      }
      
      // フォールバック1: 頬骨間距離
      const leftCheek = landmarks.find((l) => l.type === 'LEFT_CHEEK');
      const rightCheek = landmarks.find((l) => l.type === 'RIGHT_CHEEK');
      
      if (leftCheek && rightCheek && leftCheek.position && rightCheek.position) {
        const dx = rightCheek.position.x - leftCheek.position.x;
        const dy = rightCheek.position.y - leftCheek.position.y;
        const width = Math.sqrt(dx * dx + dy * dy);
        console.log("顔の幅計算詳細（頬骨間）:", { 
          leftCheek: leftCheek.position, 
          rightCheek: rightCheek.position, 
          width 
        });
        return width;
      }
      
      // フォールバック2: 目の中心間距離を使用
      const leftEyeCenter = landmarks.find((l) => l.type === 'LEFT_EYE');
      const rightEyeCenter = landmarks.find((l) => l.type === 'RIGHT_EYE');
      
      if (leftEyeCenter && rightEyeCenter && leftEyeCenter.position && rightEyeCenter.position) {
        const dx = rightEyeCenter.position.x - leftEyeCenter.position.x;
        const dy = rightEyeCenter.position.y - leftEyeCenter.position.y;
        const width = Math.sqrt(dx * dx + dy * dy);
        console.log("顔の幅計算詳細（目中心間）:", { 
          leftEyeCenter: leftEyeCenter.position, 
          rightEyeCenter: rightEyeCenter.position, 
          width 
        });
        return width;
      }
      
      console.log("顔の幅計算失敗: 目の外側、頬骨、目の中心が見つかりません");
      return 0;
    };


    // 精密な数値測定関数（顔の長さ = 額から顎先まで）
    const calculateFaceHeight = (face: { landmarks?: Array<{ type?: string; position?: { x: number; y: number } }> }) => {
      const landmarks = face.landmarks || [];
      
      // 額の位置を取得（眉毛の上）
      const leftEyebrow = landmarks.find((l) => l.type === 'LEFT_OF_LEFT_EYEBROW');
      const rightEyebrow = landmarks.find((l) => l.type === 'RIGHT_OF_RIGHT_EYEBROW');
      
      // 顎先の位置を取得
      const chin = landmarks.find((l) => l.type === 'CHIN_GNATHION');
      
      if (leftEyebrow && rightEyebrow && chin && 
          leftEyebrow.position && rightEyebrow.position && chin.position) {
        
        // 眉毛の中央点を計算
        const eyebrowCenterY = (leftEyebrow.position.y + rightEyebrow.position.y) / 2;
        const chinY = chin.position.y;
        
        const height = Math.abs(chinY - eyebrowCenterY);
        console.log("顔の長さ計算詳細（額-顎先）:", { 
          eyebrowCenterY, 
          chinY, 
          height,
          leftEyebrow: leftEyebrow.position,
          rightEyebrow: rightEyebrow.position,
          chin: chin.position
        });
        return height;
      }
      
      // 眉毛が見つからない場合は、目の上から顎先まで
      const leftEye = landmarks.find((l) => l.type === 'LEFT_EYE');
      const rightEye = landmarks.find((l) => l.type === 'RIGHT_EYE');
      
      if (leftEye && rightEye && chin && 
          leftEye.position && rightEye.position && chin.position) {
        
        // 目の中央点を計算
        const eyeCenterY = (leftEye.position.y + rightEye.position.y) / 2;
        const chinY = chin.position.y;
        
        const height = Math.abs(chinY - eyeCenterY);
        console.log("顔の長さ計算詳細（目-顎先）:", { 
          eyeCenterY, 
          chinY, 
          height,
          leftEye: leftEye.position,
          rightEye: rightEye.position,
          chin: chin.position
        });
        return height;
      }
      
      console.log("顔の長さ計算失敗: 眉毛または目、顎先が見つかりません");
      return 0;
    };

    // 目の間隔（左右の目の中心間距離）
    const calculateEyeDistance = (face: { landmarks?: Array<{ type?: string; position?: { x: number; y: number } }> }) => {
      const landmarks = face.landmarks || [];
      
      // 左右の目の中心を取得
      const leftEye = landmarks.find((l) => l.type === 'LEFT_EYE');
      const rightEye = landmarks.find((l) => l.type === 'RIGHT_EYE');
      
      if (leftEye && rightEye && leftEye.position && rightEye.position) {
        const dx = rightEye.position.x - leftEye.position.x; // 右から左を引く（正の値）
        const dy = rightEye.position.y - leftEye.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        console.log("目の間隔計算詳細:", { 
          leftEye: leftEye.position, 
          rightEye: rightEye.position, 
          distance 
        });
        return distance;
      }
      
      console.log("目の間隔計算失敗: 左右の目が見つかりません");
      return 0;
    };

    // 眉毛と目の距離（眉毛から目までの垂直距離）
    const calculateEyebrowToEyeDistance = (face: { landmarks?: Array<{ type?: string; position?: { x: number; y: number } }> }) => {
      const landmarks = face.landmarks || [];
      const leftEyebrow = landmarks.find((l) => l.type === 'LEFT_OF_LEFT_EYEBROW');
      const leftEye = landmarks.find((l) => l.type === 'LEFT_EYE');
      
      if (leftEyebrow && leftEye && leftEyebrow.position && leftEye.position) {
        const dx = leftEyebrow.position.x - leftEye.position.x;
        const dy = leftEyebrow.position.y - leftEye.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        console.log("眉毛と目の距離計算詳細:", { 
          leftEyebrow: leftEyebrow.position, 
          leftEye: leftEye.position, 
          distance 
        });
        return distance;
      }
      
      console.log("眉毛と目の距離計算失敗: 眉毛または目が見つかりません");
      return 0;
    };

    // 削除: 既存のフェイスライン角度計算（機能していないため）

    // 新指標: フェイスリフト角度（目尻-口角-顎先）
    const calculateFaceLiftAngle = (face: { landmarks?: Array<{ type?: string; position?: { x: number; y: number } }> }) => {
      const landmarks = face.landmarks || [];
      const eyeCorner = landmarks.find((l) => l.type === 'LEFT_EYE_OUTER_CORNER');
      const mouthCorner = landmarks.find((l) => l.type === 'MOUTH_LEFT');
      const chin = landmarks.find((l) => l.type === 'CHIN_GNATHION');
      
      if (eyeCorner && mouthCorner && chin && eyeCorner.position && mouthCorner.position && chin.position) {
        // 3点間の角度を計算
        const a = eyeCorner.position;
        const b = mouthCorner.position;
        const c = chin.position;
        
        const ab = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
        const bc = Math.sqrt((c.x - b.x) ** 2 + (c.y - b.y) ** 2);
        const ac = Math.sqrt((c.x - a.x) ** 2 + (c.y - a.y) ** 2);
        
        if (ab > 0 && bc > 0 && ac > 0) {
          const angle = Math.acos((ab ** 2 + bc ** 2 - ac ** 2) / (2 * ab * bc)) * (180 / Math.PI);
          return angle;
        }
      }
      return 0;
    };

    // 新指標: 下顔面比率（鼻下-口角-顎先）
    const calculateLowerFaceRatio = (face: { landmarks?: Array<{ type?: string; position?: { x: number; y: number } }> }) => {
      const landmarks = face.landmarks || [];
      const noseBottom = landmarks.find((l) => l.type === 'NOSE_BOTTOM_CENTER');
      const mouthCorner = landmarks.find((l) => l.type === 'MOUTH_LEFT');
      const chin = landmarks.find((l) => l.type === 'CHIN_GNATHION');
      
      if (noseBottom && mouthCorner && chin && noseBottom.position && mouthCorner.position && chin.position) {
        const noseToMouth = Math.sqrt(
          (mouthCorner.position.x - noseBottom.position.x) ** 2 + 
          (mouthCorner.position.y - noseBottom.position.y) ** 2
        );
        const noseToChin = Math.sqrt(
          (chin.position.x - noseBottom.position.x) ** 2 + 
          (chin.position.y - noseBottom.position.y) ** 2
        );
        
        if (noseToChin > 0) {
          return noseToMouth / noseToChin;
        }
      }
      return 0;
    };

    // 数値計算
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const beforeFaceWidth = calculateFaceWidth(beforeFace as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const afterFaceWidth = calculateFaceWidth(afterFace as any);
    const faceWidthChange = Math.round((afterFaceWidth - beforeFaceWidth) * 0.1); // ピクセルをmmに変換（概算）
    
    // デバッグ用ログ追加
    console.log("顔の幅計算デバッグ:", {
      beforeFaceWidth,
      afterFaceWidth,
      faceWidthChange,
      beforeBoundingBox: beforeFace.boundingPoly?.vertices,
      afterBoundingBox: afterFace.boundingPoly?.vertices,
      beforeLandmarks: beforeFace.landmarks?.length || 0,
      afterLandmarks: afterFace.landmarks?.length || 0,
      beforeLandmarkTypes: beforeFace.landmarks?.map(l => l.type).slice(0, 10) || [],
      afterLandmarkTypes: afterFace.landmarks?.map(l => l.type).slice(0, 10) || []
    });

    // 全ランドマークの詳細表示
    console.log("全ランドマーク詳細:", {
      beforeAllLandmarks: beforeFace.landmarks?.map(l => ({
        type: l.type,
        position: l.position
      })) || [],
      afterAllLandmarks: afterFace.landmarks?.map(l => ({
        type: l.type,
        position: l.position
      })) || []
    });

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

    // 削除: 既存のフェイスライン角度計算

    // 新指標: フェイスリフト角度の計算
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const beforeFaceLiftAngle = calculateFaceLiftAngle(beforeFace as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const afterFaceLiftAngle = calculateFaceLiftAngle(afterFace as any);
    const faceLiftAngleChange = Math.round((afterFaceLiftAngle - beforeFaceLiftAngle) * 10) / 10;

    // 新指標: 下顔面比率の計算
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const beforeLowerFaceRatio = calculateLowerFaceRatio(beforeFace as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const afterLowerFaceRatio = calculateLowerFaceRatio(afterFace as any);
    // 比率の差分（絶対値）
    const lowerFaceRatioChange = Math.round((afterLowerFaceRatio - beforeLowerFaceRatio) * 1000) / 1000; // 小数点3桁まで
    // パーセンテージ変化率（相対値）
    const lowerFaceRatioChangePercent = beforeLowerFaceRatio > 0 
      ? ((afterLowerFaceRatio - beforeLowerFaceRatio) / beforeLowerFaceRatio) * 100 
      : 0;

    // フェイスリフト指数の計算（内部スコア）
    const faceLiftIndex = (faceLiftAngleChange * 0.6) + ((-lowerFaceRatioChange * 100) * 0.4);
    
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
        faceLiftAngle: {
          before: beforeFaceLiftAngle,
          after: afterFaceLiftAngle,
          change: faceLiftAngleChange,
          unit: "度"
        },
        lowerFaceRatio: {
          before: beforeLowerFaceRatio,
          after: afterLowerFaceRatio,
          change: lowerFaceRatioChange,
          changePercent: Math.round(lowerFaceRatioChangePercent * 10) / 10, // パーセンテージ変化率（小数点1桁）
          unit: "比率"
        }
      },
      
      // 顔の境界ボックス（サイズ・位置の変化）
      boundingBox: {
        before: beforeFace.boundingPoly?.vertices || [],
        after: afterFace.boundingPoly?.vertices || []
      },
      
      // ランドマーク情報（可視化用）
      landmarks: {
        before: beforeFace.landmarks || [],
        after: afterFace.landmarks || []
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
      },

      // 肌の状態分析（シワ・シミ・肌質の変化）
      skinAnalysis: {
        before: beforeSkinAnalysis,
        after: afterSkinAnalysis,
        improvements: {
          brightness: afterSkinAnalysis.skinQuality.brightness - beforeSkinAnalysis.skinQuality.brightness,
          saturation: afterSkinAnalysis.skinQuality.saturation - beforeSkinAnalysis.skinQuality.saturation,
          evenness: beforeSkinAnalysis.skinQuality.evenness !== afterSkinAnalysis.skinQuality.evenness,
          tone: beforeSkinAnalysis.skinQuality.tone !== afterSkinAnalysis.skinQuality.tone,
          wrinkleVisibility: afterSkinAnalysis.wrinkleVisibility - beforeSkinAnalysis.wrinkleVisibility,
          estimatedAge: beforeSkinAnalysis.estimatedAge !== afterSkinAnalysis.estimatedAge
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
    // 新指標: フェイスリフト角度
    if (diff.measurements.faceLiftAngle.change !== 0) {
      significantChanges.push(`フェイスリフト角度: ${diff.measurements.faceLiftAngle.change}度 ${diff.measurements.faceLiftAngle.change > 0 ? 'リフトアップ' : 'たるみ'}`);
    }
    // 新指標: 下顔面比率
    if (diff.measurements.lowerFaceRatio.change !== 0) {
      const changePercent = diff.measurements.lowerFaceRatio.changePercent ?? (diff.measurements.lowerFaceRatio.change * 100);
      significantChanges.push(`下顔面比率: ${changePercent.toFixed(1)}% ${diff.measurements.lowerFaceRatio.change < 0 ? 'リフトアップ' : 'たるみ'}`);
    }

    // 表情変化の確認（内面的な自信や精神状態の反映）
    const expressionChanges = [];
    if (diff.joy !== "変化なし") {
      const joyChange = diff.joy.split(' → ');
      if (joyChange[1] === 'VERY_LIKELY' || joyChange[1] === 'LIKELY') {
        expressionChanges.push(`明るい表情: より自然で自信に満ちた笑顔に変化`);
      } else if (joyChange[0] === 'VERY_LIKELY' || joyChange[0] === 'LIKELY') {
        expressionChanges.push(`明るい表情: より落ち着いた表情に変化`);
      }
    }
    if (diff.anger !== "変化なし") {
      const angerChange = diff.anger.split(' → ');
      if (angerChange[1] === 'UNLIKELY' || angerChange[1] === 'VERY_UNLIKELY') {
        expressionChanges.push(`穏やかな表情: より落ち着いた穏やかな表情に改善`);
      } else if (angerChange[0] === 'UNLIKELY' || angerChange[0] === 'VERY_UNLIKELY') {
        expressionChanges.push(`表情の変化: より緊張した表情に変化`);
      }
    }
    if (diff.sorrow !== "変化なし") {
      const sorrowChange = diff.sorrow.split(' → ');
      if (sorrowChange[1] === 'UNLIKELY' || sorrowChange[1] === 'VERY_UNLIKELY') {
        expressionChanges.push(`明るい表情: より前向きで明るい表情に改善`);
      } else if (sorrowChange[0] === 'UNLIKELY' || sorrowChange[0] === 'VERY_UNLIKELY') {
        expressionChanges.push(`表情の変化: より憂鬱な表情に変化`);
      }
    }
    if (diff.surprise !== "変化なし") {
      const surpriseChange = diff.surprise.split(' → ');
      if (surpriseChange[1] === 'VERY_LIKELY' || surpriseChange[1] === 'LIKELY') {
        expressionChanges.push(`生き生きとした表情: より活発で生き生きとした表情に変化`);
      } else if (surpriseChange[0] === 'VERY_LIKELY' || surpriseChange[0] === 'LIKELY') {
        expressionChanges.push(`表情の変化: より落ち着いた表情に変化`);
      }
    }

    // 肌の状態変化の確認
    const skinChanges = [];
    if (diff.skinAnalysis.improvements.brightness !== 0) {
      skinChanges.push(`肌の明度: ${diff.skinAnalysis.improvements.brightness > 0 ? '+' : ''}${diff.skinAnalysis.improvements.brightness}`);
    }
    if (diff.skinAnalysis.improvements.saturation !== 0) {
      skinChanges.push(`肌の彩度: ${diff.skinAnalysis.improvements.saturation > 0 ? '+' : ''}${diff.skinAnalysis.improvements.saturation}`);
    }
    if (diff.skinAnalysis.improvements.evenness) {
      skinChanges.push(`肌の均一性: ${diff.skinAnalysis.before.skinQuality.evenness} → ${diff.skinAnalysis.after.skinQuality.evenness}`);
    }
    if (diff.skinAnalysis.improvements.tone) {
      skinChanges.push(`肌のトーン: ${diff.skinAnalysis.before.skinQuality.tone} → ${diff.skinAnalysis.after.skinQuality.tone}`);
    }
    if (diff.skinAnalysis.improvements.wrinkleVisibility !== 0) {
      skinChanges.push(`シワの見えやすさ: ${diff.skinAnalysis.improvements.wrinkleVisibility > 0 ? '+' : ''}${diff.skinAnalysis.improvements.wrinkleVisibility}%`);
    }
    if (diff.skinAnalysis.improvements.estimatedAge) {
      skinChanges.push(`肌年齢印象: ${diff.skinAnalysis.before.estimatedAge} → ${diff.skinAnalysis.after.estimatedAge}`);
    }

    // OpenAIコメント生成（変化項目のみに焦点）
    const prompt = `
あなたは美容・エステ専門のAIカウンセラーです。
以下の変化データをもとに、美容効果の変化を具体的な数値とともに日本語で分析してください。

【検出された変化】
${significantChanges.length > 0 ? significantChanges.map(change => `- ${change}`).join('\n') : '- 数値的な変化は検出されませんでした'}

${expressionChanges.length > 0 ? `【内面的な変化（表情・精神状態）】\n${expressionChanges.map(change => `- ${change}`).join('\n')}` : ''}

${skinChanges.length > 0 ? `【肌の状態変化】\n${skinChanges.map(change => `- ${change}`).join('\n')}` : ''}

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
      faceLiftIndex: Math.round(faceLiftIndex * 10) / 10, // 小数点1桁まで
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
