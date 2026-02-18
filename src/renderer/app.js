let currentUser = null;
let roles = {};
let users = [];
let tasks = [];
let decisions = [];
let projects = [];
let clients = [];
let messages = [];
let announcements = [];
let meetings = [];
let approvals = [];
let expenses = [];
let income = [];
let files = [];
let auditLogs = [];

let socket = null;
let localStream = null;
let peers = new Map();
let currentMeetingId = null;
let isMicOn = true;
let isVideoOn = true;
let currentFinanceTab = 'expenses';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

async function init() {
  socket = io();
  
  const rolesRes = await fetch('/api/roles');
  roles = await rolesRes.json();
  
  socket.on('connect', () => {
    console.log('Connected to server');
  });

  socket.on('usersUpdated', (data) => {
    users = data;
    renderTeam();
    updateStats();
  });

  socket.on('tasksUpdated', (data) => {
    tasks = data;
    renderTasks();
    updateStats();
  });

  socket.on('decisionsUpdated', (data) => {
    decisions = data;
    renderDecisions();
  });

  socket.on('projectsUpdated', (data) => {
    projects = data;
    renderProjects();
    populateProjectSelect();
    updateStats();
  });

  socket.on('clientsUpdated', (data) => {
    clients = data;
    renderClients();
    populateClientSelect();
    updateStats();
  });

  socket.on('newMessage', (msg) => {
    messages.push(msg);
    renderMessages();
  });

  socket.on('announcementsUpdated', (data) => {
    announcements = data;
    renderAnnouncements();
  });

  socket.on('meetingsUpdated', (data) => {
    meetings = data;
    renderMeetings();
  });

  socket.on('approvalsUpdated', (data) => {
    approvals = data;
    renderApprovals();
    updateStats();
  });

  socket.on('expensesUpdated', (data) => {
    expenses = data;
    renderFinance();
    updateStats();
  });

  socket.on('incomeUpdated', (data) => {
    income = data;
    renderFinance();
    updateStats();
  });

  socket.on('filesUpdated', (data) => {
    files = data;
    renderFiles();
  });

  await loadData();
  showUserSelect();
}

async function loadData() {
  const [usersRes, tasksRes, decisionsRes, projectsRes, clientsRes, messagesRes, announcementsRes, meetingsRes, approvalsRes, expensesRes, incomeRes, filesRes, auditRes] = await Promise.all([
    fetch('/api/users'),
    fetch('/api/tasks'),
    fetch('/api/decisions'),
    fetch('/api/projects'),
    fetch('/api/clients'),
    fetch('/api/messages'),
    fetch('/api/announcements'),
    fetch('/api/meetings'),
    fetch('/api/approvals'),
    fetch('/api/expenses'),
    fetch('/api/income'),
    fetch('/api/files'),
    fetch('/api/reports/audit')
  ]);

  users = await usersRes.json();
  tasks = await tasksRes.json();
  decisions = await decisionsRes.json();
  projects = await projectsRes.json();
  clients = await clientsRes.json();
  messages = await messagesRes.json();
  announcements = await announcementsRes.json();
  meetings = await meetingsRes.json();
  approvals = await approvalsRes.json();
  expenses = await expensesRes.json();
  income = await incomeRes.json();
  files = await filesRes.json();
  auditLogs = await auditRes.json();

  populateUserSelects();
}

function showUserSelect() {
  const modal = document.getElementById('userSelectModal');
  const grid = document.getElementById('userSelectGrid');
  
  grid.innerHTML = users.map(user => `
    <div class="user-select-item" onclick="selectUser('${user.id}')">
      <div class="avatar">${user.avatar}</div>
      <div class="name">${user.name}</div>
      <div class="team-role">${roles[user.role]?.name || user.role}</div>
    </div>
  `).join('');

  modal.classList.add('active');
}

function selectUser(userId) {
  currentUser = users.find(u => u.id === userId);
  document.getElementById('userSelectModal').classList.remove('active');
  document.getElementById('currentUserAvatar').textContent = currentUser.avatar;
  document.getElementById('currentUserName').textContent = currentUser.name;
  document.getElementById('currentUserRole').textContent = roles[currentUser.role]?.name || currentUser.role;
  
  renderAll();
}

function renderAll() {
  updateStats();
  renderTeam();
  renderTasks();
  renderDecisions();
  renderProjects();
  renderClients();
  renderMessages();
  renderAnnouncements();
  renderMeetings();
  renderApprovals();
  renderFinance();
  renderFiles();
  renderAudit();
}

