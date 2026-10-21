import * as React from "react";
import { Switch as ThemeSwitch } from "@radix-ui/themes";

/** Toggle switch rendered by Radix Themes (navy when on). */
const Switch = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof ThemeSwitch>>((props, ref) => (
  <ThemeSwitch ref={ref} size="2" {...props} />
));
Switch.displayName = "Switch";

export { Switch };
