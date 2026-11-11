/* ============ 1. FIREBASE: paste your real values from Firebase Console > Project settings > Your apps ============ */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "pesasmart-ai.firebaseapp.com",
  projectId: "pesasmart-ai",
  appId: "YOUR_APP_ID"
};

const $ = s => document.querySelector(s);
document.getElementById("boot")?.remove();
const $$ = s => [...document.querySelectorAll(s)];
const fmt = n => "KSh " + Math.round(n).toLocaleString("en-KE");
const num = id => { const v = parseFloat($(id).value); return isNaN(v) ? NaN : v; };

/* ============ 2. AUTH (Firebase, with demo fallback until config is filled in) ============ */
let user = null, fb = null, demo = false;
try {
  if (firebaseConfig.apiKey.startsWith("YOUR_")) throw new Error("no config");
  const [appMod, authMod] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js")
  ]);
  fb = { ...authMod, auth: authMod.getAuth(appMod.initializeApp(firebaseConfig)) };
} catch (e) { demo = true; }

const errText = {
  "auth/invalid-credential": "Wrong email or password.",
  "auth/user-not-found": "No account with that email. Use Create account.",
  "auth/wrong-password": "Wrong email or password.",
  "auth/email-already-in-use": "That email already has an account. Use Sign in.",
  "auth/weak-password": "Use a password with at least 6 characters.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-password": "Enter your password.",
  "auth/popup-closed-by-user": "Google sign-in was closed. Try again.",
  "auth/popup-blocked": "Your browser blocked the Google window. Allow pop-ups and try again.",
  "auth/unauthorized-domain": "Add this website's domain in Firebase > Authentication > Settings > Authorized domains.",
  "auth/operation-not-allowed": "Turn this sign-in method on in Firebase > Authentication > Sign-in method.",
  "auth/network-request-failed": "No internet connection. Check your data and try again.",
  "auth/too-many-requests": "Too many tries. Wait a few minutes and try again."
};
const say = (t, ok) => { const m = $("#authMsg"); m.textContent = t; m.className = "msg " + (ok ? "ok" : "err"); };
const clearMsg = () => { $("#authMsg").className = "msg"; };

let mode = "in";
function setMode(m) {
  mode = m; clearMsg();
  $("#tabIn").setAttribute("aria-selected", m === "in");
  $("#tabUp").setAttribute("aria-selected", m === "up");
  $("#authBtn").textContent = m === "in" ? "Sign in" : "Create account";
  $("#pass").autocomplete = m === "in" ? "current-password" : "new-password";
  $("#forgot").classList.toggle("hidden", m === "up");
}
$("#tabIn").onclick = () => setMode("in");
$("#tabUp").onclick = () => setMode("up");

$("#authForm").addEventListener("submit", async e => {
  e.preventDefault(); clearMsg();
  const email = $("#email").value.trim(), pass = $("#pass").value;
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return say("Enter a valid email address.");
  if (pass.length < 6) return say("Use a password with at least 6 characters.");
  $("#authBtn").disabled = true;
  try {
    if (demo) { localStorage.setItem("ps:demoUser", email); setUser({ email }); }
    else if (mode === "in") await fb.signInWithEmailAndPassword(fb.auth, email, pass);
    else await fb.createUserWithEmailAndPassword(fb.auth, email, pass);
  } catch (err) { say(errText[err.code] || "Something went wrong. Please try again."); }
  $("#authBtn").disabled = false;
});

$("#googleBtn").onclick = async () => {
  clearMsg();
  if (demo) return say("Google sign-in needs Firebase set up first. Use email for now.");
  try { await fb.signInWithPopup(fb.auth, new fb.GoogleAuthProvider()); }
  catch (err) { say(errText[err.code] || "Google sign-in failed. Please try again."); }
};

$("#forgot").onclick = async () => {
  clearMsg();
  const email = $("#email").value.trim();
  if (!email) return say("Type your email above, then tap Forgot password.");
  if (demo) return say("Password reset works once Firebase is connected.");
  try { await fb.sendPasswordResetEmail(fb.auth, email); say("Reset link sent. Check your inbox and spam folder.", true); }
  catch (err) { say(errText[err.code] || "Could not send the reset email."); }
};

$("#logout").onclick = async () => {
  if (demo) { localStorage.removeItem("ps:demoUser"); setUser(null); }
  else await fb.signOut(fb.auth);
};

function setUser(u) {
  user = u;
  if (u) {
    $("#login").classList.add("hidden");
    $("#app").classList.remove("hidden");
    const name = (u.email || "").split("@")[0];
    $("#userGreet").textContent = u.email;
    $("#hello").textContent = "Hello, " + name;
    route(); renderSnap();
  } else {
    $("#app").classList.add("hidden");
    $("#login").classList.remove("hidden");
    $("#demoNote").classList.toggle("hidden", !demo);
    $("#pass").value = "";
  }
}

