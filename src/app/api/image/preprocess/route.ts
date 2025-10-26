import { NextResponse } from "next/server";
import { jfetch, ImagePayload, RetinexResponse } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const body: ImagePayload = await req.json();
    
    if (!body.image_b64) {
      return NextResponse.json(
        { error: "画像データが不足しています" },
        { status: 400 }
      );
    }

    // Python画像処理サービスにRetinex補正を依頼
    const data: RetinexResponse = await jfetch(
      `http://127.0.0.1:8001/preprocess/retinex`,
      body
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Retinex補正エラー:", error);
    return NextResponse.json(
      { error: "照明補正処理に失敗しました" },
      { status: 500 }
    );
  }
}
