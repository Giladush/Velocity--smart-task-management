# Velocity — AI-Powered Task Manager

A fullstack productivity app that combines task management, habit tracking, multi-step process planning, and an AI agent — all in one focused workspace.

---

## Features

### Task Management
- **Kanban board** with drag-and-drop across To Do, In Progress, and Done columns
- **List view** as an alternative to the board — toggle persists across sessions
- Urgency levels (High / Normal / Low), due dates, and custom tags per task
- Inline due date editing directly on each task card
- Smart date filters: today, next N days, or a specific date
- Enter/exit animations when tasks are created or deleted

### Processes
- Create structured, multi-step projects with sub-tasks
- Visual progress bar per process based on completed tasks
- Navigate directly to any process from the AI agent
- Enter/exit animations when processes are created or deleted

### Routines
- Define recurring tasks by specific days of the week (e.g., Mon / Wed / Fri)
- Individual streak counter per routine
- Routines appear automatically on their scheduled days
- Inline editing of routine title and scheduled days
- Enter/exit animations when routines are created or deleted

### AI Agent (Stride AI)
A natural-language assistant in Hebrew that understands intent and acts on it:
- **Create** tasks, routines, or full multi-step processes from a single sentence
- **Delete** tasks, processes, or routines by name
- **Complete** a single task by name, or in bulk — by date, urgency level, or all at once
- **Filter** the board by date range or specific day
- **Navigate** to a specific process or view
- **Advice** — gives a warm, comprehensive review of all open tasks with priorities and reasoning
- **Emails** — fetches emails from Gmail on demand based on the user's request and displays them in a dedicated panel; each email can be converted into a task with one click

### Daily Snapshot
A modal shown on login with a personalized greeting (morning / afternoon / evening) listing today's tasks and active routines.

### Analytics
- Weekly task completion chart (last 7 days)
- Per-process progress breakdown
- Open tasks by urgency level (High / Normal / Low)

### Streak System
A daily streak that increments if at least one item was completed that day — counting standalone tasks, process tasks, and routines.

### Google Integration
- Connect your Google account via OAuth2 (single auth flow covers both services)
- **Calendar** — create events directly from any task in the app
- **Gmail** — fetch emails on demand through the AI agent and turn them into tasks

### Personalization
- Username collected at registration, displayed throughout the app
- Personalized sidebar button, daily snapshot greeting, and routine view
- Daily motivational quote (via ZenQuotes API)

---

## Tech Stack

**Frontend**
- React 18 (Vite)
- Tailwind CSS
- @hello-pangea/dnd (drag and drop)

**Backend**
- Python / Flask
- Flask Blueprints (modular route structure)
- Flask-SQLAlchemy (ORM)
- Flask-Migrate / Alembic (schema migrations)
- Flask-JWT-Extended (authentication)
- Google GenAI (`google-genai`) — Gemini AI agent
- Google OAuth2 (Calendar + Gmail integration)

**Database**
- SQLite

---

## Project Structure

```
velocity-task-manager/
├── backend/
│   ├── app.py               # App factory, config, blueprint registration
│   ├── models.py            # SQLAlchemy models: User, Task, Process, Routine, CompletionLog
│   ├── requirements.txt
│   ├── migrations/          # Alembic migration files
│   ├── routes/
│   │   ├── auth.py          # Register, login, /api/me
│   │   ├── tasks.py         # CRUD for tasks, completion logging
│   │   ├── processes.py     # Process and process-task management
│   │   ├── routines.py      # Routine CRUD and daily toggle
│   │   ├── data.py          # Aggregated data fetch (/api/data) and daily quote
│   │   ├── analytics.py     # Analytics endpoint (/api/analytics)
│   │   ├── ai.py            # AI agent endpoint (/api/chat) — Gemini + intent handlers
│   │   └── calendar.py      # Google OAuth2, Calendar event creation, Gmail fetch
│   └── tests/
│       ├── conftest.py
│       ├── test_auth.py
│       ├── test_tasks.py
│       ├── test_routines.py
│       └── test_streak.py
└── frontend/
    └── src/
        ├── App.jsx                  # Root state, routing, event handlers
        ├── services/api.js          # All API calls in one place
        └── components/
            ├── LandingPage.jsx
            ├── Auth.jsx
            ├── Sidebar.jsx          # Navigation, streak, AI chat input
            ├── KanbanBoard.jsx      # Board/list toggle, filtering
            ├── kanban/
            │   ├── TaskCard.jsx     # Task card with inline due date editing
            │   ├── ListView.jsx     # List view with inline due date editing
            │   └── TagPicker.jsx
            ├── ProcessBoard.jsx
            ├── RoutinesBoard.jsx    # Inline title + days editing
            ├── DailySummary.jsx     # Login modal with today's tasks
            ├── Analytics.jsx
            ├── EmailsPanel.jsx      # Gmail results panel with add-to-task action
            ├── AgentChatBox.jsx     # AI chat input with thinking overlay
            ├── AgentInsights.jsx    # Animated advice panel triggered by AI agent
            ├── EmailDigest.jsx      # Scanning animation shown while fetching emails
            └── animations/
                ├── TaskCrudMotion.jsx  # Enter/exit card animations (tasks, processes, routines)
                ├── StreakBurst.jsx     # Full-screen fire burst on streak click
                ├── StardustOrb.jsx    # Orb that flies from chat to insights panel
                ├── GlowHalo.jsx       # Lava-lamp glow wrapper for UI elements
                └── LavaBackground.jsx # Animated gradient backdrop (Hero section)
```

---

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
# venv/bin/activate         # macOS / Linux
pip install -r requirements.txt
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173` with the API at `http://localhost:5000`.

---

## Environment Variables

Create a `.env` file in `/backend`:

```
FLASK_SECRET_KEY=your_flask_secret
JWT_SECRET_KEY=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

## Running Tests

```bash
cd backend
python -m pytest tests/ -v
```