async function updateStats() {
  try {
    const res = await fetch('/api/reports/dashboard');
    const data = await res.json();
    
    document.getElementById('statTasks').textContent = data.tasks.pending;
    document.getElementById('statProjects').textContent = data.projects.active;
    document.getElementById('statClients').textContent = data.clients.total;
    document.getElementById('statTeam').textContent = data.team.total;
    document.getElementById('statApprovals').textContent = data.approvals.pending;
    document.getElementById('statBalance').textContent = '₹' + (data.finance.balance || 0).toLocaleString();
  } catch (e) {
    console.log('Stats error:', e);
  }
}

function showSection(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(section).classList.add('active');
  
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-section="${section}"]`).classList.add('active');
  
  const titles = {
    dashboard: 'Dashboard',
    team: 'Team Management',
    projects: 'Projects',
    tasks: 'Tasks',
    clients: 'Clients',
    approvals: 'Approvals',
    finance: 'Finance',
    decisions: 'Decisions',
    files: 'Files',
    chat: 'Team Chat',
    meetings: 'Meetings',
    announcements: 'Announcements',
    reports: 'Reports'
  };
  document.getElementById('pageTitle').textContent = titles[section] || section;
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    showSection(item.dataset.section);
  });
});

function populateUserSelects() {
  const selects = ['taskAssignee', 'projectClient'];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
      if (currentUser) el.value = currentUser.id;
    }
  });
}

function populateProjectSelect() {
  const el = document.getElementById('taskProject');
  if (el) {
    el.innerHTML = '<option value="">No Project</option>' + 
      projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  }
}

function populateClientSelect() {
  const el = document.getElementById('projectClient');
  if (el) {
    el.innerHTML = '<option value="">Internal</option>' + 
      clients.map(c => `<option value="${c.id}">${c.companyName}</option>`).join('');
  }
}

// Team
function renderTeam() {
  const container = document.getElementById('teamGrid');
  container.innerHTML = users.map(user => `
    <div class="team-card">
      <div class="team-header">
        <div class="team-avatar">${user.avatar}</div>
        <div>
          <div class="team-name">${user.name}</div>
          <div class="team-role">${roles[user.role]?.name || user.role}</div>
        </div>
      </div>
      <div class="team-details">
        <div>📧 ${user.email}</div>
        <div>📱 ${user.phone}</div>
        <div>💼 ${user.designation}</div>
        <div>🏢 ${user.department}</div>
      </div>
      <span class="team-status status-${user.status}">● ${user.status}</span>
    </div>
  `).join('');
}

function openUserModal() {
  document.getElementById('userModalTitle').textContent = 'Add Team Member';
  document.getElementById('userForm').reset();
  document.getElementById('userId').value = '';
  document.getElementById('userModal').classList.add('active');
}

document.getElementById('userForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const userData = {
    name: document.getElementById('userName').value,
    email: document.getElementById('userEmail').value,
    phone: document.getElementById('userPhone').value,
    role: document.getElementById('userRole').value,
    designation: document.getElementById('userDesignation').value,
    department: document.getElementById('userDepartment').value,
    createdBy: currentUser.id
  };

  await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });

  closeModal('userModal');
});

// Tasks
function renderTasks() {
  const columns = {
    todo: document.getElementById('todoTasks'),
    inprogress: document.getElementById('inprogressTasks'),
    review: document.getElementById('reviewTasks'),
    done: document.getElementById('doneTasks')
  };

  Object.keys(columns).forEach(status => {
    const columnTasks = tasks.filter(t => t.status === status);
    columns[status].innerHTML = columnTasks.map(task => `
      <div class="task-card" onclick="editTask('${task.id}')">
        <h4>${task.title}</h4>
        <div class="task-meta">
          <span>${getUserName(task.assignee)}</span>
          <span class="task-priority priority-${task.priority}">${task.priority}</span>
        </div>
      </div>
    `).join('');
  });

  document.getElementById('todoCount').textContent = tasks.filter(t => t.status === 'todo').length;
  document.getElementById('inprogressCount').textContent = tasks.filter(t => t.status === 'inprogress').length;
  document.getElementById('reviewCount').textContent = tasks.filter(t => t.status === 'review').length;
  document.getElementById('doneCount').textContent = tasks.filter(t => t.status === 'done').length;
}

function getUserName(userId) {
  const user = users.find(u => u.id === userId);
  return user ? user.name : 'Unassigned';
}

function openTaskModal(taskId = null) {
  const modal = document.getElementById('taskModal');
  const form = document.getElementById('taskForm');
  
  populateUserSelects();
  populateProjectSelect();
  
  if (taskId) {
    const task = tasks.find(t => t.id === taskId);
    document.getElementById('taskModalTitle').textContent = 'Edit Task';
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskAssignee').value = task.assignee;
    document.getElementById('taskProject').value = task.project || '';
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskDueDate').value = task.dueDate || '';
  } else {
    document.getElementById('taskModalTitle').textContent = 'New Task';
    form.reset();
    document.getElementById('taskId').value = '';
    if (currentUser) document.getElementById('taskAssignee').value = currentUser.id;
  }
  
  modal.classList.add('active');
}

function editTask(taskId) {
  openTaskModal(taskId);
}

document.getElementById('taskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const taskId = document.getElementById('taskId').value;
  const taskData = {
    title: document.getElementById('taskTitle').value,
    description: document.getElementById('taskDescription').value,
    assignee: document.getElementById('taskAssignee').value,
    project: document.getElementById('taskProject').value,
    priority: document.getElementById('taskPriority').value,
    dueDate: document.getElementById('taskDueDate').value,
    status: 'todo',
    createdBy: currentUser.id
  };

  if (taskId) {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...taskData, updatedBy: currentUser.id })
    });
  } else {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
  }

  closeModal('taskModal');
});

// Projects
function renderProjects() {
  const container = document.getElementById('projectsGrid');
  container.innerHTML = projects.map(project => {
    const client = clients.find(c => c.id === project.client);
    return `
      <div class="project-card">
        <div class="project-header">
          <h3 class="project-title">${project.name}</h3>
          <span class="decision-status status-${project.status}">${project.status}</span>
        </div>
        <p>${project.description || ''}</p>
        ${client ? `<p style="font-size:13px;color:var(--text-light)">Client: ${client.companyName}</p>` : ''}
        <div class="project-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${project.progress}%"></div>
          </div>
          <div class="progress-text">${project.progress}% complete</div>
        </div>
        <div class="project-meta">
          <span>📅 Due: ${project.dueDate || 'Not set'}</span>
          <span>💰 Budget: ₹${project.budget || 0}</span>
        </div>
      </div>
    `;
  }).join('');
}

function openProjectModal() {
  populateClientSelect();
  document.getElementById('projectForm').reset();
  document.getElementById('projectModal').classList.add('active');
}

document.getElementById('projectForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: document.getElementById('projectName').value,
      client: document.getElementById('projectClient').value,
      description: document.getElementById('projectDescription').value,
      status: document.getElementById('projectStatus').value,
      dueDate: document.getElementById('projectDueDate').value,
      budget: document.getElementById('projectBudget').value,
      createdBy: currentUser.id
    })
  });

  closeModal('projectModal');
});

// Clients
function renderClients() {
  const container = document.getElementById('clientsGrid');
  container.innerHTML = clients.map(client => `
    <div class="client-card">
      <div class="client-header">
        <h3 class="client-name">${client.companyName}</h3>
        <span class="decision-status status-${client.status}">${client.status}</span>
      </div>
      <p class="client-contact">👤 ${client.contactPerson || 'No contact'}</p>
      <div class="client-details">
        <div>📧 ${client.email || 'No email'}</div>
        <div>📱 ${client.phone || 'No phone'}</div>
        <div>📍 ${client.address || 'No address'}</div>
      </div>
    </div>
  `).join('');
}

function openClientModal() {
  document.getElementById('clientForm').reset();
  document.getElementById('clientModal').classList.add('active');
}

document.getElementById('clientForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  await fetch('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: document.getElementById('clientCompany').value,
      contactPerson: document.getElementById('clientContact').value,
      email: document.getElementById('clientEmail').value,
      phone: document.getElementById('clientPhone').value,
      address: document.getElementById('clientAddress').value,
      createdBy: currentUser.id
    })
  });

  closeModal('clientModal');
});

// Approvals
function renderApprovals() {
  const container = document.getElementById('approvalsList');
  container.innerHTML = approvals.map(approval => `
    <div class="approval-card">
      <div class="approval-header">
        <div>
          <h3 class="approval-title">${approval.title}</h3>
          <span class="approval-type">${approval.type}</span>
        </div>
        <span class="decision-status status-${approval.status}">${approval.status}</span>
      </div>
      <p>${approval.description || ''}</p>
      ${approval.amount ? `<div class="approval-amount">₹${parseFloat(approval.amount).toLocaleString()}</div>` : ''}
      ${approval.status === 'pending' && currentUser.role === 'chairman' ? `
        <div class="approval-actions">
          <button class="btn-approve" onclick="respondApproval('${approval.id}', 'approved')">✓ Approve</button>
          <button class="btn-reject" onclick="respondApproval('${approval.id}', 'rejected')">✗ Reject</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function openApprovalModal() {
  document.getElementById('approvalForm').reset();
  document.getElementById('approvalModal').classList.add('active');
}

document.getElementById('approvalForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  await fetch('/api/approvals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: document.getElementById('approvalType').value,
      title: document.getElementById('approvalTitle').value,
      description: document.getElementById('approvalDescription').value,
      amount: document.getElementById('approvalAmount').value,
      requestedBy: currentUser.id,
      requestedByName: currentUser.name
    })
  });

  closeModal('approvalModal');
});

async function respondApproval(approvalId, status) {
  await fetch(`/api/approvals/${approvalId}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status,
      comments: '',
      respondedBy: currentUser.id
    })
  });
}

