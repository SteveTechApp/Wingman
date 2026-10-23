import type { CSSProperties, ImgHTMLAttributes } from "react";

type GuruAssistantAvatarProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export function GuruAssistantAvatar({
  size = 40,
  className,
  style,
  alt = "Guru",
  ...rest
}: GuruAssistantAvatarProps) {
  return (
    <span
      className={["", className ?? ""].join(" ").trim()}
      style={{ width: size, height: size, ...style }}
    >
      <img {...rest} src="/guru-bot.png" alt={alt} decoding="async" />
    </span>
  );
}

export default GuruAssistantAvatar;
