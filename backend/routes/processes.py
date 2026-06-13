from flask import Blueprint, jsonify, request
from models import db, Process
from flask_jwt_extended import jwt_required, get_jwt_identity

processes_bp = Blueprint('processes', __name__)


@processes_bp.route('/api/processes', methods=['POST'])
@jwt_required()
def create_process():
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


@processes_bp.route('/api/processes/<int:process_id>', methods=['DELETE'])
@jwt_required()
def delete_process(process_id):
    try:
        current_user_id = int(get_jwt_identity())
        process = Process.query.filter_by(id=process_id, user_id=current_user_id).first()
        if not process:
            return jsonify({"error": "Process not found"}), 404
        db.session.delete(process)
        db.session.commit()
        return jsonify({"message": "Process deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
