import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TagPicker from './kanban/TagPicker';
import TaskCard from './kanban/TaskCard';
import ListView from './kanban/ListView';
import { connectGoogleCalendar, createCalendarEvent, fetchDailyQuote } from '../services/api';

export default function KanbanBoard({
  tasks, onAddTask, onUpdateTask, onDeleteTask, onDragEnd,
  activeFilter, setActiveFilter, customDate, setCustomDate, customDaysCount
}) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [newTaskUrgency, setNewTaskUrgency] = useState('normal');
  const [quote, setQuote] = useState({ text: 'Loading...', author: '' });

  const [newTaskTags, setNewTaskTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const tagAreaRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('velocity_viewMode') || 'board');

  const columns = ['To Do', 'In Progress', 'Done'];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('cal_token');
    if (token) {
      localStorage.setItem('cal_token', token);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    fetchDailyQuote().then(setQuote).catch(() => {});
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (tagAreaRef.current && !tagAreaRef.current.contains(e.target)) {
        setShowTagDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Tag helpers
  const allTags = [...new Set(tasks.flatMap(t => (t.tags && Array.isArray(t.tags)) ? t.tags : []))];
  const filteredSuggestions = allTags.filter(tag =>
    !newTaskTags.includes(tag) &&
    (tagInput === '' || tag.toLowerCase().includes(tagInput.toLowerCase().trim()))
  );

  const addTag = (raw) => {
    const tag = raw.toLowerCase().replace(/^#/, '').trim();
    if (!tag || newTaskTags.includes(tag) || newTaskTags.length >= 3) return;
    setNewTaskTags(prev => [...prev, tag]);
    setTagInput('');
  };

  const removeTag = (tag) => setNewTaskTags(prev => prev.filter(t => t !== tag));

  const handleTagKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput.trim());
    }
    if (e.key === 'Backspace' && !tagInput && newTaskTags.length > 0) {
      removeTag(newTaskTags[newTaskTags.length - 1]);
    }
    if (e.key === 'Escape') setShowTagDropdown(false);
  };

  const getDropdownStyle = () => {
    if (!tagAreaRef.current) return {};
    const rect = tagAreaRef.current.getBoundingClientRect();
    return {
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      minWidth: Math.max(rect.width, 240),
      zIndex: 9999,
    };
  };

  // Edit helpers
  const handleEditStart = (task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
  };

  const handleEditSave = (taskId) => {
    if (editingTaskId !== taskId) return;
    if (!editTitle.trim()) { setEditingTaskId(null); return; }
    fetch(`http://localhost:5000/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('stride_token')}`
      },
      body: JSON.stringify({ title: editTitle })
    }).then(res => {
      if (res.ok) {
        const orig = tasks.find(t => t.id === taskId);
        onUpdateTask({ ...orig, title: editTitle });
        setEditingTaskId(null);
      }
    }).catch(err => console.error('Error updating task:', err));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onAddTask(newTaskTitle, newTaskDeadline, newTaskUrgency, newTaskTags);
    setNewTaskTitle('');
    setNewTaskDeadline('');
    setNewTaskUrgency('normal');
    setNewTaskTags([]);
    setTagInput('');
    setShowTagDropdown(false);
  };

  const handleStatusChange = (task, newStatus) => {
    onUpdateTask({ ...task, status: newStatus, is_completed: newStatus === 'Done' });
  };

  // Calendar helpers
  const handleConnectCalendar = async () => {
    try {
      const data = await connectGoogleCalendar();
      if (data.auth_url) window.location.href = data.auth_url;
      else alert('שגיאה בקבלת קישור ההתחברות לגוגל');
    } catch (error) {
      console.error('Network error:', error);
    }
  };

  const addTaskToCalendar = async (task) => {
    try {
      const res = await createCalendarEvent(localStorage.getItem('cal_token'), task);
      const data = await res.json();
      if (res.ok) {
        alert('המשימה נוספה ליומן בהצלחה!');
        if (data.calendar_link) window.open(data.calendar_link, '_blank');
      } else {
        if (res.status === 401) alert('עליך לחבר את חשבון הגוגל שלך קודם!');
        else alert('שגיאה ביצירת האירוע: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to add event:', error);
    }
  };

  // Render helpers
  const highlightText = (text, query) => {
    if (!query || query.startsWith('#')) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5 not-italic">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  const renderTagChips = (task, small = false) => {
    if (!task.tags || !task.tags.length) return null;
    const sq = searchQuery.trim().toLowerCase();
    return (
      <div className={`flex flex-wrap gap-1 ${small ? 'mt-0.5' : 'mt-2'}`}>
        {task.tags.map(tag => {
          const isTagMatch = sq.startsWith('#') && tag.toLowerCase().includes(sq.slice(1));
          return (
            <span key={tag} className={`font-bold px-1.5 py-0.5 rounded-md border transition-all text-[10px] ${
              isTagMatch
                ? 'text-yellow-800 bg-yellow-200 border-yellow-400 ring-1 ring-yellow-300'
                : 'text-yellow-600 bg-yellow-50 border-yellow-200'
            }`}>
              #{tag}
            </span>
          );
        })}
      </div>
    );
  };

  // Sort / filter logic
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
  const nextWeekDate = new Date(); nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeekStr = nextWeekDate.toISOString().split('T')[0];

  const buildSortComparator = (todayS, tomorrowS, nextWeekS) => (a, b) => {
    const sq = searchQuery.trim().toLowerCase();
    if (sq) {
      const isTagSearch = sq.startsWith('#');
      const tagQ = isTagSearch ? sq.slice(1) : '';
      const aMatch = isTagSearch ? (a.tags||[]).some(t => t.toLowerCase().includes(tagQ)) : a.title.toLowerCase().includes(sq);
      const bMatch = isTagSearch ? (b.tags||[]).some(t => t.toLowerCase().includes(tagQ)) : b.title.toLowerCase().includes(sq);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
    }
    if (activeFilter === 'today') {
      if (a.due_date === todayS && b.due_date !== todayS) return -1;
      if (a.due_date !== todayS && b.due_date === todayS) return 1;
    } else if (activeFilter === 'tomorrow') {
      if (a.due_date === tomorrowS && b.due_date !== tomorrowS) return -1;
      if (a.due_date !== tomorrowS && b.due_date === tomorrowS) return 1;
    } else if (activeFilter === 'next7days') {
      const aIs = a.due_date && a.due_date >= todayS && a.due_date <= nextWeekS;
      const bIs = b.due_date && b.due_date >= todayS && b.due_date <= nextWeekS;
      if (aIs && !bIs) return -1;
      if (!aIs && bIs) return 1;
    } else if (activeFilter === 'next_X_days') {
      const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + customDaysCount);
      const maxStr = maxDate.toISOString().split('T')[0];
      const aIs = a.due_date && a.due_date >= todayS && a.due_date <= maxStr;
      const bIs = b.due_date && b.due_date >= todayS && b.due_date <= maxStr;
      if (aIs && !bIs) return -1;
      if (!aIs && bIs) return 1;
    } else if (activeFilter === 'custom' && customDate) {
      if (a.due_date === customDate && b.due_date !== customDate) return -1;
      if (a.due_date !== customDate && b.due_date === customDate) return 1;
    } else if (activeFilter === 'high_urgency') {
      if (a.urgency === 'high' && b.urgency !== 'high') return -1;
      if (a.urgency !== 'high' && b.urgency === 'high') return 1;
    } else if (activeFilter === 'normal_urgency') {
      const aN = a.urgency === 'normal' || !a.urgency;
      const bN = b.urgency === 'normal' || !b.urgency;
      if (aN && !bN) return -1;
      if (!aN && bN) return 1;
    } else if (activeFilter === 'low_urgency') {
      if (a.urgency === 'low' && b.urgency !== 'low') return -1;
      if (a.urgency !== 'low' && b.urgency === 'low') return 1;
    }
    return 0;
  };

  const sortComparator = buildSortComparator(todayStr, tomorrowStr, nextWeekStr);

  const activeTasks = tasks.filter(t => !t.is_routine);
  const filterCounts = {
    today: activeTasks.filter(t => t.due_date === todayStr).length,
    tomorrow: activeTasks.filter(t => t.due_date === tomorrowStr).length,
    next7days: activeTasks.filter(t => t.due_date && t.due_date >= todayStr && t.due_date <= nextWeekStr).length,
    high: activeTasks.filter(t => t.urgency === 'high').length,
    normal: activeTasks.filter(t => t.urgency === 'normal' || !t.urgency).length,
    low: activeTasks.filter(t => t.urgency === 'low').length,
  };

  const listTasks = [...tasks].sort((a, b) => {
    const filterResult = sortComparator(a, b);
    if (filterResult !== 0) return filterResult;
    const statusOrder = { 'To Do': 0, 'In Progress': 1, 'Done': 2 };
    return (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
  });

  // Shared edit/calendar props for subcomponents
  const editProps = { editingTaskId, editTitle, setEditTitle, handleEditStart, handleEditSave, setEditingTaskId };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50/50">

      <main className="flex-1 flex flex-col min-w-0">

        <header className="h-[88px] border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0 z-10 shadow-sm">
          <h2 className="text-2xl font-extrabold text-slate-800 shrink-0">My Tasks</h2>

          <form onSubmit={handleSubmit} className="flex gap-2 ml-8 flex-1 max-w-4xl items-center">
            <input
              type="text"
              placeholder="What needs to be done?"
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />

            <TagPicker
              newTaskTags={newTaskTags}
              tagInput={tagInput}
              setTagInput={setTagInput}
              showTagDropdown={showTagDropdown}
              setShowTagDropdown={setShowTagDropdown}
              tagAreaRef={tagAreaRef}
              addTag={addTag}
              removeTag={removeTag}
              handleTagKeyDown={handleTagKeyDown}
              filteredSuggestions={filteredSuggestions}
              allTags={allTags}
              getDropdownStyle={getDropdownStyle}
            />

            <input
              type="date"
              value={newTaskDeadline}
              onChange={(e) => setNewTaskDeadline(e.target.value)}
              className="w-36 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all cursor-pointer"
            />
            <select
              value={newTaskUrgency}
              onChange={(e) => setNewTaskUrgency(e.target.value)}
              className="w-32 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="normal">Normal 🟡</option>
              <option value="high">High 🔴</option>
              <option value="low">Low 🟢</option>
            </select>
            <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all hover:shadow hover:-translate-y-0.5 whitespace-nowrap">
              + Add Task
            </button>
            <button type="button" onClick={handleConnectCalendar} className="p-2 text-xl text-slate-500 rounded-full cursor-pointer hover:bg-slate-200 hover:text-slate-800 transition-colors flex items-center justify-center" title="חיבור ליומן גוגל">
              🔗
            </button>
          </form>
        </header>

        <div className="flex-1 overflow-hidden">
          {viewMode === 'board' ? (
            <div className="p-6 h-full">
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-5 h-full">
                  {columns.map(status => {
                    let columnTasks = tasks.filter(t => t.status === status);
                    columnTasks = [...columnTasks].sort((a, b) => {
                      const r = sortComparator(a, b);
                      if (r !== 0) return r;
                      if (status === 'To Do') {
                        if (a.is_routine && !b.is_routine) return -1;
                        if (!a.is_routine && b.is_routine) return 1;
                      }
                      return 0;
                    });

                    return (
                      <Droppable key={status} droppableId={status}>
                        {(provided, snapshot) => (
                          <div className={`flex-1 flex flex-col rounded-2xl border transition-colors overflow-hidden ${snapshot.isDraggingOver ? 'bg-indigo-50/70 border-indigo-300 shadow-inner' : 'bg-slate-100/50 border-slate-200'}`}>
                            <h3 className="font-bold text-slate-700 p-4 border-b border-slate-200/60 bg-slate-100 flex items-center justify-between shrink-0">
                              {status}
                              <span className="bg-white shadow-sm text-slate-500 text-xs py-1 px-2.5 rounded-full font-semibold border border-slate-200">{columnTasks.length}</span>
                            </h3>
                            <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar">
                              {columnTasks.map((task, index) => (
                                <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                                  {(provided, snapshot) => (
                                    <TaskCard
                                      task={task}
                                      status={status}
                                      provided={provided}
                                      snapshot={snapshot}
                                      {...editProps}
                                      onDeleteTask={onDeleteTask}
                                      onUpdateTask={onUpdateTask}
                                      addTaskToCalendar={addTaskToCalendar}
                                      highlightText={highlightText}
                                      renderTagChips={renderTagChips}
                                      searchQuery={searchQuery}
                                    />
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          </div>
                        )}
                      </Droppable>
                    );
                  })}
                </div>
              </DragDropContext>
            </div>
          ) : (
            <ListView
              listTasks={listTasks}
              {...editProps}
              handleStatusChange={handleStatusChange}
              onDeleteTask={onDeleteTask}
              onUpdateTask={onUpdateTask}
              addTaskToCalendar={addTaskToCalendar}
              highlightText={(text) => highlightText(text, searchQuery.trim())}
              renderTagChips={renderTagChips}
            />
          )}
        </div>
      </main>

      {/* Filters sidebar */}
      <aside className="w-56 bg-white border-l border-slate-200 shrink-0 flex flex-col z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.03)]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-center">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
            <button
              type="button"
              onClick={() => { setViewMode('board'); localStorage.setItem('velocity_viewMode', 'board'); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'board' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >⊞ Board</button>
            <button
              type="button"
              onClick={() => { setViewMode('list'); localStorage.setItem('velocity_viewMode', 'list'); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >≡ List</button>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Time</h4>
            <div className="flex flex-col gap-1">
              {[
                { key: 'default', label: 'Default' },
                { key: 'today', label: 'Today', count: filterCounts.today },
                { key: 'tomorrow', label: 'Tomorrow', count: filterCounts.tomorrow },
                { key: 'next7days', label: 'Next 7 Days', count: filterCounts.next7days },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeFilter === key ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {label}
                  {count !== undefined && (
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${activeFilter === key ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Urgency</h4>
            <div className="flex flex-col gap-1">
              {[
                { key: 'high_urgency', label: 'High 🔴', count: filterCounts.high, active: 'bg-red-50 text-red-700 ring-1 ring-red-200 shadow-sm', badge: 'bg-red-100 text-red-600' },
                { key: 'normal_urgency', label: 'Normal 🟡', count: filterCounts.normal, active: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 shadow-sm', badge: 'bg-amber-100 text-amber-600' },
                { key: 'low_urgency', label: 'Low 🟢', count: filterCounts.low, active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 shadow-sm', badge: 'bg-emerald-100 text-emerald-600' },
              ].map(({ key, label, count, active, badge }) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeFilter === key ? active : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {label}
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${activeFilter === key ? badge : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Specific Date</h4>
            <input
              type="date"
              value={customDate || ''}
              onChange={(e) => { setCustomDate(e.target.value); setActiveFilter(e.target.value ? 'custom' : 'default'); }}
              className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition-all ${activeFilter === 'custom' ? 'border-indigo-300 bg-indigo-50/30 text-indigo-700 ring-1 ring-indigo-100' : 'border-slate-200 text-slate-600 bg-slate-50 focus:bg-white focus:border-indigo-400'}`}
            />
          </div>

          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Search</h4>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">🔍</span>
              <input
                type="text"
                placeholder="Title or #tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-8 pr-7 py-2 border rounded-lg text-sm outline-none transition-all ${searchQuery ? 'border-indigo-300 bg-indigo-50/30 text-indigo-700 ring-1 ring-indigo-100' : 'border-slate-200 text-slate-600 bg-slate-50 focus:bg-white focus:border-indigo-400'}`}
                dir="auto"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold">✕</button>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/60">
            <div className="text-center bg-slate-50 rounded-xl p-4 transition-all hover:bg-slate-100 shadow-sm">
              <p className="text-sm text-slate-600 font-medium italic mb-2">"{quote.text}"</p>
              <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">— {quote.author}</p>
            </div>
          </div>
        </div>
      </aside>

    </div>
  );
}
