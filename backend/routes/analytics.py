from flask import Blueprint, jsonify
from models import Task, Process, CompletionLog
from datetime import timedelta, datetime
from flask_jwt_extended import jwt_required, get_jwt_identity

analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/api/analytics', methods=['GET'])
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

        todo_count = Task.query.filter(
            Task.user_id == current_user_id,
            Task.process_id == None,
            Task.status == 'To Do'
        ).count()
        in_progress_count = Task.query.filter(
            Task.user_id == current_user_id,
            Task.process_id == None,
            Task.status == 'In Progress'
        ).count()
        done_count = Task.query.filter(
            Task.user_id == current_user_id,
            Task.process_id == None,
            Task.is_completed == True
        ).count()

        return jsonify({
            "overall_progress": round(overall_progress),
            "processes_progress": processes_data,
            "weekly_chart": weekly_data,
            "tasks_by_status": {"todo": todo_count, "in_progress": in_progress_count, "done": done_count}
        }), 200

    except Exception as e:
        print(f"Analytics Error: {e}")
        return jsonify({"error": "Failed to fetch analytics"}), 500
