import { useState, useEffect, useRef } from "react";

/* ─── ANTHROPIC API ─────────────────────────────────────── */
const callAI = async (prompt, sys) => {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: sys || "You are ProjectOS AI, a fully autonomous project manager. Always respond with valid JSON only — no markdown, no backticks, no extra text.",
        messages: [{ role: "user", content: prompt }]
      })
    });
    const d = await r.json();
    const t = (d.content?.[0]?.text || "{}").replace(/```json\n?|```\n?/g, "").trim();
    try { return JSON.parse(t); } catch { return { raw: t }; }
  } catch (e) { return { error: String(e) }; }
};

/* ─── DESIGN TOKENS ─────────────────────────────────────── */
const C = {
  bg: "#07090e", surf: "#0c0f18", card: "#111826", border: "#182030",
  borderHi: "#243050", accent: "#4f7eff", accentBg: "#4f7eff1a",
  accentHi: "#6b94ff", green: "#2ecc8f", red: "#ff5151",
  orange: "#ff9433", yellow: "#ffd060", purple: "#a855f7",
  teal: "#22d3ee", pink: "#ec4899", text: "#dde6f5", muted: "#546480", dim: "#1e2a3f",
};

/* ─── DATA ──────────────────────────────────────────────── */
const PRIORITY = {
  critical: { label: "Critical", color: C.red, icon: "🔴", score: 4 },
  high:     { label: "High",     color: C.orange, icon: "🟠", score: 3 },
  medium:   { label: "Medium",   color: C.yellow, icon: "🟡", score: 2 },
  low:      { label: "Low",      color: C.muted, icon: "⚪", score: 1 },
};
const STATUS_FLOW = ["Backlog", "Todo", "In Progress", "Review", "Done"];
const SC = { Backlog: C.muted, Todo: "#4a5578", "In Progress": C.accent, Review: C.purple, Done: C.green };
const MEMBERS = [
  { id: 1, name: "Alex Rivera", initials: "AR", color: C.accent, role: "Lead Dev" },
  { id: 2, name: "Sam Chen",    initials: "SC", color: C.green, role: "Backend" },
  { id: 3, name: "Jordan Kim",  initials: "JK", color: C.purple, role: "Designer" },
  { id: 4, name: "Morgan Lee",  initials: "ML", color: C.orange, role: "Product" },
];
let _id = 200;
const uid = () => `t${++_id}`;
const SAMPLE_TASKS = [
  { id: uid(), title: "Redesign dashboard UX",            status: "In Progress", priority: "high",     assignee: 3, points: 8,  label: "design",   sprint: 1, project: "p1", riskScore: 0.32, aiScore: 87 },
  { id: uid(), title: "Implement OAuth 2.0 auth",         status: "Todo",        priority: "critical", assignee: 2, points: 13, label: "backend",  sprint: 1, project: "p1", riskScore: 0.71, aiScore: 95 },
  { id: uid(), title: "Fix payment gateway timeout",      status: "In Progress", priority: "critical", assignee: 1, points: 5,  label: "bug",      sprint: 1, project: "p1", riskScore: 0.80, aiScore: 98 },
  { id: uid(), title: "Write API documentation",          status: "Backlog",     priority: "medium",   assignee: 4, points: 5,  label: "docs",     sprint: null, project: "p1", riskScore: 0.18, aiScore: 62 },
  { id: uid(), title: "Set up monitoring & alerts",       status: "Review",      priority: "high",     assignee: 2, points: 8,  label: "devops",   sprint: 1, project: "p1", riskScore: 0.42, aiScore: 78 },
  { id: uid(), title: "User onboarding redesign",         status: "Done",        priority: "high",     assignee: 3, points: 8,  label: "design",   sprint: 1, project: "p1", riskScore: 0.10, aiScore: 72 },
  { id: uid(), title: "Database query optimization",      status: "Todo",        priority: "medium",   assignee: 2, points: 5,  label: "backend",  sprint: null, project: "p2", riskScore: 0.30, aiScore: 70 },
  { id: uid(), title: "Mobile responsive layouts",        status: "In Progress", priority: "high",     assignee: 3, points: 8,  label: "design",   sprint: 1, project: "p2", riskScore: 0.48, aiScore: 81 },
  { id: uid(), title: "Rate limiting implementation",     status: "Backlog",     priority: "critical", assignee: 1, points: 5,  label: "backend",  sprint: null, project: "p2", riskScore: 0.60, aiScore: 91 },
  { id: uid(), title: "Analytics dashboard charts",       status: "Todo",        priority: "medium",   assignee: 4, points: 13, label: "feature",  sprint: null, project: "p2", riskScore: 0.22, aiScore: 65 },
];
const PROJECTS = [
  { id: "p1", name: "Platform Rebuild", icon: "🏗️", color: C.accent,  health: 74 },
  { id: "p2", name: "Mobile App v2",    icon: "📱", color: C.purple, health: 82 },
  { id: "p3", name: "Data Pipeline",    icon: "🔄", color: C.teal,   health: 61 },
];

/* ─── 40 AI FEATURES ────────────────────────────────────── */
const FEATURES = [
  { id:1,  cat:"scheduling", name:"Impact/Effort Scorer",     desc:"Ranks every task by business impact vs team effort",       icon:"🎯" },
  { id:2,  cat:"scheduling", name:"AI Sprint Auto-Planner",   desc:"Fills sprints based on velocity & team capacity",          icon:"⚡" },
  { id:3,  cat:"scheduling", name:"Workload Balancer",        desc:"Prevents burnout by equalizing assignments",               icon:"⚖️" },
  { id:4,  cat:"scheduling", name:"Deadline Predictor",       desc:"Forecasts realistic completion dates per task",            icon:"📅" },
  { id:5,  cat:"scheduling", name:"Critical Path Detector",   desc:"Finds the sequence that sets the project end date",        icon:"🔗" },
  { id:6,  cat:"scheduling", name:"Bottleneck Analyzer",      desc:"Flags where work is piling up in real time",              icon:"🚧" },
  { id:7,  cat:"scheduling", name:"Auto-Reschedule Engine",   desc:"Shifts timeline automatically when tasks slip",            icon:"🔄" },
  { id:8,  cat:"scheduling", name:"Urgency Escalator",        desc:"Auto-promotes priority as deadlines approach",             icon:"📈" },
  { id:9,  cat:"scheduling", name:"Focus Time Blocker",       desc:"Schedules deep work blocks per team member",              icon:"🧘" },
  { id:10, cat:"scheduling", name:"Capacity Optimizer",       desc:"Maximizes throughput within bandwidth limits",             icon:"💡" },
  { id:11, cat:"scheduling", name:"Dependency Auto-Mapper",   desc:"Detects and visualizes hidden task dependencies",          icon:"🗺️" },
  { id:12, cat:"scheduling", name:"Conflict Resolver",        desc:"Resolves scheduling conflicts between members",            icon:"🤝" },
  { id:13, cat:"scheduling", name:"Meeting-Free Suggester",   desc:"Proposes optimal no-meeting days for the team",           icon:"🔕" },
  { id:14, cat:"generation", name:"Project Generator",        desc:"Turn a one-sentence goal into a full project plan",        icon:"✨" },
  { id:15, cat:"generation", name:"Smart Subtask Splitter",   desc:"Decomposes any task into actionable steps",               icon:"🔪" },
  { id:16, cat:"generation", name:"Meeting Notes → Tasks",    desc:"Extracts action items from meeting transcripts",           icon:"📝" },
  { id:17, cat:"generation", name:"Acceptance Criteria",      desc:"Auto-generates done-criteria for every story",             icon:"✅" },
  { id:18, cat:"generation", name:"Task Gap Analyzer",        desc:"Finds missing steps between current tasks",               icon:"🕵️" },
  { id:19, cat:"generation", name:"Risk Identifier",          desc:"Flags potential blockers before they happen",              icon:"⚠️" },
  { id:20, cat:"generation", name:"Duplicate Detector",       desc:"Surfaces overlapping or redundant tasks instantly",        icon:"🔍" },
  { id:21, cat:"generation", name:"Effort Estimator",         desc:"Predicts story points using historical velocity",          icon:"📏" },
  { id:22, cat:"generation", name:"DoD Builder",              desc:"Creates Definition of Done checklists per task type",     icon:"📋" },
  { id:23, cat:"generation", name:"Task Enhancer",            desc:"Rewrites vague tasks into clear, actionable ones",        icon:"✍️" },
  { id:24, cat:"generation", name:"Template Learner",         desc:"Learns from past projects to suggest new templates",       icon:"🧩" },
  { id:25, cat:"generation", name:"Epic Story Generator",     desc:"Breaks product goals into epics, stories, tasks",         icon:"📖" },
  { id:26, cat:"generation", name:"Smart Task Cloner",        desc:"Replicates task structures from similar past work",        icon:"📑" },
  { id:27, cat:"generation", name:"Dependency Suggester",     desc:"Recommends which tasks should block others",              icon:"🔐" },
  { id:28, cat:"analytics",  name:"Project Health Score",     desc:"Real-time 0–100 score with full AI diagnosis",            icon:"💚" },
  { id:29, cat:"analytics",  name:"Velocity Predictor",       desc:"Forecasts sprint velocity 3 sprints out",                 icon:"🚀" },
  { id:30, cat:"analytics",  name:"Burnout Risk Detector",    desc:"Alerts when a team member is heading toward overload",    icon:"🔥" },
  { id:31, cat:"analytics",  name:"On-Time Probability",      desc:"% chance each task ships on schedule",                    icon:"⏱️" },
  { id:32, cat:"analytics",  name:"Trend Analyzer",           desc:"Are you speeding up or slowing down? AI explains why",   icon:"📉" },
  { id:33, cat:"analytics",  name:"Blocker Predictor",        desc:"Predicts which tasks will get stuck next week",           icon:"🧱" },
  { id:34, cat:"analytics",  name:"Team Performance Index",   desc:"Composite AI score per member per sprint",               icon:"🏆" },
  { id:35, cat:"analytics",  name:"Anomaly Detector",         desc:"Catches unusual patterns before they become problems",    icon:"🔭" },
  { id:36, cat:"analytics",  name:"Completion Forecaster",    desc:"Probabilistic finish date with confidence bands",         icon:"📆" },
  { id:37, cat:"analytics",  name:"Scope Creep Detector",     desc:"Measures how far the project drifted from its plan",     icon:"📡" },
  { id:38, cat:"analytics",  name:"ROI Estimator",            desc:"Calculates expected return for each feature shipped",     icon:"💰" },
  { id:39, cat:"analytics",  name:"Satisfaction Predictor",   desc:"Forecasts team morale from workload patterns",            icon:"😊" },
  { id:40, cat:"analytics",  name:"Success Probability",      desc:"Overall likelihood of hitting project goals on time",     icon:"🎰" },
];

