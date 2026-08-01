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

function setMessage(text, isError = true) {
  const node = $("#loginMessage");
  node.textContent = text || "";
  node.style.color = isError ? "var(--danger)" : "var(--success)";
}

function setOtpMessage(text, isError = true) {
  const node = $("#otpMessage");
  node.textContent = text || "";
  node.style.color = isError ? "var(--danger)" : "var(--success)";
}

function resetOtpFlow() {
  state.challengeId = null;
  $("#otpChoiceForm").hidden = false;
  $("#otpForm").hidden = true;
  $("#smsOtpLabel").hidden = false;
  $("#otpCode").required = true;
  $("#otpCode").value = "";
  $("#otpHelp").textContent = "";
  $("#otpChoiceHelp").textContent = "";
  setOtpMessage("");
}

function applySchool(school) {
  $("#schoolName").textContent = school?.name || "RBPS School";
  $("#schoolTagline").textContent = school?.tagline || "";
  $("#noticeText").textContent = school?.notice || "";
}

async function loadDashboard() {
  state.dashboard = await api("/api/dashboard");
  state.user = state.dashboard.user;
  applySchool(state.dashboard.school);
  renderPortal();
}

function showPortal() {
  $("#publicWebsite").hidden = true;
  $(".portal-intro").hidden = true;
  $("#loginView").hidden = true;
  $("#otpView").hidden = true;
  $("#portalView").hidden = false;
  $("#logoutButton").hidden = false;
}

function showLogin() {
  $("#publicWebsite").hidden = false;
  $(".portal-intro").hidden = false;
  $("#loginView").hidden = false;
  $("#otpView").hidden = true;
  $("#portalView").hidden = true;
  $("#logoutButton").hidden = true;
  $("#loginForm").hidden = false;
  resetOtpFlow();
}

function metric(label, value) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderSummary(students, payments) {
  const totalFees = students.reduce(
    (sum, student) => sum + Number(student.totalFees),
    0,
  );
  const paid = students.reduce(
    (sum, student) => sum + Number(student.paidAmount),
    0,
  );
  const due = Math.max(totalFees - paid, 0);
  $("#summary").innerHTML = [
    metric("Students", students.length),
    metric("Paid fees", currency.format(paid)),
    metric("Due fees", currency.format(due)),
    metric("Payments", payments.length),
  ].join("");
}

