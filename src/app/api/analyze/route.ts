import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { before, after, mode = "vision" } = await request.json();

    if (!before || !after) {
      return NextResponse.json(
        { error: "Missing required images." },
        { status: 400 }
      );
    }

    // --- ① OpenAI Visionによる画像比較 ---
    if (mode === "vision") {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `あなたは顔診断の専門家です。提供された2枚の顔写真（施術前と施術後）を詳しく分析してください。

必ず以下の点を具体的に分析し、日本語で回答してください：

1. **肌の状態**: 明るさ、質感、色むら、シミやくすみの変化
2. **顔の輪郭**: 左右対称性、輪郭の変化、引き締まり具合
3. **表情**: 筋肉の緊張度、リラックス度、表情の変化
4. **全体的な印象**: 若々しさ、健康感、魅力的さの変化

重要な注意事項：
- 必ず実際の画像を分析してください
- 具体的な変化を指摘してください
- 一般的なアドバイスではなく、この写真に基づいた分析をしてください
- 日本語で自然に回答してください`,
              },
              { type: "image_url", image_url: { url: before, detail: "high" } },
              { type: "image_url", image_url: { url: after, detail: "high" } },
            ],
          },
        ],
      });

      const result =
        completion.choices?.[0]?.message?.content ||
        "比較結果を取得できませんでした。";

      return NextResponse.json({ mode, result });
    }

    // --- ② 数値分析モードは後で追加予定 ---
    else {
      return NextResponse.json(
        { error: "Numeric mode not implemented yet." },
        { status: 501 }
      );
    }
  } catch (error: unknown) {
    console.error("[analyze.ts error]", error);
    return NextResponse.json(
      { error: "Failed to analyze images." },
      { status: 500 }
    );
  }
}
