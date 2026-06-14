def test_get_routines_requires_auth(client):
    res = client.get('/api/routines')
    assert res.status_code == 401


def test_delete_routine_requires_auth(client):
    res = client.delete('/api/routines/1')
    assert res.status_code == 401


def test_toggle_routine_requires_auth(client):
    res = client.post('/api/routines/1/toggle')
    assert res.status_code == 401


def test_create_routine_success(client, auth_headers):
    res = client.post('/api/routines', json={
        'title': 'Morning Run', 'frequency': ['Mon', 'Wed', 'Fri']
    }, headers=auth_headers)
    assert res.status_code == 201
    data = res.get_json()
    assert data['title'] == 'Morning Run'
    assert 'Mon' in data['frequency']


def test_get_routines_only_own(client, auth_headers):
    client.post('/api/routines', json={'title': 'My Routine'}, headers=auth_headers)

    client.post('/api/register', json={'username': 'userd', 'email': 'd@test.com', 'password': 'pass'})
    res_d = client.post('/api/login', json={'email': 'd@test.com', 'password': 'pass'})
    headers_d = {'Authorization': f'Bearer {res_d.get_json()["access_token"]}'}

    res = client.get('/api/routines', headers=headers_d)
    assert res.status_code == 200
    assert res.get_json() == []


def test_cannot_delete_other_users_routine(client, auth_headers):
    res = client.post('/api/routines', json={'title': 'Yoga'}, headers=auth_headers)
    routine_id = res.get_json()['id']

    client.post('/api/register', json={'username': 'usere', 'email': 'e@test.com', 'password': 'pass'})
    res_e = client.post('/api/login', json={'email': 'e@test.com', 'password': 'pass'})
    headers_e = {'Authorization': f'Bearer {res_e.get_json()["access_token"]}'}

    res = client.delete(f'/api/routines/{routine_id}', headers=headers_e)
    assert res.status_code == 403
