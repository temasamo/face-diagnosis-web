// src/app/api/face/compare/route.ts
import { NextResponse } from "next/server";

type Point = { x: number; y: number };
type Landmarks = Record<string, Point>;
type FaceRequest = { before: Landmarks; after: Landmarks };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as FaceRequest;
    const { before, after } = body;
    if (!before || !after) {
      return NextResponse.json(
        { error: "before / after のランドマーク情報が不足しています。" },
        { status: 400 }
      );
    }

    const normalize = (lm: Landmarks) => {
      const L = lm.LEFT_EYE;
      const R = lm.RIGHT_EYE;
      const d = Math.hypot(R.x - L.x, R.y - L.y);
      const theta = Math.atan2(R.y - L.y, R.x - L.x);
      const cos = Math.cos(-theta);
      const sin = Math.sin(-theta);
      const norm: Landmarks = {};
      for (const key in lm) {
        const x = lm[key].x - L.x;
        const y = lm[key].y - L.y;
        const xr = x * cos + y * sin;
        const yr = -x * sin + y * cos;
        norm[key] = { x: xr / d, y: yr / d };
      }
      return norm;
    };

    const beforeNorm = normalize(before);
    const afterNorm = normalize(after);

    const metrics = (lm: Landmarks) => {
      const deg = (r: number) => (r * 180) / Math.PI;
      const angle = (a: Point, b: Point) => deg(Math.atan2(b.y - a.y, b.x - a.x));
      const jawLeft =
        Math.abs(
          angle(lm.CHIN_LEFT_GONION, lm.LEFT_EAR_TRAGION) -
          angle(lm.CHIN_LEFT_GONION, lm.CHIN_GNATHION)
        );
      const jawRight =
        Math.abs(
          angle(lm.CHIN_RIGHT_GONION, lm.RIGHT_EAR_TRAGION) -
          angle(lm.CHIN_RIGHT_GONION, lm.CHIN_GNATHION)
        );
      const JLA = (jawLeft + jawRight) / 2;
      const baseL = (lm.LEFT_EYE_LEFT_CORNER.y + lm.MOUTH_LEFT.y) / 2;
      const baseR = (lm.RIGHT_EYE_RIGHT_CORNER.y + lm.MOUTH_RIGHT.y) / 2;
      const CDI_L = lm.LEFT_CHEEK_CENTER.y - baseL;
      const CDI_R = lm.RIGHT_CHEEK_CENTER.y - baseR;
      const CDI = (CDI_L + CDI_R) / 2;
      const MCD = Math.abs(angle(lm.MOUTH_LEFT, lm.MOUTH_RIGHT));
      const jawWidth = Math.abs(lm.CHIN_RIGHT_GONION.x - lm.CHIN_LEFT_GONION.x);
      const earWidth = Math.abs(lm.RIGHT_EAR_TRAGION.x - lm.LEFT_EAR_TRAGION.x);
      const JWR = jawWidth / earWidth;
      return { MCD, JLA, CDI, CDI_L, CDI_R, JWR };
    };

    const beforeMetrics = metrics(beforeNorm);
    const afterMetrics = metrics(afterNorm);

    const ratio = (key: keyof typeof beforeMetrics) =>
      ((beforeMetrics[key] - afterMetrics[key]) / beforeMetrics[key]) * 100;

    const result = {
      before: beforeMetrics,
      after: afterMetrics,
      delta: {
        ΔCDI: afterMetrics.CDI - beforeMetrics.CDI,
        ΔJLA: afterMetrics.JLA - beforeMetrics.JLA,
        改善率_CDI: ratio("CDI"),
        改善率_JLA: ratio("JLA"),
      },
      score: (() => {
        const s = 50 + 0.6 * ratio("CDI") + 0.4 * ratio("JLA");
        return Math.round(Math.min(100, Math.max(0, s)));
      })(),
    };

    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    console.error("Face comparison error:", e);
    return NextResponse.json(
      { error: "たるみ比較処理中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}