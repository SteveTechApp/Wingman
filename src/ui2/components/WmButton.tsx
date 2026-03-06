import * as React from "react";

type Variant = "default" | "primary" | "ghost" | "icon";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export default function WmButton({ variant="default", className="", ...rest }: Props){
  const v =
    variant === "primary" ? " wm-btn--primary" :
    variant === "ghost" ? " wm-btn--ghost" :
    variant === "icon" ? " wm-btn--icon" : "";

  return <button className={"wm-btn" + v + (className ? " " + className : "")} {...rest} />;
}