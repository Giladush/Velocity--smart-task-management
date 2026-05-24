import React, { useState, useEffect } from 'react';
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
    onAddTask(newTaskTitle, newTaskDeadline, newTaskUrgency); 
    setNewTaskTitle('');
    setNewTaskDeadline('');
    setNewTaskUrgency('normal');
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50/50">
      
      
      <main className="flex-1 flex flex-col min-w-0">
        
        
        <header className="h-[88px] border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0 z-10 shadow-sm">
          <h2 className="text-2xl font-extrabold text-slate-800 shrink-0">My Tasks</h2>
          
          <form onSubmit={handleSubmit} className="flex gap-3 ml-8 flex-1 max-w-4xl">
            <input 
              type="text" 
              placeholder="What needs to be done?" 
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
            
            <input 
              type="date" 
              value={newTaskDeadline}
              onChange={(e) => setNewTaskDeadline(e.target.value)}
              className="w-40 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all cursor-pointer"
            />
            
            <select
              value={newTaskUrgency}
              onChange={(e) => setNewTaskUrgency(e.target.value)}
              className="w-36 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="normal">Normal 🟡</option>
              <option value="high">High 🔴</option>
              <option value="low">Low 🟢</option>
            </select>

            <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all hover:shadow hover:-translate-y-0.5 whitespace-nowrap">
              + Add Task
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
                  if (activeFilter === 'today') {
                    const aIsToday = a.due_date === todayStr;
                    const bIsToday = b.due_date === todayStr;
                    if (aIsToday && !bIsToday) return -1;
                    if (!aIsToday && bIsToday) return 1;
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
                                        {task.is_routine && task.icon ? `${task.icon} ${task.title}` : task.title}
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

                                  {task.urgency && task.urgency !== 'normal' && (
                                    <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border ${
                                      task.urgency === 'high' ? 'bg-red-50 text-red-600 border-red-100' : 
                                      'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    }`}>
                                      {task.urgency === 'high' ? '🔴 High' : '🟢 Low'}
                                    </span>
                                  )}

                                  {task.due_date && (
                                    <div className={`mt-2 flex items-center gap-1 text-[11px] font-semibold w-fit px-2 py-0.5 rounded-md border ${
                                      new Date(task.due_date) < new Date(new Date().setHours(0,0,0,0)) && status !== 'Done'
                                        ? 'text-red-600 bg-red-50 border-red-100' 
                                        : 'text-slate-500 bg-slate-50 border-slate-200'
                                    }`}>
                                      📅 {new Date(task.due_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
                                    </div>
                                  )}
                                    
                                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                    <button onClick={() => onDeleteTask(task.id)} className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wider">
                                      Delete
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
        
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          
          
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Time</h4>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setActiveFilter('default')}
                className={`text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeFilter === 'default' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Default
              </button>
              <button 
                onClick={() => setActiveFilter('today')}
                className={`text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeFilter === 'today' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Today
              </button>
              <button 
                onClick={() => setActiveFilter('next7days')}
                className={`text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeFilter === 'next7days' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Next 7 Days
              </button>
            </div>
          </div>

          
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Urgency</h4>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setActiveFilter('high_urgency')}
                className={`text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeFilter === 'high_urgency' ? 'bg-red-50 text-red-700 ring-1 ring-red-200 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                High 🔴
              </button>
              <button 
                onClick={() => setActiveFilter('normal_urgency')}
                className={`text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeFilter === 'normal_urgency' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Normal 🟡
              </button>
              <button 
                onClick={() => setActiveFilter('low_urgency')}
                className={`text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeFilter === 'low_urgency' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Low 🟢
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