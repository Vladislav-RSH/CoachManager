type LogoMarkProps = {
  alt?: string;
  className?: string;
};

function LogoMark({ alt = "", className = "" }: LogoMarkProps) {
  return (
    <img
      src="/brand/tempo-mark.svg"
      alt={alt}
      draggable={false}
      className={["block shrink-0 rounded-lg", className].filter(Boolean).join(" ")}
    />
  );
}

export default LogoMark;
