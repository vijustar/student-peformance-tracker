const defaultStudents = [
  { roll: 101, pin: "1234", name: "Aman Sharma", english: 82, language: 78, math: 92, science: 88, social: 84 },
  { roll: 102, pin: "1234", name: "Pooja Verma", english: 68, language: 74, math: 60, science: 65, social: 70 },
  { roll: 103, pin: "1234", name: "Rohan Patel", english: 94, language: 91, math: 98, science: 96, social: 92 }
];

let students = JSON.parse(localStorage.getItem('academic_students')) || defaultStudents;

function saveStudentsToStorage() {
  localStorage.setItem('academic_students', JSON.stringify(students));
}

let studentChartInstance = null;
let radarChartInstance = null;
let currentActiveStudent = null;
let activeStatusFilter = 'all';
let editingRollNumber = null;

const subjectCatalog = [
  { code: "101", key: "english", name: "General English" },
  { code: "102", key: "language", name: "Language (Hindi / Punjabi)" },
  { code: "103", key: "math", name: "Mathematics" },
  { code: "104", key: "science", name: "Science & Technology" },
  { code: "105", key: "social", name: "Social Science / EVS" }
];

// Theme Switcher
const themeToggleBtn = document.getElementById('themeToggle');
themeToggleBtn.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  themeToggleBtn.innerHTML = newTheme === 'dark' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
  if (currentActiveStudent) renderCharts(currentActiveStudent);
});

// Hidden Faculty Controls
function openFacultyDesk() {
  document.getElementById('studentSection').style.display = 'none';
  document.getElementById('teacherSection').style.display = 'block';
  document.getElementById('teacherLoginCard').style.display = 'block';
  document.getElementById('teacherDashboard').style.display = 'none';
}

function closeFacultyDesk() {
  cancelEditMode();
  document.getElementById('teacherSection').style.display = 'none';
  document.getElementById('studentSection').style.display = 'block';
}

window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('admin') === 'true') {
    openFacultyDesk();
  }
});

