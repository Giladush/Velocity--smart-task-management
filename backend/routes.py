from flask import Blueprint, jsonify, request
from models import db, Task, Process, Routine, User, CompletionLog
from datetime import date, timedelta, datetime
import os
import json
import requests
import google.generativeai as genai
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from sqlalchemy import func


main_bp = Blueprint('main', __name__)

# Health Check
@main_bp.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "Velocity Backend is running!", "db_connected": True}), 200

# registration and login routes
@main_bp.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    
    if User.query.filter_by(username=username).first() or User.query.filter_by(email=email).first():
        return jsonify({"error": "Username or email already exists"}), 400

    new_user = User(username=username, email=email)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201

@main_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()

    if user and user.check_password(password):
        access_token = create_access_token(identity=str(user.id))
        return jsonify({"access_token": access_token, "username": user.username}), 200

    return jsonify({"error": "Invalid credentials"}), 401

# analytics route
@main_bp.route('/api/analytics', methods=['GET'])
@jwt_required() 
def get_analytics():
    try:
        current_user_id = int(get_jwt_identity()) 

        total_tasks = Task.query.filter_by(user_id=current_user_id).count()
        completed_tasks = Task.query.filter_by(user_id=current_user_id, is_completed=True).count()
        overall_progress = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

        processes = Process.query.filter_by(user_id=current_user_id).all()
        processes_data = []
        
        for p in processes:
            p_total = Task.query.filter_by(process_id=p.id).count()
            p_completed = Task.query.filter_by(process_id=p.id, is_completed=True).count()
            p_progress = (p_completed / p_total * 100) if p_total > 0 else 0
            
            processes_data.append({
                "id": p.id,
                "title": p.title,
                "progress": round(p_progress)
            })

        today = datetime.now().date()
        weekly_data = []
        
        for i in range(6, -1, -1):
            target_date = today - timedelta(days=i)
            
            daily_count = CompletionLog.query.filter_by(
                user_id=current_user_id,
                completed_date=target_date
            ).count()
            
            weekly_data.append({
                "date": target_date.strftime('%d/%m'), 
                "day": target_date.strftime('%a'),     
                "completed": daily_count
            })

        open_high = Task.query.filter(
            Task.user_id == current_user_id, 
            Task.is_completed == False, 
            Task.process_id == None,  
            Task.urgency.in_(['high', 'High'])
        ).count()
        
        open_normal = Task.query.filter(
            Task.user_id == current_user_id, 
            Task.is_completed == False, 
            Task.process_id == None,  
            Task.urgency.in_(['normal', 'Normal', None, ''])
        ).count()
        
        open_low = Task.query.filter(
            Task.user_id == current_user_id, 
            Task.is_completed == False, 
            Task.process_id == None,  
            Task.urgency.in_(['low', 'Low'])
        ).count()
        
        open_tasks_by_priority = {
            "high": open_high,
            "normal": open_normal,
            "low": open_low
        }
        return jsonify({
            "overall_progress": round(overall_progress),
            "processes_progress": processes_data,
            "weekly_chart": weekly_data,
            "open_tasks_by_priority": open_tasks_by_priority 
        }), 200

    except Exception as e:
        print(f"Analytics Error: {e}")
        return jsonify({"error": "Failed to fetch analytics"}), 500


cached_quote = {
    "text": "The secret of getting ahead is getting started.",
    "author": "Mark Twain"
}
last_fetch_date = None

# daily quote route with caching mechanism
@main_bp.route('/api/quote', methods=['GET'])
def get_quote():
    global cached_quote, last_fetch_date
    
   
    today = datetime.now().date()
    
    
    if last_fetch_date != today:
        try:
            
            response = requests.get('https://quotes.rest/qod?language=en', timeout=5)
            
            
            if response.status_code == 200:
                data = response.json()
                if 'contents' in data and 'quotes' in data['contents']:
                    quote_data = data['contents']['quotes'][0]
                    
                    
                    cached_quote = {
                        "text": quote_data.get('quote'),
                        "author": quote_data.get('author')
                    }
                    
                    last_fetch_date = today
            else:
                print(f"Quote API returned status: {response.status_code}")
                
                
        except Exception as e:
            print(f"Error fetching quote from API: {e}")
            
    return jsonify(cached_quote), 200