/* ============ 3. PER-USER SAVED RESULTS ============ */
const key = k => "ps:" + (user?.email || "x") + ":" + k;
const save = (k, v) => { try { localStorage.setItem(key(k), JSON.stringify(v)); } catch (e) {} };
const load = k => { try { return JSON.parse(localStorage.getItem(key(k))); } catch (e) { return null; } };
function renderSnap() {
  const b = load("budget"), s = load("savings"), x = load("business");
  $("#sBudget").textContent = b ? fmt(b.left) : "Not set";
  $("#sSave").textContent = s ? fmt(s.total) : "Not set";
  $("#sBiz").textContent = x ? (x.profit < 0 ? "-" : "") + fmt(Math.abs(x.profit)) : "Not set";
}

/* ============ 4. ROUTER: 5 pages ============ */
const pages = ["home", "budget", "savings", "business", "tutor"];
function route() {
  if (!user) return;
  let p = location.hash.replace("#", "");
  if (!pages.includes(p)) p = "home";
  $$(".page").forEach(el => el.classList.toggle("active", el.id === "p-" + p));
  $$("nav.bottom a").forEach(a => { if (a.dataset.p === p) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  document.title = "PesaSmart AI | " + p[0].toUpperCase() + p.slice(1);
  window.scrollTo(0, 0);
}
addEventListener("hashchange", route);

/* ============ 5. CALCULATORS ============ */
function show(id, html, bad) { const el = $(id); el.innerHTML = html; el.className = "result show" + (bad ? " bad" : ""); }

$("#bGo").onclick = () => {
  const inc = num("#bIncome"), exp = num("#bExp");
  if (isNaN(inc) || isNaN(exp) || inc < 0 || exp < 0) return show("#bOut", "Enter both your income and your expenses.", true);
  const left = inc - exp, pct = inc > 0 ? Math.min(100, (exp / inc) * 100) : 100;
  show("#bOut", left >= 0
    ? "Money remaining: " + fmt(left) + "<small>You spend " + Math.round(pct) + "% of your income. Try to move part of what remains into savings.</small>"
    : "You are over budget by " + fmt(-left) + "<small>Your expenses are higher than your income. Look for one expense to cut or one way to earn more.</small>", left < 0);
  $("#bBarWrap").style.display = "block";
  $("#bBar").style.width = pct + "%"; $("#bBar").className = left < 0 ? "warn" : "";
  save("budget", { left });
};

$("#sGo").onclick = () => {
  const start = num("#sStart") || 0, month = num("#sMonth"), n = parseInt($("#sPeriod").value, 10), goal = num("#sGoal");
  if (isNaN(month) || month < 0) return show("#sOut", "Enter how much you will save each month.", true);
  const total = start + month * n;
  let html = "Estimated total: " + fmt(total) + "<small>After " + n + " months, without interest or fees.</small>";
  if (!isNaN(goal) && goal > 0) {
    const need = Math.max(0, goal - start);
    html += month > 0
      ? "<small>To reach " + fmt(goal) + " you need about " + Math.ceil(need / month) + " months at " + fmt(month) + " a month.</small>"
      : "<small>Add a monthly amount to see how long your goal takes.</small>";
    $("#sBarWrap").style.display = "block"; $("#sBar").style.width = Math.min(100, (total / goal) * 100) + "%";
  } else $("#sBarWrap").style.display = "none";
  show("#sOut", html);
  save("savings", { total });
};

$("#xGo").onclick = () => {
  const s = num("#xSales"), c = num("#xCost"), o = num("#xOther") || 0;
  if (isNaN(s) || isNaN(c)) return show("#xOut", "Enter your total sales and cost of goods.", true);
  const profit = s - c - o, margin = s > 0 ? (profit / s) * 100 : 0;
  show("#xOut", (profit >= 0 ? "Profit: " : "Loss: ") + fmt(Math.abs(profit)) +
    "<small>Profit margin: " + margin.toFixed(1) + "% of sales.</small>", profit < 0);
  save("business", { profit });
};

/* ============ 6. TIP ============ */
const tips = [
  "Pay yourself first: move savings out the day your income arrives.",
  "Write down what you spend for one week. Small purchases add up fast.",
  "Keep business money and personal money in separate accounts or wallets.",
  "Before you borrow, check the total you will repay, not just the monthly amount.",
  "Build an emergency fund of 1 month of expenses first, then grow it to 3."
];
$("#tip").textContent = tips[new Date().getDate() % tips.length];

/* ============ 7. FINANCE TUTOR ============ */
const lessons = {
  budgeting: "A budget is a plan for your money. List your income, then your needs (rent, food, transport), wants, and savings. Aim for savings first, not what is left over.",
  saving: "Saving is setting aside money now for later. Start small and be regular: KSh 50 a day is KSh 1,500 a month. Keep savings somewhere you do not touch daily.",
  interest: "Interest is the price of money. On savings you earn it; on loans you pay it. Always compare the yearly rate and any fees before you borrow.",
  business: "Profit is sales minus all costs. Track every sale and every cost, price above your total cost, and reinvest part of the profit to grow.",
  investing: "Investing means buying assets that may grow in value or give income, such as shares, bonds, or a SACCO. Returns are not guaranteed and you can lose money. Learn the risks and use regulated providers."
};
$$("#lessonChips .chip").forEach(c => c.onclick = () => {
  $$("#lessonChips .chip").forEach(x => x.setAttribute("aria-pressed", x === c));
  $("#lesson").textContent = lessons[c.dataset.l];
});

const topics = [
  [/\b(share|shares|stock|stocks|nse|dividend)\b/i, "A share is a small piece of ownership in a company. If the company grows or pays dividends you can gain, and if it does badly you can lose money. In Kenya, shares trade on the Nairobi Securities Exchange through a licensed broker. Only invest money you can afford to leave for years."],
  [/\b(sacco|saccos)\b/i, "A SACCO is a savings and credit cooperative. Members save regularly and can borrow, often at lower rates than banks. Check that the SACCO is registered and read its loan terms and fees first."],
  [/\b(m-?pesa|mpesa|mshwari|fuliza|airtime)\b/i, "M-Pesa tips: check the transaction fee before you send, keep your PIN private, and avoid using Fuliza or mobile loans for everyday spending. Review your M-Pesa statement monthly to see where money goes."],
  [/\b(budget|budgeting)\b/i, lessons.budgeting],
  [/\b(interest|loan|borrow|debt)\b/i, lessons.interest + " Avoid borrowing for things that do not earn money or meet a real need."],
  [/\b(invest|investing|investment|bond|treasury|money market)\b/i, lessons.investing],
  [/\b(emergency)\b/i, "An emergency fund covers surprises like medical bills or lost income. Aim for 1 month of expenses first, then 3 to 6 months. Keep it separate and easy to reach."],
  [/\b(business|idea|capital|startup|start a)\b/i, "With a small capital like KSh 10,000, pick something people buy every day and that you can start without big costs: selling vegetables or fruit, airtime and M-Pesa agency (needs registration), snacks, or a small mtumba stall. Test with a small stock, track profit weekly, then reinvest."],
  [/\b(save|saving|savings)\b/i, lessons.saving + " You can also use the Savings page to plan a goal."]
];

function answer(q) {
  const m = q.match(/save\s*(?:ksh|kes|sh)?\s*([\d,]+)[^\d]*?(\d+)\s*(month|week|day)/i);
  if (m) {
    const goal = parseInt(m[1].replace(/,/g, ""), 10), n = parseInt(m[2], 10), unit = m[3].toLowerCase();
    if (goal > 0 && n > 0) {
      const per = goal / n;
      return "To save " + fmt(goal) + " in " + n + " " + unit + (n > 1 ? "s" : "") + ", set aside about " + fmt(per) + " every " + unit + ". Tip: move it as soon as you are paid, before you spend.";
    }
  }
  for (const [re, a] of topics) if (re.test(q)) return a;
  return "I can help with saving, budgeting, interest, M-Pesa, SACCOs, shares and small business. Try: \"How do I save KSh 5000 in 3 months?\"";
}
function addBubble(t, who) {
  const d = document.createElement("div"); d.className = "b " + who; d.textContent = t;
  const box = $("#chatBox"); box.appendChild(d); box.scrollTop = box.scrollHeight;
}
function ask(q) { q = q.trim(); if (!q) return; addBubble(q, "me"); addBubble(answer(q), "bot"); }
$("#askBtn").onclick = () => { ask($("#tutorInput").value); $("#tutorInput").value = ""; };
$("#tutorInput").addEventListener("keydown", e => { if (e.key === "Enter") $("#askBtn").click(); });
$$("[data-q]").forEach(b => b.onclick = () => ask(b.dataset.q));

/* ============ 8. START (runs last, after everything above is defined) ============ */
if (demo) { const d = localStorage.getItem("ps:demoUser"); setUser(d ? { email: d } : null); }
else fb.onAuthStateChanged(fb.auth, u => setUser(u ? { email: u.email || u.displayName || "Signed in" } : null));
