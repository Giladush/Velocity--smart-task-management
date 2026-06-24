from flask import Blueprint, jsonify, request
from models import db, Task, Process, Routine, CompletionLog
from datetime import date
import json
import os
from google import genai as _genai_sdk
from google.genai import types as genai_types
from flask_jwt_extended import jwt_required, get_jwt_identity
from const import (
    build_chat_prompt, build_fallback_steps_prompt, build_search_query_prompt,
    build_steps_with_web_prompt, build_steps_without_web_prompt, build_email_filter_prompt,
)

ai_bp = Blueprint('ai', __name__)

_genai_client = None
_cached_model_name = None

def _get_genai_client():
    global _genai_client
    if _genai_client is None:
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not set in environment variables.")
        _genai_client = _genai_sdk.Client(api_key=api_key)
    return _genai_client

def _get_model_name():
    global _cached_model_name
    if _cached_model_name is None:
        try:
            available = [m.name for m in _get_genai_client().models.list()
                         if 'generateContent' in (getattr(m, 'supported_actions', None) or [])]
            _cached_model_name = next((n for n in available if 'flash' in n or 'pro' in n), None) or 'gemini-2.5-flash'
        except Exception:
            _cached_model_name = 'gemini-2.5-flash'
    return _cached_model_name


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

        open_tasks = [{"id": t.id, "title": t.title, "due_date": str(t.due_date) if t.due_date else None}
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

        prompt = build_chat_prompt(today_str, open_tasks, existing_processes, existing_routines, user_message)

        chosen_model_name = _get_model_name()

        response = _get_genai_client().models.generate_content(
            model=chosen_model_name,
            contents=prompt,
            config=genai_types.GenerateContentConfig(response_mime_type="application/json")
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
            topic = payload.get("process_title", "תהליך חדש")
            description = payload.get("process_description", "")
            tasks_to_create = _research_and_build_steps(topic, description, chosen_model_name)

            if not tasks_to_create:
                try:
                    fallback_response = _get_genai_client().models.generate_content(
                        model=chosen_model_name,
                        contents=build_fallback_steps_prompt(topic),
                        config=genai_types.GenerateContentConfig(response_mime_type="application/json")
                    )
                    fallback_steps = json.loads(fallback_response.text)
                    if isinstance(fallback_steps, list):
                        tasks_to_create = fallback_steps
                except Exception:
                    tasks_to_create = []

            new_process = Process(title=topic, description=description, user_id=current_user_id)
            db.session.add(new_process)
            db.session.flush()
            for item in tasks_to_create:
                t_title = item.get("title") if isinstance(item, dict) else item
                if t_title:
                    db.session.add(Task(title=str(t_title), process_id=new_process.id, user_id=current_user_id))
            db.session.commit()
            action = {"type": "NAVIGATE", "payload": {"view": "processes", "process_id": new_process.id}}

        elif intent == "create_task":
            due_date_raw = payload.get("due_date")
            try:
                due_date = date.fromisoformat(due_date_raw) if due_date_raw else None
            except (ValueError, TypeError):
                due_date = None
            db.session.add(Task(title=payload.get("title"), due_date=due_date, user_id=current_user_id))
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

        elif intent == "delete_process":
            process_id = payload.get("process_id")
            if process_id:
                process = Process.query.filter_by(id=process_id, user_id=current_user_id).first()
                if process:
                    db.session.delete(process)
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
                try:
                    actual_date = date.fromisoformat(today_str if target_date == "today" else target_date)
                    Task.query.filter_by(due_date=actual_date, is_completed=False, user_id=current_user_id).delete()
                except (ValueError, TypeError):
                    pass
            db.session.commit()
            action = {"type": "REFRESH_DATA"}

        elif intent == "delete_routine":
            routine_id = payload.get("routine_id")
            if routine_id:
                Routine.query.filter_by(id=routine_id, user_id=current_user_id).delete()
                db.session.commit()
            action = {"type": "REFRESH_DATA"}

        elif intent == "complete_task":
            task_id = payload.get("task_id")
            if task_id:
                task = Task.query.filter_by(id=task_id, user_id=current_user_id, is_completed=False).first()
                if task:
                    task.is_completed = True
                    task.status = "Done"
                    today_date = date.today()
                    existing_log = CompletionLog.query.filter_by(task_id=task.id, completed_date=today_date).first()
                    if not existing_log:
                        db.session.add(CompletionLog(user_id=current_user_id, task_id=task.id, completed_date=today_date))
                    db.session.commit()
            action = {"type": "REFRESH_DATA"}

        elif intent == "complete_tasks":
            target_date = payload.get("target_date")
            target_urgency = payload.get("target_urgency")
            today_date = date.today()
            if not target_date and not target_urgency:
                tasks_to_complete = []
            elif target_urgency:
                tasks_to_complete = Task.query.filter_by(
                    is_completed=False, urgency=target_urgency, user_id=current_user_id, process_id=None
                ).all()
            elif target_date == "all":
                tasks_to_complete = Task.query.filter_by(is_completed=False, user_id=current_user_id).all()
            else:
                try:
                    actual_date = date.fromisoformat(today_str if target_date == "today" else target_date)
                    tasks_to_complete = Task.query.filter_by(due_date=actual_date, is_completed=False, user_id=current_user_id).all()
                except (ValueError, TypeError):
                    tasks_to_complete = []
            for task in tasks_to_complete:
                task.is_completed = True
                task.status = "Done"
                existing_log = CompletionLog.query.filter_by(task_id=task.id, completed_date=today_date).first()
                if not existing_log:
                    db.session.add(CompletionLog(user_id=current_user_id, task_id=task.id, completed_date=today_date))
            db.session.commit()
            action = {"type": "REFRESH_DATA"}

        elif intent == "filter":
            action = {"type": "SET_FILTER", "payload": payload}

        elif intent == "navigate":
            action = {"type": "NAVIGATE", "payload": payload}

        elif intent == "advice":
            action = {"type": "SET_ADVICE", "payload": payload}

        elif intent == "fetch_emails":
            action = _handle_fetch_emails(payload, data, chosen_model_name)

        if action is None and intent == 'general_chat' and ai_reply:
            action = {"type": "SHOW_REPLY", "payload": {"advice_text": ai_reply}}

        return jsonify({"reply": ai_reply, "action": action}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({"error": "AI Processing Failed"}), 500


def _get_search_query(topic, model_name):
    try:
        r = _get_genai_client().models.generate_content(
            model=model_name,
            contents=build_search_query_prompt(topic),
            config=genai_types.GenerateContentConfig(response_mime_type="text/plain")
        )
        query = r.text.strip().strip('"')
        print(f"[Research] Search query: '{query}'")
        return query
    except Exception as e:
        print(f"[Research] Query generation failed: {e}, using topic as-is")
        return topic


def _fetch_web_context(topic, model_name):
    import requests as req
    from urllib.parse import quote_plus, unquote
    from html.parser import HTMLParser
    import re

    class _TextExtractor(HTMLParser):
        def __init__(self):
            super().__init__()
            self._skip = 0
            self._chunks = []
            self._SKIP_TAGS = {'script', 'style', 'nav', 'header', 'footer', 'aside', 'noscript'}

        def handle_starttag(self, tag, attrs):
            if tag in self._SKIP_TAGS:
                self._skip += 1

        def handle_endtag(self, tag):
            if tag in self._SKIP_TAGS:
                self._skip = max(0, self._skip - 1)

        def handle_data(self, data):
            if self._skip == 0:
                t = data.strip()
                if len(t) > 20:
                    self._chunks.append(t)

        def get_text(self):
            return ' '.join(self._chunks)

    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'}
    search_query = _get_search_query(topic, model_name)

    try:
        ddg = req.get(f"https://html.duckduckgo.com/html/?q={quote_plus(search_query)}", headers=headers, timeout=10)
        result_blocks = re.findall(
            r'uddg=([^&"]+)[^>]*>.*?class="result__snippet"[^>]*>(.*?)</div>',
            ddg.text, re.DOTALL
        )
        seen = set()
        results = []
        for url_enc, snippet_html in result_blocks:
            url = unquote(url_enc)
            if url in seen or 'duckduckgo.com' in url:
                continue
            seen.add(url)
            snippet = re.sub(r'<[^>]+>', '', snippet_html).strip()
            results.append((url, snippet))
        print(f"[Research] DDG returned {len(results)} results for: {search_query}")
    except Exception as e:
        print(f"[Research] DDG search failed: {e}")
        return None, None

    if not results:
        return None, None

    chunks = []
    fetched_urls = []
    for url, snippet in results[:6]:
        if len(fetched_urls) >= 2:
            break
        try:
            page = req.get(url, headers=headers, timeout=8, allow_redirects=True)
            ex = _TextExtractor()
            ex.feed(page.text)
            text = ex.get_text()
            if len(text) > 300:
                chunks.append(f"[Source: {url}]\n{text[:4000]}")
                fetched_urls.append(url)
                print(f"[Research] Fetched {len(text)} chars from {url}")
            else:
                print(f"[Research] Skipped JS-only page ({len(text)} chars): {url}")
        except Exception as e:
            print(f"[Research] Failed to fetch {url}: {e}")

    if not chunks:
        snippet_text = '\n'.join(f"- {url}: {snip}" for url, snip in results[:5])
        print("[Research] Using DDG snippets as fallback")
        return snippet_text, [r[0] for r in results[:3]]

    return '\n\n---\n\n'.join(chunks), fetched_urls


def _research_and_build_steps(topic, description, model_name):
    import traceback
    web_context, source_urls = _fetch_web_context(topic, model_name)
    print(f"[Research] Web context available: {bool(web_context)}, sources: {source_urls}")

    try:
        if web_context:
            steps_prompt = build_steps_with_web_prompt(topic, description, web_context)
        else:
            steps_prompt = build_steps_without_web_prompt(topic, description)

        steps_response = _get_genai_client().models.generate_content(
            model=model_name,
            contents=steps_prompt,
            config=genai_types.GenerateContentConfig(response_mime_type="application/json")
        )
        result = json.loads(steps_response.text)
        steps = None
        if isinstance(result, list):
            steps = result
        elif isinstance(result, dict):
            for v in result.values():
                if isinstance(v, list):
                    steps = v
                    break

        if steps is None:
            return None

        if source_urls:
            url_steps = [f"מקור: {url}" for url in source_urls]
            return url_steps + steps

        return steps
    except Exception as e:
        print(f"[Research] Steps generation failed: {e}")
        traceback.print_exc()
        return None


def _handle_fetch_emails(payload, request_data, model_name):
    from routes.calendar import _credentials_store
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build as google_build
    import re

    topic = payload.get("query", "")
    keywords = payload.get("keywords", [])
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

        all_terms = list({topic} | set(keywords)) if keywords else [topic]
        subject_terms = " OR ".join(f'subject:({t})' for t in all_terms)
        body_terms = " OR ".join(f'({t})' for t in all_terms)
        gmail_query = f'({subject_terms} OR {body_terms}) in:inbox'

        results = gmail.users().messages().list(
            userId='me',
            q=gmail_query,
            maxResults=20
        ).execute()
        message_refs = results.get('messages', [])

        if not message_refs:
            return {"type": "SET_EMAILS", "payload": {"emails": [], "query": topic}}

        emails_raw = []
        for ref in message_refs[:20]:
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

        email_prompt = build_email_filter_prompt(topic, all_terms, emails_raw)

        email_response = _get_genai_client().models.generate_content(
            model=model_name,
            contents=email_prompt,
            config=genai_types.GenerateContentConfig(response_mime_type="application/json")
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

        return {"type": "SET_EMAILS", "payload": {"emails": summarized, "query": topic}}

    except Exception as gmail_err:
        print(f"[Gmail Error] {gmail_err}")
        err_str = str(gmail_err)
        if 'accessNotConfigured' in err_str or 'not been used' in err_str:
            return {"type": "SET_EMAILS", "payload": {"emails": [], "error": "api_not_enabled"}}
        return {"type": "SET_EMAILS", "payload": {"emails": [], "error": "gmail_error"}}
