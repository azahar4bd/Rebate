"use client";

interface MarqueeProps {
  text: string;
  visible: boolean;
}

/**
 * Scrolling notice bar (marquee).
 * Duplicates the text twice for a seamless loop.
 */
export default function Marquee({ text, visible }: MarqueeProps) {
  if (!visible || !text.trim()) return null;

  return (
    <div className="relative overflow-hidden border-b border-amber-300/60 bg-gradient-to-r from-amber-500 to-amber-400 py-2">
      <div className="animate-marquee flex w-max items-center whitespace-nowrap">
        {[0, 1].map((i) => (
          <span
            key={i}
            className="mx-6 text-[13px] font-semibold tracking-wide text-amber-950"
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
