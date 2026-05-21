from flask import Flask, jsonify, request
from flask_cors import CORS
from models import db, Task, Process, Routine
from datetime import date, timedelta
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///velocity.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# טעינת משתני הסביבה (מפתח ה-API)
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

# אתחול מודל ה-AI
if api_key:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-3-flash')
else:
    print("Warning: GEMINI_API_KEY not found in .env file!")

# ראוט בדיקה (Health Check)
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "Velocity Backend is running!", "db_connected": True}), 200

# --------------------------------------------------------
# ראוט 1: שליפת כל התהליכים והמשימות + הזרקה וירטואלית (GET)
# --------------------------------------------------------
@app.route('/api/data', methods=['GET'])
def get_all_data():
    try:
        today_date = date.today()
        today_day_name = today_date.strftime('%a') # מחזיר 'Sun', 'Mon', 'Tue' וכו'

        # 1. שליפת תהילים ומשימות השייכות אליהם
        processes = Process.query.all()
        processes_data = []
        for p in processes:
            p_tasks = []
            for t in p.tasks:
                p_tasks.append({
                    "id": t.id,
                    "title": t.title,
                    "is_completed": t.is_completed,
                    "status": "Done" if t.is_completed else "To Do", # קביעת סטטוס מפורש
                    "is_routine": False,
                    "due_date": t.due_date
                })
            processes_data.append({
                "id": p.id,
                "title": p.title,
                "description": p.description,
                "tasks": p_tasks
            })
        
        # 2. שליפת משימות עצמאיות
        standalone_tasks = Task.query.filter_by(process_id=None).all()
        standalone_data = []
        for t in standalone_tasks:
            standalone_data.append({
                "id": t.id,
                "title": t.title,
                "is_completed": t.is_completed,
                "status": "Done" if t.is_completed else "To Do", # קביעת סטטוס מפורש
                "is_routine": False,
                "due_date": t.due_date
            })

       # 3. הזרקה וירטואלית של שגרות היום (רק אם חלות היום)
        active_routines = Routine.query.filter_by(is_active=True).all()
        today_str = today_date.strftime('%Y-%m-%d') # הופך את היום לטקסט
        
        for routine in active_routines:
            if today_day_name in routine.frequency:
                
                # השוואה מאובטחת: המרה של תאריך ההשלמה לטקסט
                is_done = False
                if routine.last_completed_date:
                    if hasattr(routine.last_completed_date, 'strftime'):
                        last_comp_str = routine.last_completed_date.strftime('%Y-%m-%d')
                    else:
                        last_comp_str = str(routine.last_completed_date)[:10] 
                    
                    is_done = (last_comp_str == today_str)

                standalone_data.append({
                    "id": f"routine_{routine.id}",  
                    "routine_id": routine.id,       
                    "title": routine.title,
                    "icon": routine.icon,
                    "is_completed": is_done,
                    "status": "Done" if is_done else "To Do", 
                    "is_routine": True,
                    "streak": routine.streak if routine.streak is not None else 0,
                    "due_date": None

                })

        return jsonify({
            "processes": processes_data,
            "standalone_tasks": standalone_data
        }), 200

    except Exception as e:
        print(f"Error in get_all_data: {str(e)}")
        return jsonify({"error": str(e)}), 500
# --------------------------------------------------------
# ראוט 2: יצירת משימה חדשה (POST)
# --------------------------------------------------------
@app.route('/api/tasks', methods=['POST'])
def add_task():
    data = request.get_json()
    due_date = data.get('due_date')
    title = data.get('title')
    
    if not title:
        return jsonify({"error": "Task title is required"}), 400

    new_task = Task(title=data['title'], process_id=data.get('process_id'), due_date=due_date) 
    
    db.session.add(new_task)
    db.session.commit()
    
    return jsonify({
        "id": new_task.id,
        "title": new_task.title,
        "is_completed": new_task.is_completed
    }), 201

