import { useEffect, useState } from "react";

type OdometerProps = {
  value: number;
  label: string;
};

export default function Odometer({ value, label }: OdometerProps) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const start = display;
    const delta = value - start;
    if (!delta) return;
    const started = performance.now();
    const duration = 650;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - started) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + delta * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <div className="faundry-stat" aria-label={`${display} ${label}`}>
      <strong>{display.toLocaleString()}</strong>
      <span>{label}</span>
    </div>
  );
}

export function OdometerRow({ stats }: { stats: OdometerProps[] }) {
  return (
    <div className="faundry-stats">
      {stats.map((stat) => <Odometer key={stat.label} {...stat} />)}
    </div>
  );
}
