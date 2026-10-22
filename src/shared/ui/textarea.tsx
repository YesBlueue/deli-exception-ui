import * as React from "react";
import { TextArea } from "@radix-ui/themes";

type TextareaProps = Omit<React.ComponentProps<"textarea">, "color" | "value" | "defaultValue"> & {
  value?: string;
  defaultValue?: string;
};

/** Multi-line input rendered by Radix Themes. `className` styles the field box; other props go to the <textarea>. */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>((props, ref) => (
  <TextArea ref={ref} size="2" resize="vertical" {...props} />
));
Textarea.displayName = "Textarea";

export { Textarea };
