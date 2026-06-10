import os
from flask import Blueprint, jsonify, session
from google_auth_oauthlib.flow import Flow
from flask import request, redirect
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

# 1. הגדרת ה-Blueprint
calendar_bp = Blueprint('calendar', __name__)

SCOPES = ['https://www.googleapis.com/auth/calendar.events']

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

def create_google_flow():
    return Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri="http://127.0.0.1:5000/api/callback"
    )

# 2. הראוט הראשון - שימי לב שמשתמשים ב-calendar_bp במקום ב-app
@calendar_bp.route('/api/calendar/auth', methods=['GET'])
def calendar_auth():
    flow = create_google_flow()
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true'
    )
    session['state'] = state
    return jsonify({"auth_url": authorization_url})


# מכיוון שאנחנו מפתחים לוקאלית על HTTP רגיל, השורה הזו מכבה את חסימת האבטחה הזו זמנית:
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'


# --- הראוט השני: Callback ---
@calendar_bp.route('/api/callback')
def calendar_callback():
    # 1. יצירת ה-Flow מחדש כדי לטפל בתשובה מגוגל
    flow = create_google_flow()
    
    # 2. אנחנו אומרים לספרייה של גוגל: קחי את כל ה-URL שגוגל החזירה לנו, ותחלצי משם את הטוקן
    flow.fetch_token(authorization_response=request.url)
    
    # 3. חילוץ המפתחות שגוגל שלחה לנו
    credentials = flow.credentials
    
    # 4. שמירת המפתחות בתוך ה-session כדי שנזכור אותם (בהמשך עדיף לשמור במסד הנתונים)
    session['google_credentials'] = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }
    
    # 5. סיימנו בהצלחה! עכשיו מחזירים את המשתמש חזרה לפרונטאנד של React
    # (שני את הפורט ל-3000 או 5173, תלוי על איזה פורט ה-React שלך רץ)
    return redirect('http://localhost:5173/')


@calendar_bp.route('/api/calendar/create_event', methods=['POST'])
def create_calendar_event():
    # 1. נוודא שהמשתמש עבר את תהליך ההתחברות ויש לנו את המפתחות שלו
    if 'google_credentials' not in session:
        return jsonify({"error": "Unauthorized: Google Calendar not connected"}), 401

    # 2. שחזור המפתחות מהסשן לתוך אובייקט Credentials שגוגל מכירה
    creds_data = session['google_credentials']
    creds = Credentials(
        token=creds_data['token'],
        refresh_token=creds_data['refresh_token'],
        token_uri=creds_data['token_uri'],
        client_id=creds_data['client_id'],
        client_secret=creds_data['client_secret'],
        scopes=creds_data['scopes']
    )

    try:
        # 3. פתיחת ערוץ התקשורת מול שרתי היומן של גוגל
        service = build('calendar', 'v3', credentials=creds)

        # 4. קבלת הנתונים שה-React שלח (כותרת וזמנים)
        task_data = request.json
        
        # 5. יצירת האובייקט בפורמט המדויק שגוגל דורשת
        event = {
            'summary': task_data.get('title', 'משימה חדשה מ-Velocity'),
            'description': task_data.get('description', 'נוצר אוטומטית דרך המערכת.'),
            'start': {
                # הפורמט שגוגל מצפה לו: "2026-06-10T10:00:00"
                'dateTime': task_data.get('start_time'), 
                'timeZone': 'Asia/Jerusalem',
            },
            'end': {
                'dateTime': task_data.get('end_time'),
                'timeZone': 'Asia/Jerusalem',
            },
        }

        # 6. ביצוע הפעולה: הוספת האירוע ליומן הראשי ('primary')
        created_event = service.events().insert(calendarId='primary', body=event).execute()
        
        # מחזירים ל-React הודעת הצלחה ולינק ישיר לאירוע שנוצר
        return jsonify({
            "message": "Event created successfully!", 
            "calendar_link": created_event.get('htmlLink')
        }), 201

    except Exception as e:
        return jsonify({"error": f"Failed to create event: {str(e)}"}), 500