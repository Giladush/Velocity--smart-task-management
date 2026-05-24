AI-Powered Task & Goal Orchestrator (Fullstack Project) #

Overview ##
This is a comprehensive Task and Goal Management platform designed to bridge the gap between "to-do lists" and "actual progress." By leveraging AI (Large Language Models), the system helps users break down complex goals into actionable tasks, provides smart prioritization, and acts as a productivity coach.

Key Features ##
1. Goal & Task Management
-Hierarchical Structure: Create high-level Goals and decompose them into specific Tasks and Milestones.

-Kanban Board: A dynamic drag-and-drop interface for managing task states (To-Do, In-Progress, Completed).

-Progress Tracking: Visual progress bars for goals based on completed sub-tasks.

2. AI Productivity Assistant
-Smart Breakdown: Tell the AI a goal (e.g., "Learn React in a month"), and it will automatically generate a structured task list.

-Natural Language Task Creation: Add tasks via chat (e.g., "Remind me to call the bank tomorrow at 10 AM").

-ontextual Advice: Ask the bot for tips on how to overcome "procrastination" or how to prioritize your current list.

3. User Experience & Security
-Secure Authentication: Full User Registration and Login system using JWT (JSON Web Tokens).

-Responsive Design: Fully functional on Desktop and Mobile devices.

-Real-time Feedback: Instant UI updates using modern State Management.

Technical Stack ##
**Frontend**
React.js (Vite): For a fast, component-based UI.

Tailwind CSS: For modern, responsive styling.

Zustand / Redux Toolkit: For global state management.

React Query (Axios): For efficient server state and API fetching.

**Backend**
Python (Flask): Robust RESTful API development.

Flask-SQLAlchemy: ORM for database interactions.

Flask-JWT-Extended: Handling secure authentication.

OpenAI API / LangChain: Powering the AI intelligence and function calling.

**Database**
PostgreSQL / SQLite: Relational database for storing users, goals, and task logs.

Database Schema (Brief)
-The application uses a relational structure to ensure data integrity:

-Users Table: Authentication details and user profiles.

-Goals Table: Long-term objectives linked to a specific user.

-Tasks Table: Individual actions linked to a Goal (Foreign Key).

-Chat Logs: History of AI interactions for context-aware conversations.


# ⚡ Velocity - AI-Powered Task & Goal Orchestrator

> A comprehensive Task and Goal Management platform designed to bridge the gap between "to-do lists" and "actual progress." 

By leveraging AI (Large Language Models), **Velocity** helps users break down complex goals into actionable tasks, provides smart prioritization, and acts as a personal productivity coach.

---

## ✨ Key Features

### 🎯 Goal & Task Management
* **Hierarchical Structure:** Create high-level Goals and decompose them into specific Tasks and Milestones.
* **Kanban Board:** A dynamic drag-and-drop interface for seamless task state management (To-Do, In-Progress, Completed).
* **Progress Tracking:** Visual progress bars for goals based on completed sub-tasks.

### 🤖 AI Productivity Assistant
* **Smart Breakdown:** Tell the AI a goal (e.g., *"Learn React in a month"*), and it will automatically generate a structured, step-by-step task list.
* **Natural Language Task Creation:** Add tasks via chat (e.g., *"Remind me to call the bank tomorrow at 10 AM"*).
* **Contextual Advice:** Ask the bot for tips on how to overcome procrastination or how to prioritize your current list.
* **Daily Motivation:** Integrated daily quote API to keep you inspired.

### 🔒 User Experience & Security
* **Secure Authentication:** Full User Registration and Login system using JWT (JSON Web Tokens).
* **Responsive Design:** Fully functional and beautifully crafted for both Desktop and Mobile devices.
* **Real-time Feedback:** Instant UI updates using modern State Management.

---

## 🛠️ Technical Stack

**Frontend:**
* React.js (Vite) - Fast, component-based UI
* Tailwind CSS - Modern, responsive styling
* Zustand / Redux Toolkit - Global state management
* React Query (Axios) - Efficient server state and API fetching

**Backend:**
* Python (Flask) - Robust RESTful API development
* Flask-SQLAlchemy - ORM for database interactions
* Flask-JWT-Extended - Secure authentication handling
* OpenAI API / LangChain - Powering the AI intelligence and function calling

**Database:**
* PostgreSQL / SQLite - Relational database for storing users, goals, and task logs

---

## 🗄️ Database Schema (Brief)
The application uses a relational structure to ensure data integrity:
* **Users Table:** Authentication details and user profiles.
* **Goals Table:** Long-term objectives linked to a specific user.
* **Tasks Table:** Individual actions linked to a Goal (Foreign Key).
* **Chat Logs:** History of AI interactions for context-aware conversations.

---

## 🚀 Getting Started (Local Development)

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites
Make sure you have the following installed on your computer:
* [Node.js](https://nodejs.org/) (v16 or higher)
* [Python](https://www.python.org/) (3.9 or higher)
* Git

### 1. Clone the repository
```bash
git clone [https://github.com/Giladush/Velocity--smart-task-management.git](https://github.com/Giladush/Velocity--smart-task-management.git)
cd Velocity--smart-task-management