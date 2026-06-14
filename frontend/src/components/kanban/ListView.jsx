import React from 'react';

export default function ListView({
  listTasks,
  editingTaskId, editTitle, setEditTitle,
  handleEditStart, handleEditSave, setEditingTaskId,
  handleStatusChange, onDeleteTask, onUpdateTask,
  addTaskToCalendar, highlightText, renderTagChips, isFilterMatch
}) {
  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">
      {/* Column headers */}
      <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0">
        <div className="w-1.5 shrink-0" />
        <span className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Task</span>
        <span className="w-[132px] shrink-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</span>
        <span className="w-16 shrink-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Urgency</span>
        <span className="w-[72px] shrink-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Due</span>
        <span className="w-[176px] shrink-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actions</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {listTasks.map((task, i) => {
          const isOverdue = task.due_date
            && new Date(task.due_date) < new Date(new Date().setHours(0, 0, 0, 0))
            && task.status !== 'Done';

          const matched = isFilterMatch?.(task) ?? false;
          const prevMatched = i > 0 && (isFilterMatch?.(listTasks[i - 1]) ?? false);

          const shadows = [];
          if (matched) {
            shadows.push('inset 2px 0 0 0 #a5b4fc');
            shadows.push('inset -2px 0 0 0 #a5b4fc');
            shadows.push('inset 0 -2px 0 0 #a5b4fc');
            if (!prevMatched) shadows.push('inset 0 2px 0 0 #a5b4fc');
          }

          return (
            <div
              key={task.id}
              style={matched ? { boxShadow: shadows.join(', ') } : {}}
              className={`group flex items-center gap-3 px-5 py-3 border-b border-slate-100 hover:ring-1 hover:ring-inset hover:ring-indigo-200 hover:bg-indigo-50/20 transition-all ${task.status === 'Done' ? 'opacity-65' : ''}`}
            >
              {/* Status color bar */}
              <div className={`w-1.5 h-9 rounded-full shrink-0 ${
                task.status === 'Done' ? 'bg-emerald-400'
                : task.status === 'In Progress' ? 'bg-amber-400'
                : 'bg-slate-300'
              }`} />

              {/* Title + tags */}
              <div className="flex-1 min-w-0">
                {editingTaskId === task.id ? (
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => handleEditSave(task.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditSave(task.id);
                      if (e.key === 'Escape') setEditingTaskId(null);
                    }}
                    className="w-full text-sm font-semibold border-b-2 border-indigo-500 outline-none bg-indigo-50/50 px-1 py-0.5 rounded-sm text-slate-800"
                    dir="auto"
                  />
                ) : (
                  <p className={`text-sm font-semibold truncate ${task.status === 'Done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {task.is_routine && task.icon ? `${task.icon} ${task.title}` : highlightText(task.title)}
                    {task.is_routine && (
                      <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold uppercase">Routine</span>
                    )}
                  </p>
                )}
                {renderTagChips(task, true)}
                {task.is_routine && task.streak !== undefined && (
                  <span className="text-[11px] text-amber-600 font-medium">🔥 {task.streak}</span>
                )}
              </div>

              {/* Status select */}
              <div className="w-[132px] shrink-0">
                <select
                  value={task.status || 'To Do'}
                  onChange={(e) => handleStatusChange(task, e.target.value)}
                  className={`w-full text-xs font-bold px-2 py-1.5 rounded-lg border outline-none cursor-pointer transition-colors ${
                    task.status === 'Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : task.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              {/* Urgency */}
              <div className="w-16 shrink-0 flex justify-center">
                {task.urgency && task.urgency !== 'normal' ? (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border ${
                    task.urgency === 'high' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  }`}>
                    {task.urgency === 'high' ? '🔴 High' : '🟢 Low'}
                  </span>
                ) : (
                  <span className="text-slate-300 text-sm">—</span>
                )}
              </div>

              {/* Due date */}
              <div className="w-[72px] shrink-0 flex justify-center">
                {task.due_date ? (
                  <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md border ${
                    isOverdue ? 'text-red-600 bg-red-50 border-red-100' : 'text-slate-500 bg-slate-50 border-slate-200'
                  }`}>
                    {new Date(task.due_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
                  </span>
                ) : (
                  <span className="text-slate-300 text-sm">—</span>
                )}
              </div>

              {/* Actions */}
              <div className="w-[176px] shrink-0 flex items-center justify-between">
                <button onClick={() => addTaskToCalendar(task)} title="Add to Google Calendar" className="text-slate-400 hover:text-blue-500 transition-colors">📅</button>
                {!task.is_routine && (
                  <button onClick={() => handleEditStart(task)} className="text-slate-400 hover:text-indigo-500 transition-colors" title="Edit">✏️</button>
                )}
                {!task.is_routine && (
                  <button onClick={() => onDeleteTask(task.id)} className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wide">Delete</button>
                )}
                {task.status !== 'Done' && (
                  <button
                    onClick={() => onUpdateTask({ ...task, is_completed: true, status: 'Done' })}
                    className="text-[11px] font-bold text-emerald-500 hover:text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md uppercase tracking-wide whitespace-nowrap"
                  >✓ Done</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
