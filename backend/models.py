import json
from datetime import date
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()


# User model

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    
    
    tasks = db.relationship('Task', backref='owner', lazy=True, cascade="all, delete-orphan")
    processes = db.relationship('Process', backref='owner', lazy=True, cascade="all, delete-orphan")
    routines = db.relationship('Routine', backref='owner', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


# process model

class Process(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    tasks = db.relationship('Task', backref='process', lazy=True, cascade="all, delete-orphan")


# task model

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    priority = db.Column(db.String(50), default="Medium")
    due_date = db.Column(db.String(50), nullable=True)
    is_completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    urgency = db.Column(db.String(20), default='normal')
    status = db.Column(db.String(50), default="To Do")
    
    process_id = db.Column(db.Integer, db.ForeignKey('process.id'), nullable=True)
    
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class CompletionLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    task_id = db.Column(db.Integer, nullable=False)
    completed_date = db.Column(db.Date, default=datetime.utcnow().date)


# routine model

class Routine(db.Model):
    __tablename__ = 'routines'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    icon = db.Column(db.String(50), default='⚡')
    streak = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    
    _frequency = db.Column(db.String(500), name='frequency', default='[]')
    last_completed_date = db.Column(db.Date, nullable=True)
    
    
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    @property
    def frequency(self):
        return json.loads(self._frequency) if self._frequency else []

    @frequency.setter
    def frequency(self, value):
        self._frequency = json.dumps(value)

    @property
    def completed_today(self):
        if not self.last_completed_date:
            return False
            
        if isinstance(self.last_completed_date, str):
            return self.last_completed_date.startswith(str(date.today()))
            
        return self.last_completed_date == date.today()

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'icon': self.icon,
            'streak': self.streak if self.streak is not None else 0,
            'isActive': self.is_active,
            'frequency': self.frequency,
            'completedToday': self.completed_today
        }