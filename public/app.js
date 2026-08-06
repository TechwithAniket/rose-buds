const state = {
  challengeId: null,
  dashboard: null,
  user: null,
};

document.documentElement.classList.add("js-ready");

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const $ = (selector) => document.querySelector(selector);

// ==========================================
// CORE HELPERS & SECURITY
// ==========================================

function toggleDisplay(selector, isHidden) {
  const el = $(selector);
  if (el) el.hidden = isHidden;
}

function showMessage(selector, text, type = "default") {
  const node = $(selector);
  if (node) {
    node.textContent = text || "";
    node.style.color = type === "error" ? "var(--danger)" : type === "success" ? "var(--success)" : "inherit";
  }
}

// CRITICAL SECURITY: Sanitizes all user data to prevent XSS attacks
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload;
}

// ==========================================
// SEAMLESS UX TRANSITIONS
// ==========================================

function showAuthCard(cardState) {
  // Hide all inner states inside the card
  toggleDisplay("#loginState", true);
  toggleDisplay("#otpState", true);
  toggleDisplay("#forgotState", true);
  toggleDisplay("#forgotRequestForm", true);
  toggleDisplay("#forgotResetForm", true);
  showMessage("#authMessage", "");

  // Show only the requested state inside the SAME white card
  if (cardState === "login") toggleDisplay("#loginState", false);
  if (cardState === "otp") toggleDisplay("#otpState", false);
  
  if (cardState === "forgot_req") {
    toggleDisplay("#forgotState", false);
    toggleDisplay("#forgotRequestForm", false);
    const emailInput = $("#email");
    const forgotEmailInput = $("#forgotEmail");
    if (emailInput && forgotEmailInput) {
      forgotEmailInput.value = emailInput.value;
    }
  }
  
  if (cardState === "forgot_reset") {
    toggleDisplay("#forgotState", false);
    toggleDisplay("#forgotResetForm", false);
  }
}

function showLogin() {
  // Show the public website and the Auth Card container
  toggleDisplay("#publicWebsite", false);
  toggleDisplay(".portal-intro", false);
  toggleDisplay("#authView", false); 
  
  // Hide the portal dashboards and logout button
  toggleDisplay("#portalView", true);
  toggleDisplay("#logoutButton", true);
  
  showAuthCard("login");
}

function showPortal() {
  // Completely HIDE the public website and Auth Card
  toggleDisplay("#publicWebsite", true);
  toggleDisplay(".portal-intro", true);
  toggleDisplay("#authView", true); 
  
  // Show only the Portal view and the Logout button
  toggleDisplay("#portalView", false);
  toggleDisplay("#logoutButton", false);
}

// ==========================================
// RENDER PORTAL COMPONENTS
// ==========================================

function applySchool(school) {
  const nameNode = $("#schoolName");
  const taglineNode = $("#schoolTagline");
  const noticeNode = $("#noticeText");
  
  if (nameNode) nameNode.textContent = school?.name || "RBPS School";
  if (taglineNode) taglineNode.textContent = school?.tagline || "";
  if (noticeNode) noticeNode.textContent = school?.notice || "";
}

async function loadDashboard() {
  state.dashboard = await api("/api/dashboard");
  state.user = state.dashboard.user;
  applySchool(state.dashboard.school);
  renderPortal();
}

