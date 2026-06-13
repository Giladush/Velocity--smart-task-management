from flask import Blueprint, jsonify, request
from models import db, Routine, CompletionLog
from datetime import date, timedelta
from flask_jwt_extended import jwt_required, get_jwt_identity

routines_bp = Blueprint('routines', __name__)


@routines_bp.route('/api/routines', methods=['GET'])
def get_routines():
    try:
        routines = Routine.query.filter_by(is_active=True).all()
        return jsonify([r.to_dict() for r in routines]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@routines_bp.route('/api/routines', methods=['POST'])
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


@routines_bp.route('/api/routines/<int:routine_id>', methods=['DELETE'])
def delete_routine(routine_id):
    try:
        routine = Routine.query.get_or_404(routine_id)
        db.session.delete(routine)
        db.session.commit()
        return jsonify({"message": "Routine deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@routines_bp.route('/api/routines/<int:routine_id>/toggle', methods=['POST'])
def toggle_routine(routine_id):
    try:
        routine = Routine.query.get_or_404(routine_id)
        today = date.today()
        # Use offset to avoid collision with task IDs in CompletionLog
        log_task_id = routine_id + 1_000_000

        if routine.completed_today:
            routine.last_completed_date = None
            if routine.streak > 0:
                routine.streak -= 1
            log_to_delete = CompletionLog.query.filter_by(
                user_id=routine.user_id, task_id=log_task_id, completed_date=today
            ).first()
            if log_to_delete:
                db.session.delete(log_to_delete)
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

            existing_log = CompletionLog.query.filter_by(
                user_id=routine.user_id, task_id=log_task_id, completed_date=today
            ).first()
            if not existing_log:
                db.session.add(CompletionLog(
                    user_id=routine.user_id,
                    task_id=log_task_id,
                    completed_date=today
                ))

        db.session.commit()
        return jsonify(routine.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