/* ─── CSS ───────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Plus Jakarta Sans',sans-serif;background:${C.bg};color:${C.text};height:100vh;overflow:hidden;}
::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}

.app{display:flex;height:100vh;overflow:hidden;}

/* SIDEBAR */
.sb{width:204px;min-width:204px;background:${C.surf};border-right:1px solid ${C.border};display:flex;flex-direction:column;overflow-y:auto;}
.sb-logo{padding:18px 14px 16px;font-size:14px;font-weight:800;letter-spacing:-.5px;border-bottom:1px solid ${C.border};display:flex;align-items:center;gap:8px;}
.logomark{width:28px;height:28px;background:${C.accent};border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:white;box-shadow:0 0 14px ${C.accentBg};}
.ai-chip{font-size:8px;background:${C.accent};color:white;padding:1px 5px;border-radius:4px;margin-left:2px;font-weight:800;letter-spacing:.5px;}
.sb-sec{padding:14px 8px 6px;}
.sb-lbl{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.dim};padding:0 6px;margin-bottom:4px;}
.sbi{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:7px;cursor:pointer;font-size:12px;color:${C.muted};transition:all .12s;font-weight:500;}
.sbi:hover{background:${C.card};color:${C.text};}
.sbi.on{background:${C.accentBg};color:${C.accent};}
.sb-cnt{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:9px;background:${C.border};color:${C.muted};padding:1px 5px;border-radius:8px;}
.sb-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.online-dot{width:6px;height:6px;border-radius:50%;background:${C.green};margin-left:auto;}

/* MAIN */
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;}
.tb{height:50px;border-bottom:1px solid ${C.border};display:flex;align-items:center;padding:0 18px;gap:10px;flex-shrink:0;background:${C.surf};}
.tb-title{font-size:14px;font-weight:800;letter-spacing:-.3px;flex:1;display:flex;align-items:center;gap:8px;}
.views{display:flex;gap:2px;background:${C.bg};border:1px solid ${C.border};border-radius:8px;padding:3px;}
.vbtn{padding:4px 12px;border-radius:5px;border:none;background:none;color:${C.muted};font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:600;cursor:pointer;transition:all .12s;}
.vbtn:hover{color:${C.text};}
.vbtn.on{background:${C.accentBg};color:${C.accent};}
.add-btn{display:flex;align-items:center;gap:5px;padding:6px 13px;background:${C.accent};color:white;border:none;border-radius:7px;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;}
.add-btn:hover{background:${C.accentHi};transform:translateY(-1px);box-shadow:0 4px 14px ${C.accentBg};}

.wrap{flex:1;display:flex;overflow:hidden;}
.content{flex:1;overflow-y:auto;overflow-x:hidden;}

/* AI PANEL */
.ai-panel{width:256px;min-width:256px;border-left:1px solid ${C.border};background:${C.surf};display:flex;flex-direction:column;overflow:hidden;}
.aip-hd{padding:12px 14px;border-bottom:1px solid ${C.border};display:flex;align-items:center;gap:7px;font-size:12px;font-weight:700;}
.live-dot{width:7px;height:7px;border-radius:50%;background:${C.green};animation:pulse 2s infinite;}
.ai-feed{flex:1;overflow-y:auto;padding:8px;}
.ai-entry{padding:8px 10px;margin-bottom:4px;border-radius:7px;border:1px solid ${C.border};font-size:11px;line-height:1.4;}
.ai-time{font-family:'JetBrains Mono',monospace;font-size:9px;color:${C.muted};margin-bottom:2px;}
.aip-actions{padding:10px;border-top:1px solid ${C.border};display:flex;flex-direction:column;gap:5px;}
.qbtn{padding:7px 10px;border-radius:7px;border:1px solid ${C.border};background:${C.card};color:${C.text};font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:600;cursor:pointer;transition:all .12s;text-align:left;display:flex;align-items:center;gap:6px;}
.qbtn:hover{border-color:${C.accent};background:${C.accentBg};color:${C.accent};}
.qbtn:disabled{opacity:.4;cursor:not-allowed;}