function renderStudentsTable(students, showActions = false) {
  const rows = students
    .map(
      (student) => `
      <tr>
        <td>${student.studentId}</td>
        <td>${student.name}</td>
        <td>${student.className}</td>
        <td>${currency.format(student.totalFees)}</td>
        <td>${currency.format(student.paidAmount)}</td>
        <td>${currency.format(student.dueAmount)}</td>
        <td><span class="status-pill ${student.status}">${student.status}</span></td>
        ${showActions ? `<td><button class="small danger-action" data-delete-student="${student.studentId}">Delete</button></td>` : ""}
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
            <p>${payment.mode} payment for ${payment.studentId}</p>
            <p class="muted">Ref: ${payment.reference} | ${new Date(payment.paidAt).toLocaleString()}</p>
          </div>`,
        )
        .join("")}
    </div>`;
}

function renderNewsItems(news = []) {
  const grid = $("#newsGrid");
  if (!grid) return;
  grid.innerHTML =
    news
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

function renderPortal() {
  const { user, students = [], payments = [], school } = state.dashboard;
  showPortal();
  $("#roleLabel").textContent = `${user.role} portal`;
  $("#welcomeTitle").textContent = `Welcome, ${user.name}`;
  renderSummary(students, payments);

  if (user.role === "admin") return renderAdmin();
  if (user.role === "parent") return renderParent();
  if (user.role === "teacher") return renderTeacher();
  return renderStudent();
}

function renderAdmin() {
  const { students, payments, messages, school, news = [] } = state.dashboard;
  const classes = [
    ...new Set(students.map((student) => student.className)),
  ].sort();

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
            ${classes.map((className) => `<option value="${className}">${className}</option>`).join("")}
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
          <h3>Create Student and Parent Accounts</h3>
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
        <div class="admin-panel">
          <h3>Edit School Payment Details</h3>
          <form id="schoolForm" class="admin-form">
            <label class="wide">School Name<input name="name" value="${school.name}" /></label>
            <label class="wide">Notice<textarea name="notice" rows="3">${school.notice}</textarea></label>
            <label>UPI ID<input name="upiId" value="${school.upiId}" /></label>
            <label>Bank Name<input name="bankName" value="${school.bankName}" /></label>
            <label>Account Name<input name="accountName" value="${school.accountName}" /></label>
            <label>Account Number<input name="accountNumber" value="${school.accountNumber}" /></label>
            <label>IFSC<input name="ifsc" value="${school.ifsc}" /></label>
            <label>Support Phone<input name="supportPhone" value="${school.supportPhone}" /></label>
            <button class="wide" type="submit">Save School Details</button>
          </form>
        </div>
      </div>
      <div class="admin-panel">
        <h3>Publish Gallery & News Update</h3>
        <form id="newsForm" class="admin-form">
          <label>Title<input name="title" placeholder="Competition result or school activity" required /></label>
          <label>Category<input name="category" placeholder="Achievement, Sports, Campus" required /></label>
          <label>Date<input name="date" type="date" required /></label>
          <label>Image URL<input name="image" placeholder="Approved school photo URL" required /></label>
          <label class="wide">Summary<textarea name="summary" rows="3" required></textarea></label>
          <button class="wide" type="submit">Publish Update</button>
        </form>
        <div class="news-mini-list">
          ${news
            .slice(0, 4)
            .map(
              (item) =>
                `<div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.category)}</span></div>`,
            )
            .join("")}
        </div>
      </div>
      <div class="split">
        <div>
          <h3>Payment Records</h3>
          ${renderPayments(payments)}
        </div>
        <div>
          <h3>Verification Email Log</h3>
          ${
            messages
              .map(
                (message) =>
                  `<div class="receipt"><strong>${message.phone}</strong><p>${message.text}</p></div>`,
              )
              .join("") || `<p class="muted">No verification emails sent yet.</p>`
          }
        </div>
      </div>
    </div>`;

  $("#filterStatus").addEventListener("change", updateAdminTable);
  $("#filterClass").addEventListener("change", updateAdminTable);
  $("#searchStudent").addEventListener("input", updateAdminTable);
  $("#exportCsv").addEventListener("click", exportCsv);
  $("#createStudentForm").addEventListener("submit", createStudent);
  $("#schoolForm").addEventListener("submit", updateSchool);
  $("#newsForm").addEventListener("submit", createNews);
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
    const matchesSearch =
      !search ||
      `${student.name} ${student.studentId}`.toLowerCase().includes(search);
    return matchesStatus && matchesClass && matchesSearch;
  });
}

function updateAdminTable() {
  $("#adminTable").innerHTML = renderStudentsTable(filteredStudents(), true);
  bindStudentDeleteButtons();
}

function bindStudentDeleteButtons() {
  document.querySelectorAll("[data-delete-student]").forEach((button) => {
    button.addEventListener("click", async () => {
      const studentId = button.dataset.deleteStudent;
      const confirmed = window.confirm(
        `Delete student ID ${studentId}? This removes the linked student/parent login and payment records.`,
      );
      if (!confirmed) return;
      await api("/api/students", { method: "DELETE", body: { studentId } });
      await loadDashboard();
    });
  });
}

function exportCsv() {
  const headers = [
    "studentId",
    "name",
    "className",
    "totalFees",
    "paidAmount",
    "dueAmount",
    "status",
  ];
  const rows = filteredStudents().map((student) =>
    headers.map((key) => `"${student[key]}"`).join(","),
  );
  const blob = new Blob([[headers.join(","), ...rows].join("\n")], {
    type: "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "fee-records.csv";
  link.click();
  URL.revokeObjectURL(url);
}

async function createStudent(event) {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.currentTarget));
  const message = $("#adminCreateMessage");
  try {
    const result = await api("/api/students", {
      method: "POST",
      body: formData,
    });
    message.style.color = "var(--success)";
    message.textContent = `Created ${result.student.studentId}. Parent and student credentials are ready.`;
    await loadDashboard();
  } catch (error) {
    message.style.color = "var(--danger)";
    message.textContent = error.message;
  }
}

