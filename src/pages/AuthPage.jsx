import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  MessageCircle,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Phone,
  Zap,
  ArrowRight,
} from "lucide-react";
import ThemeToggle from "../components/ui/ThemeToggle";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^\d{10}$/;

function InputField({
  icon: Icon,
  type,
  name,
  value,
  onChange,
  placeholder,
  required,
  minLength,
  maxLength,
  autoComplete,
  rightSlot,
  disabled,
}) {
  return (
    <div className="relative group">
      <Icon
        size={15}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--brand)] transition-colors"
      />
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        autoComplete={autoComplete}
        disabled={disabled}
        className="input-field pl-10 pr-10"
      />
      {rightSlot}
    </div>
  );
}

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    mobile: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, signup, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/chat", { replace: true });
  }, [user, navigate]);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!EMAIL_RE.test(form.email.trim())) {
      toast.error("Enter a valid email address");
      return false;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return false;
    }
    if (mode === "signup") {
      if (!form.username.trim()) {
        toast.error("Username is required");
        return false;
      }
      if (form.password !== form.confirmPassword) {
        toast.error("Passwords do not match");
        return false;
      }
      if (form.mobile && !MOBILE_RE.test(form.mobile.trim())) {
        toast.error("Mobile number must be exactly 10 digits");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await signup(form.username, form.email, form.password, form.mobile);
      }
      toast.success("Welcome to ChatFlow! 🎉");
      navigate("/chat", { replace: true });
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setForm({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      mobile: "",
    });
    setShowPass(false);
    setShowConfirmPass(false);
  };

  const eyeBtn = (show, toggle) => (
    <button
      type="button"
      onClick={toggle}
      tabIndex={-1}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors p-1"
    >
      {show ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );

  return (
    <div className="min-h-dvh bg-[var(--bg-primary)] flex items-center justify-center p-4 relative overflow-y-auto overflow-x-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand-500/5 blur-[80px]" />
      </div>

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="card p-8 animate-bounce-in">
          {/* Header */}
          <div className="flex flex-col items-center gap-2 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-glow">
              <MessageCircle size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              ChatFlow
            </h1>
            <p className="text-sm text-[var(--text-muted)] text-center">
              {mode === "login"
                ? "Welcome back! Sign in to continue."
                : "Create your account to get started."}
            </p>
          </div>

          {/* Mode tabs */}
          <div className="flex p-1 bg-[var(--bg-tertiary)] rounded-xl mb-6 gap-1">
            {["login", "signup"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => m !== mode && switchMode()}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === m
                    ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === "signup" && (
              <InputField
                icon={User}
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Username"
                required
                minLength={2}
                maxLength={30}
                autoComplete="username"
                disabled={loading}
              />
            )}

            <InputField
              icon={Mail}
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email address"
              required
              autoComplete="email"
              disabled={loading}
            />

            {mode === "signup" && (
              <InputField
                icon={Phone}
                type="tel"
                name="mobile"
                value={form.mobile}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setForm((f) => ({ ...f, mobile: val }));
                }}
                placeholder="Mobile number"
                maxLength={10}
                autoComplete="tel"
                disabled={loading}
              />
            )}

            <div className="relative group">
              <Lock
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--brand)] transition-colors"
              />
              <input
                type={showPass ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Password"
                required
                minLength={6}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                disabled={loading}
                className="input-field pl-10 pr-10"
              />
              {eyeBtn(showPass, () => setShowPass((v) => !v))}
            </div>

            {mode === "signup" && (
              <div className="relative group">
                <Lock
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--brand)] transition-colors"
                />
                <input
                  type={showConfirmPass ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  disabled={loading}
                  className="input-field pl-10 pr-10"
                />
                {eyeBtn(showConfirmPass, () => setShowConfirmPass((v) => !v))}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === "login" ? "Signing in…" : "Creating account…"}
                </>
              ) : (
                <>
                  {mode === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Powered by */}
          <div className="flex items-center justify-center gap-1.5 mt-5 text-[11px] text-[var(--text-muted)]">
            <Zap size={11} className="text-[var(--brand)]" />
            <span>Powered by Socket.io · Built with React</span>
          </div>
        </div>
      </div>
    </div>
  );
}
