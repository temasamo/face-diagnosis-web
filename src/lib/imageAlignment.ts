/**
 * サーバーサイドでの画像補正ユーティリティ
 * Canvas APIを使用して画像を補正
 */

import { createCanvas, loadImage } from "canvas";

/**
 * base64画像を補正する
 * @param beforeImage base64形式のBefore画像
 * @param afterImage base64形式のAfter画像（基準画像）
 * @param alignment 補正情報
 * @returns 補正後のBefore画像（base64形式）
 */
export async function alignImage(
  beforeImage: string,
  afterImage: string,
  alignment: {
    offsetX: number;
    offsetY: number;
    rotationDiff: number;
    scale: number;
  }
): Promise<string> {
  try {
    // base64をBufferに変換
    const clean = (b64: string) => b64.replace(/^data:image\/\w+;base64,/, "");
    const beforeBuffer = Buffer.from(clean(beforeImage), "base64");
    const afterBuffer = Buffer.from(clean(afterImage), "base64");

    // 画像を読み込み
    const beforeImg = await loadImage(beforeBuffer);
    const afterImg = await loadImage(afterBuffer);

    // After画像のサイズでCanvasを作成
    const canvas = createCanvas(afterImg.width, afterImg.height);
    const ctx = canvas.getContext("2d");

    // After画像の中心を基準に変換
    const centerX = afterImg.width / 2;
    const centerY = afterImg.height / 2;

    // コンテキストを保存
    ctx.save();

    // 変換の原点を中心に移動
    ctx.translate(centerX, centerY);

    // 回転補正
    ctx.rotate((alignment.rotationDiff * Math.PI) / 180);

    // スケール補正
    ctx.scale(alignment.scale, alignment.scale);

    // 変換の原点を元に戻す
    ctx.translate(-centerX, -centerY);

    // 平行移動補正
    const offsetX = alignment.offsetX;
    const offsetY = alignment.offsetY;

    // Before画像を補正された位置・角度・サイズで描画
    ctx.drawImage(beforeImg, offsetX, offsetY, beforeImg.width, beforeImg.height);

    // コンテキストを復元
    ctx.restore();

    // Canvasをbase64に変換
    const alignedBuffer = canvas.toBuffer("image/jpeg", { quality: 0.9 });
    const alignedBase64 = alignedBuffer.toString("base64");

    return `data:image/jpeg;base64,${alignedBase64}`;
  } catch (error) {
    console.error("Image alignment error:", error);
    throw new Error("画像補正に失敗しました");
  }
}

/**
 * Vision APIの顔検出結果から補正情報を計算
 */
export function calculateAlignment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeFace: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  afterFace: any
): {
  offsetX: number;
  offsetY: number;
  rotationDiff: number;
  scale: number;
} | null {
  try {
    // 座標抽出関数
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getCenter = (f: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const left = f.landmarks?.find((l: any) => l.type === "LEFT_EYE")?.position;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const right = f.landmarks?.find((l: any) => l.type === "RIGHT_EYE")?.position;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nose = f.landmarks?.find((l: any) => l.type === "NOSE_TIP")?.position;

      if (!left || !right || !nose || left.x === undefined || left.y === undefined || 
          right.x === undefined || right.y === undefined || nose.x === undefined || nose.y === undefined) {
        return null;
      }
      const eyeCenter = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
      return { x: (eyeCenter.x + nose.x) / 2, y: (eyeCenter.y + nose.y) / 2 };
    };

    // 顔のサイズ計算（目から顎までの距離）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getFaceSize = (f: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const left = f.landmarks?.find((l: any) => l.type === "LEFT_EYE")?.position;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const right = f.landmarks?.find((l: any) => l.type === "RIGHT_EYE")?.position;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chin = f.landmarks?.find((l: any) => l.type === "CHIN_GNATHION")?.position;

      if (!left || !right || !chin || left.x === undefined || left.y === undefined ||
          right.x === undefined || right.y === undefined || chin.x === undefined || chin.y === undefined) {
        return null;
      }
      const eyeCenter = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
      return Math.sqrt(Math.pow(chin.x - eyeCenter.x, 2) + Math.pow(chin.y - eyeCenter.y, 2));
    };

    const beforeCenter = getCenter(beforeFace);
    const afterCenter = getCenter(afterFace);
    const beforeSize = getFaceSize(beforeFace);
    const afterSize = getFaceSize(afterFace);

    if (!beforeCenter || !afterCenter || !beforeSize || !afterSize) {
      return null;
    }

    // スケール比率計算
    const scaleRatio = afterSize / beforeSize;

    return {
      offsetX: afterCenter.x - beforeCenter.x,
      offsetY: afterCenter.y - beforeCenter.y,
      rotationDiff: (afterFace.rollAngle || 0) - (beforeFace.rollAngle || 0),
      scale: scaleRatio,
    };
  } catch (error) {
    console.error("Alignment calculation error:", error);
    return null;
  }
}

