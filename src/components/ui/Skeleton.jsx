// Pre-compute skeleton widths so Math.random() never runs during render
const SKELETON_WIDTHS = [140, 200, 160, 220, 180, 130, 190, 170, 150, 210];

export function SkeletonConversation() {
  return (
    <>
      {SKELETON_WIDTHS.slice(0, 6).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="shimmer-line h-3" style={{ width: SKELETON_WIDTHS[i] - 40 }} />
            <div className="shimmer-line h-2.5" style={{ width: SKELETON_WIDTHS[i] }} />
          </div>
          <div className="shimmer-line w-8 h-2" />
        </div>
      ))}
    </>
  );
}

export function SkeletonMessage({ align = "left", width }) {
  return (
    <div
      className={`flex items-end gap-2 ${align === "right" ? "flex-row-reverse" : ""} animate-pulse`}
    >
      {align === "left" && (
        <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex-shrink-0" />
      )}
      <div className="space-y-1 max-w-[60%]">
        <div
          className="h-9 rounded-2xl bg-[var(--bg-tertiary)]"
          style={{ width: width || 160 }}
        />
      </div>
    </div>
  );
}