/* BOARD */
.board{display:flex;gap:10px;padding:14px 16px 20px;overflow-x:auto;align-items:flex-start;}
.bcol{min-width:218px;width:218px;flex-shrink:0;}
.bcol-hd{display:flex;align-items:center;gap:7px;padding:6px 2px 9px;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;}
.bcnt{font-family:'JetBrains Mono',monospace;font-size:9px;color:${C.muted};margin-left:auto;background:${C.border};padding:1px 5px;border-radius:8px;}
.tcard{background:${C.card};border:1px solid ${C.border};border-radius:9px;padding:10px;margin-bottom:6px;cursor:pointer;transition:all .12s;}
.tcard:hover{border-color:${C.borderHi};transform:translateY(-1px);box-shadow:0 4px 16px #0004;}
.tc-title{font-size:12px;font-weight:500;line-height:1.4;margin-bottom:8px;}
.tc-meta{display:flex;align-items:center;gap:5px;flex-wrap:wrap;}
.pri-b{display:flex;align-items:center;gap:3px;font-size:9px;font-weight:700;padding:2px 5px;border-radius:4px;background:${C.bg};}
.lbl-b{font-size:9px;font-weight:600;padding:2px 6px;border-radius:8px;background:${C.bg};}
.ai-sc{font-family:'JetBrains Mono',monospace;font-size:9px;margin-left:auto;}
.risk-bar{width:100%;height:2px;background:${C.border};border-radius:1px;margin-top:7px;overflow:hidden;}
.risk-fill{height:100%;border-radius:1px;}
.av{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;color:white;flex-shrink:0;}
.empty{border:1.5px dashed ${C.border};border-radius:8px;height:56px;display:flex;align-items:center;justify-content:center;font-size:11px;color:${C.dim};}
.add-col{border:1.5px dashed ${C.border};border-radius:7px;padding:7px;font-size:11px;color:${C.dim};cursor:pointer;text-align:center;transition:all .12s;margin-top:4px;}
.add-col:hover{border-color:${C.accent};color:${C.accent};background:${C.accentBg};}

/* SPRINT BAR */
.sbar{margin:12px 16px 0;background:${C.card};border:1px solid ${C.border};border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:14px;}
.sp-track{flex:1;height:5px;background:${C.border};border-radius:3px;overflow:hidden;}
.sp-fill{height:100%;background:linear-gradient(90deg,${C.accent},${C.teal});border-radius:3px;transition:width .6s cubic-bezier(.4,0,.2,1);}
.sp-stat{font-family:'JetBrains Mono',monospace;font-size:10px;color:${C.muted};white-space:nowrap;}
.sp-stat b{color:${C.text};}

/* AI COMMAND */
.cmd{padding:16px;}
.cmd-hero{background:linear-gradient(135deg,${C.accentBg},transparent);border:1px solid ${C.accent}44;border-radius:14px;padding:20px;margin-bottom:16px;}
.cmd-h{font-size:17px;font-weight:800;margin-bottom:5px;letter-spacing:-.4px;}
.cmd-sub{font-size:12px;color:${C.muted};line-height:1.5;margin-bottom:14px;}
.ai-row{display:flex;gap:8px;}
.ai-in{flex:1;background:${C.bg};border:1px solid ${C.border};border-radius:8px;padding:10px 14px;color:${C.text};font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;outline:none;}
.ai-in:focus{border-color:${C.accent};}
.go-btn{padding:10px 18px;background:${C.accent};color:white;border:none;border-radius:8px;font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;}
.go-btn:hover{background:${C.accentHi};}
.go-btn:disabled{opacity:.5;cursor:not-allowed;}
.success-box{margin-top:10px;padding:10px 12px;background:${C.bg};border-radius:8px;border:1px solid ${C.green}44;}
.feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;}
.feat-c{background:${C.card};border:1px solid ${C.border};border-radius:9px;padding:10px 12px;transition:all .12s;}
.feat-c:hover{border-color:${C.borderHi};transform:translateY(-1px);}
.fi{font-size:18px;margin-bottom:5px;}
.fn{font-size:11px;font-weight:700;margin-bottom:2px;}
.fd{font-size:10px;color:${C.muted};line-height:1.4;}
.fnum{font-size:8px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;margin-top:5px;}
.sec-lbl{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.muted};margin-bottom:10px;}

/* CHAT */
.chatbox{background:${C.card};border:1px solid ${C.border};border-radius:12px;overflow:hidden;height:280px;display:flex;flex-direction:column;}
.chat-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;}
.cmsg{max-width:85%;padding:9px 12px;border-radius:9px;font-size:12px;line-height:1.5;}
.cmsg.user{align-self:flex-end;background:${C.accent};color:white;border-bottom-right-radius:2px;}
.cmsg.ai{align-self:flex-start;background:${C.bg};border:1px solid ${C.border};border-bottom-left-radius:2px;}
.chat-foot{display:flex;border-top:1px solid ${C.border};}
.chat-in{flex:1;background:transparent;border:none;padding:10px 14px;color:${C.text};font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;outline:none;}
.chat-send{padding:10px 16px;background:${C.accent};color:white;border:none;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:700;cursor:pointer;}

/* ANALYTICS */
.stats4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;}
.scard{background:${C.card};border:1px solid ${C.border};border-radius:10px;padding:14px 16px;}
.sv{font-size:26px;font-weight:900;font-family:'JetBrains Mono',monospace;letter-spacing:-1px;margin-bottom:2px;}
.sl{font-size:10px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:${C.muted};}
.st{font-size:10px;margin-top:4px;font-weight:600;color:${C.muted};}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;}
.rcard{background:${C.card};border:1px solid ${C.border};border-radius:10px;padding:14px;}
.rtitle{font-size:12px;font-weight:700;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:6px;}
.ri{font-size:11px;color:${C.muted};line-height:1.5;padding:5px 0;border-bottom:1px solid ${C.border};}
.ri:last-child{border:none;}
.risk-tag{display:inline-flex;align-items:center;font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;}
.health-num{font-size:46px;font-weight:900;font-family:'JetBrains Mono',monospace;letter-spacing:-3px;}
.hbar{width:100%;height:8px;background:${C.border};border-radius:4px;margin:12px 0;overflow:hidden;}
.hfill{height:100%;border-radius:4px;}
.vel-bars{display:flex;align-items:flex-end;gap:3px;height:42px;}
.vbar-item{flex:1;border-radius:2px;transition:all .3s;}

/* SPRINT VIEW */
.sprint-v{padding:16px;}
.vel3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;}
.mload{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;}
.ml-row{display:flex;align-items:center;gap:10px;background:${C.card};border:1px solid ${C.border};border-radius:8px;padding:10px 12px;}
.ml-track{flex:1;height:5px;background:${C.border};border-radius:3px;overflow:hidden;}
.ml-fill{height:100%;border-radius:3px;}

/* WRITING */
.writing{padding:16px;}
.standup-card{background:${C.card};border:1px solid ${C.border};border-radius:10px;padding:14px;margin-top:10px;}
.sd-member{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid ${C.border};}
.sd-member:last-child{border:none;}
.sdf{font-size:9px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:${C.muted};margin-bottom:2px;}
.sdv{font-size:11px;line-height:1.5;}
.write8{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px;}

