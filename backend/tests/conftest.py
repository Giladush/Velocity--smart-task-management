import pytest
from app import app as flask_app
from models import db as _db


@pytest.fixture
def app():
    flask_app.config['TESTING'] = True
    flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    flask_app.config['JWT_SECRET_KEY'] = 'test-secret'
    with flask_app.app_context():
        _db.create_all()
        yield flask_app
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