// Student Login & Calculation
function loginStudent() {
  const roll = parseInt(document.getElementById('studentRollInput').value);
  const pin = document.getElementById('studentPinInput').value;

  const found = students.find(s => s.roll === roll && s.pin === pin);

  if (!found) {
    alert('Invalid Roll Number or Security PIN!');
    return;
  }

  currentActiveStudent = found;

  const total = found.english + found.language + found.math + found.science + found.social;
  const percentage = (total / 5).toFixed(1);

  let division = '';
  if (percentage >= 75) division = 'First Division with Distinction';
  else if (percentage >= 60) division = 'First Division';
  else if (percentage >= 50) division = 'Second Division';
  else if (percentage >= 33) division = 'Third Division (Pass)';
  else division = 'Essential Repeat / Compartment';

  if (percentage >= 75) {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
  }

  document.getElementById('dispStudentName').innerText = found.name;
  document.getElementById('dispStudentTotal').innerText = `${total} / 500 (${percentage}%)`;
  document.getElementById('dispStudentGrade').innerText = division;

  document.getElementById('pdfName').innerText = found.name;
  document.getElementById('pdfRoll').innerText = `#${found.roll}`;
  document.getElementById('pdfTotalScore').innerText = `${total}/500 (${percentage}%)`;
  document.getElementById('pdfFinalDivision').innerText = division;
  document.getElementById('pdfStatus').innerText = percentage >= 33 ? 'PASSED' : 'COMPARTMENT';

  const pdfTbody = document.getElementById('pdfTableBody');
  pdfTbody.innerHTML = '';

  subjectCatalog.forEach(sub => {
    const totalMarks = found[sub.key];
    const theory = Math.round(totalMarks * 0.8);
    const internal = totalMarks - theory;
    const grade = totalMarks >= 90 ? 'A+' : totalMarks >= 80 ? 'A' : totalMarks >= 70 ? 'B+' : totalMarks >= 60 ? 'B' : totalMarks >= 33 ? 'C' : 'D';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${sub.code}</td>
      <td><strong>${sub.name}</strong></td>
      <td>${theory}</td>
      <td>${internal}</td>
      <td>${totalMarks}</td>
      <td><strong>${grade}</strong></td>
    `;
    pdfTbody.appendChild(tr);
  });

  document.getElementById('studentLoginCard').style.display = 'none';
  document.getElementById('studentDashboard').style.display = 'block';

  renderCharts(found);
}

function logoutStudent() {
  currentActiveStudent = null;
  document.getElementById('studentLoginCard').style.display = 'block';
  document.getElementById('studentDashboard').style.display = 'none';
  document.getElementById('studentRollInput').value = '';
  document.getElementById('studentPinInput').value = '';
}

function downloadReportCardPDF() {
  const element = document.getElementById('reportCardTemplate');
  element.style.display = 'block';

  const opt = {
    margin: 0.4,
    filename: `${currentActiveStudent.name}_Official_Marksheet.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save().then(() => {
    element.style.display = 'none';
  });
}

function renderCharts(student) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#9ca3af' : '#4b5563';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const avgEnglish = students.reduce((acc, s) => acc + s.english, 0) / students.length;
  const avgLang = students.reduce((acc, s) => acc + s.language, 0) / students.length;
  const avgMath = students.reduce((acc, s) => acc + s.math, 0) / students.length;
  const avgScience = students.reduce((acc, s) => acc + s.science, 0) / students.length;
  const avgSocial = students.reduce((acc, s) => acc + s.social, 0) / students.length;

  if (studentChartInstance) studentChartInstance.destroy();
  const ctxBar = document.getElementById('studentChart').getContext('2d');
  studentChartInstance = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: ['English', 'Language', 'Maths', 'Science', 'Social/EVS'],
      datasets: [{
        label: 'Marks Scored',
        data: [student.english, student.language, student.math, student.science, student.social],
        backgroundColor: [
          'rgba(59, 130, 246, 0.85)',
          'rgba(139, 92, 246, 0.85)',
          'rgba(16, 185, 129, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(239, 68, 68, 0.85)'
        ],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 100, ticks: { color: textColor }, grid: { color: gridColor } },
        x: { ticks: { color: textColor }, grid: { display: false } }
      }
    }
  });

  if (radarChartInstance) radarChartInstance.destroy();
  const ctxRadar = document.getElementById('studentRadarChart').getContext('2d');
  radarChartInstance = new Chart(ctxRadar, {
    type: 'radar',
    data: {
      labels: ['English', 'Language', 'Maths', 'Science', 'Social/EVS'],
      datasets: [
        {
          label: student.name,
          data: [student.english, student.language, student.math, student.science, student.social],
          backgroundColor: 'rgba(59, 130, 246, 0.25)',
          borderColor: '#3b82f6',
          pointBackgroundColor: '#3b82f6'
        },
        {
          label: 'Class Average',
          data: [avgEnglish.toFixed(0), avgLang.toFixed(0), avgMath.toFixed(0), avgScience.toFixed(0), avgSocial.toFixed(0)],
          backgroundColor: 'rgba(156, 163, 175, 0.15)',
          borderColor: '#9ca3af',
          borderDash: [4, 4],
          pointBackgroundColor: '#9ca3af'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          suggestedMin: 0,
          suggestedMax: 100,
          ticks: { backdropColor: 'transparent', color: textColor },
          grid: { color: gridColor },
          pointLabels: { color: textColor, font: { size: 11 } }
        }
      },
      plugins: { legend: { labels: { color: textColor } } }
    }
  });
}

// Faculty Desk & Analytics
function loginTeacher() {
  const pass = document.getElementById('teacherPassInput').value;
  if (pass !== 'admin123') {
    alert('Invalid Administrative Passcode!');
    return;
  }
  document.getElementById('teacherLoginCard').style.display = 'none';
  document.getElementById('teacherDashboard').style.display = 'block';
  updateFacultyStatistics();
  renderTeacherTable();
}

