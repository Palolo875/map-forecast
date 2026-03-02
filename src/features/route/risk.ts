export type RiskLevel = "low" | "medium" | "high" | "extreme";

export type RiskScore = {
  score: number;
  level: RiskLevel;
};

export function riskFromScore(score: number): RiskScore {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const level: RiskLevel = s < 25 ? "low" : s < 50 ? "medium" : s < 75 ? "high" : "extreme";
  return { score: s, level };
}
