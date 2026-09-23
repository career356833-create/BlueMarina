export type TurnGuidance = {
  direction: "port" | "starboard" | "aligned";
  angleDegrees: number;
  label: string;
};

const ALIGNMENT_TOLERANCE_DEGREES = 5;

export function getTurnGuidance(relativeBearing: number): TurnGuidance {
  const angleDegrees = Math.round(Math.abs(relativeBearing));

  if (angleDegrees <= ALIGNMENT_TOLERANCE_DEGREES) {
    return { direction: "aligned", angleDegrees, label: "침로 유지" };
  }

  if (relativeBearing < 0) {
    return { direction: "port", angleDegrees, label: `좌현으로 ${angleDegrees}° 정렬` };
  }

  return { direction: "starboard", angleDegrees, label: `우현으로 ${angleDegrees}° 정렬` };
}
