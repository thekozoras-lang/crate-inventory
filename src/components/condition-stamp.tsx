import { Badge } from "@/components/ui/badge";
import type { Condition, ItemStatus } from "@/lib/types";

const CONDITION_LABEL: Record<Condition, string> = {
  new: "New",
  "like-new": "Like new",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

export function ConditionStamp({ condition }: { condition: Condition }) {
  return <Badge tone="muted">{CONDITION_LABEL[condition]}</Badge>;
}

export function StatusStamp({ status }: { status: ItemStatus }) {
  if (status === "listed") return <Badge tone="warn">Listed</Badge>;
  if (status === "sold") return <Badge tone="ok">Sold</Badge>;
  return <Badge tone="muted">In storage</Badge>;
}
