export type ConsequenceNodeType =
  | "goal" | "asset" | "liability" | "cash_flow"
  | "investment" | "tax" | "financial_plan" | "life_event";

export type ConsequenceNode = {
  id: string;
  type: ConsequenceNodeType;
  label: string;
  evidence: Array<{ kind: "observed" | "calculated" | "assumption"; label: string }>;
};

export type ConsequenceEdge = {
  id: string;
  source: string;
  target: string;
  relationship: "funds" | "constrains" | "reduces" | "depends_on";
  explanation: string;
  confidence: "verified" | "calculated" | "uncertain";
};

export type ProposedChange = {
  kind: "contribution" | "withdrawal" | "horizon" | "return_assumption" | "new_liability" | "life_event";
  label: string;
  amount?: number;
};

export function analyseConsequences(
  nodes: ConsequenceNode[],
  edges: ConsequenceEdge[],
  change: ProposedChange,
) {
  const relevantTypes = new Set<ConsequenceNodeType>(
    change.kind === "contribution" || change.kind === "withdrawal"
      ? ["cash_flow", "investment", "goal", "financial_plan"]
      : change.kind === "horizon"
        ? ["goal", "financial_plan", "life_event"]
        : change.kind === "return_assumption"
          ? ["investment", "goal", "financial_plan"]
          : change.kind === "new_liability"
            ? ["liability", "cash_flow", "goal", "financial_plan"]
            : ["life_event", "cash_flow", "asset", "goal", "financial_plan"],
  );
  const directlyRelevant = nodes.filter((node) => relevantTypes.has(node.type));
  const affectedIds = new Set(directlyRelevant.map((node) => node.id));
  for (const edge of edges) {
    if (affectedIds.has(edge.source) || affectedIds.has(edge.target)) {
      affectedIds.add(edge.source);
      affectedIds.add(edge.target);
    }
  }
  const affectedNodes = nodes
    .filter((node) => affectedIds.has(node.id))
    .map((node) => ({ id: node.id, type: node.type, label: node.label }));
  const explanations = edges
    .filter((edge) => affectedIds.has(edge.source) && affectedIds.has(edge.target))
    .map((edge) => ({
      edgeId: edge.id,
      source: edge.source,
      target: edge.target,
      relationship: edge.relationship,
      explanation: edge.explanation,
      confidence: edge.confidence,
    }));
  return { affectedNodes, explanations, humanReviewRequired: true };
}
