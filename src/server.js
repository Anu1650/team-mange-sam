const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

const ROLES = {
  chairman: { level: 1, name: 'Chairman', permissions: ['all'] },
  ceo: { level: 2, name: 'CEO', permissions: ['projects', 'tasks', 'team', 'clients', 'finance', 'reports', 'approvals'] },
  cto: { level: 3, name: 'CTO', permissions: ['projects', 'tasks', 'team', 'clients', 'approvals'] },
  cfo: { level: 3, name: 'CFO', permissions: ['finance', 'reports', 'approvals'] },
  hr: { level: 4, name: 'HR', permissions: ['team', 'approvals'] },
  developer: { level: 5, name: 'Developer', permissions: ['tasks', 'projects'] },
  intern: { level: 6, name: 'Intern', permissions: ['tasks'] }
};

let data = {
  users: [
    { id: '1', name: 'Samarth Jadhav', role: 'chairman', email: 'samarth@zerobytes.com', phone: '9876543210', avatar: 'S', status: 'online', department: 'Management', designation: 'Chairman', joinedDate: '2024-01-01' },
    { id: '2', name: 'Shubham Bodake', role: 'ceo', email: 'shubham@zerobytes.com', phone: '9876543211', avatar: 'B', status: 'online', department: 'Management', designation: 'CEO', joinedDate: '2024-01-15' },
    { id: '3', name: 'Aniket', role: 'developer', email: 'aniket@zerobytes.com', phone: '9876543212', avatar: 'A', status: 'online', department: 'Technical', designation: 'Technical Lead', joinedDate: '2024-02-01' },
    { id: '4', name: 'Keshav', role: 'developer', email: 'keshav@zerobytes.com', phone: '9876543213', avatar: 'K', status: 'away', department: 'Operations', designation: 'Operations Manager', joinedDate: '2024-02-15' },
    { id: '5', name: 'Amar', role: 'cfo', email: 'amar@zerobytes.com', phone: '9876543214', avatar: 'A', status: 'online', department: 'Finance', designation: 'CFO', joinedDate: '2024-03-01' },
    { id: '6', name: 'Shreyash', role: 'cto', email: 'shreyash@zerobytes.com', phone: '9876543215', avatar: 'S', status: 'online', department: 'Technical', designation: 'CTO', joinedDate: '2024-03-15' }
  ],
  tasks: [],
  decisions: [],
  projects: [],
  clients: [],
  messages: [],
  announcements: [],
  meetings: [],
  approvals: [],
  expenses: [],
  income: [],
  files: [],
  auditLogs: []
};

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileData = fs.readFileSync(DATA_FILE, 'utf8');
      data = JSON.parse(fileData);
    }
  } catch (e) {
    console.log('Using default data');
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function logAudit(userId, action, details) {
  data.auditLogs.unshift({
    id: uuidv4(),
    userId,
    action,
    details,
    timestamp: new Date().toISOString()
  });
  saveData();
}

loadData();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'renderer')));

// Auth & Roles
app.get('/api/roles', (req, res) => res.json(ROLES));