# --------------------------------------------------------
# ראוט 3: עדכון משימה (PUT) - סימון כהושלמה
# --------------------------------------------------------
@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = db.session.get(Task, task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
        
    data = request.get_json()
    if 'is_completed' in data:
        task.is_completed = data['is_completed']
        
    db.session.commit()
    return jsonify({"message": "Task updated", "is_completed": task.is_completed}), 200

# --------------------------------------------------------
# ראוט 4: מחיקת משימה (DELETE)
# --------------------------------------------------------
@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = db.session.get(Task, task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
        
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted successfully"}), 200


# --------------------------------------------------------
# ראוט 5: סוכן ה-AI לפירוק משימות (Stride)
# --------------------------------------------------------
@app.route('/api/chat', methods=['POST'])
def chat_with_stride():
    try:
        data = request.get_json()
        user_message = data.get('message')
        
        if not user_message:
            return jsonify({"error": "No message provided"}), 400

        # --- 1. הזרקת נתונים ---
        today_str = date.today().isoformat()
        
        open_tasks_query = Task.query.filter_by(is_completed=False).all()
        open_tasks = [{"id": t.id, "title": t.title, "due_date": t.due_date} for t in open_tasks_query]

        processes_query = Process.query.all()
        existing_processes = [{"id": p.id, "title": p.title} for p in processes_query]

        # שליפת שגרות כדי שה-AI יכיר אותן ויוכל למחוק אותן
        routines_query = Routine.query.all()
        existing_routines = [{"id": r.id, "title": r.title} for r in routines_query]

        # --- 2. הפרומפט המעודכן ---
        prompt = f"""
        You are Stride AI, an expert task manager and proactive smart assistant.
        Today's date is: {today_str}.
        Current open tasks: {json.dumps(open_tasks, ensure_ascii=False)}
        Existing processes: {json.dumps(existing_processes, ensure_ascii=False)}
        Existing routines: {json.dumps(existing_routines, ensure_ascii=False)}

        The user says: "{user_message}"

        Analyze the request and decide the BEST intent.
        CRITICAL RULE: If the user directly commands you to create, delete, or modify something, DO IT IMMEDIATELY using the correct intent. DO NOT ask for confirmation, even if a similar item already exists.
        You must respond ONLY with a valid JSON object in this exact format:
        {{
          "reply": "Your conversational, helpful response in HEBREW.",
          "intent": "ONE_OF: create_process, create_task, create_routine, delete_task, delete_tasks, delete_routine, filter, complete_tasks, advice, navigate, general_chat",
          "payload": {{ ... see instructions below ... }}
        }}

        PAYLOAD INSTRUCTIONS:
        - if intent='create_process': (CRITICAL: Use this for multi-step goals, projects, "תוכנית", "תהליך") payload = {{"process_title": "...", "process_description": "...", "tasks": ["task 1", "task 2"]}}
        - if intent='create_task': payload = {{"title": "...", "due_date": "YYYY-MM-DD" or null}}
        - if intent='create_routine': payload = {{"title": "..."}}
        - if intent='delete_task': payload = {{"task_id": 123}} (find ID from open tasks)
        - if intent='delete_tasks': payload = {{"target_date": "YYYY-MM-DD" or "today" or "all"}}
        - if intent='delete_routine': payload = {{"routine_id": 123}} (find ID from Existing routines)
        - if intent='filter': payload = {{"filter_value": "next_X_days" or "custom" or "today", "days_count": int, "custom_date": "YYYY-MM-DD"}} 
        - if intent='complete_tasks': payload = {{"target_date": "YYYY-MM-DD" or "today" or "all"}}
        - if intent='advice': payload = {{"advice_text": "Detailed Markdown advice..."}}
        - if intent='navigate': payload = {{"view": "processes" or "tasks" or "routines", "process_id": int}}
        - if intent='general_chat': payload = {{}}
        """

        # --- 3. הפעלת מודל ה-AI ---
        available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        if not available_models:
             raise Exception("No active generative models found.")
             
        chosen_model_name = next((name for name in available_models if 'flash' in name or 'pro' in name), available_models[-1])
        current_model = genai.GenerativeModel(chosen_model_name)
        
        response = current_model.generate_content(
            prompt, 
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        
        # --- שכבת ההגנה: טיפול ב-JSON עקשן ---
        result = json.loads(response.text)
        if isinstance(result, list): 
            result = result[0] if len(result) > 0 else {}
        
        print("\n====== AI BRAIN ======")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        print("======================\n")

        intent = result.get("intent", "general_chat")
        
        payload = result.get("payload", {})
        if isinstance(payload, list):
            payload = payload[0] if len(payload) > 0 else {}

        ai_reply = result.get("reply", "הבנתי!")
        action = None

        # --- 4. מנוע הביצוע ---
        if intent == "create_process":
            new_process = Process(
                title=payload.get("process_title", "תהליך חדש"),
                description=payload.get("process_description", "")
            )
            db.session.add(new_process)
            db.session.flush() 
            for t_title in payload.get("tasks", []):
                db.session.add(Task(title=t_title, process_id=new_process.id))
            db.session.commit()
            action = {"type": "NAVIGATE", "payload": {"view": "processes", "process_id": new_process.id}}

        elif intent == "create_task":
            new_task = Task(title=payload.get("title"), due_date=payload.get("due_date"))
            db.session.add(new_task)
            db.session.commit()
            action = {"type": "REFRESH_DATA"}

        elif intent == "create_routine":
            new_routine = Routine(title=payload.get("title"))
            db.session.add(new_routine)
            db.session.commit()
            action = {"type": "REFRESH_DATA"}

        elif intent == "delete_task":
            task_id = payload.get("task_id")
            if task_id:
                Task.query.filter_by(id=task_id).delete()
                db.session.commit()
                action = {"type": "REFRESH_DATA"}

        elif intent == "delete_tasks":
            target_date = payload.get("target_date")
            if target_date == "all":
                Task.query.filter_by(is_completed=False).delete()
            else:
                actual_date = today_str if target_date == "today" else target_date
                Task.query.filter_by(due_date=actual_date, is_completed=False).delete()
            db.session.commit()
            action = {"type": "REFRESH_DATA"}

        elif intent == "delete_routine":
            routine_id = payload.get("routine_id")
            if routine_id:
                Routine.query.filter_by(id=routine_id).delete()
                db.session.commit()
                action = {"type": "REFRESH_DATA"}

        elif intent == "complete_tasks":
            target_date = payload.get("target_date")
            if target_date == "all":
                Task.query.filter_by(is_completed=False).update({"is_completed": True})
            else:
                actual_date = today_str if target_date == "today" else target_date
                Task.query.filter_by(due_date=actual_date, is_completed=False).update({"is_completed": True})
            db.session.commit()
            action = {"type": "REFRESH_DATA"}

        elif intent == "filter":
            action = {"type": "SET_FILTER", "payload": payload}

        elif intent == "navigate":
            action = {"type": "NAVIGATE", "payload": payload}

        elif intent == "advice":
            action = {"type": "SET_ADVICE", "payload": payload}

        return jsonify({"reply": ai_reply, "action": action}), 200

    except Exception as e:
        print(f"AI ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "AI Processing Failed"}), 500
# ========================================================
# Routines API Routes
# ========================================================

# 1. קבלת כל השגרות
@app.route('/api/routines', methods=['GET'])
def get_routines():
    try:
        routines = Routine.query.filter_by(is_active=True).all()
        return jsonify([r.to_dict() for r in routines]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 2. יצירת שגרה חדשה
@app.route('/api/routines', methods=['POST'])
def create_routine():
    try:
        data = request.json
        new_routine = Routine(
            title=data.get('title'),
            icon=data.get('icon', '⚡')
        )
        if 'frequency' in data:
            new_routine.frequency = data['frequency']
            
        db.session.add(new_routine)
        db.session.commit()
        return jsonify(new_routine.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# 3. מחיקת שגרה
@app.route('/api/routines/<int:routine_id>', methods=['DELETE'])
def delete_routine(routine_id):
    try:
        routine = Routine.query.get_or_404(routine_id)
        db.session.delete(routine)
        db.session.commit()
        return jsonify({"message": "Routine deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# 4. סימון שגרה (Toggle) עם לוגיקת סטריק חכמה
@app.route('/api/routines/<int:routine_id>/toggle', methods=['POST'])
def toggle_routine(routine_id):
    try:
        routine = Routine.query.get_or_404(routine_id)
        today = date.today()
        
        if routine.completed_today:
            # ביטול השלמה של היום (Untoggle)
            routine.last_completed_date = None
            if routine.streak > 0:
                routine.streak -= 1
        else:
            # מציאת הפעם הקודמת שהשגרה הזו הייתה אמורה להתבצע
            previous_scheduled_date = None
            
            # הולכים אחורה בזמן (עד 7 ימים) כדי למצוא את יום השגרה הקודם
            for i in range(1, 8):
                past_date = today - timedelta(days=i)
                if past_date.strftime('%a') in routine.frequency:
                    previous_scheduled_date = past_date
                    break
            
            # אם השגרה הושלמה ביום הקודם שהיא הייתה מיועדת לו, או שזה סטריק חדש
            if routine.last_completed_date == previous_scheduled_date or routine.streak == 0:
                routine.streak += 1
            else:
                # השגרה פוספסה (התאדתה) באחד הימים הקודמים - הסטריק מתאפס
                routine.streak = 1
                
            routine.last_completed_date = today
            
        db.session.commit()
        return jsonify(routine.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# ========================================================
# הפעלת השרת - תמיד בסוף הקובץ!
# ========================================================
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)