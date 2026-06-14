from flask import Blueprint, jsonify
from models import Task, Process, Routine, CompletionLog
from datetime import date, timedelta, datetime
import requests
from flask_jwt_extended import jwt_required, get_jwt_identity

data_bp = Blueprint('data', __name__)

cached_quote = {
    "text": "The secret of getting ahead is getting started.",
    "author": "Mark Twain"
}
last_fetch_date = None


@data_bp.route('/api/quote', methods=['GET'])
def get_quote():
    global cached_quote, last_fetch_date

    today = datetime.now().date()
    if last_fetch_date != today:
        last_fetch_date = today
        try:
            response = requests.get('https://zenquotes.io/api/today', timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data:
                    cached_quote = {
                        "text": data[0].get('q'),
                        "author": data[0].get('a')
                    }
        except Exception:
            pass

    return jsonify(cached_quote), 200


@data_bp.route('/api/data', methods=['GET'])
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
                    "created_at": t.created_at.strftime('%Y-%m-%dT%H:%M:%SZ') if t.created_at else None,
                    "urgency": t.urgency or 'normal',
                    "tags": [x.strip() for x in t.tags.split(',') if x.strip()] if t.tags else []
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
                "created_at": t.created_at.strftime('%Y-%m-%dT%H:%M:%SZ') if t.created_at else None,
                "urgency": t.urgency or 'normal',
                "tags": [x.strip() for x in t.tags.split(',') if x.strip()] if t.tags else []
            })

        today_str = today_date.strftime('%Y-%m-%d')
        active_routines = Routine.query.filter_by(is_active=True, user_id=current_user_id).all()
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

        logs = CompletionLog.query.filter_by(user_id=current_user_id).all()
        unique_dates = {str(log.completed_date).strip()[:10] for log in logs if log.completed_date}

        current_check = datetime.now().date()
        if str(current_check) not in unique_dates:
            current_check -= timedelta(days=1)
        while str(current_check) in unique_dates:
            calculated_streak += 1
            current_check -= timedelta(days=1)

        total_routines = Routine.query.filter_by(is_active=True, user_id=current_user_id).count()

        return jsonify({
            "processes": processes_data,
            "standalone_tasks": standalone_data,
            "streak": calculated_streak,
            "routine_count": total_routines
        }), 200

    except Exception as e:
        print(f"Error in get_all_data: {str(e)}")
        return jsonify({"error": str(e)}), 500
