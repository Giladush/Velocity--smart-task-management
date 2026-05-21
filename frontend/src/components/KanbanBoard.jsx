import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function KanbanBoard({ tasks, onAddTask, onUpdateTask, onDeleteTask, onDragEnd, activeFilter, customDate, customDaysCount }) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState(''); // הוספת הסטייט לתאריך
  const columns = ['To Do', 'In Progress', 'Done'];

  const handleSubmit = (e) => {
  e.preventDefault();
  if (!newTaskTitle.trim()) return;
  
  // שולחים לפונקציה ב-App גם את הכותרת וגם את התאריך
  onAddTask(newTaskTitle, newTaskDeadline); 
  
  // איפוס השדות אחרי היצירה
  setNewTaskTitle('');
  setNewTaskDeadline('');
};

  return (
    <main className="flex-1 flex flex-col relative">
      <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 z-10">
        <h2 className="text-xl font-bold text-slate-800">My Board</h2>
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input 
            type="text" 
            placeholder="What needs to be done?" 
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 shadow-sm"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
          <input 
          type="date" 
          value={newTaskDeadline}
          onChange={(e) => setNewTaskDeadline(e.target.value)}
          className="border rounded px-3 py-2 text-sm text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100"
        />
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm">
            + Add Task
          </button>
        </form>
      </header>
      
      <div className="flex-1 p-8 overflow-x-auto">
        {/* העטיפה הראשית שמזהה גרירות */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 h-full min-w-max">
            
            {columns.map(status => {
          // 1. הגדרת תאריכי ייחוס (לצורך השוואות)
          const todayObj = new Date();
          const todayStr = todayObj.toISOString().split('T')[0]; // "YYYY-MM-DD"

          const nextWeekObj = new Date();
          nextWeekObj.setDate(nextWeekObj.getDate() + 7);
          const nextWeekStr = nextWeekObj.toISOString().split('T')[0];

          // 2. סינון המשימות לטור הנוכחי
          let columnTasks = tasks.filter(t => t.status === status);
        // 3. מיון חכם - חל על *כל* הטורים
        columnTasks = [...columnTasks].sort((a, b) => {
          
          // עדיפות עליונה: הפילטר האקטיבי
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

          // עדיפות שנייה (תקף רק לטור ה-To Do): שגרות קופצות למעלה
          if (status === 'To Do') {
            if (a.is_routine && !b.is_routine) return -1;
            if (!a.is_routine && b.is_routine) return 1;
          }

          // אם המשימות זהות מבחינת הפילטרים, שמור על סדר הזנתן המקורי (ברירת מחדל)
          return 0; 
        });
              
              return (
                // אזור שאפשר לזרוק אליו פתקים (עמודה)
                <Droppable key={status} droppableId={status}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`w-80 rounded-3xl p-5 flex flex-col gap-4 border transition-colors ${
                        snapshot.isDraggingOver ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-100/50 border-slate-200/60'
                      }`}
                    >
                      <h3 className="font-bold text-slate-700 px-1 flex items-center justify-between">
                        {status}
                        <span className="bg-slate-200 text-slate-600 text-xs py-1 px-2 rounded-full">
                          {columnTasks.length}
                        </span>
                      </h3>
                      
                      {columnTasks.map((task, index) => (
                        // הפתקית עצמה שאפשר לגרור
                        <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            className={`relative bg-white p-5 rounded-2xl shadow-sm border transition-all ${
                              snapshot.isDragging ? 'shadow-lg ring-2 ring-indigo-400 rotate-2 cursor-grabbing' : 'cursor-grab'
                            } ${
                              status === 'Done' ? 'border-l-4 border-l-emerald-400 opacity-80' : 
                              status === 'In Progress' ? 'border-l-4 border-l-amber-400' : 'border-slate-100'
                            }`}
                          >
                            {/* 1. הזרקת תגית השגרה כאן: */}
                            {task.is_routine && (
                              <span className="absolute -top-2 -left-2 text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold shadow-sm z-10 pointer-events-none">
                                Routine
                              </span>
                            )}

                            <p className={`text-sm font-semibold ${status === 'Done' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                              {task.is_routine && task.icon ? `${task.icon} ${task.title}` : task.title}
                            </p>

                            {/* 2. הזרקת תצוגת הסטריק (הרצף) מתחת לכותרת: */}
                            {task.is_routine && task.streak !== undefined && (
                              <span className="text-xs text-amber-600 font-medium block mt-1">
                                🔥 רצף נוכחי: {task.streak}
                              </span>
                            )}
                              
                              <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                                <button onClick={() => onDeleteTask(task.id)} className="text-xs font-medium text-slate-400 hover:text-red-500">
                                  Delete
                                </button>
                               {status !== 'Done' && (
                                  <button 
                                    onClick={() => onUpdateTask(task)} 
                                    className="text-xs font-bold text-emerald-500 hover:text-emerald-600 transition-colors"
                                  >
                                    ✓ Done
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {/* שומר המקום של הספרייה כדי שהעמודה לא תקרוס בזמן גרירה */}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}

          </div>
        </DragDropContext>
      </div>
    </main>
  );
}