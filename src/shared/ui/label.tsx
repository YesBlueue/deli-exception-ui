import * as React from "react";
import { Text } from "@radix-ui/themes";

import { cn } from "@/shared/utils";

/** Form label using Radix Themes typography. */
const Label = React.forwardRef<HTMLLabelElement, React.ComponentProps<"label">>(({ className, color: _color, ...props }, ref) => (
  <Text as="label" ref={ref} size="2" weight="medium" className={cn("block leading-none", className)} {...props} />
));
Label.displayName = "Label";

export { Label };
