// Seed Database
const INITIAL_RECORDS = [
  { rollId: '101', pin: '1234', name: 'Alice Cooper', math: 94, science: 89, english: 92, total: 275, average: 91.7, grade: 'A' },
  { rollId: '102', pin: '1234', name: 'Bob Smith', math: 62, science: 55, english: 68, total: 185, average: 61.7, grade: 'C' },
  { rollId: '103', pin: '1234', name: 'Charlie Ray', math: 82, science: 78, english: 85, total: 245, average: 81.7, grade: 'B' }
];

// Persistent State
let studentDB = JSON.parse(localStorage.getItem('portalStudentDB')) || INITIAL_RECORDS;
let systemSettings = JSON.parse(localStorage.getItem('portalSystemSettings')) || {
  announcement: '📢 Welcome to the new academic term! Check your updated grades below.',
  maintenanceMode: false
};

const PASSCODES = {
  TEACHER: 'admin123',
  OWNER: 'owner123'
};

// Chart References
let adminSubjectChart = null;
let adminGradeChart = null;
let studentChart = null;

// DOM View Elements
const authView = document.getElementById('authView');
const adminView = document.getElementById('adminView');
const studentView = document.getElementById('studentView');
const ownerView = document.getElementById('ownerView');
const navAuthSection = document.getElementById('navAuthSection');
const globalBanner = document.getElementById('globalBanner');

// Grade Calculation
function calculateGrade(avg) {
  if (avg >= 85) return 'A';
  if (avg >= 70) return 'B';
  if (avg >= 50) return 'C';
  return 'F';
}

function saveDB() {
  localStorage.setItem('portalStudentDB', JSON.stringify(studentDB));
}

function saveSettings() {
  localStorage.setItem('portalSystemSettings', JSON.stringify(systemSettings));
  updateBanner();
}

function updateBanner() {
  if (systemSettings.maintenanceMode) {
    globalBanner.style.display = 'block';
    globalBanner.style.backgroundColor = '#fee2e2';
    globalBanner.style.color = '#991b1b';
    globalBanner.style.borderColor = '#fca5a5';
    globalBanner.textContent = '⚠️ System Maintenance Active: Teacher entry and editing is currently in read-only mode.';
  } else if (systemSettings.announcement && systemSettings.announcement.trim() !== '') {
    globalBanner.style.display = 'block';
    globalBanner.style.backgroundColor = '#fef3c7';
    globalBanner.style.color = '#92400e';
    globalBanner.style.borderColor = '#fcd34d';
    globalBanner.textContent = systemSettings.announcement;
  } else {
    globalBanner.style.display = 'none';
  }
}

// Navigation & Routing
function showView(viewName, userData = null) {
  authView.style.display = 'none';
  adminView.style.display = 'none';
  studentView.style.display = 'none';
  ownerView.style.display = 'none';

  if (viewName === 'AUTH') {
    authView.style.display = 'block';
    navAuthSection.innerHTML = `<span class="text-muted" style="font-size: 0.85rem;">Select portal to continue</span>`;
  } else if (viewName === 'ADMIN') {
    adminView.style.display = 'flex';
    navAuthSection.innerHTML = `
      <div class="user-badge">
        <span>👩‍🏫 <strong>Teacher Station</strong></span>
        <button class="btn-outline" onclick="logout()">Logout</button>
      </div>
    `;
    renderAdminDashboard();
  } else if (viewName === 'STUDENT') {
    studentView.style.display = 'flex';
    navAuthSection.innerHTML = `
      <div class="user-badge">
        <span>👨‍🎓 ${userData.name}</span>
        <button class="btn-outline" onclick="logout()">Logout</button>
      </div>
    `;
    renderStudentPortal(userData);
  } else if (viewName === 'OWNER') {
    ownerView.style.display = 'flex';
    navAuthSection.innerHTML = `
      <div class="user-badge">
        <span>⚙️ <strong>Principal Hub</strong></span>
        <button class="btn-outline" onclick="logout()">Logout</button>
      </div>
    `;
    renderOwnerHub();
  }
}

