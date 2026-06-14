from flask import Blueprint, jsonify, request
from models import db, Task, Process, Routine
from datetime import date
import json
import google.generativeai as genai
from flask_jwt_extended import jwt_required, get_jwt_identity

ai_bp = Blueprint('ai', __name__)


@ai_bp.route('/api/chat', methods=['POST'])
@jwt_required()
def chat_with_stride():
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        user_message = data.get('message')

        if not user_message:
            return jsonify({"error": "No message provided"}), 400

        today_str = date.today().isoformat()

        open_tasks = [{"id": t.id, "title": t.title, "due_date": t.due_date}
                      for t in Task.query.filter(
                          Task.is_completed == False,
                          Task.user_id == current_user_id,
                          Task.process_id.is_(None)
                      ).all()]
        existing_processes = []
        for p in Process.query.filter_by(user_id=current_user_id).all():
            total_steps = Task.query.filter_by(process_id=p.id).count()
            done_steps = Task.query.filter_by(process_id=p.id, is_completed=True).count()
            existing_processes.append({
                "id": p.id,
                "title": p.title,
                "steps_total": total_steps,
                "steps_done": done_steps
            })
        existing_routines = [{"id": r.id, "title": r.title}
                              for r in Routine.query.filter_by(user_id=current_user_id).all()]

        prompt = f"""
        You are Stride AI — a warm, sharp, and proactive personal assistant who genuinely cares about helping the user move forward.
        Your tone is friendly, direct, and encouraging — like a smart friend who knows productivity well, not a cold robot.
        Always respond in fluent, natural Hebrew. Never sound robotic or overly formal.
        Today's date is: {today_str}.
        Current open tasks: {json.dumps(open_tasks, ensure_ascii=False)}
        Existing processes: {json.dumps(existing_processes, ensure_ascii=False)}
        Existing routines: {json.dumps(existing_routines, ensure_ascii=False)}

        CRITICAL RULES:
        1. NO TASK IDs: Never mention task IDs to the user. Use task titles only.
        2. PRIORITIZATION: Bureaucratic, financial, medical, or administrative tasks always take top priority (e.g., National Insurance, banking, government forms, medical appointments). Leisure or hobby tasks are always lower priority.
        3. ADVICE QUALITY: When giving advice, always consider ALL open tasks — not just one. Give a full picture: what to tackle first and why, what can wait, and any time-sensitive items. Be warm and specific, not generic.
        4. TONE: Be warm and human. Use phrases like "אני ממליץ", "שים לב ש...", "הייתי מתחיל עם..." — make the user feel supported, not just informed.

        The user says: "{user_message}"

        Analyze the request and decide the BEST intent.
        CRITICAL RULE: If the user directly commands you to create, delete, or modify something, DO IT IMMEDIATELY using the correct intent. DO NOT ask for confirmation, even if a similar item already exists.
        You must respond ONLY with a valid JSON object in this exact format:
        {{
          "reply": "Your conversational, warm response in HEBREW — 1-2 sentences max for non-advice intents.",
          "intent": "ONE_OF: create_process, create_task, create_routine, delete_task, delete_tasks, delete_routine, filter, complete_tasks, advice, navigate, fetch_emails, general_chat",
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
        - if intent='advice': payload = {{"advice_text": "Warm, comprehensive Markdown advice covering ALL tasks — priorities, reasoning, and encouragement. CRITICAL RULES: (1) The open_tasks list contains ONLY standalone tasks — mention them by name freely. (2) For processes: mention ONLY the process title and how many steps remain (e.g. 'נשארו לך 3 שלבים בתהליך X'). NEVER mention individual step names from any process, under any circumstances."}}
        - if intent='navigate': payload = {{"view": "processes" or "tasks" or "routines", "process_id": int}}
        - if intent='fetch_emails': (Use when user asks to fetch/search emails by topic, e.g. "משוך לי מיילים דחופים", "מיילים שקשורים לעבודה", "מיילים על הטיול") payload = {{"query": "the topic or category in Hebrew"}}
        - if intent='general_chat': (also use this when the user asks which tasks they have for a specific date or day, e.g. "מה המשימות שלי ליום רביעי?" or "מה יש לי ב-20.6?". In that case, resolve the requested date using today's date, filter open_tasks by due_date, and list the matching tasks in the reply. If no tasks match, say so warmly.) payload = {{}}
        """

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
            for item in payload.get("tasks", []):
                t_title = item.get("title") if isinstance(item, dict) else item
                if t_title:
                    db.session.add(Task(title=str(t_title), process_id=new_process.id, user_id=current_user_id))
            db.session.commit()
            action = {"type": "NAVIGATE", "payload": {"view": "processes", "process_id": new_process.id}}

        elif intent == "create_task":
            db.session.add(Task(title=payload.get("title"), due_date=payload.get("due_date"), user_id=current_user_id))
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
                Task.query.filter_by(is_completed=False, user_id=current_user_id).update({"is_completed": True, "status": "Done"})
            else:
                actual_date = today_str if target_date == "today" else target_date
                Task.query.filter_by(due_date=actual_date, is_completed=False, user_id=current_user_id).update({"is_completed": True, "status": "Done"})
            db.session.commit()
            action = {"type": "REFRESH_DATA"}

        elif intent == "filter":
            action = {"type": "SET_FILTER", "payload": payload}

        elif intent == "navigate":
            action = {"type": "NAVIGATE", "payload": payload}

        elif intent == "advice":
            action = {"type": "SET_ADVICE", "payload": payload}

        elif intent == "fetch_emails":
            action = _handle_fetch_emails(payload, data, current_model)

        if action is None and intent == 'general_chat' and ai_reply:
            action = {"type": "SHOW_REPLY", "payload": {"advice_text": ai_reply}}

        return jsonify({"reply": ai_reply, "action": action}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({"error": "AI Processing Failed"}), 500


def _handle_fetch_emails(payload, request_data, current_model):
    from routes.calendar import _credentials_store
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build as google_build
    import re

    query = payload.get("query", "דחופים")
    cal_token = request_data.get("cal_token")

    if not cal_token or cal_token not in _credentials_store:
        return {"type": "SET_EMAILS", "payload": {"emails": [], "error": "not_connected"}}

    creds_data = _credentials_store[cal_token]
    stored_scopes = creds_data.get('scopes') or []
    if 'https://www.googleapis.com/auth/gmail.readonly' not in stored_scopes:
        return {"type": "SET_EMAILS", "payload": {"emails": [], "error": "no_gmail_scope"}}

    try:
        creds = Credentials(
            token=creds_data['token'],
            refresh_token=creds_data['refresh_token'],
            token_uri=creds_data['token_uri'],
            client_id=creds_data['client_id'],
            client_secret=creds_data['client_secret'],
            scopes=creds_data['scopes']
        )
        gmail = google_build('gmail', 'v1', credentials=creds)

        results = gmail.users().messages().list(
            userId='me',
            q=f'{query} in:inbox',
            maxResults=10
        ).execute()
        message_refs = results.get('messages', [])

        if not message_refs:
            return {"type": "SET_EMAILS", "payload": {"emails": [], "query": query}}

        emails_raw = []
        for ref in message_refs[:8]:
            msg = gmail.users().messages().get(
                userId='me', id=ref['id'],
                format='metadata',
                metadataHeaders=['Subject', 'From', 'Date']
            ).execute()
            headers = {h['name']: h['value'] for h in msg.get('payload', {}).get('headers', [])}
            emails_raw.append({
                'id': ref['id'],
                'subject': headers.get('Subject', '(ללא נושא)'),
                'sender': headers.get('From', 'לא ידוע'),
                'snippet': msg.get('snippet', '')
            })

        email_prompt = f"""
        For each of the following emails, write a single short sentence in Hebrew summarizing what it says or what action it requires.
        Return a JSON array with fields: id, subject, sender, summary.
        CRITICAL: All string values must be valid JSON — escape any double-quote characters inside strings with a backslash.

        Emails:
        {json.dumps(emails_raw, ensure_ascii=True)}
        """

        email_response = current_model.generate_content(
            email_prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        try:
            summarized = json.loads(email_response.text)
        except json.JSONDecodeError:
            match = re.search(r'\[.*?\]', email_response.text, re.DOTALL)
            try:
                summarized = json.loads(match.group()) if match else []
            except Exception:
                summarized = []
        if isinstance(summarized, dict):
            summarized = summarized.get('emails', [])
        if not isinstance(summarized, list):
            summarized = []

        return {"type": "SET_EMAILS", "payload": {"emails": summarized, "query": query}}

    except Exception as gmail_err:
        print(f"[Gmail Error] {gmail_err}")
        err_str = str(gmail_err)
        if 'accessNotConfigured' in err_str or 'not been used' in err_str:
            return {"type": "SET_EMAILS", "payload": {"emails": [], "error": "api_not_enabled"}}
        return {"type": "SET_EMAILS", "payload": {"emails": [], "error": "gmail_error"}}