function metric(label, value) {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderSummary(students, payments) {
  const totalFees = students.reduce((sum, student) => sum + Number(student.totalFees), 0);
  const paid = students.reduce((sum, student) => sum + Number(student.paidAmount), 0);
  const due = Math.max(totalFees - paid, 0);
  
  const summaryNode = $("#summary");
  if (summaryNode) {
    summaryNode.innerHTML = [
      metric("Students", students.length),
      metric("Paid fees", currency.format(paid)),
      metric("Due fees", currency.format(due)),
      metric("Payments", payments.length),
    ].join("");
  }
}

function renderStudentsTable(students, showActions = false) {
  const rows = students
    .map(
      (student) => `
      <tr>
        <td>${escapeHtml(student.studentId)}</td>
        <td>${escapeHtml(student.name)}</td>
        <td>${escapeHtml(student.className)}</td>
        <td>${currency.format(student.totalFees)}</td>
        <td>${currency.format(student.paidAmount)}</td>
        <td>${currency.format(student.dueAmount)}</td>
        <td><span class="status-pill ${escapeHtml(student.status)}">${escapeHtml(student.status)}</span></td>
        ${showActions ? `<td><button class="small danger-action" data-delete-student="${escapeHtml(student.studentId)}">Delete</button></td>` : ""}
      </tr>`,
    )
    .join("");

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Unique ID</th>
            <th>Student</th>
            <th>Class</th>
            <th>Total Fees</th>
            <th>Paid</th>
            <th>Due</th>
            <th>Status</th>
            ${showActions ? `<th>Action</th>` : ""}
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="${showActions ? 8 : 7}">No students found.</td></tr>`}</tbody>
      </table>
    </div>`;
}

function renderPayments(payments) {
  if (!payments.length) return `<p class="muted">No payment records yet.</p>`;
  return `
    <div class="receipt-list">
      ${payments
        .map(
          (payment) => `
          <div class="receipt">
            <strong>${currency.format(payment.amount)}</strong>
            <p>${escapeHtml(payment.mode)} payment for ${escapeHtml(payment.studentId)}</p>
            <p class="muted">Ref: ${escapeHtml(payment.reference)} | ${new Date(payment.paidAt).toLocaleString()}</p>
          </div>`,
        )
        .join("")}
    </div>`;
}

function renderNewsItems(news = []) {
  const grid = $("#newsGrid");
  if (!grid) return;
  grid.innerHTML = news
    .map(
      (item) => `
      <article class="news-card">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" />
        <div>
          <span>${escapeHtml(item.category)}</span>
          <time>${new Date(item.date).toLocaleDateString()}</time>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.summary)}</p>
        </div>
      </article>`,
    )
    .join("") || `<p class="muted">School news will appear here soon.</p>`;
}

// ==========================================
// ROLE-BASED DASHBOARDS
// ==========================================

function renderPortal() {
  const { user, students = [], payments = [] } = state.dashboard;
  
  // INSTANT UX: Hide public site, show portal
  showPortal();
  
  const roleNode = $("#roleLabel");
  const welcomeNode = $("#welcomeTitle");
  
  if (roleNode) roleNode.textContent = `${user.role} portal`;
  if (welcomeNode) welcomeNode.textContent = `Welcome, ${user.name}`;
  
  renderSummary(students, payments);

  if (user.role === "admin") return renderAdmin(); // Fallback if admin logs in here
  if (user.role === "parent") return renderParent();
  if (user.role === "teacher") return renderTeacher();
  return renderStudent();
}

function renderParent() {
  const { students, payments } = state.dashboard;
  const student = students[0];
  
  $("#mainContent").innerHTML = `
    <div class="workspace">
      ${renderStudentsTable(students)}
      <div class="split">
        <div class="pay-panel">
          <h3>Pay Online</h3>
          <div class="payment-box">
            <p><strong>Payment method:</strong> Razorpay Checkout</p>
            <p><strong>Supported apps:</strong> Google Pay, PhonePe, Paytm, BHIM, and bank UPI apps.</p>
          </div>
          <form id="paymentForm" class="payment-grid">
            <label>Child
              <select name="studentId">
                ${students.map((item) => `<option value="${escapeHtml(item.studentId)}">${escapeHtml(item.name)} (${escapeHtml(item.studentId)})</option>`).join("")}
              </select>
            </label>
            <label>Amount
              <input name="amount" type="number" min="1" max="${student?.dueAmount || 1}" value="${student?.dueAmount || 1}" required />
            </label>
            <button type="submit">Proceed to Payment</button>
          </form>
          <p id="paymentMessage" class="message"></p>
        </div>
        <div>
          <h3>Receipts</h3>
          ${renderPayments(payments)}
        </div>
      </div>
    </div>`;

  $("#paymentForm")?.addEventListener("submit", payFees);
}

function renderTeacher() {
  const { students, payments } = state.dashboard;
  $("#mainContent").innerHTML = `
    <div class="workspace">
      <h3>Class Fee Overview</h3>
      ${renderStudentsTable(students)}
      <h3>Recent Class Payments</h3>
      ${renderPayments(payments)}
    </div>`;
}

function renderStudent() {
  const { students, payments } = state.dashboard;
  $("#mainContent").innerHTML = `
    <div class="workspace">
      ${renderStudentsTable(students)}
      <h3>Fee Receipts</h3>
      ${renderPayments(payments)}
    </div>`;
}

// Fallback Admin Render (in case they use the root URL instead of /admin)
function renderAdmin() {
  const { students, payments, messages = [], school, news = [] } = state.dashboard;
  const classes = [...new Set(students.map((student) => student.className))].sort();

  $("#mainContent").innerHTML = `
    <div class="workspace">
      <div class="toolbar">
        <label>Status
          <select id="filterStatus">
            <option value="all">All</option>
            <option value="due">Due fees</option>
            <option value="paid">Paid fees</option>
          </select>
        </label>
        <label>Class
          <select id="filterClass">
            <option value="all">All classes</option>
            ${classes.map((className) => `<option value="${escapeHtml(className)}">${escapeHtml(className)}</option>`).join("")}
          </select>
        </label>
        <label>Search
          <input id="searchStudent" placeholder="Name or unique ID" />
        </label>
        <label>&nbsp;
          <button id="exportCsv">Export CSV</button>
        </label>
      </div>
      <div id="adminTable">${renderStudentsTable(students, true)}</div>
      
      <div class="split">
        <div class="admin-panel">
          <h3>Create Student Accounts</h3>
          <form id="createStudentForm" class="admin-form">
            <label>Student Name<input name="name" required /></label>
            <label>Class<input name="className" placeholder="8-A" required /></label>
            <label>Student Email<input name="studentEmail" type="email" required /></label>
            <label>Student Phone<input name="studentPhone" required /></label>
            <label>Parent Name<input name="parentName" required /></label>
            <label>Parent Email<input name="parentEmail" type="email" required /></label>
            <label>Parent Phone<input name="parentPhone" required /></label>
            <label>Total Fees<input name="totalFees" type="number" min="0" required /></label>
            <label>Paid Amount<input name="paidAmount" type="number" min="0" value="0" /></label>
            <label>Due Date<input name="dueDate" type="date" /></label>
            <button class="wide" type="submit">Create Accounts</button>
          </form>
          <p id="adminCreateMessage" class="message"></p>
        </div>
      </div>
    </div>`;

  $("#filterStatus")?.addEventListener("change", updateAdminTable);
  $("#filterClass")?.addEventListener("change", updateAdminTable);
  $("#searchStudent")?.addEventListener("input", updateAdminTable);
  $("#exportCsv")?.addEventListener("click", exportCsv);
  $("#createStudentForm")?.addEventListener("submit", createStudent);
  bindStudentDeleteButtons();
}

function filteredStudents() {
  const { students } = state.dashboard;
  const status = $("#filterStatus")?.value || "all";
  const className = $("#filterClass")?.value || "all";
  const search = ($("#searchStudent")?.value || "").toLowerCase();

  return students.filter((student) => {
    const matchesStatus = status === "all" || student.status === status;
    const matchesClass = className === "all" || student.className === className;
    const matchesSearch = !search || `${student.name} ${student.studentId}`.toLowerCase().includes(search);
    return matchesStatus && matchesClass && matchesSearch;
  });
}

function updateAdminTable() {
  const tableNode = $("#adminTable");
  if (tableNode) {
    tableNode.innerHTML = renderStudentsTable(filteredStudents(), true);
    bindStudentDeleteButtons();
  }
}

function bindStudentDeleteButtons() {
  document.querySelectorAll("[data-delete-student]").forEach((button) => {
    button.addEventListener("click", async () => {
      const studentId = button.dataset.deleteStudent;
      const confirmed = window.confirm(`Delete student ID ${studentId}? This removes the linked student/parent login and payment records.`);
      if (!confirmed) return;
      await api("/api/students", { method: "DELETE", body: { studentId } });
      await loadDashboard();
    });
  });
}

function exportCsv() {
  const headers = ["studentId", "name", "className", "totalFees", "paidAmount", "dueAmount", "status"];
  const escapeCsv = (val) => String(val ?? "").replace(/"/g, '""');
  const rows = filteredStudents().map((student) => 
    headers.map((key) => `"${escapeCsv(student[key])}"`).join(",")
  );
  
  const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  link.href = url;
  link.download = "fee-records.csv";
  link.click();
  
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

async function createStudent(event) {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const result = await api("/api/students", { method: "POST", body: formData });
    showMessage("#adminCreateMessage", `Created ${result.student.studentId}.`, "success");
    event.currentTarget.reset();
    await loadDashboard();
  } catch (error) {
    showMessage("#adminCreateMessage", error.message, "error");
  }
}

// ==========================================
// SECURE RAZORPAY VERIFICATION
// ==========================================

async function payFees(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget));
  showMessage("#paymentMessage", "Initializing secure gateway...", "default");
  
  try {
    const order = await api("/api/razorpay-order", { method: "POST", body: payload });

    if (!window.Razorpay) {
      throw new Error("Payment gateway is blocked or loading. Please refresh the page.");
    }

    const razorpay = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: order.schoolName,
      description: `Fees for ${order.studentName}`,
      order_id: order.orderId,
      method: { upi: true, card: false, netbanking: false, wallet: false, emi: false, paylater: false },
      prefill: { name: order.parentName, email: order.parentEmail, contact: order.parentPhone },
      theme: { color: "#0d7668" },
      handler: async (response) => {
        try {
          showMessage("#paymentMessage", "Verifying secure payment receipt...", "success");
          
          await api("/api/payments", {
            method: "POST",
            body: {
              studentId: payload.studentId,
              amount: payload.amount,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            },
          });
          
          showMessage("#paymentMessage", "Payment successful and cryptographically verified!", "success");
          setTimeout(() => loadDashboard(), 1500);
        } catch (err) {
          showMessage("#paymentMessage", "Verification failed: " + err.message, "error");
        }
      },
    });

    razorpay.on('payment.failed', function (response){
       showMessage("#paymentMessage", "Payment Failed: " + response.error.description, "error");
    });

    razorpay.open();
  } catch (error) {
    showMessage("#paymentMessage", error.message, "error");
  }
}

