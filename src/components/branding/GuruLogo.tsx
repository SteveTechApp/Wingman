import guruLogo from "@/assets/branding/guru.png";

type GuruLogoProps = {
  className?: string;
  alt?: string;
};

export default function GuruLogo({
  className = "",
  alt = "Wingman Guru",
}: GuruLogoProps) {
  const classes = ["wm-guru-logo", className].filter(Boolean).join(" ");

  return (
    <img
      src={guruLogo}
      alt={alt}
      className={classes}
      draggable={false}
    />
  );
}