async function updateSchool(event) {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.currentTarget));
  await api("/api/school", { method: "PATCH", body: formData });
  await loadDashboard();
}

async function createNews(event) {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(event.currentTarget));
  await api("/api/news", { method: "POST", body: formData });
  event.currentTarget.reset();
  await loadDashboard();
}

function renderParent() {
  const { students, payments, school } = state.dashboard;
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
                ${students.map((item) => `<option value="${item.studentId}">${item.name} (${item.studentId})</option>`).join("")}
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

  $("#paymentForm").addEventListener("submit", payFees);
}

// --- FULLY SECURED RAZORPAY VERIFICATION ---
async function payFees(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget));
  const message = $("#paymentMessage");
  
  try {
    const order = await api("/api/razorpay-order", {
      method: "POST",
      body: payload,
    });

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
      method: {
        upi: true,
        card: false,
        netbanking: false,
        wallet: false,
        emi: false,
        paylater: false,
      },
      prefill: {
        name: order.parentName,
        email: order.parentEmail,
        contact: order.parentPhone,
      },
      theme: { color: "#0d7668" },
      
      // The Handler now strictly enforces Cryptographic Math
      handler: async (response) => {
        try {
          message.style.color = "var(--success)";
          message.textContent = "Verifying secure payment receipt...";
          
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
          
          message.textContent = "Payment successful and cryptographically verified!";
          setTimeout(() => loadDashboard(), 1500);
        } catch (err) {
          message.style.color = "var(--danger)";
          message.textContent = "Verification failed: " + err.message;
        }
      },
    });

    razorpay.on('payment.failed', function (response){
       message.style.color = "var(--danger)";
       message.textContent = "Payment Failed: " + response.error.description;
    });

    razorpay.open();
  } catch (error) {
    message.style.color = "var(--danger)";
    message.textContent = error.message;
  }
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

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");
  setOtpMessage("");
  const email = $("#email").value;
  const password = $("#password").value;

  try {
    const result = await api("/api/login", {
      method: "POST",
      body: { email, password },
    });
    if (result.requiresOtp) {
      state.challengeId = result.challengeId;
      $("#loginView").hidden = true;
      $("#otpView").hidden = false;
      // Note: Backend still sends phone, but we will wire up the email later
      $("#otpChoiceHelp").textContent = `Identity verification required for security.`;
      return;
    }
    await loadDashboard();
  } catch (error) {
    setMessage(error.message);
  }
});

$("#otpChoiceForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  setOtpMessage("");
  try {
    const result = await api("/api/request-otp", {
      method: "POST",
      body: { challengeId: state.challengeId },
    });
    $("#otpChoiceForm").hidden = true;
    $("#otpForm").hidden = false;
    $("#otpCode").value = "";
    $("#otpHelp").textContent = `${result.delivery}. Valid for 5 minutes.`;
  } catch (error) {
    setOtpMessage(error.message);
  }
});

$("#otpForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/verify-otp", {
      method: "POST",
      body: {
        challengeId: state.challengeId,
        smsOtp: $("#otpCode").value, // Backend still looks for the smsOtp key
      },
    });
    $("#otpForm").hidden = true;
    $("#otpView").hidden = true;
    await loadDashboard();
  } catch (error) {
    setOtpMessage(error.message);
  }
});

$("#backToLogin").addEventListener("click", () => {
  showLogin();
});

$("#logoutButton").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  state.user = null;
  state.dashboard = null;
  showLogin();
});

$("#roleHint").addEventListener("change", () => {
  // Optional Hint logic
});

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

api("/api/me")
  .then(async ({ user }) => {
    if (user) await loadDashboard();
  })
  .catch(() => showLogin());

api("/api/public")
  .then(({ news }) => renderNewsItems(news))
  .catch(() => renderNewsItems([]));