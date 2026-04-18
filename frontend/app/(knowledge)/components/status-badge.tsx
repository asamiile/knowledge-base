import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  status: string;
  className?: string;
};

/** 実行ログのステータス（成功 / 失敗）を表示する Badge */
export function StatusBadge({ status, className }: Props) {
  return (
    <Badge
      variant={status === "success" ? "secondary" : "destructive"}
      className={cn("font-normal", className)}
    >
      {status === "success" ? "成功" : "失敗"}
    </Badge>
  );
}