app.get('/api/users', (req, res) => res.json(data.users));
app.post('/api/users', (req, res) => {
  const user = { id: uuidv4(), ...req.body, avatar: req.body.name[0].toUpperCase(), status: 'offline', createdAt: new Date().toISOString() };
  data.users.push(user);
  logAudit(req.body.createdBy || 'system', 'user_created', `Created user: ${user.name}`);
  saveData();
  io.emit('usersUpdated', data.users);
  res.json(user);
});
app.put('/api/users/:id', (req, res) => {
  const idx = data.users.findIndex(u => u.id === req.params.id);
  if (idx !== -1) {
    data.users[idx] = { ...data.users[idx], ...req.body };
    logAudit(req.body.updatedBy || 'system', 'user_updated', `Updated user: ${data.users[idx].name}`);
    saveData();
    io.emit('usersUpdated', data.users);
    res.json(data.users[idx]);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Tasks
app.get('/api/tasks', (req, res) => res.json(data.tasks));
app.post('/api/tasks', (req, res) => {
  const task = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  data.tasks.push(task);
  logAudit(req.body.createdBy, 'task_created', `Created task: ${task.title}`);
  saveData();
  io.emit('tasksUpdated', data.tasks);
  res.json(task);
});
app.put('/api/tasks/:id', (req, res) => {
  const idx = data.tasks.findIndex(t => t.id === req.params.id);
  if (idx !== -1) {
    data.tasks[idx] = { ...data.tasks[idx], ...req.body };
    logAudit(req.body.updatedBy, 'task_updated', `Updated task: ${data.tasks[idx].title}`);
    saveData();
    io.emit('tasksUpdated', data.tasks);
    res.json(data.tasks[idx]);
  } else {
    res.status(404).json({ error: 'Task not found' });
  }
});
app.delete('/api/tasks/:id', (req, res) => {
  const task = data.tasks.find(t => t.id === req.params.id);
  data.tasks = data.tasks.filter(t => t.id !== req.params.id);
  logAudit(req.query.userId || 'system', 'task_deleted', `Deleted task: ${task?.title}`);
  saveData();
  io.emit('tasksUpdated', data.tasks);
  res.json({ success: true });
});

// Projects
app.get('/api/projects', (req, res) => res.json(data.projects));
app.post('/api/projects', (req, res) => {
  const project = { 
    id: uuidv4(), 
    ...req.body, 
    milestones: [],
    progress: 0,
    status: 'planning',
    createdAt: new Date().toISOString() 
  };
  data.projects.push(project);
  logAudit(req.body.createdBy, 'project_created', `Created project: ${project.name}`);
  saveData();
  io.emit('projectsUpdated', data.projects);
  res.json(project);
});
app.put('/api/projects/:id', (req, res) => {
  const idx = data.projects.findIndex(p => p.id === req.params.id);
  if (idx !== -1) {
    data.projects[idx] = { ...data.projects[idx], ...req.body };
    logAudit(req.body.updatedBy, 'project_updated', `Updated project: ${data.projects[idx].name}`);
    saveData();
    io.emit('projectsUpdated', data.projects);
    res.json(data.projects[idx]);
  } else {
    res.status(404).json({ error: 'Project not found' });
  }
});
app.post('/api/projects/:id/milestones', (req, res) => {
  const project = data.projects.find(p => p.id === req.params.id);
  if (project) {
    const milestone = { id: uuidv4(), ...req.body, status: 'pending' };
    project.milestones.push(milestone);
    logAudit(req.body.createdBy, 'milestone_added', `Added milestone: ${milestone.title}`);
    saveData();
    io.emit('projectsUpdated', data.projects);
    res.json(milestone);
  } else {
    res.status(404).json({ error: 'Project not found' });
  }
});

// Clients (CRM)
app.get('/api/clients', (req, res) => res.json(data.clients));
app.post('/api/clients', (req, res) => {
  const client = { 
    id: uuidv4(), 
    ...req.body, 
    projects: [],
    contacts: [],
    status: 'active',
    createdAt: new Date().toISOString() 
  };
  data.clients.push(client);
  logAudit(req.body.createdBy, 'client_created', `Created client: ${client.companyName}`);
  saveData();
  io.emit('clientsUpdated', data.clients);
  res.json(client);
});
app.put('/api/clients/:id', (req, res) => {
  const idx = data.clients.findIndex(c => c.id === req.params.id);
  if (idx !== -1) {
    data.clients[idx] = { ...data.clients[idx], ...req.body };
    logAudit(req.body.updatedBy, 'client_updated', `Updated client: ${data.clients[idx].companyName}`);
    saveData();
    io.emit('clientsUpdated', data.clients);
    res.json(data.clients[idx]);
  } else {
    res.status(404).json({ error: 'Client not found' });
  }
});

// Approvals
app.get('/api/approvals', (req, res) => res.json(data.approvals));
app.post('/api/approvals', (req, res) => {
  const approval = { 
    id: uuidv4(), 
    ...req.body, 
    status: 'pending',
    approverComments: '',
    createdAt: new Date().toISOString() 
  };
  data.approvals.push(approval);
  logAudit(req.body.requestedBy, 'approval_requested', `Requested ${approval.type}: ${approval.title}`);
  saveData();
  io.emit('approvalsUpdated', data.approvals);
  res.json(approval);
});
app.post('/api/approvals/:id/respond', (req, res) => {
  const approval = data.approvals.find(a => a.id === req.params.id);
  if (approval) {
    approval.status = req.body.status;
    approval.approverComments = req.body.comments;
    approval.respondedBy = req.body.respondedBy;
    approval.respondedAt = new Date().toISOString();
    logAudit(req.body.respondedBy, `approval_${req.body.status}`, `Responded to ${approval.type}: ${approval.title}`);
    saveData();
    io.emit('approvalsUpdated', data.approvals);
    res.json(approval);
  } else {
    res.status(404).json({ error: 'Approval not found' });
  }
});

// Finance - Expenses
app.get('/api/expenses', (req, res) => res.json(data.expenses));
app.post('/api/expenses', (req, res) => {
  const expense = { 
    id: uuidv4(), 
    ...req.body, 
    status: 'pending',
    createdAt: new Date().toISOString() 
  };
  data.expenses.push(expense);
  logAudit(req.body.createdBy, 'expense_added', `Added expense: ${expense.description} - ₹${expense.amount}`);
  saveData();
  io.emit('expensesUpdated', data.expenses);
  res.json(expense);
});
app.put('/api/expenses/:id', (req, res) => {
  const idx = data.expenses.findIndex(e => e.id === req.params.id);
  if (idx !== -1) {
    data.expenses[idx] = { ...data.expenses[idx], ...req.body };
    logAudit(req.body.updatedBy, 'expense_updated', `Updated expense: ${data.expenses[idx].description}`);
    saveData();
    io.emit('expensesUpdated', data.expenses);
    res.json(data.expenses[idx]);
  } else {
    res.status(404).json({ error: 'Expense not found' });
  }
});

// Finance - Income
app.get('/api/income', (req, res) => res.json(data.income));
app.post('/api/income', (req, res) => {
  const income = { 
    id: uuidv4(), 
    ...req.body, 
    createdAt: new Date().toISOString() 
  };
  data.income.push(income);
  logAudit(req.body.createdBy, 'income_added', `Added income: ${income.description} - ₹${income.amount}`);
  saveData();
  io.emit('incomeUpdated', data.income);
  res.json(income);
});

// Reports
app.get('/api/reports/dashboard', (req, res) => {
  const totalTasks = data.tasks.length;
  const completedTasks = data.tasks.filter(t => t.status === 'done').length;
  const pendingTasks = data.tasks.filter(t => t.status !== 'done').length;
  const activeProjects = data.projects.filter(p => p.status === 'active').length;
  const totalClients = data.clients.length;
  const pendingApprovals = data.approvals.filter(a => a.status === 'pending').length;
  
  const totalExpenses = data.expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const approvedExpenses = data.expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const totalIncome = data.income.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  
  res.json({
    tasks: { total: totalTasks, completed: completedTasks, pending: pendingTasks },
    projects: { active: activeProjects, total: data.projects.length },
    clients: { total: totalClients },
    approvals: { pending: pendingApprovals },
    finance: { expenses: totalExpenses, approvedExpenses, income: totalIncome, balance: totalIncome - approvedExpenses },
    team: { total: data.users.length, online: data.users.filter(u => u.status === 'online').length }
  });
});

app.get('/api/reports/audit', (req, res) => res.json(data.auditLogs.slice(0, 100)));

// Decisions
app.get('/api/decisions', (req, res) => res.json(data.decisions));
app.post('/api/decisions', (req, res) => {
  const decision = { 
    id: uuidv4(), 
    ...req.body, 
    votes: [], 
    comments: [],
    status: 'pending',
    createdAt: new Date().toISOString() 
  };
  data.decisions.push(decision);
  saveData();
  io.emit('decisionsUpdated', data.decisions);
  res.json(decision);
});
app.post('/api/decisions/:id/vote', (req, res) => {
  const { userId, vote } = req.body;
  const decision = data.decisions.find(d => d.id === req.params.id);
  if (decision) {
    const existingVote = decision.votes.find(v => v.userId === userId);
    if (existingVote) {
      existingVote.vote = vote;
    } else {
      decision.votes.push({ userId, vote });
    }
    if (vote === 'reject') {
      decision.status = 'rejected';
    } else if (decision.votes.filter(v => v.vote === 'approve').length >= Math.ceil(data.users.length / 2)) {
      decision.status = 'approved';
    }
    saveData();
    io.emit('decisionsUpdated', data.decisions);
    res.json(decision);
  } else {
    res.status(404).json({ error: 'Decision not found' });
  }
});
app.post('/api/decisions/:id/comment', (req, res) => {
  const { userId, userName, text } = req.body;
  const decision = data.decisions.find(d => d.id === req.params.id);
  if (decision) {
    decision.comments.push({ id: uuidv4(), userId, userName, text, createdAt: new Date().toISOString() });
    saveData();
    io.emit('decisionsUpdated', data.decisions);
    res.json(decision);
  } else {
    res.status(404).json({ error: 'Decision not found' });
  }
});

// Messages
app.get('/api/messages', (req, res) => res.json(data.messages));
app.post('/api/messages', (req, res) => {
  const message = { 
    id: uuidv4(), 
    ...req.body, 
    createdAt: new Date().toISOString() 
  };
  data.messages.push(message);
  saveData();
  io.emit('newMessage', message);
  res.json(message);
});

// Announcements
app.get('/api/announcements', (req, res) => res.json(data.announcements));
app.post('/api/announcements', (req, res) => {
  const announcement = { 
    id: uuidv4(), 
    ...req.body, 
    pinned: false,
    createdAt: new Date().toISOString() 
  };
  data.announcements.unshift(announcement);
  logAudit(req.body.createdBy, 'announcement_posted', `Posted announcement: ${announcement.title}`);
  saveData();
  io.emit('announcementsUpdated', data.announcements);
  res.json(announcement);
});

// Meetings
app.get('/api/meetings', (req, res) => res.json(data.meetings));
app.post('/api/meetings', (req, res) => {
  const meeting = { 
    id: uuidv4(), 
    ...req.body, 
    participants: [],
    status: 'scheduled',
    agenda: '',
    notes: '',
    createdAt: new Date().toISOString() 
  };
  data.meetings.push(meeting);
  logAudit(req.body.createdBy, 'meeting_scheduled', `Scheduled meeting: ${meeting.title}`);
  saveData();
  io.emit('meetingsUpdated', data.meetings);
  res.json(meeting);
});
app.put('/api/meetings/:id', (req, res) => {
  const idx = data.meetings.findIndex(m => m.id === req.params.id);
  if (idx !== -1) {
    data.meetings[idx] = { ...data.meetings[idx], ...req.body };
    saveData();
    io.emit('meetingsUpdated', data.meetings);
    res.json(data.meetings[idx]);
  } else {
    res.status(404).json({ error: 'Meeting not found' });
  }
});

// Files
app.get('/api/files', (req, res) => res.json(data.files));
app.post('/api/files', (req, res) => {
  const file = { 
    id: uuidv4(), 
    ...req.body, 
    uploadedAt: new Date().toISOString() 
  };
  data.files.push(file);
  logAudit(req.body.uploadedBy, 'file_uploaded', `Uploaded file: ${file.name}`);
  saveData();
  io.emit('filesUpdated', data.files);
  res.json(file);
});

// Socket.IO
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(socket.id);
    io.to(roomId).emit('roomUsers', Array.from(rooms.get(roomId)));
  });

  socket.on('leaveRoom', (roomId) => {
    socket.leave(roomId);
    if (rooms.has(roomId)) {
      rooms.get(roomId).delete(socket.id);
      io.to(roomId).emit('roomUsers', Array.from(rooms.get(roomId)));
    }
  });

  socket.on('signal', ({ to, signal }) => {
    io.to(to).emit('signal', { from: socket.id, signal });
  });

  socket.on('disconnect', () => {
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        io.to(roomId).emit('roomUsers', Array.from(users));
      }
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
