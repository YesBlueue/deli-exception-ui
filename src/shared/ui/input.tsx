import * as React from "react";
import { TextField } from "@radix-ui/themes";

type InputProps = Omit<React.ComponentProps<"input">, "size" | "color" | "defaultValue" | "value"> & {
  value?: string | number;
  defaultValue?: string | number;
};

/** Text input rendered by Radix Themes. `className` styles the field box; other props go to the <input>. */
const Input = React.forwardRef<HTMLInputElement, InputProps>(({ type, ...props }, ref) => (
  <TextField.Root ref={ref} size="2" {...(type && { type: type as NonNullable<TextField.RootProps["type"]> })} {...props} />
));
Input.displayName = "Input";

export { Input };
