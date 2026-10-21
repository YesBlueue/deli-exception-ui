import { Text } from "@radix-ui/themes";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Shown when a list or page has nothing to display. */
export function EmptyState({ icon: Icon, title, titleAs = "p", description, action }: {
  icon: LucideIcon;
  title: ReactNode;
  /** Use "h1" when the empty state is the whole page. */
  titleAs?: "p" | "h1" | "h2";
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
      <Icon className="mb-1 size-7 text-muted-foreground" aria-hidden />
      <Text as={titleAs === "p" ? "p" : "div"} size="3" weight="medium">{titleAs === "p" ? title : titleAs === "h1" ? <h1>{title}</h1> : <h2>{title}</h2>}</Text>
      {description && <Text as="p" size="2" color="gray">{description}</Text>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
