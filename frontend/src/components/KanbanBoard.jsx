import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function KanbanBoard({
  tasks, onAddTask, onUpdateTask, onDeleteTask, onDragEnd,
  activeFilter, setActiveFilter, customDate, setCustomDate, customDaysCount
}) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const columns = ['To Do', 'In Progress', 'Done'];
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [newTaskUrgency, setNewTaskUrgency] = useState('normal');
  const [quote, setQuote] = useState({ text: "Loading...", author: "" });

  // Tag state
  const [newTaskTags, setNewTaskTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const tagAreaRef = useRef(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('cal_token');
    if (token) {
      localStorage.setItem('cal_token', token);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    const fetchDailyQuote = async () => {
      try {
        const res = await fetch('http://127.0.0.1:5000/api/quote');
        if (res.ok) {
          const data = await res.json();
          setQuote(data);
        }
      } catch (error) {
        console.error("Failed to load quote:", error);
      }
    };
    fetchDailyQuote();
  }, []);

  // Close tag dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (tagAreaRef.current && !tagAreaRef.current.contains(e.target)) {
        setShowTagDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // All unique tags across all existing tasks (for suggestions)
  const allTags = [...new Set(
    tasks.flatMap(t => (t.tags && Array.isArray(t.tags)) ? t.tags : [])
  )];

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
    if (e.key === 'Escape') {
      setShowTagDropdown(false);
    }
  };

  // Compute dropdown position (fixed, to escape overflow:hidden ancestors)
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

  const handleEditStart = (task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
  };

  const handleEditSave = (taskId) => {
    if (editingTaskId !== taskId) return;
    if (!editTitle.trim()) {
      setEditingTaskId(null);
      return;
    }

    fetch(`http://localhost:5000/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('stride_token')}`
      },
      body: JSON.stringify({ title: editTitle })
    })
    .then(res => {
      if (res.ok) {
        const originalTask = tasks.find(t => t.id === taskId);
        onUpdateTask({ ...originalTask, title: editTitle });
        setEditingTaskId(null);
      }
    })
    .catch(err => console.error("Error updating task:", err));
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

  const connectToGoogleCalendar = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/calendar/auth');
      const data = await response.json();
      if (response.ok && data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        console.error("Failed to get auth URL:", data);
        alert("שגיאה בקבלת קישור ההתחברות לגוגל");
      }
    } catch (error) {
      console.error("Network error:", error);
    }
  };

  const addTaskToCalendar = async (task) => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/calendar/create_event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Calendar-Token': localStorage.getItem('cal_token') || '',
        },
        body: JSON.stringify({
          title: task.title,
          description: task.description || "משימה שנוצרה ב-Velocity",
          start_time: task.due_date ? `${task.due_date}T09:00:00` : new Date().toISOString().slice(0, 19),
          end_time: task.due_date ? `${task.due_date}T10:00:00` : new Date(Date.now() + 3600000).toISOString().slice(0, 19),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("המשימה נוספה ליומן בהצלחה!");
        if (data.calendar_link) window.open(data.calendar_link, '_blank');
      } else {
        if (response.status === 401) {
          alert("עליך לחבר את חשבון הגוגל שלך קודם!");
        } else {
          alert("שגיאה ביצירת האירוע: " + data.error);
        }
      }
    } catch (error) {
      console.error("Failed to add event:", error);
    }
  };

  // Highlight matching text in task titles
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

  // Filter counts (non-routine tasks only)
  const activeTasks = tasks.filter(t => !t.is_routine);
  const todayCount = new Date().toISOString().split('T')[0];
  const tomorrowCount = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })();
  const next7Count = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; })();
  const filterCounts = {
    today: activeTasks.filter(t => t.due_date === todayCount).length,
    tomorrow: activeTasks.filter(t => t.due_date === tomorrowCount).length,
    next7days: activeTasks.filter(t => t.due_date && t.due_date >= todayCount && t.due_date <= next7Count).length,
    high: activeTasks.filter(t => t.urgency === 'high').length,
    normal: activeTasks.filter(t => t.urgency === 'normal' || !t.urgency).length,
    low: activeTasks.filter(t => t.urgency === 'low').length,
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50/50">

      <main className="flex-1 flex flex-col min-w-0">

        <header className="h-[88px] border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0 z-10 shadow-sm">
          <h2 className="text-2xl font-extrabold text-slate-800 shrink-0">My Tasks</h2>

          <form onSubmit={handleSubmit} className="flex gap-2 ml-8 flex-1 max-w-4xl items-center">
            {/* Title */}
            <input
              type="text"
              placeholder="What needs to be done?"
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />

            {/* Tag picker */}
            <div className="relative" ref={tagAreaRef}>
              <div
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl cursor-text min-w-[130px] max-w-[200px] h-[42px] flex-wrap overflow-hidden hover:border-indigo-300 transition-colors"
                onClick={() => newTaskTags.length < 3 && setShowTagDropdown(true)}
              >
                {newTaskTags.map(tag => (
                  <span key={tag} className="flex items-center gap-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    #{tag}
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); removeTag(tag); }}
                      className="text-yellow-500 hover:text-yellow-800 leading-none ml-0.5"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                {newTaskTags.length < 3 && (
                  <input
                    type="text"
                    placeholder={newTaskTags.length === 0 ? "# Tags" : ""}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onFocus={() => setShowTagDropdown(true)}
                    onKeyDown={handleTagKeyDown}
                    className="flex-1 min-w-[40px] bg-transparent outline-none text-sm text-slate-600 placeholder-slate-400 w-full"
                  />
                )}
              </div>

              {/* Dropdown - uses fixed positioning to escape overflow:hidden parents */}
              {showTagDropdown && (
                <div
                  className="bg-white border border-slate-200 rounded-xl shadow-lg p-3"
                  style={getDropdownStyle()}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {filteredSuggestions.length > 0 ? (
                    <>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Existing tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {filteredSuggestions.map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => addTag(tag)}
                            className="bg-yellow-50 text-yellow-700 text-[11px] font-bold px-2.5 py-1 rounded-full border border-yellow-200 hover:bg-yellow-100 transition-colors"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}

                  {tagInput.trim() && !allTags.includes(tagInput.toLowerCase().trim()) && (
                    <div className={filteredSuggestions.length > 0 ? 'mt-2 pt-2 border-t border-slate-100' : ''}>
                      <button
                        type="button"
                        onClick={() => addTag(tagInput)}
                        className="bg-slate-100 text-slate-600 text-[11px] font-bold px-2.5 py-1 rounded-full border border-slate-200 hover:bg-slate-200 transition-colors"
                      >
                        + Create "#{tagInput.trim()}"
                      </button>
                    </div>
                  )}

                  {filteredSuggestions.length === 0 && !tagInput.trim() && (
                    <p className="text-xs text-slate-400">Type a tag name and press Enter</p>
                  )}

                  {newTaskTags.length >= 3 && (
                    <p className="text-xs text-amber-500 font-semibold">Max 3 tags reached</p>
                  )}
                </div>
              )}
            </div>

            {/* Date - slightly narrower */}
            <input
              type="date"
              value={newTaskDeadline}
              onChange={(e) => setNewTaskDeadline(e.target.value)}
              className="w-36 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all cursor-pointer"
            />

            {/* Urgency - slightly narrower */}
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

            <button
              type="button"
              onClick={connectToGoogleCalendar}
              className="p-2 text-xl text-slate-500 rounded-full cursor-pointer hover:bg-slate-200 hover:text-slate-800 transition-colors flex items-center justify-center"
              title="חיבור ליומן גוגל"
            >
            🔗
            </button>
          </form>
        </header>


        <div className="flex-1 p-6 overflow-hidden">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-5 h-full">

              {columns.map(status => {
                const todayObj = new Date();
                const todayStr = todayObj.toISOString().split('T')[0];

                const nextWeekObj = new Date();
                nextWeekObj.setDate(nextWeekObj.getDate() + 7);
                const nextWeekStr = nextWeekObj.toISOString().split('T')[0];

                let columnTasks = tasks.filter(t => t.status === status);

                columnTasks = [...columnTasks].sort((a, b) => {
                  // Search boost — matching tasks always float to top
                  const sq = searchQuery.trim().toLowerCase();
                  if (sq) {
                    const isTagSearch = sq.startsWith('#');
                    const tagQ = isTagSearch ? sq.slice(1) : '';
                    const aMatch = isTagSearch
                      ? (a.tags || []).some(t => t.toLowerCase().includes(tagQ))
                      : a.title.toLowerCase().includes(sq);
                    const bMatch = isTagSearch
                      ? (b.tags || []).some(t => t.toLowerCase().includes(tagQ))
                      : b.title.toLowerCase().includes(sq);
                    if (aMatch && !bMatch) return -1;
                    if (!aMatch && bMatch) return 1;
                  }

                  if (activeFilter === 'today') {
                    const aIsToday = a.due_date === todayStr;
                    const bIsToday = b.due_date === todayStr;
                    if (aIsToday && !bIsToday) return -1;
                    if (!aIsToday && bIsToday) return 1;
                  }
                  else if (activeFilter === 'tomorrow') {
                    const tomorrowObj = new Date();
                    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
                    const tomorrowStr = tomorrowObj.toISOString().split('T')[0];
                    const aIsTomorrow = a.due_date === tomorrowStr;
                    const bIsTomorrow = b.due_date === tomorrowStr;
                    if (aIsTomorrow && !bIsTomorrow) return -1;
                    if (!aIsTomorrow && bIsTomorrow) return 1;
                  }
                  else if (activeFilter === 'next7days') {
                    const aIsNext7 = a.due_date >= todayStr && a.due_date <= nextWeekStr && a.due_date !== null;
                    const bIsNext7 = b.due_date >= todayStr && b.due_date <= nextWeekStr && b.due_date !== null;
                    if (aIsNext7 && !bIsNext7) return -1;
                    if (!aIsNext7 && bIsNext7) return 1;
                  }
                  else if (activeFilter === 'next_X_days') {
                    const maxDate = new Date();
                    maxDate.setDate(maxDate.getDate() + customDaysCount);
                    const maxDateStr = maxDate.toISOString().split('T')[0];
                    const aIsNextX = a.due_date >= todayStr && a.due_date <= maxDateStr && a.due_date !== null;
                    const bIsNextX = b.due_date >= todayStr && b.due_date <= maxDateStr && b.due_date !== null;
                    if (aIsNextX && !bIsNextX) return -1;
                    if (!aIsNextX && bIsNextX) return 1;
                  }
                  else if (activeFilter === 'custom' && customDate) {
                    const aIsCustom = a.due_date === customDate;
                    const bIsCustom = b.due_date === customDate;
                    if (aIsCustom && !bIsCustom) return -1;
                    if (!aIsCustom && bIsCustom) return 1;
                  }
                  else if (activeFilter === 'high_urgency') {
                    if (a.urgency === 'high' && b.urgency !== 'high') return -1;
                    if (a.urgency !== 'high' && b.urgency === 'high') return 1;
                  }
                  else if (activeFilter === 'normal_urgency') {
                    const aIsNormal = a.urgency === 'normal' || !a.urgency;
                    const bIsNormal = b.urgency === 'normal' || !b.urgency;
                    if (aIsNormal && !bIsNormal) return -1;
                    if (!aIsNormal && bIsNormal) return 1;
                  }
                  else if (activeFilter === 'low_urgency') {
                    if (a.urgency === 'low' && b.urgency !== 'low') return -1;
                    if (a.urgency !== 'low' && b.urgency === 'low') return 1;
                  }

                  if (status === 'To Do') {
                    if (a.is_routine && !b.is_routine) return -1;
                    if (!a.is_routine && b.is_routine) return 1;
                  }
                  return 0;
                });

                return (
                  <Droppable key={status} droppableId={status}>
                    {(provided, snapshot) => (
                      <div
                        className={`flex-1 flex flex-col rounded-2xl border transition-colors overflow-hidden ${
                          snapshot.isDraggingOver ? 'bg-indigo-50/70 border-indigo-300 shadow-inner' : 'bg-slate-100/50 border-slate-200'
                        }`}
                      >

                        <h3 className="font-bold text-slate-700 p-4 border-b border-slate-200/60 bg-slate-100 flex items-center justify-between shrink-0">
                          {status}
                          <span className="bg-white shadow-sm text-slate-500 text-xs py-1 px-2.5 rounded-full font-semibold border border-slate-200">
                            {columnTasks.length}
                          </span>
                        </h3>


                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar"
                        >
                          {columnTasks.map((task, index) => (
                            <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`group relative bg-white p-4 rounded-xl shadow-sm border transition-all ${
                                    snapshot.isDragging ? 'shadow-lg ring-2 ring-indigo-400 rotate-2 cursor-grabbing' : 'cursor-grab hover:border-indigo-200 hover:shadow-md'
                                  } ${
                                    status === 'Done' ? 'border-l-4 border-l-emerald-400 opacity-80' :
                                    status === 'In Progress' ? 'border-l-4 border-l-amber-400' : 'border-slate-100'
                                  }`}
                                >
                                  {task.created_at && (
                                    <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[11px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md">
                                      נוצר ב: {new Date(task.created_at).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}
                                    </div>
                                  )}

                                  {task.is_routine && (
                                    <span className="absolute -top-2 -left-2 text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold shadow-sm z-10 pointer-events-none">
                                      Routine
                                    </span>
                                  )}

                                  {editingTaskId === task.id ? (
                                    <div className="mb-2">
                                      <input
                                        autoFocus
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onBlur={() => handleEditSave(task.id)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleEditSave(task.id);
                                          if (e.key === 'Escape') setEditingTaskId(null);
                                        }}
                                        className="w-full text-sm font-semibold border-b-2 border-indigo-500 outline-none bg-indigo-50/50 px-1 py-1 rounded-sm text-slate-800"
                                        dir="auto"
                                      />
                                      <span className="text-[10px] text-slate-400 mt-1 block">Enter לשמירה, Esc לביטול</span>
                                    </div>
                                  ) : (
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                      <p className={`text-sm font-semibold break-all flex-1 min-w-0 ${status === 'Done' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                        {task.is_routine && task.icon
                                          ? `${task.icon} ${task.title}`
                                          : highlightText(task.title, searchQuery.trim())}
                                      </p>

                                      {status !== 'Done' && !task.is_routine && (
                                        <button
                                          onClick={() => handleEditStart(task)}
                                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-indigo-500 transition-all focus:outline-none shrink-0 cursor-pointer"
                                          title="עריכת משימה"
                                        >
                                          ✏️
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {task.is_routine && task.streak !== undefined && (
                                    <span className="text-xs text-amber-600 font-medium block mt-1">
                                      🔥 רצף נוכחי: {task.streak}
                                    </span>
                                  )}

                                  {/* Tags display */}
                                  {task.tags && task.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {task.tags.map(tag => {
                                        const sq = searchQuery.trim().toLowerCase();
                                        const isTagMatch = sq.startsWith('#') && tag.toLowerCase().includes(sq.slice(1));
                                        return (
                                          <span key={tag} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border transition-all ${
                                            isTagMatch
                                              ? 'text-yellow-800 bg-yellow-200 border-yellow-400 ring-1 ring-yellow-300'
                                              : 'text-yellow-600 bg-yellow-50 border-yellow-200'
                                          }`}>
                                            #{tag}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Urgency + due date on the same row */}
                                  {((task.urgency && task.urgency !== 'normal') || task.due_date) && (
                                    <div className="flex items-center gap-2 mt-2">
                                      {task.urgency && task.urgency !== 'normal' && (
                                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border ${
                                          task.urgency === 'high' ? 'bg-red-50 text-red-600 border-red-100' :
                                          'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        }`}>
                                          {task.urgency === 'high' ? '🔴 High' : '🟢 Low'}
                                        </span>
                                      )}
                                      {task.due_date && (
                                        <div className={`flex items-center gap-1 text-[11px] font-semibold w-fit px-2 py-0.5 rounded-md border ${
                                          new Date(task.due_date) < new Date(new Date().setHours(0,0,0,0)) && status !== 'Done'
                                            ? 'text-red-600 bg-red-50 border-red-100'
                                            : 'text-slate-500 bg-slate-50 border-slate-200'
                                        }`}>
                                          📅 {new Date(task.due_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                    <button onClick={() => onDeleteTask(task.id)} className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wider">
                                      Delete
                                    </button>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => addTaskToCalendar(task)}
                                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-blue-500 transition-all focus:outline-none"
                                        title="הוסף ליומן גוגל"
                                      >
                                        📅
                                      </button>
                                      {status !== 'Done' && (
                                        <button
                                          onClick={() => onUpdateTask({ ...task, is_completed: true })}
                                          className="text-[11px] font-bold text-emerald-500 hover:text-emerald-600 transition-colors uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded-md"
                                        >
                                          ✓ Done
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
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
      </main>


      <aside className="w-56 bg-white border-l border-slate-200 shrink-0 flex flex-col z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.03)]">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
            <span>⚙️</span> Filters
          </h3>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-4">


          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Time</h4>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setActiveFilter('default')}
                className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  activeFilter === 'default' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Default
              </button>
              <button
                onClick={() => setActiveFilter('today')}
                className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  activeFilter === 'today' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Today
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${activeFilter === 'today' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>{filterCounts.today}</span>
              </button>
              <button
                onClick={() => setActiveFilter('tomorrow')}
                className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  activeFilter === 'tomorrow' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Tomorrow
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${activeFilter === 'tomorrow' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>{filterCounts.tomorrow}</span>
              </button>
              <button
                onClick={() => setActiveFilter('next7days')}
                className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  activeFilter === 'next7days' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Next 7 Days
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${activeFilter === 'next7days' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>{filterCounts.next7days}</span>
              </button>
            </div>
          </div>


          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Urgency</h4>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setActiveFilter('high_urgency')}
                className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  activeFilter === 'high_urgency' ? 'bg-red-50 text-red-700 ring-1 ring-red-200 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                High 🔴
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${activeFilter === 'high_urgency' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{filterCounts.high}</span>
              </button>
              <button
                onClick={() => setActiveFilter('normal_urgency')}
                className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  activeFilter === 'normal_urgency' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Normal 🟡
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${activeFilter === 'normal_urgency' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>{filterCounts.normal}</span>
              </button>
              <button
                onClick={() => setActiveFilter('low_urgency')}
                className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  activeFilter === 'low_urgency' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Low 🟢
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${activeFilter === 'low_urgency' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{filterCounts.low}</span>
              </button>
            </div>
          </div>


          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Specific Date</h4>
            <input
              type="date"
              value={customDate || ''}
              onChange={(e) => {
                setCustomDate(e.target.value);
                if(e.target.value) setActiveFilter('custom');
                else setActiveFilter('default');
              }}
              className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition-all ${
                activeFilter === 'custom' ? 'border-indigo-300 bg-indigo-50/30 text-indigo-700 ring-1 ring-indigo-100' : 'border-slate-200 text-slate-600 bg-slate-50 focus:bg-white focus:border-indigo-400'
              }`}
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
                className={`w-full pl-8 pr-7 py-2 border rounded-lg text-sm outline-none transition-all ${
                  searchQuery ? 'border-indigo-300 bg-indigo-50/30 text-indigo-700 ring-1 ring-indigo-100' : 'border-slate-200 text-slate-600 bg-slate-50 focus:bg-white focus:border-indigo-400'
                }`}
                dir="auto"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="mt-auto pt-4 mt-4 border-t border-slate-200/60">
            <div className="text-center bg-slate-50 rounded-xl p-4 transition-all hover:bg-slate-100 shadow-sm">
              <p className="text-sm text-slate-600 font-medium italic mb-2">
                "{quote.text}"
              </p>
              <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
                — {quote.author}
              </p>
            </div>
          </div>

        </div>
      </aside>

    </div>
  );
}
