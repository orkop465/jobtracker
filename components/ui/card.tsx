"use client";

import { type HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-8",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hoverable, padding = "md", className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          relative
          gradient-border-card
          ${paddingClasses[padding]}
          ${hoverable ? "transition-all duration-200 hover:shadow-[0_4px_24px_-4px_rgba(0,212,255,0.08)] cursor-pointer group" : ""}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
export { Card };
export type { CardProps };