# get all data route - returns processes, standalone tasks, and today's routines with a smart streak calculation
@main_bp.route('/api/data', methods=['GET'])
@jwt_required()  
def get_all_data():
    calculated_streak = 0
    try:
        current_user_id = int(get_jwt_identity()) 
        
        today_date = date.today()
        today_day_name = today_date.strftime('%a')

        processes = Process.query.filter_by(user_id=current_user_id).all()
        processes_data = []
        for p in processes:
            p_tasks = []
            for t in p.tasks:
                p_tasks.append({
                    "id": t.id,
                    "title": t.title,
                    "is_completed": t.is_completed,
                    "status": t.status if t.status else ("Done" if t.is_completed else "To Do"),
                    "is_routine": False,
                    "due_date": t.due_date,
                    "created_at": t.created_at.strftime('%Y-%m-%dT%H:%M:%S') if t.created_at else None,
                    "urgency": t.urgency or 'normal'
                })
            processes_data.append({
                "id": p.id,
                "title": p.title,
                "description": p.description,
                "tasks": p_tasks
            })
        
        standalone_tasks = Task.query.filter_by(process_id=None, user_id=current_user_id).all()
        standalone_data = []
        for t in standalone_tasks:
            standalone_data.append({
                "id": t.id,
                "title": t.title,
                "is_completed": t.is_completed,
                "status": t.status if t.status else ("Done" if t.is_completed else "To Do"),
                "is_routine": False,
                "due_date": t.due_date,
                "created_at": t.created_at.strftime('%Y-%m-%dT%H:%M:%S') if t.created_at else None,
                "urgency": t.urgency or 'normal'
            })

        active_routines = Routine.query.filter_by(is_active=True, user_id=current_user_id).all()
        today_str = today_date.strftime('%Y-%m-%d')
        
        for routine in active_routines:
            if today_day_name in routine.frequency:
                
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

        # streak calculation logic:
        logs = CompletionLog.query.filter_by(user_id=current_user_id).all()
        
        
        unique_dates = {str(log.completed_date).strip()[:10] for log in logs if log.completed_date}
        
        current_check = datetime.now().date()
        
        if str(current_check) not in unique_dates:
            current_check -= timedelta(days=1)
            
        while str(current_check) in unique_dates:
            calculated_streak += 1
            current_check -= timedelta(days=1)

        return jsonify({
            "processes": processes_data,
            "standalone_tasks": standalone_data,
            "streak": calculated_streak
        }), 200

    except Exception as e:
        print(f"Error in get_all_data: {str(e)}")
        return jsonify({"error": str(e)}), 500


# post task route- enhanced with user association and urgency handling
@main_bp.route('/api/tasks', methods=['POST'])
@jwt_required() 
def add_task():
    current_user_id = int(get_jwt_identity()) 
    
    data = request.get_json()
    due_date = data.get('due_date')
    title = data.get('title')
    
    urgency = data.get('urgency', 'normal') 
    
    if not title:
        return jsonify({"error": "Task title is required"}), 400

    new_task = Task(
        title=title, 
        process_id=data.get('process_id'), 
        due_date=due_date,
        user_id=current_user_id,
        urgency=urgency 
    ) 
    
    db.session.add(new_task)
    db.session.commit()
    
    return jsonify({
        "id": new_task.id,
        "title": new_task.title,
        "is_completed": new_task.is_completed,
        "urgency": new_task.urgency  
    }), 201

