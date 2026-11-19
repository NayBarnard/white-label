export type ManagerUpdateStatus = "draft" | "internal_review" | "approved" | "published" | "archived";
export type ManagerUpdateWorkflowAction = "submit" | "approve" | "publish" | "archive";

const transitions: Record<ManagerUpdateWorkflowAction, Partial<Record<ManagerUpdateStatus, ManagerUpdateStatus>>> = {
  submit: { draft: "internal_review" },
  approve: { internal_review: "approved" },
  publish: { approved: "published" },
  archive: { published: "archived" },
};

export function nextManagerUpdateStatus(
  current: ManagerUpdateStatus,
  action: ManagerUpdateWorkflowAction,
) {
  return transitions[action][current] ?? null;
}