// ==========================================
// FLUID AUTHENTICATION LISTENERS
// ==========================================

$("#showForgotBtn")?.addEventListener("click", () => showAuthCard("forgot_req"));
$("#backToLoginFromOtp")?.addEventListener("click", () => showAuthCard("login"));
$("#backToLoginFromForgot")?.addEventListener("click", () => showAuthCard("login"));

$("#logoutButton")?.addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  state.user = null;
  state.dashboard = null;
  showLogin(); // Instantly clears dashboard and brings public site back
});

$("#loginForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("#authMessage", "Authenticating...", "default"); 
  
  const email = $("#email")?.value;
  const password = $("#password")?.value;

  try {
    const result = await api("/api/login", {
      method: "POST",
      body: { email, password },
    });
    
    if (result.requiresOtp) {
      state.challengeId = result.challengeId;
      showAuthCard("otp"); // Instantly flip card to OTP
      const helpNode = $("#otpHelp");
      if (helpNode) helpNode.textContent = `Code sent securely to ${result.email}. Valid for 5 mins.`;
      
      const otpCodeNode = $("#otpCode");
      if (otpCodeNode) otpCodeNode.value = "";
      
      showMessage("#authMessage", ""); 
      return;
    }
    
    // No OTP needed (legacy admin account, etc), go straight to portal
    await loadDashboard();
  } catch (error) {
    showMessage("#authMessage", error.message, "error");
  }
});