// Finance
function renderFinance() {
  const totalExp = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const totalInc = income.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  const balance = totalInc - totalExp;
  
  document.getElementById('totalIncome').textContent = '₹' + totalInc.toLocaleString();
  document.getElementById('totalExpenses').textContent = '₹' + totalExp.toLocaleString();
  document.getElementById('netBalance').textContent = '₹' + balance.toLocaleString();
  
  const container = document.getElementById('financeList');
  const items = currentFinanceTab === 'expenses' ? expenses : income;
  
  container.innerHTML = items.map(item => `
    <div class="finance-item">
      <div class="finance-item-info">
        <h4>${item.description}</h4>
        <span>${item.category || item.source} • ${new Date(item.date || item.createdAt).toLocaleDateString()}</span>
      </div>
      <span class="finance-item-amount ${currentFinanceTab}-amount">${currentFinanceTab === 'expenses' ? '-' : '+'}₹${parseFloat(item.amount).toLocaleString()}</span>
    </div>
  `).join('');
}

function switchFinanceTab(tab) {
  currentFinanceTab = tab;
  document.querySelectorAll('.finance-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  renderFinance();
}

function openExpenseModal() {
  document.getElementById('expenseForm').reset();
  document.getElementById('expenseModal').classList.add('active');
}

document.getElementById('expenseForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  await fetch('/api/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: document.getElementById('expenseDescription').value,
      category: document.getElementById('expenseCategory').value,
      amount: document.getElementById('expenseAmount').value,
      date: document.getElementById('expenseDate').value,
      createdBy: currentUser.id
    })
  });

  closeModal('expenseModal');
});

