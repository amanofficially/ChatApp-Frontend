import { MessageCircle, Zap, Lock, Smile } from "lucide-react";

const features = [
  {
    icon: Zap,
    label: "Real-time messaging",
    desc: "Instant delivery powered by Socket.io",
  },
  {
    icon: Lock,
    label: "Secure & Private",
    desc: "JWT authentication with encrypted passwords",
  },
  {
    icon: Smile,
    label: "Emoji support",
    desc: "Express yourself with the emoji picker",
  },
];

export default function EmptyChat() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 bg-[var(--bg-primary)]">
      {/* Header Section */}
      <div className="flex flex-col items-center text-center gap-4 max-w-sm">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-glow animate-pulse-soft">
          <MessageCircle size={36} className="text-white" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Welcome to ChatFlow
          </h2>

          <p className="text-sm text-[var(--text-muted)] mt-1 leading-relaxed">
            Select a conversation or start a new one using the{" "}
            <span className="font-semibold text-[var(--text-primary)]">+</span>{" "}
            button
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="mt-6 w-full max-w-xs space-y-3">
        {features.map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:scale-[1.01] transition-transform duration-200"
          >
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon size={15} className="text-brand-500" />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {label}
              </p>
              <p className="text-xs text-[var(--text-muted)]">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
