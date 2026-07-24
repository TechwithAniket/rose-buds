const state = {
  challengeId: null,
  dashboard: null,
  user: null,
};

const $ = (selector) => document.querySelector(selector);

function setAdminMessage(text, isError = true) {
  const node = $("#adminLoginMessage");
  node.textContent = text || "";
  node.style.color = isError ? "#dc2626" : "#10b981";
}

function setAdminOtpMessage(text, isError = true) {
  const node = $("#adminOtpMessage");
  node.textContent = text || "";
  node.style.color = isError ? "#dc2626" : "#10b981";
}

function resetAdminOtpFlow() {
  state.challengeId = null;
  $("#adminOtpChoiceForm").hidden = false;
  $("#adminOtpForm").hidden = true;
  $("#adminSmsOtpLabel").hidden = false;
  $("#adminSmsOtp").required = true;
  $("#adminSmsOtp").value = "";
  $("#adminOtpHelp").textContent = "";
  $("#adminOtpChoiceHelp").textContent = "";
  setAdminOtpMessage("");
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

function showAdminLogin() {
  $("#adminLoginView").style.display = "grid";
  $("#adminOtpView").style.display = "none";
  $("#adminPortalView").style.display = "none";
  resetAdminOtpFlow();
}

function showAdminOtp() {
  $("#adminLoginView").style.display = "none";
  $("#adminOtpView").style.display = "grid";
  $("#adminPortalView").style.display = "none";
}

function showAdminPortal() {
  $("#adminLoginView").style.display = "none";
  $("#adminOtpView").style.display = "none";
  $("#adminPortalView").style.display = "block";
}

async function handleAdminLogin(e) {
  e.preventDefault();
  setAdminMessage("");

  const email = $("#adminEmail").value.trim();
  const password = $("#adminPassword").value;

  if (!email || !password) {
    setAdminMessage("Email and password are required.", true);
    return;
  }

  try {
    const response = await api("/api/login", {
      method: "POST",
      body: { email, password },
    });

    if (response.requiresOtp) {
      state.challengeId = response.challengeId;
      $("#adminOtpChoiceHelp").textContent =
        `Registered mobile: ${response.phone}`;
      showAdminOtp();
    } else {

      state.user = response.user;
     
      await loadAdminDashboard();
      showAdminPortal();
    }
  } catch (error) {
   
    setAdminMessage(error.message, true);
  }
}

async function handleAdminOtpRequest(e) {
  e.preventDefault();
  setAdminOtpMessage("");

  try {
    const response = await api("/api/request-otp", {
      method: "POST",
      body: { challengeId: state.challengeId },
    });

    $("#adminOtpChoiceHelp").textContent = response.delivery;
    $("#adminOtpChoiceForm").hidden = true;
    $("#adminOtpForm").hidden = false;
    $("#adminOtpHelp").textContent =
      `OTP sent. Valid for ${response.expiresInMinutes} minutes. `;
  } catch (error) {
    setAdminOtpMessage(error.message, true);
  }
}

async function handleAdminOtpVerify(e) {
  e.preventDefault();
  setAdminOtpMessage("");

  const smsOtp = $("#adminSmsOtp").value;

  try {
    const response = await api("/api/verify-otp", {
      method: "POST",
      body: { challengeId: state.challengeId, smsOtp },
    });

    state.user = response.user;
    await loadAdminDashboard();
    showAdminPortal();
  } catch (error) {
    setAdminOtpMessage(error.message, true);
  }
}

async function loadAdminDashboard() {
  state.dashboard = await api("/api/dashboard");
  state.user = state.dashboard.user;
  renderAdminPortal();
}

function renderAdminPortal() {
  const { user, students = [], payments = [], school } = state.dashboard;

  $("#adminRoleLabel").textContent = `${user.role} portal`;
  $("#adminWelcomeTitle").textContent = `Welcome, ${user.name}`;


  const totalFees = students.reduce(
    (sum, student) => sum + Number(student.totalFees),
    0,
  );
  const paid = students.reduce(
    (sum, student) => sum + Number(student.paidAmount),
    0,
  );
  const due = Math.max(totalFees - paid, 0);

  const currency = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  const summaryHtml = `
    <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; margin: 24px 0;">
      <div style="padding: 28px 24px; background: white; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); text-align: center;">
        <span style="display: block; color: #6b7280; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Students</span>
        <strong style="display: block; margin-top: 12px; font-size: 1.8rem; background: linear-gradient(135deg, #059669, #3b82f6); -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: 900;">${students.length}</strong>
      </div>
      <div style="padding: 28px 24px; background: white; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); text-align: center;">
        <span style="display: block; color: #6b7280; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Paid Fees</span>
        <strong style="display: block; margin-top: 12px; font-size: 1.8rem; background: linear-gradient(135deg, #059669, #3b82f6); -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: 900;">${currency.format(paid)}</strong>
      </div>
      <div style="padding: 28px 24px; background: white; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); text-align: center;">
        <span style="display: block; color: #6b7280; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Due Fees</span>
        <strong style="display: block; margin-top: 12px; font-size: 1.8rem; background: linear-gradient(135deg, #dc2626, #f87171); -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: 900;">${currency.format(due)}</strong>
      </div>
      <div style="padding: 28px 24px; background: white; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); text-align: center;">
        <span style="display: block; color: #6b7280; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Payments</span>
        <strong style="display: block; margin-top: 12px; font-size: 1.8rem; background: linear-gradient(135deg, #059669, #3b82f6); -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: 900;">${payments.length}</strong>
      </div>
    </div>
  `;

  const tableHeaderHtml = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin: 32px 0 16px 0;">
      <h3 style="margin: 0; font-size: 1.3rem; color: #0f1419;">Student Directory</h3>
      <button onclick="document.getElementById('addStudentModal').style.display='grid'" style="background: #059669; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: 700;">+ Add Student</button>
    </div>
  `;

  const studentsTableHtml = `
    <div style="border: 1px solid #e5e7eb; border-radius: 12px; background: white; overflow-x: auto; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
      <table style="width: 100%; border-collapse: collapse;">
        <thead style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
          <tr>
            <th style="padding: 16px; text-align: left; font-weight: 700; color: #0f1419;">Unique ID</th>
            <th style="padding: 16px; text-align: left; font-weight: 700; color: #0f1419;">Student</th>
            <th style="padding: 16px; text-align: left; font-weight: 700; color: #0f1419;">Class</th>
            <th style="padding: 16px; text-align: left; font-weight: 700; color: #0f1419;">Total Fees</th>
            <th style="padding: 16px; text-align: left; font-weight: 700; color: #0f1419;">Paid</th>
            <th style="padding: 16px; text-align: left; font-weight: 700; color: #0f1419;">Due</th>
            <th style="padding: 16px; text-align: left; font-weight: 700; color: #0f1419;">Status</th>
          </tr>
        </thead>
        <tbody>

          ${students
            .map(
              (student) => `
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 14px 16px; color: #0f1419;">${student.studentId}</td>
              <td style="padding: 14px 16px; color: #0f1419;">${student.name}</td>
              <td style="padding: 14px 16px; color: #0f1419;">${student.className}</td>
              <td style="padding: 14px 16px; color: #0f1419;">${currency.format(student.totalFees)}</td>
              <td style="padding: 14px 16px; color: #10b981; font-weight: 700;">${currency.format(student.paidAmount)}</td>
              <td style="padding: 14px 16px; color: #dc2626; font-weight: 700;">${currency.format(student.dueAmount)}</td>
              <td style="padding: 14px 16px;">
                <span style="display: inline-block; padding: 0.4rem 0.8rem; border-radius: 999px; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; ${student.status === "paid" ? "background: #d1fae5; color: #047857;" : "background: #fee2e2; color: #991b1b;"}">${student.status}</span>
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

 
$("#adminMainContent").innerHTML = summaryHtml + tableHeaderHtml + studentsTableHtml;
}


async function handleAdminLogout() {
  try {
    await api("/api/logout", { method: "POST" });
    state.challengeId = null;
    state.dashboard = null;
    state.user = null;
    showAdminLogin();
    $("#adminEmail").value = "";
    $("#adminPassword").value = "";
  } catch (error) {
    alert(error.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("#adminLoginForm").addEventListener("submit", handleAdminLogin);
  $("#adminOtpChoiceForm").addEventListener("submit", handleAdminOtpRequest);
  $("#adminOtpForm").addEventListener("submit", handleAdminOtpVerify);
  $("#adminBackToLogin").addEventListener("click", () => showAdminLogin());
  $("#adminLogoutButton").addEventListener("click", handleAdminLogout);
// Handle closing modal
  $("#closeModalBtn").addEventListener("click", () => {
    $("#addStudentModal").style.display = "none";
  });

  // Handle form submission
  $("#addStudentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const body = {
      name: $("#newStdName").value.trim(),
      className: $("#newStdClass").value.trim(),
      studentEmail: $("#newStdEmail").value.trim(),
      studentPhone: $("#newStdPhone").value.trim(),
      studentPassword: $("#newStdPassword").value, // Captured!
      parentName: $("#newParentName").value.trim(),
      parentEmail: $("#newParentEmail").value.trim(),
      parentPhone: $("#newParentPhone").value.trim(),
      parentPassword: $("#newParentPassword").value, // Captured!
      totalFees: $("#newTotalFees").value,
      paidAmount: $("#newPaidAmount").value,
      dueDate: $("#newDueDate").value,
    };

    try {
      const res = await api("/api/students", { method: "POST", body });
      
      // Clear form and close modal
      e.target.reset();
      $("#addStudentModal").style.display = "none";
      
      // Reload dashboard data to show new student instantly
      await loadAdminDashboard();
      
      // Alert the credentials so you can copy them
      alert(`SUCCESS! Student Created.\n\nStudent ID: ${res.student.studentId}\n\nSTUDENT LOGIN:\nEmail: ${res.credentials.studentEmail}\nPassword: ${res.credentials.studentPassword}\n\nPARENT LOGIN:\nEmail: ${res.credentials.parentEmail}\nPassword: ${res.credentials.parentPassword}`);
      
    } catch (error) {
      alert("Failed to add student: " + error.message);
    }
  });
  showAdminLogin();
});
