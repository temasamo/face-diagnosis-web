import { NextResponse } from "next/server";
import { jfetch, ImagePayload, ColorNormalizeResponse } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const body: ImagePayload = await req.json();
    
    if (!body.image_b64) {
      return NextResponse.json(
        { error: "画像データが不足しています" },
        { status: 400 }
      );
    }

    // Python画像処理サービスに色恒常性補正を依頼
    const data: ColorNormalizeResponse = await jfetch(
      `http://127.0.0.1:8001/normalize/color`,
      body
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("色恒常性補正エラー:", error);
    return NextResponse.json(
      { error: "色補正処理に失敗しました" },
      { status: 500 }
    );
  }
}
