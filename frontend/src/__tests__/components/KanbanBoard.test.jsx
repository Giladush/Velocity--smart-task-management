// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import KanbanBoard from '../../components/KanbanBoard';

vi.mock('../../services/api', () => ({
  connectGoogleCalendar: vi.fn(),
  createCalendarEvent: vi.fn(),
  fetchDailyQuote: vi.fn().mockResolvedValue({ text: 'Test quote', author: 'Author' }),
  updateTask: vi.fn(),
}));

const mockTasks = [
  { id: 1, title: 'Todo Task',        status: 'To Do',      is_completed: false, is_routine: false, urgency: 'normal', tags: [] },
  { id: 2, title: 'Progress Task',    status: 'In Progress', is_completed: false, is_routine: false, urgency: 'high',   tags: [] },
  { id: 3, title: 'Done Task',        status: 'Done',        is_completed: true,  is_routine: false, urgency: 'normal', tags: [] },
];

const defaultProps = {
  tasks: mockTasks,
  onAddTask: vi.fn(),
  onUpdateTask: vi.fn(),
  onDeleteTask: vi.fn(),
  onDragEnd: vi.fn(),
  activeFilter: 'default',
  setActiveFilter: vi.fn(),
  customDate: '',
  setCustomDate: vi.fn(),
  customDaysCount: 0,
  onToast: vi.fn(),
};

describe('KanbanBoard', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      _store: { kanban_view: 'board', stride_token: 'test-token' },
      getItem(k) { return this._store[k] ?? null; },
      setItem(k, v) { this._store[k] = v; },
      removeItem(k) { delete this._store[k]; },
      clear() { this._store = {}; },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders all three status columns', () => {
    render(<KanbanBoard {...defaultProps} />);
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders task titles', () => {
    render(<KanbanBoard {...defaultProps} />);
    expect(screen.getByText('Todo Task')).toBeInTheDocument();
    expect(screen.getByText('Progress Task')).toBeInTheDocument();
    expect(screen.getByText('Done Task')).toBeInTheDocument();
  });

  it('filter=today sorts matching tasks to the top', () => {
    const today = new Date().toISOString().slice(0, 10);
    const tasks = [
      { id: 1, title: 'Due Today',     status: 'To Do', is_completed: false, is_routine: false, urgency: 'normal', tags: [], due_date: today },
      { id: 2, title: 'Due Next Week', status: 'To Do', is_completed: false, is_routine: false, urgency: 'normal', tags: [], due_date: '2099-12-31' },
    ];

    render(<KanbanBoard {...defaultProps} tasks={tasks} activeFilter="today" />);

    expect(screen.getByText('Due Today')).toBeInTheDocument();
    expect(screen.getByText('Due Next Week')).toBeInTheDocument();

    const items = screen.getAllByRole('paragraph').map(el => el.textContent);
    const todayIdx = items.findIndex(t => t.includes('Due Today'));
    const nextWeekIdx = items.findIndex(t => t.includes('Due Next Week'));
    expect(todayIdx).toBeLessThan(nextWeekIdx);
  });
});