function updateFacultyStatistics() {
  if (students.length === 0) {
    document.getElementById('facultyTotalCount').innerText = '0';
    document.getElementById('facultyClassAvg').innerText = '0%';
    document.getElementById('facultyTopScore').innerText = 'N/A';
    return;
  }

  document.getElementById('facultyTotalCount').innerText = students.length;

  const totalMarksEarned = students.reduce((acc, s) => acc + (s.english + s.language + s.math + s.science + s.social), 0);
  const classAvg = (totalMarksEarned / (students.length * 5)).toFixed(1);
  document.getElementById('facultyClassAvg').innerText = `${classAvg}%`;

  let topStudent = students[0];
  let maxScore = -1;
  students.forEach(s => {
    const total = s.english + s.language + s.math + s.science + s.social;
    if (total > maxScore) {
      maxScore = total;
      topStudent = s;
    }
  });
  const topPercentage = (maxScore / 5).toFixed(1);
  document.getElementById('facultyTopScore').innerText = `${topStudent.name} (${topPercentage}%)`;
}

function setStatusFilter(filterType, buttonEl) {
  activeStatusFilter = filterType;
  document.querySelectorAll('.filter-pills .pill').forEach(btn => btn.classList.remove('active'));
  buttonEl.classList.add('active');
  renderTeacherTable();
}

function filterTeacherTable() {
  renderTeacherTable();
}

