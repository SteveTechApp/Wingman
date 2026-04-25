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
      className={["wingman-guru-avatar", className ?? ""].join(" ").trim()}
      style={{ width: size, height: size, ...style }}
    >
      <img {...rest} src="/guru-bot.png" alt={alt} className="wingman-guru-avatar-image" />
    </span>
  );
}

export default GuruAssistantAvatar;