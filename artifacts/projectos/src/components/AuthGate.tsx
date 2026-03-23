import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Key, Lock, Fingerprint, Loader2, AlertTriangle, Check, Trash2, Plus } from "lucide-react";
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

function LoginScreen({ status, onAuth }: { status: SecurityStatus; onAuth: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"yubikey" | "password">(status.webauthnKeys.length > 0 ? "yubikey" : "password");

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

  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">ProjectOS</h1>
          <p className="text-muted-foreground text-sm mt-1">Authentication required to continue</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          {status.webauthnKeys.length > 0 && status.hasPassword && (
            <div className="flex gap-2">
              <button onClick={() => setMode("yubikey")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${mode === "yubikey" ? "bg-primary/15 text-primary border border-primary/30" : "bg-white/5 text-muted-foreground border border-border"}`}>
                <Fingerprint className="w-4 h-4" /> YubiKey
              </button>
              <button onClick={() => setMode("password")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${mode === "password" ? "bg-primary/15 text-primary border border-primary/30" : "bg-white/5 text-muted-foreground border border-border"}`}>
                <Lock className="w-4 h-4" /> Password
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {mode === "yubikey" && status.webauthnKeys.length > 0 ? (
              <motion.div key="yubikey" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="text-center py-4">
                  <Fingerprint className="w-12 h-12 text-primary mx-auto mb-3" />
                  <p className="text-sm font-medium">Insert your YubiKey and tap it</p>
                  <p className="text-xs text-muted-foreground mt-1">Touch the metal contact on your security key</p>
                </div>
                <button onClick={loginWithYubiKey} disabled={loading}
                  className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  {loading ? "Waiting for YubiKey..." : "Authenticate with YubiKey"}
                </button>
              </motion.div>
            ) : (
              <motion.div key="password" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <form onSubmit={e => { e.preventDefault(); loginWithPassword(); }} className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password" autoComplete="current-password"
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      autoFocus />
                  </div>
                  <button type="submit" disabled={loading || !password}
                    className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    {loading ? "Verifying..." : "Unlock"}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </div>
      </motion.div>
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
          <p className="text-xs text-muted-foreground">Password authentication is active. Use it as a fallback when your YubiKey isn't available.</p>
        )}
      </div>

      <div className="bg-white/5 rounded-xl p-4">
        <h4 className="text-sm font-bold mb-2">How It Works</h4>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">1.</span>
            <span>Once configured, all API endpoints require authentication</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">2.</span>
            <span>Use your YubiKey (primary) or password (fallback) to log in</span>
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