function openIncomeModal() {
  document.getElementById('incomeForm').reset();
  document.getElementById('incomeModal').classList.add('active');
}

document.getElementById('incomeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  await fetch('/api/income', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: document.getElementById('incomeDescription').value,
      source: document.getElementById('incomeSource').value,
      amount: document.getElementById('incomeAmount').value,
      date: document.getElementById('incomeDate').value,
      createdBy: currentUser.id
    })
  });

  closeModal('incomeModal');
});

// Decisions
function renderDecisions() {
  const container = document.getElementById('decisionsList');
  container.innerHTML = decisions.map(decision => {
    const userVote = currentUser ? decision.votes.find(v => v.userId === currentUser.id) : null;
    return `
      <div class="decision-card">
        <div class="decision-header">
          <h3 class="decision-title">${decision.title}</h3>
          <span class="decision-status status-${decision.status}">${decision.status}</span>
        </div>
        <p class="decision-description">${decision.description || ''}</p>
        <div class="decision-votes">
          <button class="vote-btn approve ${userVote?.vote === 'approve' ? 'active' : ''}" 
            onclick="vote('${decision.id}', 'approve')">✓ Approve</button>
          <button class="vote-btn reject ${userVote?.vote === 'reject' ? 'active' : ''}" 
            onclick="vote('${decision.id}', 'reject')">✗ Reject</button>
        </div>
        <div class="decision-comments">
          ${decision.comments.map(c => `
            <div class="comment">
              <div class="comment-avatar">${c.userName[0]}</div>
              <div class="comment-text">
                <span class="comment-author">${c.userName}</span>
                ${c.text}
              </div>
            </div>
          `).join('')}
          <div class="comment-input">
            <input type="text" id="comment-${decision.id}" placeholder="Add a comment...">
            <button class="btn btn-primary" onclick="addComment('${decision.id}')">Post</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function vote(decisionId, vote) {
  await fetch(`/api/decisions/${decisionId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUser.id, vote })
  });
}