$("#otpForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("#authMessage", "Verifying...", "default");

  try {
    await api("/api/verify-otp", {
      method: "POST",
      body: { challengeId: state.challengeId, smsOtp: $("#otpCode")?.value },
    });
    
    // Success! Load data. `loadDashboard()` calls `showPortal()` which drops the card.
    await loadDashboard();
  } catch (error) {
    showMessage("#authMessage", error.message, "error");
  }
});

$("#forgotRequestForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = $("#forgotEmail")?.value;
  showMessage("#authMessage", "Sending secure reset code...", "default");
  
  try {
    const res = await api("/api/forgot-password", { method: "POST", body: { email } });
    state.challengeId = res.challengeId; 
    showAuthCard("forgot_reset");
    showMessage("#authMessage", "");
  } catch (err) {
    showMessage("#authMessage", err.message, "error");
  }
});

$("#forgotResetForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const otp = $("#forgotOtp")?.value;
  const newPassword = $("#forgotNewPassword")?.value;
  showMessage("#authMessage", "Updating password...", "default");
  
  try {
    await api("/api/reset-password", { 
      method: "POST", 
      body: { challengeId: state.challengeId, otp, newPassword } 
    });
    showMessage("#authMessage", "Password updated! Redirecting to login...", "success");
    setTimeout(() => {
      showAuthCard("login");
      showMessage("#authMessage", "");
    }, 2000); 
  } catch (err) {
    showMessage("#authMessage", err.message, "error");
  }
});

