import React from 'react';

export default function TaskCard({
  task, status, provided, snapshot,
  editingTaskId, editTitle, setEditTitle,
  handleEditStart, handleEditSave, setEditingTaskId,
  onDeleteTask, onUpdateTask, addTaskToCalendar,
  highlightText, renderTagChips, searchQuery
}) {
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={`group relative bg-white p-4 rounded-xl shadow-sm border transition-all ${
        snapshot.isDragging
          ? 'shadow-lg ring-2 ring-indigo-400 rotate-2 cursor-grabbing'
          : 'cursor-grab hover:border-indigo-200 hover:shadow-md'
      } ${
        status === 'Done' ? 'border-l-4 border-l-emerald-400 opacity-80'
        : status === 'In Progress' ? 'border-l-4 border-l-amber-400'
        : 'border-slate-100'
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
            {task.is_routine && task.icon ? `${task.icon} ${task.title}` : highlightText(task.title, searchQuery.trim())}
          </p>
          {status !== 'Done' && !task.is_routine && (
            <button
              onClick={() => handleEditStart(task)}
              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-indigo-500 transition-all focus:outline-none shrink-0 cursor-pointer"
              title="עריכת משימה"
            >✏️</button>
          )}
        </div>
      )}

      {task.is_routine && task.streak !== undefined && (
        <span className="text-xs text-amber-600 font-medium block mt-1">🔥 רצף נוכחי: {task.streak}</span>
      )}

      {renderTagChips(task)}

      {((task.urgency && task.urgency !== 'normal') || task.due_date) && (
        <div className="flex items-center gap-2 mt-2">
          {task.urgency && task.urgency !== 'normal' && (
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border ${
              task.urgency === 'high' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
            }`}>
              {task.urgency === 'high' ? '🔴 High' : '🟢 Low'}
            </span>
          )}
          {task.due_date && (
            <div className={`flex items-center gap-1 text-[11px] font-semibold w-fit px-2 py-0.5 rounded-md border ${
              new Date(task.due_date) < new Date(new Date().setHours(0, 0, 0, 0)) && status !== 'Done'
                ? 'text-red-600 bg-red-50 border-red-100'
                : 'text-slate-500 bg-slate-50 border-slate-200'
            }`}>
              📅 {new Date(task.due_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <button
          onClick={() => onDeleteTask(task.id)}
          className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wider"
        >Delete</button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => addTaskToCalendar(task)}
            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-blue-500 transition-all focus:outline-none"
            title="הוסף ליומן גוגל"
          >📅</button>
          {status !== 'Done' && (
            <button
              onClick={() => onUpdateTask({ ...task, is_completed: true, status: 'Done' })}
              className="text-[11px] font-bold text-emerald-500 hover:text-emerald-600 transition-colors uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded-md"
            >✓ Done</button>
          )}
        </div>
      </div>
    </div>
  );
}
