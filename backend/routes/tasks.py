from flask import Blueprint, jsonify, request
from models import db, Task, Routine, CompletionLog
from datetime import datetime, timedelta
from flask_jwt_extended import jwt_required, get_jwt_identity

tasks_bp = Blueprint('tasks', __name__)


@tasks_bp.route('/api/tasks', methods=['POST'])
@jwt_required()
def add_task():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    title = data.get('title')
    urgency = data.get('urgency', 'normal')
    tags_list = data.get('tags', [])
    tags_str = ','.join(t.strip() for t in tags_list if t.strip()) if tags_list else None

    if not title:
        return jsonify({"error": "Task title is required"}), 400

    new_task = Task(
        title=title,
        process_id=data.get('process_id'),
        due_date=data.get('due_date'),
        user_id=current_user_id,
        urgency=urgency,
        tags=tags_str
    )
    db.session.add(new_task)
    db.session.commit()
    return jsonify({
        "id": new_task.id,
        "title": new_task.title,
        "is_completed": new_task.is_completed,
        "urgency": new_task.urgency
    }), 201


@tasks_bp.route('/api/tasks/<int:task_id>', methods=['PUT'])
@jwt_required()
def update_task(task_id):
    current_user_id = int(get_jwt_identity())
    task = db.session.get(Task, task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    if task.user_id != current_user_id:
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json()
    process_completion = False
    new_is_completed = task.is_completed

    if 'is_completed' in data:
        new_is_completed = data['is_completed']
        if 'status' in data:
            task.status = data['status']
        else:
            task.status = "Done" if new_is_completed else "To Do"
        process_completion = True
    elif 'status' in data:
        task.status = data['status']
        new_is_completed = (data['status'] == 'Done')
        process_completion = True

    if process_completion:
        task.is_completed = new_is_completed
        today_date = datetime.now().date()

        if new_is_completed:
            existing_log = CompletionLog.query.filter_by(task_id=task.id, completed_date=today_date).first()
            if not existing_log:
                db.session.add(CompletionLog(user_id=task.user_id, task_id=task.id, completed_date=today_date))
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

            if new_is_completed:
                if last_completed != today_date:
                    routine.streak = (routine.streak or 0) + 1
                    routine.last_completed_date = today_date
            else:
                if last_completed == today_date:
                    routine.streak = max(0, (routine.streak or 0) - 1)
                    routine.last_completed_date = None

    if 'title' in data:
        task.title = data['title']

    db.session.commit()
    return jsonify({
        "message": "Task updated",
        "is_completed": task.is_completed,
        "status": getattr(task, 'status', 'To Do'),
        "title": task.title
    }), 200


@tasks_bp.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@jwt_required()
def delete_task(task_id):
    current_user_id = int(get_jwt_identity())
    task = db.session.get(Task, task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    if task.user_id != current_user_id:
        return jsonify({"error": "Forbidden"}), 403
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted successfully"}), 200
