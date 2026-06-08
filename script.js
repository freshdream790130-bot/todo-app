// ── Data ──────────────────────────────────────────────────────────────
let todos = JSON.parse(localStorage.getItem('todos') || '[]');
let currentView = 'daily';
let currentWeekOffset = 0;
let currentDayOffset = 0;
let accessToken = null;

const GCAL_CLIENT_ID_KEY = 'gcal_client_id';
const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

function todayStr() {
    const d = new Date();
    return dateStr(d);
}

function currentDayStr() {
    const d = new Date();
    d.setDate(d.getDate() + currentDayOffset);
    return dateStr(d);
}

// ── Init ──────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('todoDate').value = todayStr();
    document.getElementById('todoInput').addEventListener('keydown', (e) => {
          if (e.key === 'Enter') addTodo();
    });
    renderView();
    checkGCalStatus();
});

// ── Add Todo ──────────────────────────────────────────────────────────
function addTodo() {
    const input = document.getElementById('todoInput');
    const dateInput = document.getElementById('todoDate');
    const text = input.value.trim();
    if (!text) return;

  const todo = {
        id: Date.now().toString(),
        text,
        date: dateInput.value || todayStr(),
        completed: false,
        calendarEventId: null
  };

  todos.push(todo);
    saveTodos();
    input.value = '';
    renderView();

  if (accessToken) addToGoogleCalendar(todo);
}

// ── Delete Todo ───────────────────────────────────────────────────────
function deleteTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo && todo.calendarEventId && accessToken) {
          deleteGCalEvent(todo.calendarEventId);
    }
    todos = todos.filter(t => t.id !== id);
    saveTodos();
    renderView();
}

// ── Toggle Complete ───────────────────────────────────────────────────
function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
          todo.completed = !todo.completed;
          saveTodos();
          renderView();
    }
}

// ── Render ────────────────────────────────────────────────────────────
function renderView() {
    if (currentView === 'daily') renderDaily();
    else renderWeekly();
}

function createTodoItem(todo) {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.completed ? ' done' : '');

  // Checkbox
  const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.completed;
    checkbox.className = 'todo-checkbox';
    checkbox.addEventListener('change', () => toggleTodo(todo.id));

  // Text
  const span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = todo.text;

  // Right actions
  const right = document.createElement('div');
    right.className = 'todo-right';

  if (todo.calendarEventId) {
        const calIcon = document.createElement('span');
        calIcon.className = 'cal-synced';
        calIcon.title = '구글 캘린더에 등록됨';
        calIcon.textContent = '📅';
        right.appendChild(calIcon);
  } else if (accessToken) {
        const syncBtn = document.createElement('button');
        syncBtn.className = 'button-sync';
        syncBtn.textContent = '+ 캘린더';
        syncBtn.onclick = (e) => { e.stopPropagation(); addToGoogleCalendar(todo); };
        right.appendChild(syncBtn);
  }

  const del = document.createElement('button');
    del.textContent = '삭제';
    del.className = 'button-delete';
    del.onclick = (e) => { e.stopPropagation(); deleteTodo(todo.id); };
    right.appendChild(del);

  li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(right);
    return li;
}

function renderDaily() {
    const ds = currentDayStr();
    document.getElementById('dailyTitle').textContent = formatDate(ds);

  // 오늘이면 "오늘" 표시
  const todayBadge = document.getElementById('dailyTodayBadge');
    if (todayBadge) {
          todayBadge.style.display = (currentDayOffset === 0) ? 'inline' : 'none';
    }

  const list = document.getElementById('dailyList');
    const empty = document.getElementById('dailyEmpty');
    list.innerHTML = '';

  const dayTodos = todos.filter(t => t.date === ds);
    const hasTodos = dayTodos.length > 0;
    empty.style.display = hasTodos ? 'none' : 'block';
    if (hasTodos) {
          dayTodos.forEach(t => list.appendChild(createTodoItem(t)));
    }
}

function renderWeekly() {
    const grid = document.getElementById('weeklyGrid');
    const weekLabel = document.getElementById('weekLabel');
    grid.innerHTML = '';

  const { start, end } = getWeekRange(currentWeekOffset);
    weekLabel.textContent = `${formatDateShort(dateStr(start))} – ${formatDateShort(dateStr(end))}`;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const ds = dateStr(d);
        const dayTodos = todos.filter(t => t.date === ds);
        const isToday = ds === todayStr();

      const col = document.createElement('div');
        col.className = 'week-col' + (isToday ? ' today' : '');

      // Day header
      const header = document.createElement('div');
        header.className = 'week-day-header';
        const dayName = document.createElement('span');
        dayName.className = 'day-name';
        dayName.textContent = getDayName(d);
        const dayNum = document.createElement('span');
        dayNum.className = 'day-num';
        dayNum.textContent = new Date(d).getDate();
        header.appendChild(dayName);
        header.appendChild(dayNum);
        col.appendChild(header);

      if (dayTodos.length === 0) {
              const empty = document.createElement('p');
              empty.className = 'week-empty';
              empty.textContent = '–';
              col.appendChild(empty);
      } else {
              const ul = document.createElement('ul');
              ul.className = 'week-todo-list';
              dayTodos.forEach(t => {
                        const li = document.createElement('li');
                        li.className = 'week-todo-item' + (t.completed ? ' done' : '');

                                       const cb = document.createElement('input');
                        cb.type = 'checkbox';
                        cb.checked = t.completed;
                        cb.className = 'todo-checkbox small';
                        cb.addEventListener('change', () => toggleTodo(t.id));

                                       const sp = document.createElement('span');
                        sp.className = 'week-todo-text';
                        sp.textContent = t.text;

                                       li.appendChild(cb);
                        li.appendChild(sp);
                        ul.appendChild(li);
              });
              col.appendChild(ul);
      }
        grid.appendChild(col);
  }
}

