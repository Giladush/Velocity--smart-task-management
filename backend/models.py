from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Process(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    
    # הקשר למשימות
    tasks = db.relationship('Task', backref='process', lazy=True, cascade="all, delete-orphan")

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    priority = db.Column(db.String(50), default="Medium")
    due_date = db.Column(db.String(50), nullable=True)
    is_completed = db.Column(db.Boolean, default=False)
    
    # מפתח זר לתהליך (יכול להיות ריק אם זו משימה בודדת)
    process_id = db.Column(db.Integer, db.ForeignKey('process.id'), nullable=True)

    from datetime import date
import json

class Routine(db.Model):
    __tablename__ = 'routines'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    icon = db.Column(db.String(50), default='⚡')
    streak = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    
    _frequency = db.Column(db.String(500), name='frequency', default='[]')
    last_completed_date = db.Column(db.Date, nullable=True)

    @property
    def frequency(self):
        import json
        return json.loads(self._frequency) if self._frequency else []

    @frequency.setter
    def frequency(self, value):
        import json
        self._frequency = json.dumps(value)

    @property
    def completed_today(self):
        if not self.last_completed_date:
            return False
            
        from datetime import date
        # הגנה: אם SQLite מחזיר מחרוזת במקום אובייקט Date
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