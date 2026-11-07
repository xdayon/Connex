import { useMemo } from "react";
import { encode } from "uqr";

type Props = { value: string; size?: number; label: string; className?: string };

export function QRCode({ value, size = 260, label, className = "" }: Props) {
  const { count, path } = useMemo(() => {
    const { data, size: count } = encode(value, { ecc: "M", border: 0 });
    let d = "";
    for (let y = 0; y < count; y++) {
      let x = 0;
      while (x < count) {
        if (!data[y][x]) {
          x++;
          continue;
        }
        const start = x;
        while (x < count && data[y][x]) x++;
        d += `M${start} ${y}h${x - start}v1h-${x - start}z`;
      }
    }
    return { count, path: d };
  }, [value]);

  const quiet = 3;
  const box = count + quiet * 2;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${box} ${box}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={`block max-w-full ${className}`}
      style={{ aspectRatio: "1 / 1", height: "auto" }}
    >
      <rect width={box} height={box} fill="#ffffff" />
      <path transform={`translate(${quiet} ${quiet})`} d={path} fill="#12141e" />
    </svg>
  );
}
