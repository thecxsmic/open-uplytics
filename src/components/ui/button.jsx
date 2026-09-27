import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { Spinner } from "@/components/spinner";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4",
  {
    variants: {
      variant: {
        default: "bg-white text-black hover:bg-zinc-200",
        secondary: "bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800",
        ghost: "hover:bg-white/5 text-zinc-300",
        destructive: "bg-red-600 text-white hover:bg-red-500",
        outline: "border border-zinc-800 bg-transparent hover:bg-white/5",
        link: "text-white underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 min-h-11",
        sm: "h-9 px-3 min-h-9",
        lg: "h-12 px-6 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, busy = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={asChild ? disabled : disabled || busy}
        aria-busy={!asChild && busy ? true : undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {busy ? <Spinner className="size-4" /> : null}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
