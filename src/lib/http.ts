/**
 * Python画像処理サービスとの通信を行うHTTPクライアント
 */

export interface ImagePayload {
  image_b64: string;
}

export interface RetinexResponse {
  image_b64: string;
}

export interface SkinMetricsResponse {
  metrics: {
    L_mean: number;
    L_std: number;
    a_mean: number;
    a_std: number;
    b_mean: number;
    b_std: number;
    uniformity: number;
    skin_area_ratio: number;
    brightness: number;
    redness: number;
    yellowness: number;
  };
}

export interface ColorNormalizeResponse {
  image_b64: string;
}

/**
 * Python画像処理サービスにPOSTリクエストを送信
 */
export async function jfetch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Python service error: ${errorText}`);
  }
  
  return res.json();
}

/**
 * Python画像処理サービスのヘルスチェック
 */
export async function checkPythonService(): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.PY_SERVICE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