async function addComment(decisionId) {
  const input = document.getElementById(`comment-${decisionId}`);
  const text = input.value.trim();
  if (!text) return;

  await fetch(`/api/decisions/${decisionId}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUser.id, userName: currentUser.name, text })
  });

  input.value = '';
}

function openDecisionModal() {
  document.getElementById('decisionModal').classList.add('active');
}

document.getElementById('decisionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  await fetch('/api/decisions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: document.getElementById('decisionTitle').value,
      description: document.getElementById('decisionDescription').value,
      createdBy: currentUser.id
    })
  });

  closeModal('decisionModal');
  document.getElementById('decisionForm').reset();
});

// Files
function renderFiles() {
  const container = document.getElementById('filesGrid');
  const icons = { document: '📄', design: '🎨', code: '💻', other: '📁' };
  
  container.innerHTML = files.map(file => `
    <div class="file-card">
      <div class="file-icon">${icons[file.category] || '📁'}</div>
      <div class="file-name">${file.name}</div>
      <div class="file-meta">${file.category} • ${new Date(file.uploadedAt).toLocaleDateString()}</div>
    </div>
  `).join('');
}

function openFileModal() {
  document.getElementById('fileForm').reset();
  document.getElementById('fileModal').classList.add('active');
}

document.getElementById('fileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  await fetch('/api/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: document.getElementById('fileName').value,
      description: document.getElementById('fileDescription').value,
      category: document.getElementById('fileCategory').value,
      uploadedBy: currentUser.id,
      uploadedByName: currentUser.name
    })
  });

  closeModal('fileModal');
});

// Chat
function renderMessages() {
  const container = document.getElementById('chatMessages');
  container.innerHTML = messages.map(msg => `
    <div class="chat-message ${msg.userId === currentUser?.id ? 'own' : ''}">
      <div class="message-avatar">${msg.userName[0]}</div>
      <div class="message-bubble">
        <div class="message-text">${msg.text}</div>
        <div class="message-time">${new Date(msg.createdAt).toLocaleTimeString()}</div>
      </div>
    </div>
  `).join('');
  
  container.scrollTop = container.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  if (!text || !currentUser) return;

  fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: currentUser.id,
      userName: currentUser.name,
      text
    })
  });

  input.value = '';
}

document.getElementById('messageInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Meetings
function renderMeetings() {
  const container = document.getElementById('meetingsGrid');
  const upcomingMeetings = meetings.filter(m => new Date(m.dateTime) > new Date());
  
  container.innerHTML = upcomingMeetings.map(meeting => `
    <div class="meeting-card">
      <h3 class="meeting-title">${meeting.title}</h3>
      <p class="meeting-time">📅 ${new Date(meeting.dateTime).toLocaleString()}</p>
      <p style="font-size:13px;color:var(--text-light);margin-bottom:12px;">${meeting.agenda || ''}</p>
      <button class="join-meeting-btn" onclick="joinMeeting('${meeting.id}')">Join Meeting</button>
    </div>
  `).join('');

  if (upcomingMeetings.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#666;grid-column:1/-1;">No upcoming meetings. Schedule one!</p>';
  }
}

function openMeetingModal() {
  document.getElementById('meetingForm').reset();
  document.getElementById('meetingModal').classList.add('active');
}

document.getElementById('meetingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  await fetch('/api/meetings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: document.getElementById('meetingTitle').value,
      dateTime: document.getElementById('meetingDateTime').value,
      agenda: document.getElementById('meetingAgenda').value,
      createdBy: currentUser.id
    })
  });

  closeModal('meetingModal');
  document.getElementById('meetingForm').reset();
});

async function joinMeeting(meetingId) {
  currentMeetingId = meetingId;
  
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    
    document.getElementById('videoCallContainer').style.display = 'flex';
    const videoGrid = document.getElementById('videoGrid');
    videoGrid.innerHTML = `
      <div class="video-participant" id="localVideo">
        <video autoplay muted playsinline></video>
        <span class="name">${currentUser.name} (You)</span>
      </div>
    `;
    
    document.getElementById('localVideo').querySelector('video').srcObject = localStream;
    
    socket.emit('joinRoom', meetingId);
    
    socket.on('roomUsers', (userIds) => {
      userIds.forEach(userId => {
        if (userId !== socket.id && !peers.has(userId)) {
          createPeerConnection(userId, true);
        }
      });
    });
    
    socket.on('signal', async ({ from, signal }) => {
      if (!peers.has(from)) {
        await createPeerConnection(from, false);
      }
      const peer = peers.get(from);
      await peer.signal(signal);
    });

  } catch (err) {
    console.error('Error accessing media devices:', err);
    alert('Could not access camera/microphone. Please check permissions.');
  }
}

async function createPeerConnection(peerId, initiator) {
  const peer = new RTCPeerConnection(ICE_SERVERS);
  peers.set(peerId, peer);

  localStream.getTracks().forEach(track => {
    peer.addTrack(track, localStream);
  });

  peer.ontrack = (event) => {
    const videoGrid = document.getElementById('videoGrid');
    const existingVideo = document.getElementById(`remote-${peerId}`);
    
    if (!existingVideo) {
      const div = document.createElement('div');
      div.className = 'video-participant';
      div.id = `remote-${peerId}`;
      div.innerHTML = `<video autoplay playsinline></video><span class="name">Participant</span>`;
      videoGrid.appendChild(div);
    }
    
    document.getElementById(`remote-${peerId}`).querySelector('video').srcObject = event.streams[0];
  };

  peer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('signal', { to: peerId, signal: event.candidate });
    }
  };

  if (initiator) {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit('signal', { to: peerId, signal: offer });
  }
}

function toggleMic() {
  isMicOn = !isMicOn;
  localStream.getAudioTracks().forEach(track => track.enabled = isMicOn);
  document.getElementById('toggleMicBtn').classList.toggle('active', !isMicOn);
  document.getElementById('toggleMicBtn').textContent = isMicOn ? '🎤' : '🔇';
}

function toggleVideo() {
  isVideoOn = !isVideoOn;
  localStream.getVideoTracks().forEach(track => track.enabled = isVideoOn);
  document.getElementById('toggleVideoBtn').classList.toggle('active', !isVideoOn);
  document.getElementById('toggleVideoBtn').textContent = isVideoOn ? '📹' : '📷';
}

async function shareScreen() {
  try {
    const sources = await window.electronAPI.getSources();
    const screenStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sources[0]?.id
        }
      }
    });
    
    const videoTrack = screenStream.getVideoTracks()[0];
    peers.forEach(peer => {
      const sender = peer.getSenders().find(s => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(videoTrack);
    });
    
  } catch (err) {
    console.error('Error sharing screen:', err);
  }
}

function leaveMeeting() {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  
  peers.forEach(peer => peer.close());
  peers.clear();
  
  if (currentMeetingId) {
    socket.emit('leaveRoom', currentMeetingId);
  }
  
  document.getElementById('videoCallContainer').style.display = 'none';
  currentMeetingId = null;
}

// Announcements
function renderAnnouncements() {
  const container = document.getElementById('announcementsList');
  container.innerHTML = announcements.map(announcement => `
    <div class="announcement-card">
      <div class="announcement-header">
        <h3 class="announcement-title">${announcement.title}</h3>
        <span class="announcement-date">${new Date(announcement.createdAt).toLocaleDateString()}</span>
      </div>
      <p class="announcement-content">${announcement.content}</p>
    </div>
  `).join('');
}

function openAnnouncementModal() {
  document.getElementById('announcementForm').reset();
  document.getElementById('announcementModal').classList.add('active');
}

document.getElementById('announcementForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  await fetch('/api/announcements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: document.getElementById('announcementTitle').value,
      content: document.getElementById('announcementContent').value,
      createdBy: currentUser.id,
      userName: currentUser.name
    })
  });

  closeModal('announcementModal');
  document.getElementById('announcementForm').reset();
});

// Audit Logs
function renderAudit() {
  const container = document.getElementById('auditList');
  container.innerHTML = auditLogs.map(log => `
    <div class="audit-item">
      <span class="audit-time">${new Date(log.timestamp).toLocaleString()}</span>
      <span class="audit-action">${log.action}</span>
      <span class="audit-details">${log.details}</span>
    </div>
  `).join('');
}

// Modal utilities
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
});

document.getElementById('quickActionBtn').addEventListener('click', () => {
  showSection('tasks');
  openTaskModal();
});

document.getElementById('userProfile').addEventListener('click', showUserSelect);

// Initialize
init();