window.logout = function() {
  showView('AUTH');
};

// ================= AUTH HANDLERS =================
document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const pwd = document.getElementById('adminPassword').value;
  if (pwd === PASSCODES.TEACHER) {
    document.getElementById('adminPassword').value = '';
    showView('ADMIN');
  } else {
    alert('Incorrect Teacher Passcode. Default: admin123');
  }
});

document.getElementById('ownerLoginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const pwd = document.getElementById('ownerPassword').value;
  if (pwd === PASSCODES.OWNER) {
    document.getElementById('ownerPassword').value = '';
    showView('OWNER');
  } else {
    alert('Incorrect Master Passcode. Default: owner123');
  }
});

document.getElementById('studentLoginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const roll = document.getElementById('studentLoginId').value.trim();
  const pin = document.getElementById('studentLoginPin').value.trim();

  const student = studentDB.find(s => s.rollId === roll && s.pin === pin);
  if (student) {
    document.getElementById('studentLoginId').value = '';
    document.getElementById('studentLoginPin').value = '';
    showView('STUDENT', student);
  } else {
    alert('Invalid Roll ID or PIN.');
  }
});

// ================= TEACHER STATION =================
function renderAdminDashboard() {
  const total = studentDB.length;
  document.getElementById('adminTotalStudents').textContent = total;

  if (total === 0) {
    document.getElementById('adminClassAvg').textContent = '0.0%';
    document.getElementById('adminPassRate').textContent = '0%';
    document.getElementById('adminTopScorer').textContent = '-';
  } else {
    const avgSum = studentDB.reduce((sum, s) => sum + s.average, 0);
    document.getElementById('adminClassAvg').textContent = `${(avgSum / total).toFixed(1)}%`;

    const passes = studentDB.filter(s => s.average >= 50).length;
    document.getElementById('adminPassRate').textContent = `${((passes / total) * 100).toFixed(0)}%`;

    const top = studentDB.reduce((max, s) => (s.total > max.total ? s : max), studentDB[0]);
    document.getElementById('adminTopScorer').textContent = `${top.name} (${top.total}/300)`;
  }

  // Handle Maintenance Mode Lock
  const formInputs = document.querySelectorAll('#studentEntryForm input, #studentEntryForm button');
  formInputs.forEach(el => el.disabled = systemSettings.maintenanceMode);

  renderAdminCharts();
  renderAdminTable();
}