function renderTeacherTable() {
  const tbody = document.getElementById('teacherTableBody');
  tbody.innerHTML = '';

  const searchQuery = document.getElementById('rosterSearchInput') ? document.getElementById('rosterSearchInput').value.toLowerCase().trim() : '';

  const filteredStudents = students.filter(s => {
    const total = s.english + s.language + s.math + s.science + s.social;
    const avg = total / 5;

    const matchesSearch = s.name.toLowerCase().includes(searchQuery) || s.roll.toString().includes(searchQuery);

    let matchesStatus = true;
    if (activeStatusFilter === 'distinction') {
      matchesStatus = avg >= 75;
    } else if (activeStatusFilter === 'first') {
      matchesStatus = avg >= 60 && avg < 75;
    } else if (activeStatusFilter === 'repeat') {
      matchesStatus = avg < 33;
    }

    return matchesSearch && matchesStatus;
  });

  if (filteredStudents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-secondary); padding: 1.5rem;">No matching candidate records found.</td></tr>`;
    return;
  }

  filteredStudents.forEach(s => {
    const total = s.english + s.language + s.math + s.science + s.social;
    const avg = (total / 5).toFixed(1);
    const div = avg >= 75 ? 'Distinction' : avg >= 60 ? '1st Div' : avg >= 50 ? '2nd Div' : avg >= 33 ? '3rd Div' : 'Compartment';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>#${s.roll}</strong></td>
      <td>${s.name}</td>
      <td>${s.english}</td>
      <td>${s.language}</td>
      <td>${s.math}</td>
      <td>${s.science}</td>
      <td>${s.social}</td>
      <td><strong>${total}/500</strong> (${avg}%)</td>
      <td><span style="color: ${avg >= 33 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}; font-weight: 600;">${div}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-icon edit" title="Edit Student Record" onclick="startEditStudent(${s.roll})">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn-icon delete" title="Delete Student Record" onclick="deleteStudentRecord(${s.roll})">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Edit & Delete Operations
function startEditStudent(roll) {
  const student = students.find(s => s.roll === roll);
  if (!student) return;

  editingRollNumber = roll;

  document.getElementById('newStudentName').value = student.name;
  document.getElementById('newStudentRoll').value = student.roll;
  document.getElementById('newStudentRoll').disabled = true;
  document.getElementById('newStudentPin').value = student.pin;
  document.getElementById('newEnglish').value = student.english;
  document.getElementById('newLanguage').value = student.language;
  document.getElementById('newMath').value = student.math;
  document.getElementById('newScience').value = student.science;
  document.getElementById('newSocial').value = student.social;

  document.getElementById('formTitle').innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Update Marksheet (#${roll})`;
  document.getElementById('formSub').innerText = `Modifying scores for ${student.name}`;
  document.getElementById('submitRecordBtn').innerHTML = `<i class="fa-solid fa-check"></i> Save Updated Marks`;
  document.getElementById('cancelEditBtn').style.display = 'inline-flex';

  document.getElementById('formCard').scrollIntoView({ behavior: 'smooth' });
}

function cancelEditMode() {
  editingRollNumber = null;

  document.getElementById('newStudentName').value = '';
  document.getElementById('newStudentRoll').value = '';
  document.getElementById('newStudentRoll').disabled = false;
  document.getElementById('newStudentPin').value = '';
  document.getElementById('newEnglish').value = '';
  document.getElementById('newLanguage').value = '';
  document.getElementById('newMath').value = '';
  document.getElementById('newScience').value = '';
  document.getElementById('newSocial').value = '';

  document.getElementById('formTitle').innerHTML = `<i class="fa-solid fa-user-plus"></i> Register Student Marks Entry`;
  document.getElementById('formSub').innerText = `Add a new student candidate record`;
  document.getElementById('submitRecordBtn').innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Upload Mark Record`;
  document.getElementById('cancelEditBtn').style.display = 'none';
}

function deleteStudentRecord(roll) {
  const student = students.find(s => s.roll === roll);
  if (!student) return;

  const confirmDelete = confirm(`Are you sure you want to delete candidate #${roll} (${student.name})? This action cannot be undone.`);
  if (!confirmDelete) return;

  students = students.filter(s => s.roll !== roll);
  saveStudentsToStorage();
  updateFacultyStatistics();
  renderTeacherTable();

  if (editingRollNumber === roll) {
    cancelEditMode();
  }

  alert(`Candidate #${roll} deleted successfully.`);
}

function saveStudentRecord() {
  const nameInput = document.getElementById('newStudentName');
  const rollInput = document.getElementById('newStudentRoll');
  const pinInput = document.getElementById('newStudentPin');
  const engInput = document.getElementById('newEnglish');
  const langInput = document.getElementById('newLanguage');
  const mathInput = document.getElementById('newMath');
  const sciInput = document.getElementById('newScience');
  const socInput = document.getElementById('newSocial');

  const name = nameInput.value.trim();
  const roll = parseInt(rollInput.value.trim());
  const pin = pinInput.value.trim();
  const english = parseInt(engInput.value.trim());
  const language = parseInt(langInput.value.trim());
  const math = parseInt(mathInput.value.trim());
  const science = parseInt(sciInput.value.trim());
  const social = parseInt(socInput.value.trim());

  if (!name || isNaN(roll) || !pin || isNaN(english) || isNaN(language) || isNaN(math) || isNaN(science) || isNaN(social)) {
    alert('Please fill out all fields before submitting!');
    return;
  }

  const marks = [english, language, math, science, social];
  if (marks.some(m => m < 0 || m > 100)) {
    alert('Subject marks must be between 0 and 100!');
    return;
  }

  if (editingRollNumber !== null) {
    const index = students.findIndex(s => s.roll === editingRollNumber);
    if (index !== -1) {
      students[index] = { roll, pin, name, english, language, math, science, social };
      saveStudentsToStorage();
      updateFacultyStatistics();
      renderTeacherTable();
      alert(`Record for ${name} (#${roll}) updated successfully!`);
      cancelEditMode();
    }
  } else {
    const duplicate = students.find(s => s.roll === roll);
    if (duplicate) {
      alert(`Roll number #${roll} is already registered under ${duplicate.name}! Use a different roll number.`);
      return;
    }

    students.push({ roll, pin, name, english, language, math, science, social });
    saveStudentsToStorage();
    updateFacultyStatistics();
    renderTeacherTable();
    alert(`Candidate ${name} (#${roll}) registered successfully!`);

    cancelEditMode();
  }
}

// Export Marks to CSV / Excel
function exportMarksToCSV() {
  if (students.length === 0) {
    alert('No records available to export!');
    return;
  }

  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += 'Roll Number,Candidate Name,General English,Language,Mathematics,Science,Social Studies,Total Marks,Max Marks,Percentage,Division\r\n';

  students.forEach(s => {
    const total = s.english + s.language + s.math + s.science + s.social;
    const percentage = (total / 5).toFixed(1);
    const division = percentage >= 75 ? 'Distinction' : percentage >= 60 ? '1st Division' : percentage >= 50 ? '2nd Division' : percentage >= 33 ? '3rd Division' : 'Compartment';

    // Wrap name in quotes to prevent CSV comma issues
    const safeName = `"${s.name}"`;
    const row = `${s.roll},${safeName},${s.english},${s.language},${s.math},${s.science},${s.social},${total},500,${percentage}%,${division}`;
    csvContent += row + '\r\n';
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Annual_Examination_Marks_Register_2026.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
