import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Key, Lock, Fingerprint, Loader2, AlertTriangle, Check, Trash2, Plus, Hexagon, Mail, User, Eye, EyeOff, ToggleLeft, ToggleRight } from "lucide-react";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface SecurityStatus {
  configured: boolean;
  hasPassword: boolean;
  webauthnKeys: { id: number; deviceName: string; createdAt: string }[];
  authenticated: boolean;
}

function fetchApi(path: string, options?: RequestInit) {
  return fetch(`${API}${path}`, { credentials: "include", ...options });
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetchApi("/security/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ configured: false, hasPassword: false, webauthnKeys: [], authenticated: false });
    }
    setLoading(false);
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!status?.configured || status.authenticated) {
    return <>{children}</>;
  }

  return <LoginScreen status={status} onAuth={checkStatus} />;
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
      <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
    </svg>
  );
}

function LoginScreen({ status, onAuth }: { status: SecurityStatus; onAuth: () => void }) {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [yubiKeyMode, setYubiKeyMode] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const loginWithPassword = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchApi("/security/password/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        onAuth();
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Connection error");
    }
    setLoading(false);
  };

  const loginWithYubiKey = async () => {
    setLoading(true);
    setError("");
    try {
      const optionsRes = await fetchApi("/security/webauthn/auth-options");
      const options = await optionsRes.json();
      const credential = await startAuthentication({ optionsJSON: options });
      const verifyRes = await fetchApi("/security/webauthn/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const data = await verifyRes.json();
      if (data.success) {
        onAuth();
      } else {
        setError(data.error || "Authentication failed");
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("YubiKey authentication was cancelled");
      } else {
        setError(err.message || "YubiKey authentication failed");
      }
    }
    setLoading(false);
  };

  const handleSocialLogin = async (provider: string) => {
    setSocialLoading(provider);
    setError("");
    await new Promise(r => setTimeout(r, 1500));
    setSocialLoading(null);
    setError(`${provider} OAuth is not configured. Please use your username and password below to sign in.`);
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <div className="hidden lg:flex lg:w-[45%] relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-indigo-600 to-accent" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', backgroundSize: '60px 60px' }} />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Hexagon className="w-6 h-6 text-white fill-white/20" />
            </div>
            <span className="text-white text-xl font-display font-bold">ProjectOS</span>
          </div>

          <div className="space-y-6">
            <h2 className="text-4xl font-display font-bold text-white leading-tight">
              Manage projects<br/>
              like never before.
            </h2>
            <p className="text-white/70 text-lg max-w-md">
              Task boards, sprints, time tracking, goals, AI insights, team messaging, and email routing — all in one powerful platform.
            </p>

            <div className="grid grid-cols-2 gap-3 max-w-md">
              {[
                { label: "Active Projects", value: "24+" },
                { label: "AI Features", value: "60" },
                { label: "Task Views", value: "7" },
                { label: "Team Tools", value: "15+" },
              ].map((s, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                  <div className="text-white text-xl font-bold">{s.value}</div>
                  <div className="text-white/60 text-xs">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {["#6366f1", "#22c55e", "#a78bfa", "#f59e0b", "#38bdf8"].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-indigo-600" style={{ backgroundColor: c }} />
              ))}
            </div>
            <p className="text-white/60 text-xs">Join your team on ProjectOS</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="absolute top-6 right-6 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {yubiKeyMode ? "YubiKey Mode" : "Standard Login"}
          </span>
          <button
            onClick={() => { setYubiKeyMode(!yubiKeyMode); setError(""); }}
            className="relative"
            title={yubiKeyMode ? "Switch to standard login" : "Switch to YubiKey mode"}
          >
            {yubiKeyMode ? (
              <ToggleRight className="w-10 h-10 text-primary" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-muted-foreground hover:text-foreground transition-colors" />
            )}
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-3">
              <Hexagon className="w-7 h-7 text-white fill-white/20" />
            </div>
            <h1 className="text-2xl font-display font-bold">ProjectOS</h1>
          </div>

          <AnimatePresence mode="wait">
            {yubiKeyMode ? (
              <motion.div
                key="yubikey-mode"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-center mb-8">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                    <Key className="w-10 h-10 text-primary" />
                  </div>
                  <h2 className="text-2xl font-display font-bold mb-2">Security Key Access</h2>
                  <p className="text-muted-foreground text-sm">
                    Insert your YubiKey and tap the button to authenticate
                  </p>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                  <div className="bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Shield className="w-5 h-5 text-primary" />
                      <span className="text-sm font-bold">Hardware Key Required</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This mode requires a registered FIDO2 security key (YubiKey, Titan, etc.) for authentication. No passwords accepted.
                    </p>
                  </div>

                  {status.webauthnKeys.length > 0 ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground font-medium">Registered Keys</label>
                        {status.webauthnKeys.map(k => (
                          <div key={k.id} className="flex items-center gap-3 px-3 py-2.5 bg-background border border-border rounded-xl">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Key className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium">{k.deviceName}</div>
                              <div className="text-[10px] text-muted-foreground">Added {new Date(k.createdAt).toLocaleDateString()}</div>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          </div>
                        ))}
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-16 h-16 rounded-full bg-primary/5 animate-ping" style={{ animationDuration: "3s" }} />
                        </div>
                        <button
                          onClick={loginWithYubiKey}
                          disabled={loading}
                          className="relative w-full px-4 py-4 bg-gradient-to-r from-primary to-accent text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Touch your security key now...</span>
                            </>
                          ) : (
                            <>
                              <Fingerprint className="w-5 h-5" />
                              <span>Authenticate with YubiKey</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                      <p className="text-sm font-medium mb-1">No Security Keys Registered</p>
                      <p className="text-xs text-muted-foreground mb-4">
                        You need to register a YubiKey first. Toggle off YubiKey mode and sign in with your password, then go to Admin → Security to register your key.
                      </p>
                    </div>
                  )}

                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </div>

                <p className="text-center text-xs text-muted-foreground mt-4">
                  Need to use password login?{" "}
                  <button onClick={() => setYubiKeyMode(false)} className="text-primary hover:underline font-medium">
                    Switch to standard login
                  </button>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="standard-mode"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="hidden lg:block mb-8">
                  <h2 className="text-2xl font-display font-bold mb-2">Welcome back</h2>
                  <p className="text-muted-foreground text-sm">Sign in to your ProjectOS workspace</p>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { name: "Google", icon: GoogleIcon, bg: "hover:bg-white/10" },
                      { name: "GitHub", icon: GitHubIcon, bg: "hover:bg-white/10" },
                      { name: "Microsoft", icon: MicrosoftIcon, bg: "hover:bg-white/10" },
                    ].map(provider => (
                      <button
                        key={provider.name}
                        onClick={() => handleSocialLogin(provider.name)}
                        disabled={socialLoading !== null}
                        className={`flex items-center justify-center gap-2 px-4 py-3 bg-card border border-border rounded-xl text-sm font-medium transition-all ${provider.bg} disabled:opacity-50 group`}
                      >
                        {socialLoading === provider.name ? (
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        ) : (
                          <provider.icon />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">or continue with password</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <form onSubmit={e => { e.preventDefault(); loginWithPassword(); }} className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email / Username</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="admin@projectos.dev"
                          autoComplete="username"
                          className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          className="w-full pl-10 pr-12 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/50 bg-background" />
                        <span className="text-xs text-muted-foreground">Remember me</span>
                      </label>
                      <button type="button" className="text-xs text-primary hover:underline">
                        Forgot password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !password}
                      className="w-full px-4 py-3.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          Sign In
                        </>
                      )}
                    </button>
                  </form>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  {status.webauthnKeys.length > 0 && (
                    <div className="pt-2">
                      <button
                        onClick={() => setYubiKeyMode(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-card border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all group"
                      >
                        <Key className="w-4 h-4 group-hover:text-primary transition-colors" />
                        <span>Sign in with Security Key</span>
                      </button>
                    </div>
                  )}

                  <p className="text-center text-xs text-muted-foreground">
                    Require hardware key?{" "}
                    <button onClick={() => setYubiKeyMode(true)} className="text-primary hover:underline font-medium">
                      Enable YubiKey mode
                    </button>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export function SecurityManagement() {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [keyName, setKeyName] = useState("");
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchApi("/security/status").then(r => r.json()).then(setStatus);
  }, []);

  const setupPassword = async () => {
    if (newPassword.length < 8) {
      setMessage("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }
    setLoading("password");
    const res = await fetchApi("/security/password/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    const data = await res.json();
    if (data.success) {
      setMessage("Password configured successfully");
      setShowPasswordSetup(false);
      setNewPassword("");
      setConfirmPassword("");
      const s = await fetchApi("/security/status").then(r => r.json());
      setStatus(s);
    } else {
      setMessage(data.error);
    }
    setLoading("");
  };

  const registerYubiKey = async () => {
    setLoading("webauthn");
    setMessage("");
    try {
      const optionsRes = await fetchApi("/security/webauthn/register-options");
      const options = await optionsRes.json();
      const credential = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetchApi("/security/webauthn/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential, deviceName: keyName || "YubiKey" }),
      });
      const data = await verifyRes.json();
      if (data.success) {
        setMessage("YubiKey registered successfully!");
        setKeyName("");
        const s = await fetchApi("/security/status").then(r => r.json());
        setStatus(s);
      } else {
        setMessage(data.error || "Registration failed");
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setMessage("Registration cancelled");
      } else {
        setMessage(err.message || "Failed to register YubiKey");
      }
    }
    setLoading("");
  };

  const removeKey = async (id: number) => {
    await fetchApi(`/security/webauthn/${id}`, { method: "DELETE" });
    const s = await fetchApi("/security/status").then(r => r.json());
    setStatus(s);
  };

  const removePassword = async () => {
    await fetchApi("/security/password/remove", { method: "POST" });
    const s = await fetchApi("/security/status").then(r => r.json());
    setStatus(s);
    setMessage("Password removed");
  };

  if (!status) return null;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold">API Security</h2>
          <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase ${status.configured ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
            {status.configured ? "Protected" : "Unprotected"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {status.configured
            ? "All API endpoints are secured. Authentication is required to access any data."
            : "APIs are currently open. Set up a password or register a YubiKey to protect your endpoints."}
        </p>
      </div>

      <div className="bg-card border border-primary/20 rounded-xl p-4 space-y-3">
        <h4 className="text-sm font-bold flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Login Screen Modes
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-background border border-border rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <ToggleLeft className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-bold">Toggle OFF — Standard Login</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Social login buttons (Google, GitHub, Microsoft) plus username/password form. Default mode for everyday access.</p>
          </div>
          <div className="bg-background border border-border rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <ToggleRight className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold">Toggle ON — YubiKey Mode</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Hardware security key (FIDO2) authentication only. Maximum security — no password fallback on this screen.</p>
          </div>
        </div>
      </div>

      {message && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className={`p-3 rounded-lg text-xs flex items-center gap-2 ${message.includes("success") || message.includes("configured") ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
          <Check className="w-3 h-3" /> {message}
        </motion.div>
      )}

      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">YubiKey / Security Keys</h3>
          </div>
        </div>

        {status.webauthnKeys.length > 0 ? (
          <div className="space-y-2">
            {status.webauthnKeys.map(k => (
              <div key={k.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <Key className="w-4 h-4 text-primary" />
                  <div>
                    <div className="text-sm font-medium">{k.deviceName}</div>
                    <div className="text-[10px] text-muted-foreground">Registered {new Date(k.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <button onClick={() => removeKey(k.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No security keys registered yet</p>
        )}

        <div className="flex items-center gap-2">
          <input value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="Key name (e.g. My YubiKey 5)"
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <button onClick={registerYubiKey} disabled={loading === "webauthn"}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap">
            {loading === "webauthn" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Register YubiKey
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold">Password Protection</h3>
            {status.hasPassword && (
              <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500/15 text-emerald-400 rounded font-bold">ACTIVE</span>
            )}
          </div>
          {status.hasPassword && (
            <div className="flex gap-1">
              <button onClick={() => setShowPasswordSetup(true)}
                className="text-xs text-primary hover:underline">Change</button>
              <span className="text-muted-foreground">|</span>
              <button onClick={removePassword}
                className="text-xs text-red-400 hover:underline">Remove</button>
            </div>
          )}
        </div>

        {!status.hasPassword && !showPasswordSetup && (
          <button onClick={() => setShowPasswordSetup(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-sm font-medium hover:bg-amber-500/20 transition-colors">
            <Lock className="w-4 h-4" /> Set Up Password
          </button>
        )}

        {(showPasswordSetup || (!status.hasPassword && !showPasswordSetup)) && showPasswordSetup && (
          <form onSubmit={e => { e.preventDefault(); setupPassword(); }} className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{status.hasPassword ? "New Password" : "Password"}</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters" autoComplete="new-password"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password" autoComplete="new-password"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading === "password" || newPassword.length < 8}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {loading === "password" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {status.hasPassword ? "Update Password" : "Set Password"}
              </button>
              <button type="button" onClick={() => { setShowPasswordSetup(false); setNewPassword(""); setConfirmPassword(""); }}
                className="px-4 py-2 bg-white/5 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}

        {status.hasPassword && !showPasswordSetup && (
          <p className="text-xs text-muted-foreground">Password authentication is active. Used for the standard login mode and as a fallback.</p>
        )}
      </div>

      <div className="bg-white/5 rounded-xl p-4">
        <h4 className="text-sm font-bold mb-2">How Authentication Works</h4>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">1.</span>
            <span>The login screen defaults to <strong>Standard Login</strong> mode with social buttons + username/password</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">2.</span>
            <span>Toggle the switch in the top-right to enable <strong>YubiKey Mode</strong> for hardware-key-only access</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">3.</span>
            <span>Sessions last 24 hours before requiring re-authentication</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">4.</span>
            <span>External API integrations use Bearer tokens from the API Keys section</span>
          </div>
        </div>
      </div>
    </div>
  );
}