function renderAdminCharts() {
  const ctxSub = document.getElementById('adminSubjectChart').getContext('2d');
  const ctxGrd = document.getElementById('adminGradeChart').getContext('2d');
  const total = studentDB.length || 1;

  const mAvg = (studentDB.reduce((acc, s) => acc + s.math, 0) / total).toFixed(1);
  const sAvg = (studentDB.reduce((acc, s) => acc + s.science, 0) / total).toFixed(1);
  const eAvg = (studentDB.reduce((acc, s) => acc + s.english, 0) / total).toFixed(1);

  const gradeCount = { A: 0, B: 0, C: 0, F: 0 };
  studentDB.forEach(s => gradeCount[s.grade]++);

  if (adminSubjectChart) adminSubjectChart.destroy();
  if (adminGradeChart) adminGradeChart.destroy();

  adminSubjectChart = new Chart(ctxSub, {
    type: 'bar',
    data: {
      labels: ['Math', 'Science', 'English'],
      datasets: [{
        label: 'Average Score',
        data: [mAvg, sAvg, eAvg],
        backgroundColor: ['#6366f1', '#38bdf8', '#818cf8'],
        borderRadius: 6
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
  });

  adminGradeChart = new Chart(ctxGrd, {
    type: 'doughnut',
    data: {
      labels: ['A', 'B', 'C', 'F'],
      datasets: [{
        data: [gradeCount.A, gradeCount.B, gradeCount.C, gradeCount.F],
        backgroundColor: ['#22c55e', '#3b82f6', '#eab308', '#ef4444']
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function renderAdminTable() {
  const tbody = document.getElementById('adminTableBody');
  tbody.innerHTML = '';

  const q = document.getElementById('adminTableSearch').value.toLowerCase();
  const list = studentDB.filter(s => s.name.toLowerCase().includes(q) || s.rollId.includes(q));

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 2rem; color: #94a3b8;">No student records found.</td></tr>`;
    return;
  }

  list.forEach((s) => {
    const idx = studentDB.indexOf(s);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>#${s.rollId}</strong></td>
      <td>${s.name}</td>
      <td><code>${s.pin}</code></td>
      <td>${s.math}</td>
      <td>${s.science}</td>
      <td>${s.english}</td>
      <td><strong>${s.total}</strong></td>
      <td>${s.average.toFixed(1)}%</td>
      <td><span class="badge grade-${s.grade}">${s.grade}</span></td>
      <td>
        <button class="btn-sm-edit" onclick="startEdit(${idx})" ${systemSettings.maintenanceMode ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>Edit</button>
        <button class="btn-sm-del" onclick="deleteStudent(${idx})" ${systemSettings.maintenanceMode ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>Del</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('studentEntryForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (systemSettings.maintenanceMode) {
    alert('System is under maintenance. Edits are disabled.');
    return;
  }

  const rollId = document.getElementById('rollId').value.trim();
  const pin = document.getElementById('studentPin').value.trim();
  const name = document.getElementById('studentFullName').value.trim();
  const math = Number(document.getElementById('mathMarks').value);
  const science = Number(document.getElementById('scienceMarks').value);
  const english = Number(document.getElementById('englishMarks').value);
  const editIndex = Number(document.getElementById('editStudentKey').value);

  if (editIndex === -1 && studentDB.some(s => s.rollId === rollId)) {
    alert(`Roll ID #${rollId} already exists!`);
    return;
  }

  const total = math + science + english;
  const average = total / 3;
  const grade = calculateGrade(average);
  const record = { rollId, pin, name, math, science, english, total, average, grade };

  if (editIndex === -1) {
    studentDB.push(record);
  } else {
    studentDB[editIndex] = record;
    resetForm();
  }

  saveDB();
  document.getElementById('studentEntryForm').reset();
  renderAdminDashboard();
});

window.startEdit = function(index) {
  const s = studentDB[index];
  document.getElementById('rollId').value = s.rollId;
  document.getElementById('studentPin').value = s.pin;
  document.getElementById('studentFullName').value = s.name;
  document.getElementById('mathMarks').value = s.math;
  document.getElementById('scienceMarks').value = s.science;
  document.getElementById('englishMarks').value = s.english;

  document.getElementById('editStudentKey').value = index;
  document.getElementById('formModeTitle').textContent = `Editing: ${s.name} (#${s.rollId})`;
  document.getElementById('saveRecordBtn').textContent = 'Update Student';
  document.getElementById('cancelFormEditBtn').style.display = 'inline-block';
};

function resetForm() {
  document.getElementById('editStudentKey').value = '-1';
  document.getElementById('formModeTitle').textContent = 'Register / Edit Student Record';
  document.getElementById('saveRecordBtn').textContent = 'Save Student';
  document.getElementById('cancelFormEditBtn').style.display = 'none';
  document.getElementById('studentEntryForm').reset();
}

document.getElementById('cancelFormEditBtn').addEventListener('click', resetForm);

window.deleteStudent = function(index) {
  if (confirm(`Delete record for ${studentDB[index].name}?`)) {
    studentDB.splice(index, 1);
    saveDB();
    renderAdminDashboard();
  }
};

document.getElementById('adminTableSearch').addEventListener('input', renderAdminTable);

document.getElementById('exportCsvBtn').addEventListener('click', () => {
  if (studentDB.length === 0) return alert('No records to export.');
  let csv = 'data:text/csv;charset=utf-8,Roll ID,Name,PIN,Math,Science,English,Total,Average,Grade\n';
  studentDB.forEach(s => {
    csv += `${s.rollId},"${s.name}",${s.pin},${s.math},${s.science},${s.english},${s.total},${s.average.toFixed(1)},${s.grade}\n`;
  });
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csv));
  link.setAttribute('download', 'class_records.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// ================= STUDENT PORTAL =================
function renderStudentPortal(student) {
  document.getElementById('portalStudentName').textContent = student.name;
  document.getElementById('portalRollId').textContent = student.rollId;
  document.getElementById('portalTotalMarks').textContent = `${student.total} / 300`;
  document.getElementById('portalAverage').textContent = `${student.average.toFixed(1)}%`;
  document.getElementById('portalGrade').textContent = student.grade;

  const isPass = student.average >= 50;
  const statusEl = document.getElementById('portalStatus');
  statusEl.textContent = isPass ? 'PASSED' : 'NEEDS IMPROVEMENT';
  statusEl.style.color = isPass ? '#16a34a' : '#dc2626';

  document.getElementById('cardMath').textContent = `${student.math} / 100`;
  document.getElementById('cardSci').textContent = `${student.science} / 100`;
  document.getElementById('cardEng').textContent = `${student.english} / 100`;

  let feedback = '';
  if (student.average >= 85) feedback = `🌟 Outstanding work! Maintaining Grade A performance across coursework.`;
  else if (student.average >= 70) feedback = `👍 Good performance with Grade B. Target your lowest scoring subject to climb into Grade A.`;
  else if (student.average >= 50) feedback = `⚠️ Fair standing. You passed with Grade C, but additional practice will boost scores.`;
  else feedback = `❗ Below the pass threshold. Please consult your instructor for remedial study support.`;
  document.getElementById('studentFeedbackText').textContent = feedback;

  const ctx = document.getElementById('studentSubjectChart').getContext('2d');
  if (studentChart) studentChart.destroy();

  studentChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Math', 'Science', 'English'],
      datasets: [{
        label: 'Your Score',
        data: [student.math, student.science, student.english],
        backgroundColor: ['#6366f1', '#38bdf8', '#818cf8'],
        borderRadius: 6
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
  });
}

// ================= PRINCIPAL / OWNER HUB =================
function renderOwnerHub() {
  document.getElementById('noticeMessage').value = systemSettings.announcement || '';
  const toggle = document.getElementById('maintenanceToggle');
  toggle.checked = systemSettings.maintenanceMode;
  updateToggleLabel();
}

function updateToggleLabel() {
  const lbl = document.getElementById('maintenanceStatusLabel');
  if (systemSettings.maintenanceMode) {
    lbl.textContent = 'Maintenance Mode: ACTIVE (Teacher edits locked)';
    lbl.style.color = '#dc2626';
  } else {
    lbl.textContent = 'Maintenance Mode: Disabled (Normal Operation)';
    lbl.style.color = '#0f172a';
  }
}

document.getElementById('announcementForm').addEventListener('submit', (e) => {
  e.preventDefault();
  systemSettings.announcement = document.getElementById('noticeMessage').value.trim();
  saveSettings();
  alert('Notice broadcasted successfully!');
});

document.getElementById('clearNoticeBtn').addEventListener('click', () => {
  systemSettings.announcement = '';
  document.getElementById('noticeMessage').value = '';
  saveSettings();
  alert('Broadcast notice cleared.');
});

document.getElementById('maintenanceToggle').addEventListener('change', (e) => {
  systemSettings.maintenanceMode = e.target.checked;
  saveSettings();
  updateToggleLabel();
});

document.getElementById('backupJsonBtn').addEventListener('click', () => {
  const dataBlob = new Blob([JSON.stringify(studentDB, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `edutrack_backup_${Date.now()}.json`;
  link.click();
});

document.getElementById('resetDemoBtn').addEventListener('click', () => {
  if (confirm('Reset all student data to the original default demo data?')) {
    studentDB = [...INITIAL_RECORDS];
    saveDB();
    alert('Database restored to default records.');
  }
});

// Boot Setup
updateBanner();
showView('AUTH');