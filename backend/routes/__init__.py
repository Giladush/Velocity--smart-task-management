from .auth import auth_bp
from .tasks import tasks_bp
from .processes import processes_bp
from .routines import routines_bp
from .data import data_bp
from .calendar import calendar_bp

__all__ = ['auth_bp', 'tasks_bp', 'processes_bp', 'routines_bp', 'data_bp', 'calendar_bp']
