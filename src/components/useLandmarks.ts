"use client";

import { useState } from "react";

type Landmarks = Record<string, { x: number; y: number }>;

type LandmarksState = {
  before?: Landmarks;
  after?: Landmarks;
};

type ImageState = {
  before?: string; // base64
  after?: string; // base64
};

/**
 * 画像アップロードとランドマーク取得を管理するフック
 * Vision APIからランドマークを取得し、before/afterで共通利用
 */
export function useLandmarks() {
  const [landmarks, setLandmarks] = useState<LandmarksState>({});
  const [images, setImages] = useState<ImageState>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 画像をリサイズしてbase64に変換
  const resizeImage = async (file: File, maxSize = 1280): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const img = new window.Image();
        img.onload = () => {
          try {
            const scale = Math.min(maxSize / img.width, maxSize / img.height);
            const canvas = document.createElement("canvas");
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Canvas context not available"));
              return;
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            resolve(dataUrl);
          } catch (error) {
            console.error("Canvas processing error:", error);
            reject(error);
          }
        };
        img.onerror = (error) => {
          console.error("Image load error:", error);
          reject(error);
        };
        img.src = URL.createObjectURL(file);
      } catch (error) {
        console.error("Resize image error:", error);
        reject(error);
      }
    });
  };

  // 画像アップロードとランドマーク取得
  async function uploadImage(
    e: React.ChangeEvent<HTMLInputElement>,
    type: "before" | "after" = "before"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // 画像をリサイズしてbase64に変換
      const base64Image = await resizeImage(file);

      // 画像を保存
      setImages((prev) => ({
        ...prev,
        [type]: base64Image,
      }));

      // Vision APIでランドマーク取得
      const res = await fetch("/api/vision/landmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });

      const data = await res.json();

      if (!data.success || !data.landmarks) {
        throw new Error(data.error || "ランドマーク取得に失敗しました");
      }

      // before/afterに設定
      setLandmarks((prev) => ({
        ...prev,
        [type]: data.landmarks,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "画像処理に失敗しました";
      setError(errorMessage);
      console.error("Upload image error:", err);
    } finally {
      setLoading(false);
    }
  }

  // ランドマークをリセット
  function resetLandmarks() {
    setLandmarks({});
    setImages({});
    setError(null);
  }

  return {
    landmarks,
    images,
    loading,
    error,
    uploadImage,
    resetLandmarks,
  };
}

