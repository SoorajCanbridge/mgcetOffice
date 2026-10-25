'use client';

import { cn } from '@/lib/utils';

export function Sparkline({ values = [], className, stroke = 'currentColor', fill = 'currentColor', height = 36, width = 96 }) {
  const nums = values.map((v) => Number(v) || 0);
  if (nums.length < 2) {
    return <div className={cn('h-9 w-24', className)} />;
  }
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const pad = 2;
  const innerH = height - pad * 2;
  const innerW = width - pad * 2;
  const points = nums.map((v, i) => {
    const x = pad + (i / (nums.length - 1)) * innerW;
    const y = pad + innerH - ((v - min) / span) * innerH;
    return `${x},${y}`;
  });
  const area = `${pad},${height - pad} ${points.join(' ')} ${width - pad},${height - pad}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible text-blue-500', className)}
      width={width}
      height={height}
      aria-hidden
    >
      <polyline points={area} fill={fill} fillOpacity="0.12" stroke="none" />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
