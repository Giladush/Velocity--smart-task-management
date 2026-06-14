// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { addTask, sendAIMessage, deleteTask, toggleRoutine, updateTask } from '../services/api';

describe('api.js', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    vi.stubGlobal('localStorage', {
      _store: {},
      getItem(k) { return this._store[k] ?? null; },
      setItem(k, v) { this._store[k] = v; },
      removeItem(k) { delete this._store[k]; },
      clear() { this._store = {}; },
    });
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('addTask sends correct JSON body', async () => {
    fetch.mockResolvedValueOnce({ ok: true });

    await addTask('my-token', 'Buy milk', '2026-06-20', 'high', ['shopping']);

    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain('/api/tasks');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      title: 'Buy milk',
      due_date: '2026-06-20',
      urgency: 'high',
      tags: ['shopping'],
    });
  });

  it('addTask sends null due_date when not provided', async () => {
    fetch.mockResolvedValueOnce({ ok: true });

    await addTask('my-token', 'Task with no date', null, 'normal', []);

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.due_date).toBeNull();
  });

  it('sendAIMessage includes cal_token from localStorage', async () => {
    localStorage.setItem('cal_token', 'my-cal-token');
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ reply: 'hi', action: null }) });

    await sendAIMessage('my-token', 'hello');

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.cal_token).toBe('my-cal-token');
    expect(body.message).toBe('hello');
  });

  it('sendAIMessage sends null cal_token when not in localStorage', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ reply: 'hi', action: null }) });

    await sendAIMessage('my-token', 'hello');

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.cal_token).toBeNull();
  });

  it('toggleRoutine sends POST with auth header', async () => {
    fetch.mockResolvedValueOnce({ ok: true });

    await toggleRoutine('my-token', 42);

    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain('/api/routines/42/toggle');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('Bearer my-token');
  });

  it('deleteTask sends DELETE with auth header', async () => {
    fetch.mockResolvedValueOnce({ ok: true });

    await deleteTask('my-token', 5);

    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain('/api/tasks/5');
    expect(options.method).toBe('DELETE');
    expect(options.headers['Authorization']).toBe('Bearer my-token');
  });

  it('updateTask sends PUT with correct body', async () => {
    fetch.mockResolvedValueOnce({ ok: true });

    await updateTask('my-token', 7, { title: 'New Title', is_completed: true });

    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain('/api/tasks/7');
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body)).toEqual({ title: 'New Title', is_completed: true });
  });
});
