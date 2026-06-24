import pytest
from sqlalchemy.pool import StaticPool
from app import app as flask_app
from models import db as _db


@pytest.fixture(scope='session')
def app():
    flask_app.config['TESTING'] = True
    flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    flask_app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'connect_args': {'check_same_thread': False},
        'poolclass': StaticPool,
    }
    flask_app.config['JWT_SECRET_KEY'] = 'test-secret-key-that-is-long-enough-for-sha256'
    # FSA 3.x raises if init_app is called on an already-registered app.
    # Popping the extension lets us re-register with the :memory: URI before
    # any requests are handled (Flask locks setup methods after first request).
    flask_app.extensions.pop('sqlalchemy', None)
    _db.init_app(flask_app)
    yield flask_app
    # No restore needed — test process is separate from the server process.


@pytest.fixture(autouse=True)
def reset_db(app):
    with app.app_context():
        _db.create_all()
    yield
    with app.app_context():
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth_headers(client):
    client.post('/api/register', json={
        'username': 'testuser', 'email': 'test@test.com', 'password': 'pass123'
    })
    res = client.post('/api/login', json={'email': 'test@test.com', 'password': 'pass123'})
    token = res.get_json()['access_token']
    return {'Authorization': f'Bearer {token}'}
