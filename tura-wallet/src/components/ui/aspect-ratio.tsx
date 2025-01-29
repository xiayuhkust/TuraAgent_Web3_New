import * as React from "react";
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

interface AspectRatioProps extends React.ComponentPropsWithoutRef<typeof AspectRatioPrimitive.Root> {}

const AspectRatio = React.forwardRef<
  React.ElementRef<typeof AspectRatioPrimitive.Root>,
  AspectRatioProps
>((props, ref) => <AspectRatioPrimitive.Root {...props} ref={ref} />);

AspectRatio.displayName = AspectRatioPrimitive.Root.displayName;

export { AspectRatio };