// ==========================================
// PUBLIC UI LISTENERS
// ==========================================

document.querySelectorAll(".gallery-filter").forEach((button) => {
  button.addEventListener("click", () => {
    const category = button.dataset.gallery;
    document
      .querySelectorAll(".gallery-filter")
      .forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    
    document.querySelectorAll(".photo-card").forEach((card) => {
      card.classList.toggle(
        "is-hidden",
        category !== "all" && card.dataset.category !== category,
      );
    });
  });
});

document.querySelectorAll(".faq-item").forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.toggle("open");
  });
});

document.querySelectorAll("[data-tilt]").forEach((card) => {
  card.addEventListener("mousemove", (event) => {
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty("--tilt-x", `${x * 5}deg`);
    card.style.setProperty("--tilt-y", `${y * -5}deg`);
  });

  card.addEventListener("mouseleave", () => {
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 },
);

document
  .querySelectorAll(
    ".quick-info, .operations-strip, .admission-board, .campus-showcase, .news-page, .content-band, .trust-section, .faq-band, .auth-grid, .site-footer",
  )
  .forEach((section) => {
    section.classList.add("reveal");
    revealObserver.observe(section);
  });

// Fixed: Smooth scrolling ID reference logic
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    const targetId = link.getAttribute("href");
    e.preventDefault();

    if (targetId === "#") return; 

    const publicWeb = $("#publicWebsite");
    if (publicWeb && publicWeb.hidden) {
      showLogin(); 
    }

    const elementId = targetId.substring(1);
    const targetElement = document.getElementById(elementId);
    
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      history.pushState(null, null, targetId);
    }
  });
});

// Auto-Login and Bootstrap
api("/api/me")
  .then(async ({ user }) => {
    if (user) await loadDashboard();
  })
  .catch(() => showLogin());

api("/api/public")
  .then(({ news }) => renderNewsItems(news))
  .catch(() => renderNewsItems([]));