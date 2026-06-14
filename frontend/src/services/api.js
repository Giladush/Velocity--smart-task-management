const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

const authHeaders = (token) => ({ 'Authorization': `Bearer ${token}` });
const jsonHeaders = (token) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` });

export const fetchAllData = async (token) => {
  const res = await fetch(`${BASE}/api/data`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Failed to fetch data');
  return res.json();
};

export const fetchMe = (token) =>
  fetch(`${BASE}/api/me`, { headers: authHeaders(token) });

export const fetchAnalytics = (token) =>
  fetch(`${BASE}/api/analytics`, { headers: authHeaders(token) });

export const fetchRoutines = (token) =>
  fetch(`${BASE}/api/routines`, { headers: authHeaders(token) });

export const loginUser = (email, password) =>
  fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

export const registerUser = (userData) =>
  fetch(`${BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });

export const addTask = (token, title, dueDate, urgency, tags) =>
  fetch(`${BASE}/api/tasks`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify({ title, due_date: dueDate || null, urgency: urgency || 'normal', tags: tags || [] })
  });

export const updateTask = (token, taskId, payload) =>
  fetch(`${BASE}/api/tasks/${taskId}`, {
    method: 'PUT',
    headers: jsonHeaders(token),
    body: JSON.stringify(payload)
  });

export const deleteTask = (token, taskId) =>
  fetch(`${BASE}/api/tasks/${taskId}`, { method: 'DELETE', headers: authHeaders(token) });

export const toggleRoutine = (token, routineId) =>
  fetch(`${BASE}/api/routines/${routineId}/toggle`, { method: 'POST', headers: authHeaders(token) });

export const deleteRoutine = (token, routineId) =>
  fetch(`${BASE}/api/routines/${routineId}`, { method: 'DELETE', headers: authHeaders(token) });

export const createRoutine = (token, data) =>
  fetch(`${BASE}/api/routines`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(data)
  });

export const createProcess = (token, title) =>
  fetch(`${BASE}/api/processes`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify({ title })
  });

export const deleteProcess = (token, processId) =>
  fetch(`${BASE}/api/processes/${processId}`, { method: 'DELETE', headers: authHeaders(token) });

export const addProcessTask = (token, processId, title) =>
  fetch(`${BASE}/api/tasks`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify({ title, process_id: processId })
  });

export const sendAIMessage = async (token, message) => {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify({ message, cal_token: localStorage.getItem('cal_token') || null })
  });
  return res.json();
};

export const connectGoogleCalendar = async () => {
  const res = await fetch(`${BASE}/api/calendar/auth`);
  return res.json();
};

export const createCalendarEvent = (calToken, task) =>
  fetch(`${BASE}/api/calendar/create_event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Calendar-Token': calToken || '' },
    body: JSON.stringify({
      title: task.title,
      description: task.description || 'משימה שנוצרה ב-Velocity',
      start_time: task.due_date ? `${task.due_date}T09:00:00` : new Date().toISOString().slice(0, 19),
      end_time: task.due_date ? `${task.due_date}T10:00:00` : new Date(Date.now() + 3600000).toISOString().slice(0, 19),
    })
  });

export const fetchDailyQuote = () =>
  fetch(`${BASE}/api/quote`).then(r => r.json());

export const fetchUrgentEmails = (calToken) =>
  fetch(`${BASE}/api/gmail/urgent`, {
    headers: { 'X-Calendar-Token': calToken || '' }
  }).then(r => r.json());