/* MODAL */
.overlay{position:fixed;inset:0;background:#000b;backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:999;animation:fi .15s ease;}
@keyframes fi{from{opacity:0}to{opacity:1}}
.modal{background:${C.surf};border:1px solid ${C.borderHi};border-radius:14px;padding:22px;width:440px;max-width:95vw;animation:su .2s cubic-bezier(.4,0,.2,1);box-shadow:0 30px 60px #0008;}
@keyframes su{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.modal-lg{width:560px;max-height:80vh;overflow-y:auto;}
.mtitle{font-size:15px;font-weight:800;margin-bottom:18px;}
.fld{margin-bottom:12px;}
.flbl{font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:${C.muted};display:block;margin-bottom:5px;}
.fi-inp{width:100%;background:${C.bg};border:1px solid ${C.border};border-radius:7px;padding:8px 11px;color:${C.text};font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;outline:none;}
.fi-inp:focus{border-color:${C.accent};}
.fi-sel{width:100%;background:${C.bg};border:1px solid ${C.border};border-radius:7px;padding:8px 11px;color:${C.text};font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;outline:none;cursor:pointer;}
textarea.fi-inp{resize:vertical;min-height:80px;}
.frow2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.mfooter{display:flex;gap:8px;justify-content:flex-end;margin-top:18px;}
.mcancel{padding:7px 14px;background:${C.bg};border:1px solid ${C.border};border-radius:7px;color:${C.muted};font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;}
.msubmit{padding:7px 18px;background:${C.accent};border:none;border-radius:7px;color:white;font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;font-weight:700;cursor:pointer;}
.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;}
.df{background:${C.bg};border:1px solid ${C.border};border-radius:7px;padding:9px 11px;}
.dfl{font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:${C.dim};margin-bottom:3px;}
.dfv{font-size:12px;font-weight:600;display:flex;align-items:center;gap:5px;}
.sbtns{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:14px;}
.sbtn{padding:4px 10px;border-radius:14px;font-size:10px;font-weight:700;cursor:pointer;border:1px solid transparent;background:${C.bg};color:${C.muted};transition:all .12s;}
.sbtn.on{color:white;}
.ai-actions-row{display:flex;gap:6px;margin-top:12px;}
.aa-btn{flex:1;padding:7px;border:1px solid ${C.border};border-radius:7px;background:${C.card};color:${C.text};font-family:'Plus Jakarta Sans',sans-serif;font-size:10px;font-weight:600;cursor:pointer;transition:all .12s;display:flex;align-items:center;justify-content:center;gap:5px;}
.aa-btn:hover{border-color:${C.accent};color:${C.accent};background:${C.accentBg};}
.aa-btn:disabled{opacity:.4;cursor:not-allowed;}

.spin{display:inline-block;width:11px;height:11px;border:2px solid ${C.border};border-top-color:${C.accent};border-radius:50%;animation:sp .7s linear infinite;}
@keyframes sp{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.tag{font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;padding:2px 7px;border-radius:8px;}
.tip{font-size:11px;color:${C.muted};line-height:1.5;}
`;

/* ─── MAIN APP ──────────────────────────────────────────── */
export default function ProjectOS() {
  const [tasks, setTasks] = useState(SAMPLE_TASKS);
  const [projects] = useState(PROJECTS);
  const [activeProjId, setActiveProjId] = useState("p1");
  const [view, setView] = useState("board");
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({});
  const [actLog, setActLog] = useState([
    { id: 1, time: "2m ago",  msg: "Auto-prioritized 9 tasks by deadline proximity", type: "success" },
    { id: 2, time: "8m ago",  msg: "Burnout risk: Sam Chen overloaded — redistributing 2 tasks", type: "warning" },
    { id: 3, time: "15m ago", msg: "Sprint 13 auto-planned: 42 pts across 4 members", type: "sprint" },
    { id: 4, time: "1h ago",  msg: "Health score updated: Platform Rebuild 74/100", type: "info" },
    { id: 5, time: "2h ago",  msg: "3 duplicate tasks detected and merged", type: "success" },
  ]);
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [projGoal, setProjGoal] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { role: "assistant", content: "👋 I'm your fully autonomous AI project manager. I can generate projects, plan sprints, analyze risks, write standups, and run your entire backlog. What should I do first?" }
  ]);
  const [meetingNotes, setMeetingNotes] = useState("");
  const [newTask, setNewTask] = useState({ title: "", status: "Todo", priority: "medium", assignee: 1, points: 3, label: "feature" });
  const chatRef = useRef(null);

  const proj = projects.find(p => p.id === activeProjId);
  const projTasks = tasks.filter(t => t.project === activeProjId);
  const sprintTasks = projTasks.filter(t => t.sprint === 1);
  const doneTasks = sprintTasks.filter(t => t.status === "Done");
  const sprintPct = sprintTasks.length ? Math.round(doneTasks.length / sprintTasks.length * 100) : 0;

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chatHistory]);

  const setL = (k, v) => setLoading(p => ({ ...p, [k]: v }));
  const setR = (k, v) => setResults(p => ({ ...p, [k]: v }));
  const log = (msg, type = "info") => setActLog(p => [{ id: Date.now(), time: "just now", msg, type }, ...p.slice(0, 19)]);

  /* ── 10 REAL API CALLS ───────────────────────────────── */

  // 1. Generate project from goal
  const generateProject = async () => {
    if (!projGoal.trim()) return;
    setL("gen", true); log("Generating full project from goal…", "generating");
    const res = await callAI(`Generate a complete project plan for: "${projGoal}". Return JSON: {"projectName":string,"description":string,"tasks":[{"title":string,"priority":"critical"|"high"|"medium"|"low","status":"Backlog"|"Todo","points":number,"label":string}]} Include 7-10 tasks. Labels: feature|backend|design|docs|devops|research|bug`);
    setL("gen", false);
    if (res.tasks?.length) {
      const newTasks = res.tasks.map(t => ({ ...t, id: uid(), assignee: (Math.floor(Math.random() * 4) + 1), sprint: null, project: activeProjId, riskScore: Math.random() * .5, aiScore: Math.round(60 + Math.random() * 35), created: Date.now() }));
      setTasks(p => [...p, ...newTasks]);
      setR("gen", res);
      log(`Generated "${res.projectName}" — ${newTasks.length} tasks added`, "success");
    }
    setProjGoal("");
  };

  // 2. Break down a task into subtasks
  const breakdownTask = async (task) => {
    setL(`bd_${task.id}`, true); log(`Breaking down "${task.title}"…`, "generating");
    const res = await callAI(`Break this task into 4-6 concrete subtasks: "${task.title}". Return JSON: {"subtasks":[{"title":string,"points":number,"priority":"high"|"medium"|"low"}]}`);
    setL(`bd_${task.id}`, false);
    if (res.subtasks?.length) {
      const newTasks = res.subtasks.map(st => ({ ...st, id: uid(), status: "Todo", label: "feature", assignee: task.assignee, sprint: null, project: task.project, riskScore: .2, aiScore: 70, created: Date.now() }));
      setTasks(p => [...p, ...newTasks]);
      log(`Added ${newTasks.length} subtasks for "${task.title}"`, "success");
    }
    setSelectedTask(null);
  };

  // 3. AI Chat
  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput; setChatInput("");
    setChatHistory(p => [...p, { role: "user", content: msg }]);
    setL("chat", true);
    const ctx = projTasks.slice(0, 6).map(t => `${t.title}(${t.status})`).join("; ");
    const res = await callAI(msg, `You are ProjectOS AI for project "${proj?.name}". Tasks: ${ctx}. Return JSON: {"message":string}. Be concise and actionable.`);
    setL("chat", false);
    setChatHistory(p => [...p, { role: "assistant", content: res.message || res.raw || "Got it — task processed." }]);
    log(`AI responded to: "${msg.slice(0, 40)}…"`, "info");
  };

  // 4. Generate standup
  const genStandup = async () => {
    setL("standup", true); log("Generating daily standup…", "generating");
    const taskCtx = projTasks.map(t => `${t.title}(${t.status},${MEMBERS.find(m=>m.id===t.assignee)?.name})`).join(";");
    const res = await callAI(`Generate a daily standup. Project: ${proj?.name}. Tasks: ${taskCtx}. Return JSON: {"highlights":string,"members":[{"name":string,"yesterday":string,"today":string,"blockers":string}],"teamNote":string}`);
    setL("standup", false); setR("standup", res);
    log("Daily standup generated", "success");
  };

  // 5. Project health analysis
  const analyzeHealth = async () => {
    setL("health", true); log("Running health analysis…", "generating");
    const stats = { total: projTasks.length, done: doneTasks.length, critical: projTasks.filter(t=>t.priority==="critical"&&t.status!=="Done").length, highRisk: projTasks.filter(t=>t.riskScore>.6).length };
    const res = await callAI(`Analyze health of "${proj?.name}". Stats: ${JSON.stringify(stats)}. Return JSON: {"score":number(0-100),"status":"healthy"|"at-risk"|"critical","summary":string,"risks":[string],"recommendations":[string],"forecast":string}`);
    setL("health", false); setR("health", res);
    log(`Health: ${res.score}/100 — ${res.status}`, res.status === "healthy" ? "success" : "warning");
  };

  // 6. Risk analysis
  const analyzeRisks = async () => {
    setL("risks", true); log("Scanning for risks…", "generating");
    const crit = projTasks.filter(t=>t.priority==="critical").map(t=>t.title);
    const hr = projTasks.filter(t=>t.riskScore>.5).map(t=>t.title);
    const res = await callAI(`Identify top risks for "${proj?.name}". Critical tasks: ${crit.join(",")}. High-risk: ${hr.join(",")}. Return JSON: {"risks":[{"title":string,"severity":"critical"|"high"|"medium","probability":number,"impact":string,"mitigation":string}]} Include 4-6 risks.`);
    setL("risks", false); setR("risks", res);
    log(`Risk scan: ${res.risks?.length || 0} risks found`, "warning");
  };

  // 7. AI Sprint planner
  const planSprint = async () => {
    setL("sprint", true); log("AI planning sprint 13…", "generating");
    const backlog = projTasks.filter(t=>!t.sprint).map(t=>`${t.id}:${t.title}(${t.points}pts,${t.priority})`).join(";");
    const res = await callAI(`Plan optimal 2-week sprint for "${proj?.name}". Team capacity: 40pts. Backlog: ${backlog||"empty"}. Return JSON: {"sprintGoal":string,"totalPoints":number,"selectedTasks":[string],"reasoning":string,"warnings":[string]}`);
    setL("sprint", false);
    if (res.selectedTasks?.length) {
      setTasks(p => p.map(t => res.selectedTasks.includes(t.id) ? { ...t, sprint: 2 } : t));
      log(`Sprint 13 planned: ${res.selectedTasks.length} tasks, ${res.totalPoints}pts`, "success");
    }
    setR("sprint", res);
  };

  // 8. Auto-prioritize all tasks
  const autoPrioritize = async () => {
    setL("repri", true); log("Re-ranking tasks by impact/effort…", "generating");
    const list = projTasks.map(t=>`${t.id}:"${t.title}"(${t.priority},${t.points}pts)`).join(";");
    const res = await callAI(`Re-prioritize for max business impact: ${list}. Return JSON: {"updates":[{"id":string,"priority":"critical"|"high"|"medium"|"low","reason":string}]}`);
    setL("repri", false);
    if (res.updates?.length) {
      const map = {}; res.updates.forEach(u => { map[u.id] = u.priority; });
      setTasks(p => p.map(t => map[t.id] ? { ...t, priority: map[t.id] } : t));
      log(`Re-prioritized ${res.updates.length} tasks by AI impact matrix`, "success");
    }
  };

  // 9. Meeting notes to tasks
  const convertMeetingNotes = async () => {
    if (!meetingNotes.trim()) return;
    setL("meeting", true); log("Extracting action items from notes…", "generating");
    const res = await callAI(`Extract action items from meeting notes: "${meetingNotes}". Return JSON: {"summary":string,"tasks":[{"title":string,"assignee":string,"priority":"high"|"medium"|"low"}]}`);
    setL("meeting", false); setR("meeting", res);
    if (res.tasks) log(`Extracted ${res.tasks.length} action items`, "success");
  };

  // 10. Executive status report
  const writeReport = async () => {
    setL("report", true); log("Writing executive status report…", "generating");
    const stats = { total: projTasks.length, done: doneTasks.length, inProgress: projTasks.filter(t=>t.status==="In Progress").length, critical: projTasks.filter(t=>t.priority==="critical"&&t.status!=="Done").length };
    const res = await callAI(`Write executive status report for "${proj?.name}". Stats: ${JSON.stringify(stats)}. Return JSON: {"subject":string,"executiveSummary":string,"progressSection":string,"risksSection":string,"nextSteps":string}`);
    setL("report", false); setR("report", res);
    log("Status report ready", "success");
  };

  /* ── BOARD VIEW ─────────────────────────────────────── */
  const BoardView = () => (
    <div>
      <div className="sbar">
        <div>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:C.muted}}>SPRINT 12</div>
          <div style={{fontSize:12,fontWeight:700,marginTop:2}}>Apr 1 – Apr 14, 2026</div>
        </div>
        <div className="sp-track"><div className="sp-fill" style={{width:`${sprintPct}%`}} /></div>
        <div className="sp-stat"><b>{sprintPct}%</b> done</div>
        <div className="sp-stat"><b>{doneTasks.reduce((a,t)=>a+t.points,0)}</b>/{sprintTasks.reduce((a,t)=>a+t.points,0)} pts</div>
        <div className="sp-stat"><b>{doneTasks.length}</b>/{sprintTasks.length} tasks</div>
      </div>
      <div className="board">
        {STATUS_FLOW.map(status => {
          const col = projTasks.filter(t => t.status === status);
          return (
            <div key={status} className="bcol">
              <div className="bcol-hd">
                <div style={{width:7,height:7,borderRadius:"50%",background:SC[status],flexShrink:0}} />
                <span style={{color:SC[status]}}>{status}</span>
                <span className="bcnt">{col.length}</span>
              </div>
              {col.map(t => {
                const mem = MEMBERS.find(m => m.id === t.assignee);
                const pri = PRIORITY[t.priority];
                const rc = t.riskScore > .6 ? C.red : t.riskScore > .3 ? C.orange : C.green;
                return (
                  <div key={t.id} className="tcard" onClick={() => setSelectedTask(t)}>
                    <div className="tc-title" style={{opacity:status==="Done"?.5:1,textDecoration:status==="Done"?"line-through":"none"}}>{t.title}</div>
                    <div className="tc-meta">
                      <div className="pri-b" style={{color:pri.color}}>{pri.icon}</div>
                      <div className="lbl-b" style={{color:C.muted}}>{t.label}</div>
                      <div className="ai-sc" style={{color:t.aiScore>80?C.red:t.aiScore>60?C.orange:C.green}}>AI:{t.aiScore}</div>
                      {mem && <div className="av" style={{background:mem.color,marginLeft:"auto"}}>{mem.initials}</div>}
                    </div>
                    <div className="risk-bar"><div className="risk-fill" style={{width:`${t.riskScore*100}%`,background:rc}} /></div>
                  </div>
                );
              })}
              {col.length === 0 && <div className="empty">Empty</div>}
              <div className="add-col" onClick={() => { setNewTask(p=>({...p,status})); setShowNewTask(true); }}>+ Add</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  /* ── AI COMMAND CENTER ──────────────────────────────── */
  const AICommand = () => {
    const cats = { scheduling:{name:"🎯 Smart Scheduling",color:C.accent}, generation:{name:"🧠 AI Generation",color:C.purple}, analytics:{name:"📊 Predictive Analytics",color:C.green} };
    return (
      <div className="cmd">
        <div className="cmd-hero">
          <div className="cmd-h">✨ AI Command Center</div>
          <div className="cmd-sub">Turn any business goal into a full project plan instantly. The AI generates tasks, estimates effort, assigns priorities, and schedules everything — fully autonomous.</div>
          <div className="ai-row">
            <input className="ai-in" placeholder='e.g. "Launch a referral program by Q3 to grow signups 30%"'
              value={projGoal} onChange={e=>setProjGoal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&generateProject()} />
            <button className="go-btn" onClick={generateProject} disabled={loading.gen}>
              {loading.gen ? <><span className="spin" /> &nbsp;Building…</> : "✨ Generate Project"}
            </button>
          </div>
          {results.gen && (
            <div className="success-box">
              <div style={{fontSize:11,fontWeight:700,color:C.green,marginBottom:3}}>✓ {results.gen.projectName} created</div>
              <div style={{fontSize:11,color:C.muted}}>{results.gen.description}</div>
            </div>
          )}
        </div>

        <div className="two" style={{marginBottom:16}}>
          <div>
            <div className="sec-lbl">AI Project Manager Chat</div>
            <div className="chatbox">
              <div className="chat-msgs" ref={chatRef}>
                {chatHistory.map((m,i) => <div key={i} className={`cmsg ${m.role==="user"?"user":"ai"}`}>{m.content}</div>)}
                {loading.chat && <div className="cmsg ai"><span className="spin" /></div>}
              </div>
              <div className="chat-foot">
                <input className="chat-in" placeholder="Plan sprint, prioritize, analyze risks…"
                  value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} />
                <button className="chat-send" onClick={sendChat} disabled={loading.chat}>↑</button>
              </div>
            </div>
          </div>
          <div>
            <div className="sec-lbl">Meeting Notes → Action Items</div>
            <div className="rcard">
              <textarea className="fi-inp" placeholder="Paste meeting notes or transcript here…" value={meetingNotes} onChange={e=>setMeetingNotes(e.target.value)} style={{height:130,marginBottom:8}} />
              <button className="go-btn" onClick={convertMeetingNotes} disabled={loading.meeting} style={{width:"100%"}}>
                {loading.meeting ? <><span className="spin" /> Extracting…</> : "🗒️ Extract Action Items"}
              </button>
              {results.meeting?.tasks && (
                <div style={{marginTop:10}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.green,marginBottom:6}}>{results.meeting.summary}</div>
                  {results.meeting.tasks.map((t,i) => (
                    <div key={i} className="ri">• {t.title} <span style={{color:C.accent}}>— {t.assignee}</span></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {Object.entries(cats).map(([cat, meta]) => (
          <div key={cat} style={{marginBottom:16}}>
            <div className="sec-lbl" style={{color:meta.color}}>{meta.name}</div>
            <div className="feat-grid">
              {FEATURES.filter(f=>f.cat===cat).map(f => (
                <div key={f.id} className="feat-c">
                  <div className="fi">{f.icon}</div>
                  <div className="fn">{f.name}</div>
                  <div className="fd">{f.desc}</div>
                  <div className="fnum" style={{color:meta.color}}>#{String(f.id).padStart(2,"0")} · {cat}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  /* ── ANALYTICS VIEW ─────────────────────────────────── */
  const Analytics = () => {
    const total = projTasks.length, done = doneTasks.length;
    const inProg = projTasks.filter(t=>t.status==="In Progress").length;
    const critical = projTasks.filter(t=>t.priority==="critical"&&t.status!=="Done").length;
    const health = results.health;
    const risks = results.risks;
    const successProb = Math.round(((done/(total||1))*.4+(1-critical/(total||1))*.6)*100);
    const velTrend = [22,28,24,31,27,34,38];
    return (
      <div style={{padding:16}}>
        <div className="stats4">
          {[
            {label:"Total Tasks",  val:total,    color:C.text,   trend:"+3 this week"},
            {label:"Completed",    val:done,     color:C.green,  trend:`${Math.round((done/total||0)*100)}% rate`},
            {label:"In Progress",  val:inProg,   color:C.accent, trend:`${((inProg/(total||1))*100).toFixed(0)}% WIP`},
            {label:"Critical Open",val:critical, color:C.red,    trend:critical>2?"⚠ Needs attention":"✓ Manageable"},
          ].map(s => (
            <div key={s.label} className="scard">
              <div className="sv" style={{color:s.color}}>{s.val}</div>
              <div className="sl">{s.label}</div>
              <div className="st">{s.trend}</div>
            </div>
          ))}
        </div>

        <div className="two">
          <div className="rcard">
            <div className="rtitle">
              💚 Project Health Score
              <button className="qbtn" onClick={analyzeHealth} disabled={loading.health} style={{padding:"4px 10px",fontSize:10}}>
                {loading.health ? <span className="spin" /> : "🧠 Analyze"}
              </button>
            </div>
            <div className="health-num" style={{color:health?(health.score>70?C.green:health.score>50?C.orange:C.red):C.accent}}>
              {health?.score ?? proj?.health ?? "—"}
            </div>
            <div className="hbar"><div className="hfill" style={{width:`${health?.score||proj?.health||0}%`,background:`linear-gradient(90deg,${C.accent},${C.green})`}} /></div>
            {health ? (
              <>
                <div className="tip" style={{marginBottom:8}}>{health.summary}</div>
                {health.recommendations?.slice(0,2).map((r,i) => (
                  <div key={i} style={{fontSize:11,padding:"4px 8px",background:C.accentBg,borderRadius:6,marginBottom:4}}>💡 {r}</div>
                ))}
                {health.forecast && <div style={{fontSize:11,color:C.muted,marginTop:6,fontStyle:"italic"}}>📆 {health.forecast}</div>}
              </>
            ) : <div className="tip">Click Analyze for AI health diagnostics with risks & recommendations</div>}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div className="scard">
              <div className="sl" style={{marginBottom:8}}>🎰 Success Probability</div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontSize:30,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:successProb>70?C.green:successProb>50?C.orange:C.red}}>{successProb}%</div>
                <div style={{flex:1}}>
                  <div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${successProb}%`,background:successProb>70?C.green:successProb>50?C.orange:C.red,borderRadius:3}} />
                  </div>
                  <div style={{fontSize:10,color:C.muted,marginTop:4}}>Velocity + risk composite</div>
                </div>
              </div>
            </div>
            <div className="scard">
              <div className="sl" style={{marginBottom:8}}>🚀 Sprint Velocity Trend</div>
              <div className="vel-bars">
                {velTrend.map((v,i) => (
                  <div key={i} className="vbar-item" title={`Sprint ${i+6}: ${v}pts`}
                    style={{background:i===velTrend.length-1?C.accent:C.border,height:`${(v/38)*100}%`}} />
                ))}
              </div>
              <div style={{fontSize:10,color:C.green,marginTop:6,fontWeight:600}}>↑ +12% velocity this sprint</div>
            </div>
          </div>
        </div>

        <div className="two">
          <div className="rcard">
            <div className="rtitle">
              ⚠️ Risk Analysis
              <button className="qbtn" onClick={analyzeRisks} disabled={loading.risks} style={{padding:"4px 10px",fontSize:10}}>
                {loading.risks ? <span className="spin" /> : "Scan"}
              </button>
            </div>
            {risks?.risks ? risks.risks.map((r,i) => (
              <div key={i} className="ri">
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <span className="risk-tag" style={{background:`${r.severity==="critical"?C.red:r.severity==="high"?C.orange:C.yellow}22`,color:r.severity==="critical"?C.red:r.severity==="high"?C.orange:C.yellow}}>{r.severity}</span>
                  <span style={{fontWeight:600,fontSize:11}}>{r.title}</span>
                  <span style={{fontSize:10,color:C.muted,marginLeft:"auto"}}>{Math.round(r.probability*100)}%</span>
                </div>
                <div style={{fontSize:10,color:C.muted}}>{r.mitigation}</div>
              </div>
            )) : projTasks.filter(t=>t.riskScore>.5).map(t => (
              <div key={t.id} className="ri">
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <span className="risk-tag" style={{background:`${C.red}22`,color:C.red}}>high risk</span>
                  <span style={{fontSize:11}}>{t.title}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rcard">
            <div className="rtitle">🔥 Burnout Risk</div>
            {MEMBERS.map(m => {
              const load = projTasks.filter(t=>t.assignee===m.id&&t.status!=="Done").reduce((a,t)=>a+t.points,0);
              const pct = Math.min((load/20)*100, 100);
              const risk = load>16?"high":load>10?"medium":"low";
              const rc = {high:C.red,medium:C.orange,low:C.green}[risk];
              return (
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
                  <div className="av" style={{background:m.color,width:24,height:24,fontSize:8}}>{m.initials}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:11,fontWeight:600}}>{m.name.split(" ")[0]}</span>
                      <span className="risk-tag" style={{background:`${rc}22`,color:rc}}>{risk}</span>
                    </div>
                    <div style={{height:4,background:C.border,borderRadius:2,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:rc,borderRadius:2}} />
                    </div>
                  </div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{load}pts</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rcard">
          <div className="rtitle">⏱️ On-Time Probability</div>
          {projTasks.filter(t=>t.status!=="Done").slice(0,7).map(t => {
            const prob = Math.round((1-t.riskScore)*(PRIORITY[t.priority].score/4*.3+.7)*100);
            const pc = prob>70?C.green:prob>50?C.orange:C.red;
            return (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{flex:1,fontSize:11,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                <div style={{width:80,height:4,background:C.border,borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${prob}%`,background:pc,borderRadius:2}} />
                </div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:pc,minWidth:30}}>{prob}%</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ── SPRINT PLANNER ─────────────────────────────────── */
  const SprintView = () => {
    const backlog = projTasks.filter(t=>!t.sprint);
    const spRes = results.sprint;
    return (
      <div className="sprint-v">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <div style={{fontSize:15,fontWeight:800,marginBottom:2}}>⚡ AI Sprint Planner</div>
            <div style={{fontSize:12,color:C.muted}}>{backlog.length} backlog tasks · 40pt team capacity</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="qbtn" onClick={planSprint} disabled={loading.sprint}>
              {loading.sprint ? <><span className="spin" /> Planning…</> : "✨ Auto-Plan Sprint 13"}
            </button>
            <button className="qbtn" onClick={autoPrioritize} disabled={loading.repri}>
              {loading.repri ? <><span className="spin" /> Ranking…</> : "🎯 Re-Prioritize All"}
            </button>
          </div>
        </div>

        {spRes && (
          <div style={{background:`${C.green}11`,border:`1px solid ${C.green}33`,borderRadius:10,padding:"12px 14px",marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:4}}>✓ Sprint Goal: {spRes.sprintGoal}</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:spRes.warnings?.length?6:0}}>{spRes.reasoning}</div>
            {spRes.warnings?.map((w,i) => <div key={i} style={{fontSize:11,color:C.orange}}>⚠ {w}</div>)}
          </div>
        )}

        <div className="vel3">
          {[
            {label:"Team Velocity",  val:"34 pts", sub:"Last sprint avg"},
            {label:"Capacity Used",  val:`${Math.round(sprintTasks.reduce((a,t)=>a+t.points,0)/40*100)}%`, sub:"Sprint 12"},
            {label:"Backlog Items",  val:backlog.length, sub:"Unscheduled"},
          ].map(s => (
            <div key={s.label} className="scard">
              <div className="sv">{s.val}</div>
              <div className="sl">{s.label}</div>
              <div className="st">{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="sec-lbl">Team Workload</div>
        <div className="mload">
          {MEMBERS.map(m => {
            const pts = projTasks.filter(t=>t.assignee===m.id&&t.sprint===1).reduce((a,t)=>a+t.points,0);
            const pct = Math.min((pts/13)*100, 100);
            const over = pts > 13;
            return (
              <div key={m.id} className="ml-row">
                <div className="av" style={{background:m.color,width:28,height:28,fontSize:9}}>{m.initials}</div>
                <div style={{minWidth:88}}>
                  <div style={{fontSize:12,fontWeight:700}}>{m.name.split(" ")[0]}</div>
                  <div style={{fontSize:10,color:C.muted}}>{m.role}</div>
                </div>
                <div className="ml-track"><div className="ml-fill" style={{width:`${pct}%`,background:over?C.red:m.color}} /></div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:over?C.red:C.muted,minWidth:45}}>{pts}/13 pts</div>
                {over && <span className="tag" style={{background:`${C.red}22`,color:C.red}}>over</span>}
              </div>
            );
          })}
        </div>

        <div className="sec-lbl">Backlog ({backlog.length})</div>
        {backlog.length === 0 ? (
          <div className="empty">🎉 All tasks scheduled!</div>
        ) : backlog.map(t => {
          const mem = MEMBERS.find(m=>m.id===t.assignee);
          return (
            <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:C.card,border:`1px solid ${C.border}`,borderRadius:8,marginBottom:4}}>
              <span style={{fontSize:11}}>{PRIORITY[t.priority].icon}</span>
              <div style={{flex:1,fontSize:12,fontWeight:500}}>{t.title}</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{t.points}pts</div>
              {mem && <div className="av" style={{background:mem.color}}>{mem.initials}</div>}
              <button style={{fontSize:9,padding:"3px 8px",border:`1px solid ${C.border}`,borderRadius:5,background:"none",color:C.muted,cursor:"pointer"}}
                onClick={() => setTasks(p=>p.map(tk=>tk.id===t.id?{...tk,sprint:2}:tk))}>
                + Sprint 13
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  /* ── AI WRITING VIEW ────────────────────────────────── */
  const WritingView = () => {
    const su = results.standup;
    const rpt = results.report;
    return (
      <div className="writing">
        <div style={{fontSize:15,fontWeight:800,marginBottom:14}}>✍️ AI Writing Tools</div>
        <div className="two">
          <div>
            <div className="sec-lbl">Daily Standup Generator</div>
            <div className="rcard">
              <div className="tip" style={{marginBottom:10}}>Generates personalized standup for all {MEMBERS.length} members based on live task data</div>
              <button className="go-btn" onClick={genStandup} disabled={loading.standup} style={{width:"100%"}}>
                {loading.standup ? <><span className="spin" /> Generating…</> : "📋 Generate Team Standup"}
              </button>
              {su?.members && (
                <div className="standup-card">
                  {su.highlights && <div style={{fontSize:11,fontWeight:700,color:C.green,marginBottom:8}}>🎯 {su.highlights}</div>}
                  {su.members.map((m,i) => (
                    <div key={i} className="sd-member">
                      <div className="av" style={{background:MEMBERS[i%4].color,width:24,height:24,fontSize:8,flexShrink:0}}>{MEMBERS[i%4].initials}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:11,fontWeight:700,marginBottom:4}}>{m.name}</div>
                        <div style={{marginBottom:3}}><div className="sdf">Yesterday</div><div className="sdv">{m.yesterday}</div></div>
                        <div style={{marginBottom:3}}><div className="sdf">Today</div><div className="sdv">{m.today}</div></div>
                        {m.blockers&&m.blockers!=="None"&&<div><div className="sdf" style={{color:C.red}}>Blocker</div><div className="sdv" style={{color:C.orange}}>{m.blockers}</div></div>}
                      </div>
                    </div>
                  ))}
                  {su.teamNote && <div style={{fontSize:11,color:C.muted,marginTop:8,fontStyle:"italic"}}>💬 {su.teamNote}</div>}
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="sec-lbl">Executive Status Report</div>
            <div className="rcard">
              <div className="tip" style={{marginBottom:10}}>Writes a full stakeholder update with progress, risks, and next steps</div>
              <button className="go-btn" onClick={writeReport} disabled={loading.report} style={{width:"100%"}}>
                {loading.report ? <><span className="spin" /> Writing…</> : "📄 Write Status Report"}
              </button>
              {rpt && (
                <div style={{marginTop:12}}>
                  {rpt.subject && <div style={{fontSize:12,fontWeight:700,color:C.accent,marginBottom:8}}>Re: {rpt.subject}</div>}
                  {[["Summary",rpt.executiveSummary],["Progress",rpt.progressSection],["Risks",rpt.risksSection],["Next Steps",rpt.nextSteps]].map(([k,v])=>v&&(
                    <div key={k} style={{marginBottom:8}}>
                      <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".8px",color:C.muted,marginBottom:3}}>{k}</div>
                      <div style={{fontSize:11,color:C.text,lineHeight:1.6}}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sec-lbl" style={{marginTop:4}}>More AI Writing Tools</div>
        <div className="write8">
          {[["🎯","Acceptance Criteria","For any user story"],["🔄","Retrospective","Sprint retro notes"],["🗺️","Project Brief","Full project overview"],["📧","Stakeholder Email","Weekly update"],["⚠️","Risk Register","Formatted risk doc"],["📅","Release Notes","Version changelog"],["🎓","Onboarding Guide","New member docs"],["💡","Sprint Goals","Next sprint objectives"]].map(([ic,nm,ds])=>(
            <div key={nm} className="feat-c" style={{cursor:"pointer"}}>
              <div className="fi">{ic}</div><div className="fn">{nm}</div><div className="fd">{ds}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* ── TASK DETAIL MODAL ──────────────────────────────── */
  const TaskDetail = () => {
    if (!selectedTask) return null;
    const task = tasks.find(t=>t.id===selectedTask.id) || selectedTask;
    const mem = MEMBERS.find(m=>m.id===task.assignee);
    const pri = PRIORITY[task.priority];
    const isL = loading[`bd_${task.id}`];
    return (
      <div className="overlay" onClick={e=>e.target===e.currentTarget&&setSelectedTask(null)}>
        <div className="modal modal-lg">
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>#{task.id}</div>
            <button onClick={()=>setSelectedTask(null)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:18}}>×</button>
          </div>
          <div style={{fontSize:16,fontWeight:800,marginBottom:14,letterSpacing:"-.3px",lineHeight:1.3}}>{task.title}</div>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".8px",color:C.muted,marginBottom:7}}>Move to</div>
          <div className="sbtns">
            {STATUS_FLOW.map(s=>(
              <div key={s} className={`sbtn ${task.status===s?"on":""}`}
                style={task.status===s?{background:SC[s]+"33",color:SC[s],borderColor:SC[s]+"66"}:{}}
                onClick={()=>setTasks(p=>p.map(t=>t.id===task.id?{...t,status:s}:t))}>
                {s}
              </div>
            ))}
          </div>
          <div className="detail-grid">
            <div className="df"><div className="dfl">Priority</div><div className="dfv" style={{color:pri.color}}>{pri.icon} {pri.label}</div></div>
            <div className="df"><div className="dfl">AI Score</div><div className="dfv" style={{fontFamily:"'JetBrains Mono',monospace",color:task.aiScore>80?C.red:task.aiScore>60?C.orange:C.green}}>{task.aiScore}/100</div></div>
            <div className="df"><div className="dfl">Assignee</div><div className="dfv">{mem&&<div className="av" style={{background:mem.color,width:20,height:20,fontSize:7}}>{mem.initials}</div>}{mem?.name.split(" ")[0]}</div></div>
            <div className="df"><div className="dfl">Points</div><div className="dfv" style={{fontFamily:"'JetBrains Mono',monospace"}}>{task.points} pts</div></div>
            <div className="df">
              <div className="dfl">Risk Score</div>
              <div className="dfv">
                <div style={{flex:1,height:4,background:C.border,borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${task.riskScore*100}%`,background:task.riskScore>.6?C.red:task.riskScore>.3?C.orange:C.green,borderRadius:2}} />
                </div>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{Math.round(task.riskScore*100)}%</span>
              </div>
            </div>
            <div className="df"><div className="dfl">Sprint</div><div className="dfv">{task.sprint?`Sprint ${task.sprint}`:"Backlog"}</div></div>
          </div>
          <div className="ai-actions-row">
            <button className="aa-btn" onClick={()=>breakdownTask(task)} disabled={isL}>
              {isL?<span className="spin" />:"🔪"} Break Down
            </button>
            <button className="aa-btn">✍️ Enhance</button>
            <button className="aa-btn">⚠️ Find Risks</button>
            <button className="aa-btn">📏 Re-Estimate</button>
          </div>
        </div>
      </div>
    );
  };

  /* ── NEW TASK MODAL ─────────────────────────────────── */
  const NewTaskModal = () => {
    const create = () => {
      if (!newTask.title.trim()) return;
      setTasks(p=>[{...newTask,id:uid(),project:activeProjId,sprint:null,riskScore:.3,aiScore:70,created:Date.now()},...p]);
      setNewTask({title:"",status:"Todo",priority:"medium",assignee:1,points:3,label:"feature"});
      setShowNewTask(false);
    };
    return (
      <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowNewTask(false)}>
        <div className="modal">
          <div className="mtitle">Create Task</div>
          <div className="fld">
            <label className="flbl">Title</label>
            <input className="fi-inp" placeholder="What needs to be done?" autoFocus value={newTask.title}
              onChange={e=>setNewTask(p=>({...p,title:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&create()} />
          </div>
          <div className="frow2">
            <div className="fld"><label className="flbl">Status</label>
              <select className="fi-sel" value={newTask.status} onChange={e=>setNewTask(p=>({...p,status:e.target.value}))}>
                {STATUS_FLOW.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="fld"><label className="flbl">Priority</label>
              <select className="fi-sel" value={newTask.priority} onChange={e=>setNewTask(p=>({...p,priority:e.target.value}))}>
                {Object.entries(PRIORITY).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="frow2">
            <div className="fld"><label className="flbl">Assignee</label>
              <select className="fi-sel" value={newTask.assignee} onChange={e=>setNewTask(p=>({...p,assignee:+e.target.value}))}>
                {MEMBERS.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="fld"><label className="flbl">Story Points</label>
              <select className="fi-sel" value={newTask.points} onChange={e=>setNewTask(p=>({...p,points:+e.target.value}))}>
                {[1,2,3,5,8,13,21].map(n=><option key={n} value={n}>{n} pts</option>)}
              </select>
            </div>
          </div>
          <div className="mfooter">
            <button className="mcancel" onClick={()=>setShowNewTask(false)}>Cancel</button>
            <button className="msubmit" onClick={create}>Create Task</button>
          </div>
        </div>
      </div>
    );
  };

  /* ── LOG ENTRY COLORS ─────────────────────────────────── */
  const LC = { success:C.green, warning:C.orange, sprint:C.teal, info:C.accent, generating:C.purple };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {/* ── SIDEBAR ─────────────────────────────────────── */}
        <div className="sb">
          <div className="sb-logo">
            <div className="logomark">P</div>
            ProjectOS <span className="ai-chip">AI</span>
          </div>
          <div className="sb-sec">
            <div className="sb-lbl">Workspace</div>
            {[["◉","My Tasks",tasks.filter(t=>t.assignee===1).length],["◎","Inbox",5],["▣","All Projects",null]].map(([ic,lb,cnt])=>(
              <div key={lb} className="sbi"><span>{ic}</span>{lb}{cnt!=null&&<span className="sb-cnt">{cnt}</span>}</div>
            ))}
          </div>
          <div className="sb-sec">
            <div className="sb-lbl">Projects</div>
            {PROJECTS.map(p=>(
              <div key={p.id} className={`sbi ${activeProjId===p.id?"on":""}`} onClick={()=>setActiveProjId(p.id)}>
                <div className="sb-dot" style={{background:p.color}} />{p.name}
                <span className="sb-cnt">{tasks.filter(t=>t.project===p.id).length}</span>
              </div>
            ))}
          </div>
          <div className="sb-sec">
            <div className="sb-lbl">40 AI Features</div>
            {[["🎯","Scheduling",13],["🧠","Generation",14],["📊","Analytics",13]].map(([ic,lb,cnt])=>(
              <div key={lb} className="sbi" onClick={()=>setView("command")}>
                <span>{ic}</span>{lb}<span className="sb-cnt">{cnt}</span>
              </div>
            ))}
          </div>
          <div style={{marginTop:"auto",padding:"8px",borderTop:`1px solid ${C.border}`}}>
            {MEMBERS.slice(0,4).map(m=>(
              <div key={m.id} className="sbi">
                <div className="av" style={{background:m.color,width:20,height:20,fontSize:7}}>{m.initials}</div>
                <span style={{fontSize:11}}>{m.name.split(" ")[0]}</span>
                <div className="online-dot" />
              </div>
            ))}
          </div>
        </div>

        {/* ── MAIN ────────────────────────────────────────── */}
        <div className="main">
          <div className="tb">
            <div className="tb-title">
              {proj?.icon} {proj?.name}
              <div style={{width:6,height:6,borderRadius:"50%",background:C.green,boxShadow:`0 0 5px ${C.green}`}} />
            </div>
            <div className="views">
              {[["board","Board"],["command","✨ AI Command"],["sprint","Sprint"],["analytics","Analytics"],["writing","AI Write"]].map(([k,v])=>(
                <button key={k} className={`vbtn ${view===k?"on":""}`} onClick={()=>setView(k)}>{v}</button>
              ))}
            </div>
            <button className="add-btn" onClick={()=>setShowNewTask(true)}>+ New Task</button>
          </div>

          <div className="wrap">
            <div className="content">
              {view==="board"    && <BoardView />}
              {view==="command"  && <AICommand />}
              {view==="sprint"   && <SprintView />}
              {view==="analytics"&& <Analytics />}
              {view==="writing"  && <WritingView />}
            </div>

            {/* ── AI ACTIVITY PANEL ───────────────────────── */}
            <div className="ai-panel">
              <div className="aip-hd">
                <div className="live-dot" />
                AI Agent · Autonomous
                <div style={{marginLeft:"auto",fontSize:9,color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>40 features</div>
              </div>
              <div className="ai-feed">
                {actLog.map(e=>(
                  <div key={e.id} className="ai-entry" style={{borderColor:`${LC[e.type]||C.border}44`,background:`${LC[e.type]||C.border}09`}}>
                    <div className="ai-time">{e.time}</div>
                    <div style={{color:e.type==="warning"?C.orange:e.type==="success"?C.green:C.text}}>{e.msg}</div>
                  </div>
                ))}
              </div>
              <div className="aip-actions">
                <div style={{fontSize:9,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:C.dim,marginBottom:4}}>Quick Actions</div>
                {[
                  [genStandup,   loading.standup,  "📋","Standup"],
                  [analyzeHealth,loading.health,   "💚","Health"],
                  [autoPrioritize,loading.repri,   "🎯","Prioritize"],
                  [planSprint,   loading.sprint,   "⚡","Plan Sprint"],
                  [analyzeRisks, loading.risks,    "⚠️","Risks"],
                  [writeReport,  loading.report,   "📄","Status Report"],
                ].map(([fn,ld,ic,lb])=>(
                  <button key={lb} className="qbtn" onClick={fn} disabled={ld}>
                    {ld?<span className="spin" />:ic} {lb}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showNewTask && <NewTaskModal />}
      {selectedTask && <TaskDetail />}
    </>
  );
}
