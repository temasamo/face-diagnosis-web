import { NextResponse } from "next/server";
import { jfetch, ImagePayload, SkinMetricsResponse } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const body: ImagePayload = await req.json();
    
    if (!body.image_b64) {
      return NextResponse.json(
        { error: "画像データが不足しています" },
        { status: 400 }
      );
    }

    // Python画像処理サービスに肌LAB数値化を依頼
    const data: SkinMetricsResponse = await jfetch(
      `http://127.0.0.1:8001/metrics/skin`,
      body
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("肌LAB数値化エラー:", error);
    return NextResponse.json(
      { error: "肌領域分析に失敗しました" },
      { status: 500 }
    );
  }
}
