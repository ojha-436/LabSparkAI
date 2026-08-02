/* ── LoginPage: Premium Google & Email SaaS Authentication Screen ── */
import React from "react";
import { C } from "./tokens.js";
import { Ic } from "./ui.jsx";
import firebase from "./firebaseInit.js";
import { RoleChooser } from "./roles.jsx";
const { useState: loUS } = React;

function LoginPage({ onLogin, onBack, onRoleHint }) {
  const [activeTab, setActiveTab] = loUS("signin"); // signin | signup
  const [email, setEmail] = loUS("");
  const [pass, setPass] = loUS("");
  const [name, setName] = loUS("");
  const [loading, setLoading] = loUS(false);
  const [loadingGoogle, setLoadingGoogle] = loUS(false);
  const [error, setError] = loUS("");
  const [role, setRole] = loUS("student");

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (onRoleHint) onRoleHint(role, name); // capture role + name before auth state changes

    if (activeTab === "signup" && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (pass.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    if (activeTab === "signup") {
      firebase.auth().createUserWithEmailAndPassword(email, pass)
        .then((userCredential) => {
          return userCredential.user.updateProfile({ displayName: name })
            .then(() => {
              setLoading(false);
              onLogin(name, role);
            });
        })
        .catch((err) => {
          setLoading(false);
          setError(err.message);
        });
    } else {
      firebase.auth().signInWithEmailAndPassword(email, pass)
        .then((userCredential) => {
          setLoading(false);
          onLogin(userCredential.user.displayName || userCredential.user.email, role);
        })
        .catch((err) => {
          setLoading(false);
          setError(err.message);
        });
    }
  };

  const handleGoogleSubmit = () => {
    setError("");
    // Only hint a role when the chooser was actually shown (Sign Up tab). On the
    // Sign In tab, send "" so a brand-new Google user (teacher/parent) lands on the
    // role-setup screen instead of being silently forced to "student".
    const hintRole = activeTab === "signup" ? role : "";
    if (onRoleHint) onRoleHint(hintRole);
    setLoadingGoogle(true);
    // Popup uses the default (registered) auth handler and returns the result via
    // postMessage — no cross-origin redirect, so no redirect_uri_mismatch and no
    // storage-partitioning bounce. Works in browsers and Chrome-backed TWAs.
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
      .then((result) => {
        setLoadingGoogle(false);
        onLogin(result.user.displayName || result.user.email, hintRole);
      })
      .catch((err) => {
        setLoadingGoogle(false);
        setError(err.message);
      });
  };


  return (
    <div className="grid-blueprint" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Navbar */}
      <nav style={{ background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={onBack}>
            <div style={{ width: 32, height: 32, borderRadius: "24%", background: `linear-gradient(135deg, #6366f1, #8b5cf6)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ic n="flask" s={16} c="#fff" sw={2} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Plus Jakarta Sans'", letterSpacing: "-0.03em", color: C.ink }}>
              LabSpark <span style={{ color: C.emBright, fontWeight: 500 }}>AI</span>
            </span>
          </div>
          <button onClick={onBack} className="press btn btn-light" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Ic n="back" s={14} c={C.ink50} /> Back to Home
          </button>
        </div>
      </nav>

      {/* Main Authentication Container */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div className="card-glass hover-lift" style={{ width: "100%", maxWidth: 440, background: C.cream, borderRadius: 16, boxShadow: "0 20px 50px rgba(15,23,42,0.06)", overflow: "hidden" }}>
          
          {/* Accent Header */}
          <div style={{ background: C.inkDeep, color: "#fff", padding: "26px 32px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "-50%", right: "-10%", width: 180, height: 180, borderRadius: "50%", background: `radial-gradient(circle, ${C.emBright}22, transparent 65%)` }} />
            <h3 style={{ fontSize: 21, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
              {activeTab === "signin" ? "Access Lab Workbench" : "Create Scientist Account"}
            </h3>
            <p style={{ fontSize: 12.5, color: C.ink30, marginTop: 4 }}>
              {activeTab === "signin" ? "Sign in to resume NCERT syllabus practicals" : "Get started with virtual laboratory simulations"}
            </p>
          </div>

          <div style={{ padding: "28px 32px 34px" }}>
            {/* Tabs */}
            <div style={{ display: "flex", background: C.paperWarm, borderRadius: 8, padding: 3, marginBottom: 24 }}>
              <button 
                onClick={() => { setActiveTab("signin"); setError(""); }}
                className="press" 
                style={{
                  flex: 1, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, padding: "8px 0", borderRadius: 6, transition: "all 0.2s",
                  background: activeTab === "signin" ? C.cream : "transparent",
                  color: activeTab === "signin" ? C.ink : C.ink50,
                  boxShadow: activeTab === "signin" ? "0 2px 6px rgba(0,0,0,0.04)" : "none"
                }}
              >
                Sign In
              </button>
              <button 
                onClick={() => { setActiveTab("signup"); setError(""); }}
                className="press" 
                style={{
                  flex: 1, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, padding: "8px 0", borderRadius: 6, transition: "all 0.2s",
                  background: activeTab === "signup" ? C.cream : "transparent",
                  color: activeTab === "signup" ? C.ink : C.ink50,
                  boxShadow: activeTab === "signup" ? "0 2px 6px rgba(0,0,0,0.04)" : "none"
                }}
              >
                Sign Up
              </button>
            </div>

            {/* Role chooser (sign-up only) */}
            {activeTab === "signup" && (
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.ink70, display: "block", marginBottom: 8 }}>I am a…</span>
                <RoleChooser value={role} onChange={setRole} />
              </div>
            )}

            {/* Google Authentication Trigger */}
            <button 
              onClick={handleGoogleSubmit} 
              disabled={loading || loadingGoogle}
              className="press btn btn-light" 
              style={{ width: "100%", padding: "11px 0", borderRadius: 8, fontSize: 13.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontWeight: 600, border: `1.5px solid ${C.line}` }}
            >
              {loadingGoogle ? (
                <div className="spinner" style={{ width: 16, height: 16, border: `2px solid ${C.ink30}`, borderTopColor: C.ink, borderRadius: "50%", animation: "pulse 1s infinite linear" }} />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
              )}
              {loadingGoogle ? "Verifying Google Account..." : "Continue with Google"}
            </button>

            <div style={{ display: "flex", alignItems: "center", margin: "22px 0 18px", gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: C.line }} />
              <span className="mono" style={{ fontSize: 10.5, color: C.ink30, fontWeight: 700 }}>OR EMAIL ID</span>
              <div style={{ flex: 1, height: 1, background: C.line }} />
            </div>

            {/* Error Message Chip */}
            {error && (
              <div className="reveal r1" style={{ background: C.coralPale, border: `1.5px solid rgba(234, 88, 12, 0.1)`, padding: "10px 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <Ic n="lock" s={14} c={C.coral} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.coral }}>{error}</span>
              </div>
            )}

            {/* Email form */}
            <form onSubmit={handleEmailSubmit}>
              {activeTab === "signup" && (
                <div className="auth-input-container">
                  <input 
                    type="text" 
                    id="name-input"
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="auth-floating-input"
                    placeholder=" "
                    required
                  />
                  <label htmlFor="name-input" className="auth-floating-label">Full Name</label>
                </div>
              )}

              <div className="auth-input-container">
                <input 
                  type="email" 
                  id="email-input"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="auth-floating-input"
                  placeholder=" "
                  required
                />
                <label htmlFor="email-input" className="auth-floating-label">Email Address</label>
              </div>

              <div className="auth-input-container" style={{ marginBottom: 24 }}>
                <input 
                  type="password" 
                  id="password-input"
                  value={pass} 
                  onChange={(e) => setPass(e.target.value)} 
                  className="auth-floating-input"
                  placeholder=" "
                  required
                />
                <label htmlFor="password-input" className="auth-floating-label">Password</label>
              </div>

              <button 
                type="submit" 
                disabled={loading || loadingGoogle}
                className="press btn btn-primary" 
                style={{ width: "100%", padding: "13px 0", fontSize: 14, borderRadius: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {loading ? (
                  <div className="spinner" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "pulse 1s infinite linear" }} />
                ) : (
                  activeTab === "signin" ? "Sign In to Workbench" : "Create Scientist Account"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export { LoginPage };
