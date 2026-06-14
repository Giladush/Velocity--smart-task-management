def test_register_success(client):
    res = client.post('/api/register', json={
        'username': 'alice', 'email': 'alice@test.com', 'password': 'pass123'
    })
    assert res.status_code == 201


def test_register_duplicate_email(client):
    client.post('/api/register', json={'username': 'u1', 'email': 'dup@test.com', 'password': 'pass'})
    res = client.post('/api/register', json={'username': 'u2', 'email': 'dup@test.com', 'password': 'pass'})
    assert res.status_code == 400


def test_login_success(client):
    client.post('/api/register', json={'username': 'bob', 'email': 'bob@test.com', 'password': 'pass123'})
    res = client.post('/api/login', json={'email': 'bob@test.com', 'password': 'pass123'})
    assert res.status_code == 200
    data = res.get_json()
    assert 'access_token' in data
    assert data['username'] == 'bob'


def test_login_wrong_password(client):
    client.post('/api/register', json={'username': 'carol', 'email': 'carol@test.com', 'password': 'pass123'})
    res = client.post('/api/login', json={'email': 'carol@test.com', 'password': 'wrong'})
    assert res.status_code == 401


def test_me_requires_auth(client):
    res = client.get('/api/me')
    assert res.status_code == 401


def test_me_returns_user(client, auth_headers):
    res = client.get('/api/me', headers=auth_headers)
    assert res.status_code == 200
    assert res.get_json()['username'] == 'testuser'