# put task route- enhanced with smart streak logic for routines and user association
@main_bp.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = db.session.get(Task, task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
        
    data = request.get_json()
    
    process_completion = False
    new_is_completed = task.is_completed

    if 'status' in data:
        task.status = data['status']

        new_is_completed = (data['status'] == 'Done')
        process_completion = True
        

    elif 'is_completed' in data:
        new_is_completed = data['is_completed']

        task.status = "Done" if new_is_completed else "To Do"
        process_completion = True

    if process_completion:
        task.is_completed = new_is_completed
        today_date = datetime.now().date()
        
        if new_is_completed == True:
            existing_log = CompletionLog.query.filter_by(task_id=task.id, completed_date=today_date).first()
            if not existing_log:
                new_log = CompletionLog(user_id=task.user_id, task_id=task.id, completed_date=today_date)
                db.session.add(new_log)
        else:
            log_to_delete = CompletionLog.query.filter_by(task_id=task.id, completed_date=today_date).first()
            if log_to_delete:
                db.session.delete(log_to_delete)
                
        routine = Routine.query.filter_by(title=task.title, user_id=task.user_id).first()
        
        if routine:
            
            last_completed = routine.last_completed_date
            if isinstance(last_completed, str) and last_completed:
                last_completed = datetime.strptime(last_completed[:10], '%Y-%m-%d').date()

            yesterday_date = today_date - timedelta(days=1)

            if new_is_completed == True:
                
                if last_completed != today_date:
                    routine.streak = (routine.streak or 0) + 1
                    routine.last_completed_date = today_date
            else:
                
                if last_completed == today_date:
                    routine.streak = max(0, (routine.streak or 0) - 1)
                    routine.last_completed_date = yesterday_date
            
    
    if 'title' in data:
        task.title = data['title']
        
    db.session.commit()
    
    return jsonify({
        "message": "Task updated", 
        "is_completed": task.is_completed,
        "status": getattr(task, 'status', 'To Do'),
        "title": task.title
    }), 200


# delete task route- enhanced with user association check for security
@main_bp.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = db.session.get(Task, task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
        
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted successfully"}), 200

# AI Chat Route- Enhanced with user-specific data injection, smart prompt engineering, and a secure execution engine.
@main_bp.route('/api/chat', methods=['POST'])
@jwt_required()  # הגנה: הראוט דורש טוקן
def chat_with_stride():
    try:
        
        current_user_id = int(get_jwt_identity())
        
        data = request.get_json()
        user_message = data.get('message')
        
        if not user_message:
            return jsonify({"error": "No message provided"}), 400

        
        today_str = date.today().isoformat()
        
        open_tasks_query = Task.query.filter_by(is_completed=False, user_id=current_user_id).all()
        open_tasks = [{"id": t.id, "title": t.title, "due_date": t.due_date} for t in open_tasks_query]

        processes_query = Process.query.filter_by(user_id=current_user_id).all()
        existing_processes = [{"id": p.id, "title": p.title} for p in processes_query]

        routines_query = Routine.query.filter_by(user_id=current_user_id).all()
        existing_routines = [{"id": r.id, "title": r.title} for r in routines_query]

        # the prompt for the AI - enhanced with clear instructions, user-specific context, and strict output format requirements
        prompt = f"""
        You are Stride AI, an expert task manager and proactive smart assistant.
        Today's date is: {today_str}.
        Current open tasks: {json.dumps(open_tasks, ensure_ascii=False)}
        Existing processes: {json.dumps(existing_processes, ensure_ascii=False)}
        Existing routines: {json.dumps(existing_routines, ensure_ascii=False)}

        CRITICAL RULES FOR TASK PRESENTATION AND PRIORITIZATION:
        1. NO TASK IDs: Never output the task ID (the numbers in parentheses) to the user. Refer to tasks purely by their text titles. For example, output "Submit forms" and never "Submit forms (45)". 
        2. PRIORITIZATION LOGIC: Always give the highest priority to bureaucratic, financial, medical, or administrative tasks (e.g., National Insurance / Bituah Leumi, banking, paying bills, government forms),
        even if they are standalone tasks. Leisure, hobby, or recreational projects (e.g., baking bread, organizing a trip) must always receive a lower priority, regardless of how many sub-tasks they contain.

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
        - if intent='create_routine': payload = {{"title": "...", "frequency": ["Sun", "Wed"]}} (CRITICAL: If specific days are mentioned, extract them to 'frequency' array using ONLY abbreviations: 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'. If no days mentioned, omit the 'frequency' key.)
        - if intent='delete_task': payload = {{"task_id": 123}} (find ID from open tasks)
        - if intent='delete_tasks': payload = {{"target_date": "YYYY-MM-DD" or "today" or "all"}}
        - if intent='delete_routine': payload = {{"routine_id": 123}} (find ID from Existing routines)
        - if intent='filter': payload = {{"filter_value": "next_X_days" or "custom" or "today", "days_count": int, "custom_date": "YYYY-MM-DD"}} 
        - if intent='complete_tasks': payload = {{"target_date": "YYYY-MM-DD" or "today" or "all"}}
        - if intent='advice': payload = {{"advice_text": "Detailed Markdown advice..."}}
        - if intent='navigate': payload = {{"view": "processes" or "tasks" or "routines", "process_id": int}}
        - if intent='general_chat': payload = {{}}
        """

        # the AI processing layer
        available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        if not available_models:
             raise Exception("No active generative models found.")
             
        chosen_model_name = next((name for name in available_models if 'flash' in name or 'pro' in name), available_models[-1])
        current_model = genai.GenerativeModel(chosen_model_name)
        
        response = current_model.generate_content(
            prompt, 
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        
        
        result = json.loads(response.text)
        if isinstance(result, list): 
            result = result[0] if len(result) > 0 else {}
        

        intent = result.get("intent", "general_chat")
        
        payload = result.get("payload", {})
        if isinstance(payload, list):
            payload = payload[0] if len(payload) > 0 else {}

        ai_reply = result.get("reply", "הבנתי!")
        action = None

        
        if intent == "create_process":
            new_process = Process(
                title=payload.get("process_title", "תהליך חדש"),
                description=payload.get("process_description", ""),
                user_id=current_user_id
            )
            db.session.add(new_process)
            db.session.flush() 
            
            tasks_list = payload.get("tasks", [])
            for item in tasks_list:
                
                t_title = item.get("title") if isinstance(item, dict) else item
                
                
                if t_title:
                    db.session.add(Task(title=str(t_title), process_id=new_process.id, user_id=current_user_id))
            
            db.session.commit()
            action = {"type": "NAVIGATE", "payload": {"view": "processes", "process_id": new_process.id}}

        elif intent == "create_task":
            new_task = Task(title=payload.get("title"), due_date=payload.get("due_date"), user_id=current_user_id)
            db.session.add(new_task)
            db.session.commit()
            action = {"type": "REFRESH_DATA"}

        elif intent == "create_routine":
            new_routine = Routine(title=payload.get("title"), user_id=current_user_id)
            
            
            extracted_frequency = payload.get("frequency")
            
            if extracted_frequency and isinstance(extracted_frequency, list) and len(extracted_frequency) > 0:
               
                new_routine.frequency = extracted_frequency
            else:
                
                new_routine.frequency = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                
            db.session.add(new_routine)
            db.session.commit()
            action = {"type": "REFRESH_DATA"}

        elif intent == "delete_task":
            task_id = payload.get("task_id")
            if task_id:
                Task.query.filter_by(id=task_id, user_id=current_user_id).delete()
                db.session.commit()
                action = {"type": "REFRESH_DATA"}

        elif intent == "delete_tasks":
            target_date = payload.get("target_date")
            if target_date == "all":
                Task.query.filter_by(is_completed=False, user_id=current_user_id).delete()
            else:
                actual_date = today_str if target_date == "today" else target_date
                Task.query.filter_by(due_date=actual_date, is_completed=False, user_id=current_user_id).delete()
            db.session.commit()
            action = {"type": "REFRESH_DATA"}

        elif intent == "delete_routine":
            routine_id = payload.get("routine_id")
            if routine_id:
                Routine.query.filter_by(id=routine_id, user_id=current_user_id).delete()
                db.session.commit()
                action = {"type": "REFRESH_DATA"}

        elif intent == "complete_tasks":
            target_date = payload.get("target_date")
            if target_date == "all":
                Task.query.filter_by(is_completed=False, user_id=current_user_id).update({"is_completed": True})
            else:
                actual_date = today_str if target_date == "today" else target_date
                Task.query.filter_by(due_date=actual_date, is_completed=False, user_id=current_user_id).update({"is_completed": True})
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

@main_bp.route('/api/routines', methods=['GET'])
def get_routines():
    try:
        routines = Routine.query.filter_by(is_active=True).all()
        return jsonify([r.to_dict() for r in routines]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@main_bp.route('/api/routines', methods=['POST'])
@jwt_required()  
def create_routine():
    try:
        
        current_user_id = int(get_jwt_identity())
        
        data = request.json
        new_routine = Routine(
            title=data.get('title'),
            icon=data.get('icon', '⚡'),
            user_id=current_user_id 
        )
        if 'frequency' in data:
            new_routine.frequency = data['frequency']
            
        db.session.add(new_routine)
        db.session.commit()
        return jsonify(new_routine.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@main_bp.route('/api/routines/<int:routine_id>', methods=['DELETE'])
def delete_routine(routine_id):
    try:
        routine = Routine.query.get_or_404(routine_id)
        db.session.delete(routine)
        db.session.commit()
        return jsonify({"message": "Routine deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@main_bp.route('/api/routines/<int:routine_id>/toggle', methods=['POST'])
def toggle_routine(routine_id):
    try:
        routine = Routine.query.get_or_404(routine_id)
        today = date.today()
        
        if routine.completed_today:
            
            routine.last_completed_date = None
            if routine.streak > 0:
                routine.streak -= 1
        else:
            
            previous_scheduled_date = None
            
            
            for i in range(1, 8):
                past_date = today - timedelta(days=i)
                if past_date.strftime('%a') in routine.frequency:
                    previous_scheduled_date = past_date
                    break
            
            
            if routine.last_completed_date == previous_scheduled_date or routine.streak == 0:
                routine.streak += 1
            else:
                
                routine.streak = 1
                
            routine.last_completed_date = today
            
        db.session.commit()
        return jsonify(routine.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@main_bp.route('/api/processes', methods=['POST'])
@jwt_required()  
def create_process_manual():
    try:
        
        current_user_id = int(get_jwt_identity())
        
        data = request.json
        title = data.get('title')
        
        if not title:
            return jsonify({"error": "Process title is required"}), 400

        
        new_process = Process(
            title=title,
            description=data.get('description', ''),
            user_id=current_user_id
        )
        
        db.session.add(new_process)
        db.session.commit()
        
        return jsonify({
            "id": new_process.id,
            "title": new_process.title,
            "description": new_process.description
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500