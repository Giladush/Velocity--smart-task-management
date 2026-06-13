import os
import json
import secrets
from flask import Blueprint, jsonify, request, redirect
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import google.generativeai as genai

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

calendar_bp = Blueprint('calendar', __name__)

SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/gmail.readonly',
]

client_config = {
    "web": {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "redirect_uris": ["http://127.0.0.1:5000/api/callback"]
    }
}

_pkce_store = {}
_credentials_store = {}


def create_google_flow(autogenerate_code_verifier=False):
    return Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri="http://127.0.0.1:5000/api/callback",
        autogenerate_code_verifier=autogenerate_code_verifier
    )


@calendar_bp.route('/api/calendar/auth', methods=['GET'])
def calendar_auth():
    flow = create_google_flow(autogenerate_code_verifier=True)
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true'
    )
    _pkce_store[state] = flow.code_verifier
    return jsonify({"auth_url": authorization_url})


@calendar_bp.route('/api/callback')
def calendar_callback():
    state = request.args.get('state')
    code_verifier = _pkce_store.pop(state, None)
    flow = create_google_flow()
    flow.fetch_token(
        authorization_response=request.url,
        code_verifier=code_verifier
    )
    credentials = flow.credentials
    token = secrets.token_urlsafe(32)
    _credentials_store[token] = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }
    return redirect(f'http://localhost:5173/?cal_token={token}')


@calendar_bp.route('/api/calendar/create_event', methods=['POST'])
def create_calendar_event():
    token = request.headers.get('X-Calendar-Token')
    if not token or token not in _credentials_store:
        return jsonify({"error": "Unauthorized: Google Calendar not connected"}), 401

    creds_data = _credentials_store[token]
    creds = Credentials(
        token=creds_data['token'],
        refresh_token=creds_data['refresh_token'],
        token_uri=creds_data['token_uri'],
        client_id=creds_data['client_id'],
        client_secret=creds_data['client_secret'],
        scopes=creds_data['scopes']
    )

    try:
        service = build('calendar', 'v3', credentials=creds)
        task_data = request.json
        event = {
            'summary': task_data.get('title', 'משימה חדשה מ-Velocity'),
            'description': task_data.get('description', 'נוצר אוטומטית דרך המערכת.'),
            'start': {'dateTime': task_data.get('start_time'), 'timeZone': 'Asia/Jerusalem'},
            'end': {'dateTime': task_data.get('end_time'), 'timeZone': 'Asia/Jerusalem'},
        }
        created_event = service.events().insert(calendarId='primary', body=event).execute()
        return jsonify({
            "message": "Event created successfully!",
            "calendar_link": created_event.get('htmlLink')
        }), 201
    except Exception as e:
        return jsonify({"error": f"Failed to create event: {str(e)}"}), 500


@calendar_bp.route('/api/gmail/urgent', methods=['GET'])
def get_urgent_emails():
    token = request.headers.get('X-Calendar-Token')
    if not token or token not in _credentials_store:
        return jsonify({"error": "not_connected"}), 401

    creds_data = _credentials_store[token]
    stored_scopes = creds_data.get('scopes') or []
    if 'https://www.googleapis.com/auth/gmail.readonly' not in stored_scopes:
        return jsonify({"error": "no_gmail_scope"}), 403

    creds = Credentials(
        token=creds_data['token'],
        refresh_token=creds_data['refresh_token'],
        token_uri=creds_data['token_uri'],
        client_id=creds_data['client_id'],
        client_secret=creds_data['client_secret'],
        scopes=creds_data['scopes']
    )

    try:
        gmail = build('gmail', 'v1', credentials=creds)

        results = gmail.users().messages().list(
            userId='me',
            q='in:inbox is:unread',
            maxResults=20
        ).execute()

        message_refs = results.get('messages', [])
        if not message_refs:
            return jsonify({"urgent_emails": []}), 200

        emails = []
        for ref in message_refs[:15]:
            msg = gmail.users().messages().get(
                userId='me',
                id=ref['id'],
                format='metadata',
                metadataHeaders=['Subject', 'From', 'Date']
            ).execute()
            headers = {h['name']: h['value'] for h in msg.get('payload', {}).get('headers', [])}
            emails.append({
                'id': ref['id'],
                'subject': headers.get('Subject', '(ללא נושא)'),
                'sender': headers.get('From', 'לא ידוע'),
                'date': headers.get('Date', ''),
                'snippet': msg.get('snippet', '')
            })

        prompt = f"""
        You are an email urgency classifier. Review the following emails and return ONLY those that are genuinely urgent.
        Urgent means: requires action soon, involves a deadline, financial/legal/medical/administrative matter, or a direct reply is clearly needed.
        Marketing emails, newsletters, and notifications are NOT urgent.
        Return a JSON array of at most 5 urgent emails, preserving these fields exactly: id, subject, sender, date, snippet.
        If none are urgent, return an empty array [].

        Emails:
        {json.dumps(emails, ensure_ascii=False)}
        """

        available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        chosen = next((n for n in available_models if 'flash' in n or 'pro' in n), available_models[-1])
        model = genai.GenerativeModel(chosen)
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )

        urgent = json.loads(response.text)
        if isinstance(urgent, dict):
            urgent = urgent.get('urgent_emails', urgent.get('emails', []))
        if not isinstance(urgent, list):
            urgent = []

        return jsonify({"urgent_emails": urgent}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
