from flask import Flask, jsonify, request
from flask_cors import CORS
from models import db, Task, Process, Routine, User, CompletionLog
from datetime import date, timedelta, datetime
import os
import json
import requests
import google.generativeai as genai
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta
from sqlalchemy import func

from routes import main_bp

app = Flask(__name__)
# JWT
app.config['JWT_SECRET_KEY'] = 'super-secret-stride-key-change-in-prod'
app.config['JWT_TOKEN_LOCATION'] = ['headers']  # אומר לשרת לחפש את הטוקן בכותרות הבקשה
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)
jwt = JWTManager(app)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///velocity.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# API key
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

# setting up GenAI
if api_key:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-3-flash')
else:
    print("Warning: GEMINI_API_KEY not found in .env file!")


cached_quote = {
    "text": "The secret of getting ahead is getting started.",
    "author": "Mark Twain"
}
last_fetch_date = None


app.register_blueprint(main_bp)


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)