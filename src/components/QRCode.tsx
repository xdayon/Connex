import { useMemo } from "react";
import { encode } from "uqr";

type Props = { value: string; size?: number; label: string; className?: string; withLogo?: boolean };

export function QRCode({ value, size = 260, label, className = "", withLogo = false }: Props) {
  const { count, path } = useMemo(() => {
    // Com o símbolo: correção Q (aguenta 25%). A H deixava o QR mais denso e falhava em foto.
    const { data, size: count } = encode(value, { ecc: withLogo ? "Q" : "M", border: 0 });
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
  }, [value, withLogo]);

  const quiet = 3;
  const box = count + quiet * 2;
  const logo = Math.round(count * 0.24);
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
      <path transform={`translate(${quiet} ${quiet})`} d={path} fill="#0a0d16" />
      {withLogo && (
        // O símbolo cobre cerca de 8% dos módulos, bem abaixo dos 25% da correção Q.
        <g shapeRendering="geometricPrecision">
          <rect x={box / 2 - logo / 2 - 1} y={box / 2 - logo / 2 - 1} width={logo + 2} height={logo + 2} rx={(logo + 2) * 0.24} fill="#ffffff" />
          <svg x={box / 2 - logo / 2} y={box / 2 - logo / 2} width={logo} height={logo} viewBox="0 0 512 512" aria-hidden>
            <rect width="512" height="512" rx="120" fill="#0a0d16" />
            <path d="M128 146 L194 256 L128 366" fill="none" stroke="#C77DFF" strokeWidth="60" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M384 146 L318 256 L384 366" fill="none" stroke="#00F0FF" strokeWidth="60" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="256" cy="256" r="18" fill="#E9ECF5" />
          </svg>
        </g>
      )}
    </svg>
  );
}
