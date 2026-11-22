import { describe, expect, it } from "vitest";
import { analyseConsequences, type ConsequenceEdge, type ConsequenceNode } from "./consequence";

const nodes: ConsequenceNode[] = [
  { id: "cash", type: "cash_flow", label: "Monthly cash flow", evidence: [] },
  { id: "portfolio", type: "investment", label: "Portfolio", evidence: [] },
  { id: "retirement", type: "goal", label: "Retirement", evidence: [] },
];

const edges: ConsequenceEdge[] = [
  {
    id: "funding",
    source: "cash",
    target: "portfolio",
    relationship: "funds",
    explanation: "Monthly contributions are assumed to fund the portfolio.",
    confidence: "calculated",
  },
  {
    id: "goal",
    source: "portfolio",
    target: "retirement",
    relationship: "depends_on",
    explanation: "The retirement goal depends on projected portfolio value.",
    confidence: "calculated",
  },
];

describe("financial consequence analysis", () => {
  it("includes directly and transitively affected nodes", () => {
    const result = analyseConsequences(nodes, edges, { kind: "withdrawal", label: "Increase monthly withdrawal", amount: 5000 });
    expect(result.affectedNodes.map((node) => node.id)).toEqual(expect.arrayContaining(["cash", "portfolio", "retirement"]));
    expect(result.explanations).toHaveLength(2);
    expect(result.humanReviewRequired).toBe(true);
  });

  it("does not invent a relationship for unrelated nodes", () => {
    const isolated = analyseConsequences(
      [...nodes, { id: "tax", type: "tax", label: "Tax", evidence: [] }],
      edges,
      { kind: "withdrawal", label: "Withdraw", amount: 1000 },
    );
    expect(isolated.affectedNodes.some((node) => node.id === "tax")).toBe(false);
  });
});
