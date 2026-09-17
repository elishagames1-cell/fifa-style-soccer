// קבועי מידות המגרש (יחידות עולם, לא פיקסלים - המצלמה ממירה לפיקסלים)
export const FIELD = {
  width: 1050,
  height: 680,
  margin: 45,
  goalWidth: 105,
  goalDepth: 20,
  postRadius: 4,
  penaltyDepth: 165,
  penaltyWidth: 403,
  sixYardDepth: 55,
  sixYardWidth: 183,
  centerCircleRadius: 91.5,
  penaltySpotDist: 110,
};

// פורמציית 4-4-2 בשברי שטח (0..1), עבור קבוצה שתוקפת ימינה (attackDir = 1)
export const FORMATION_442 = [
  { x: 0.06, y: 0.5, role: 'GK' },
  { x: 0.18, y: 0.18, role: 'DEF' },
  { x: 0.18, y: 0.38, role: 'DEF' },
  { x: 0.18, y: 0.62, role: 'DEF' },
  { x: 0.18, y: 0.82, role: 'DEF' },
  { x: 0.45, y: 0.18, role: 'MID' },
  { x: 0.45, y: 0.38, role: 'MID' },
  { x: 0.45, y: 0.62, role: 'MID' },
  { x: 0.45, y: 0.82, role: 'MID' },
  { x: 0.72, y: 0.35, role: 'FWD' },
  { x: 0.72, y: 0.65, role: 'FWD' },
];

export function formationWorldPos(slotIndex, attackDir) {
  const slot = FORMATION_442[slotIndex];
  const fx = attackDir === 1 ? slot.x : 1 - slot.x;
  return { x: fx * FIELD.width, y: slot.y * FIELD.height };
}