// ── View Switching ────────────────────────────────────────────────────
function switchView(view) {
    currentView = view;
    document.getElementById('view-daily').style.display = view === 'daily' ? 'block' : 'none';
    document.getElementById('view-weekly').style.display = view === 'weekly' ? 'block' : 'none';
    document.getElementById('tab-daily').classList.toggle('active', view === 'daily');
    document.getElementById('tab-weekly').classList.toggle('active', view === 'weekly');
    renderView();
}

function changeDay(delta) {
    currentDayOffset += delta;
    renderDaily();
}

function changeWeek(delta) {
    currentWeekOffset += delta;
    renderWeekly();
}

// ── Helpers ───────────────────────────────────────────────────────────
function dateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function getWeekRange(offset) {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
  const mon = new Date(now);
    mon.setDate(now.getDate() - ((day + 6) % 7) + offset * 7);
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);
    return { start: mon, end: sun };
}

function getDayName(d) {
    return ['일', '월', '화', '수', '목', '금', '토'][new Date(d).getDay()];
}

function formatDate(ds) {
    const [y, m, day] = ds.split('-');
    return `${y}년 ${parseInt(m)}월 ${parseInt(day)}일`;
}

function formatDateShort(ds) {
    const [y, m, day] = ds.split('-');
    return `${parseInt(m)}월 ${parseInt(day)}일`;
}

// ── Google Calendar ───────────────────────────────────────────────────
function checkGCalStatus() {
    const clientId = localStorage.getItem(GCAL_CLIENT_ID_KEY);
    if (!clientId) {
          updateGCalButton(false);
    }
}

function handleGCalAuth() {
    if (accessToken) {
          // Disconnect
      accessToken = null;
          updateGCalButton(false);
          renderView();
          return;
    }
    const clientId = localStorage.getItem(GCAL_CLIENT_ID_KEY);
    if (!clientId) {
          const setup = document.getElementById('gcalSetup');
          setup.style.display = 'block';
          setup.scrollIntoView({ behavior: 'smooth' });
          return;
    }
    initiateGCalOAuth(clientId);
}

function saveClientId() {
    const id = document.getElementById('clientIdInput').value.trim();
    if (!id) { alert('Client ID를 입력해주세요.'); return; }
    localStorage.setItem(GCAL_CLIENT_ID_KEY, id);
    document.getElementById('gcalSetup').style.display = 'none';
    initiateGCalOAuth(id);
}

function initiateGCalOAuth(clientId) {
    if (typeof google === 'undefined') {
          alert('Google 라이브러리가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
          return;
    }
    const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: GCAL_SCOPE,
          callback: (response) => {
                  if (response.error) {
                            alert('Google Calendar 연결 실패: ' + response.error);
                            return;
                  }
                  accessToken = response.access_token;
                  updateGCalButton(true);
                  renderView();
          }
    });
    tokenClient.requestAccessToken();
}

function updateGCalButton(connected) {
    document.getElementById('gcalLabel').textContent = connected ? '연결됨' : '캘린더 연결';
    document.getElementById('gcalIcon').textContent = connected ? '✅' : '📅';
}

async function addToGoogleCalendar(todo) {
    if (!accessToken) return;

  const endDate = new Date(todo.date + 'T00:00:00');
    endDate.setDate(endDate.getDate() + 1);
    const endDateStr = dateStr(endDate);

  const event = {
        summary: todo.text,
        start: { date: todo.date },
        end: { date: endDateStr }
  };

  try {
        const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                method: 'POST',
                headers: {
                          'Authorization': `Bearer ${accessToken}`,
                          'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
        });

      if (res.ok) {
              const data = await res.json();
              const t = todos.find(t => t.id === todo.id);
              if (t) {
                        t.calendarEventId = data.id;
                        saveTodos();
                        renderView();
              }
      } else if (res.status === 401) {
              accessToken = null;
              updateGCalButton(false);
              alert('Google Calendar 세션이 만료되었습니다. 다시 연결해주세요.');
      }
  } catch (err) {
        console.error('캘린더 추가 실패:', err);
  }
}

async function deleteGCalEvent(eventId) {
    if (!accessToken) return;
    try {
          await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${accessToken}` }
          });
    } catch (err) {
          console.error('캘린더 이벤트 삭제 실패:', err);
    }
}
