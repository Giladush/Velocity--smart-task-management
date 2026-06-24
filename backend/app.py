from flask import Flask
from flask_cors import CORS
from models import db
from flask_migrate import Migrate
import os
import google.generativeai as genai
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager
from datetime import timedelta
from routes import auth_bp, tasks_bp, processes_bp, routines_bp, data_bp, analytics_bp, ai_bp, calendar_bp

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY")

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'super-secret-stride-key-change-in-prod')
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)
jwt = JWTManager(app)

CORS(app, supports_credentials=True, origins=[r'http://localhost:5173', r'http://localhost:5174', r'http://localhost:5175'])

app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'velocity.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
migrate = Migrate(app, db, render_as_batch=True)

api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
else:
    print("Warning: GEMINI_API_KEY not found in .env file!")

app.register_blueprint(auth_bp)
app.register_blueprint(tasks_bp)
app.register_blueprint(processes_bp)
app.register_blueprint(routines_bp)
app.register_blueprint(data_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(ai_bp)
app.register_blueprint(calendar_bp)

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
