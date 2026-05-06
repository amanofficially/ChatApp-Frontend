import { MessageCircle, Zap, Lock, Smile, ArrowLeft } from "lucide-react";

const features = [
  {
    icon: Zap,
    label: "Real-time messaging",
    desc: "Instant delivery powered by Socket.io",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
  },
  {
    icon: Lock,
    label: "Secure & Private",
    desc: "JWT authentication with encrypted passwords",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.1)",
  },
  {
    icon: Smile,
    label: "Emoji reactions",
    desc: "Express yourself with reactions & an emoji picker",
    color: "#ec4899",
    bg: "rgba(236,72,153,0.1)",
  },
];

export default function EmptyChat() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-[var(--bg-primary)] relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-brand-500/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-accent-500/5 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col items-center text-center gap-4 max-w-xs animate-bounce-in">
        {/* Logo */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-glow animate-pulse-soft">
            <MessageCircle size={36} className="text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center shadow-sm">
            <span className="text-sm">👋</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
            Welcome to ChatFlow
          </h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Select a conversation from the sidebar, or tap{" "}
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[var(--brand-light)] text-[var(--brand)] font-bold text-xs align-middle mx-0.5">+</span>{" "}
            to start a new chat.
          </p>
        </div>

        {/* Hidden on mobile – show on md+ */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-3 py-2 rounded-full border border-[var(--border)]">
          <ArrowLeft size={12} />
          <span>Choose a conversation to get started</span>
        </div>
      </div>

      {/* Features */}
      <div className="mt-8 w-full max-w-xs space-y-2.5">
        {features.map(({ icon: Icon, label, desc, color, bg }, i) => (
          <div
            key={label}
            className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:scale-[1.01] hover:shadow-md transition-all duration-200"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: bg }}
            >
              <Icon size={15} style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
