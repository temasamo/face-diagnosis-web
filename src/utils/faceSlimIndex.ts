// 型定義
interface Position {
  x: number;
  y: number;
}

interface Landmark {
  type: string;
  position: Position;
}

interface VisionData {
  landmarks?: Landmark[];
}

interface LandmarkPoints {
  leftCheek: Position;
  rightCheek: Position;
  leftJaw: Position;
  rightJaw: Position;
  leftEyeCorner: Position;
  rightEyeCorner: Position;
  chin: Position;
  midEye: Position;
  leftEar: Position;
  rightEar: Position;
}

/**
 * 顔が痩せたスコアを算出
 * @param before Vision APIのランドマーク座標（Before）
 * @param after  Vision APIのランドマーク座標（After）
 * @returns { faceSlimIndex, details }
 */
export function calculateFaceSlimIndex(before: VisionData, after: VisionData) {
  // ===== ユーティリティ関数 =====
  const distance = (p1: Position, p2: Position) =>
    Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

  const polygonArea = (points: Position[]) => {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y - points[j].x * points[i].y;
    }
    return Math.abs(area / 2);
  };

  // ===== 必要ランドマーク =====
  const lm = (data: VisionData, key: string): Position => {
    const landmark = data.landmarks?.find((l: Landmark) => l.type === key);
    return landmark?.position || { x: 0, y: 0 };
  };

  // 主要ランドマーク取得
  const b: LandmarkPoints = {
    leftCheek: lm(before, "LEFT_CHEEK_CENTER") || lm(before, "LEFT_EAR_TRAGION"),
    rightCheek: lm(before, "RIGHT_CHEEK_CENTER") || lm(before, "RIGHT_EAR_TRAGION"),
    leftJaw: lm(before, "CHIN_LEFT_GONION"),
    rightJaw: lm(before, "CHIN_RIGHT_GONION"),
    leftEyeCorner: lm(before, "LEFT_EYE_RIGHT_CORNER"),
    rightEyeCorner: lm(before, "RIGHT_EYE_LEFT_CORNER"),
    chin: lm(before, "CHIN_GNATHION"),
    midEye: lm(before, "MIDPOINT_BETWEEN_EYES"),
    leftEar: lm(before, "LEFT_EAR_TRAGION"),
    rightEar: lm(before, "RIGHT_EAR_TRAGION"),
  };

  const a: LandmarkPoints = {
    leftCheek: lm(after, "LEFT_CHEEK_CENTER") || lm(after, "LEFT_EAR_TRAGION"),
    rightCheek: lm(after, "RIGHT_CHEEK_CENTER") || lm(after, "RIGHT_EAR_TRAGION"),
    leftJaw: lm(after, "CHIN_LEFT_GONION"),
    rightJaw: lm(after, "CHIN_RIGHT_GONION"),
    leftEyeCorner: lm(after, "LEFT_EYE_RIGHT_CORNER"),
    rightEyeCorner: lm(after, "RIGHT_EYE_LEFT_CORNER"),
    chin: lm(after, "CHIN_GNATHION"),
    midEye: lm(after, "MIDPOINT_BETWEEN_EYES"),
    leftEar: lm(after, "LEFT_EAR_TRAGION"),
    rightEar: lm(after, "RIGHT_EAR_TRAGION"),
  };

  // ===== 1. 頬幅比 =====
  const eyeDistanceBefore = distance(b.leftEyeCorner, b.rightEyeCorner);
  const eyeDistanceAfter = distance(a.leftEyeCorner, a.rightEyeCorner);
  
  if (eyeDistanceBefore === 0 || eyeDistanceAfter === 0) {
    return {
      faceSlimIndex: "0.00",
      details: {
        cheekWidthChange: "0.00",
        jawWidthChange: "0.00",
        areaChange: "0.00",
      },
      interpretation: "計算エラー（ランドマーク不足）",
    };
  }

  // 正規化された比率で計算（目尻間距離で正規化）
  const cheekWidthBefore = distance(b.leftCheek, b.rightCheek) / eyeDistanceBefore;
  const cheekWidthAfter = distance(a.leftCheek, a.rightCheek) / eyeDistanceAfter;
  const cheekWidthChange = cheekWidthBefore > 0 ? (cheekWidthAfter - cheekWidthBefore) / cheekWidthBefore : 0;

  // ===== 2. 顎ライン幅比 =====
  const jawWidthBefore = distance(b.leftJaw, b.rightJaw) / eyeDistanceBefore;
  const jawWidthAfter = distance(a.leftJaw, a.rightJaw) / eyeDistanceAfter;
  const jawWidthChange = jawWidthBefore > 0 ? (jawWidthAfter - jawWidthBefore) / jawWidthBefore : 0;

  // ===== 3. フェイス面積比（正規化） =====
  const areaBefore = polygonArea([b.leftEar, b.rightEar, b.chin, b.midEye]) / (eyeDistanceBefore * eyeDistanceBefore);
  const areaAfter = polygonArea([a.leftEar, a.rightEar, a.chin, a.midEye]) / (eyeDistanceAfter * eyeDistanceAfter);
  const areaChange = areaBefore > 0 ? (areaAfter - areaBefore) / areaBefore : 0;

  // ===== 総合スコア =====
  const faceSlimIndex =
    (cheekWidthChange * 0.4 + jawWidthChange * 0.3 + areaChange * 0.3) * 100;

  // ===== 結果 =====
  return {
    faceSlimIndex: faceSlimIndex.toFixed(2),
    details: {
      cheekWidthChange: (cheekWidthChange * 100).toFixed(2),
      jawWidthChange: (jawWidthChange * 100).toFixed(2),
      areaChange: (areaChange * 100).toFixed(2),
    },
    interpretation:
      faceSlimIndex < -5
        ? "顔が細くなった（痩せた）"
        : faceSlimIndex > 5
        ? "顔がふっくらした（むくみ）"
        : "変化なし（安定）",
  };
}

