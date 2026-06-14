def test_create_task_requires_auth(client):
    res = client.post('/api/tasks', json={'title': 'Test'})
    assert res.status_code == 401


def test_update_task_requires_auth(client):
    res = client.put('/api/tasks/1', json={'title': 'pwned'})
    assert res.status_code == 401


def test_delete_task_requires_auth(client):
    res = client.delete('/api/tasks/1')
    assert res.status_code == 401


def test_create_and_fetch_task(client, auth_headers):
    res = client.post('/api/tasks', json={'title': 'My Task'}, headers=auth_headers)
    assert res.status_code == 201
    assert res.get_json()['title'] == 'My Task'


def test_update_task_title(client, auth_headers):
    res = client.post('/api/tasks', json={'title': 'Original'}, headers=auth_headers)
    task_id = res.get_json()['id']

    res = client.put(f'/api/tasks/{task_id}', json={'title': 'Updated'}, headers=auth_headers)
    assert res.status_code == 200
    assert res.get_json()['title'] == 'Updated'


def test_delete_task(client, auth_headers):
    res = client.post('/api/tasks', json={'title': 'To Delete'}, headers=auth_headers)
    task_id = res.get_json()['id']

    res = client.delete(f'/api/tasks/{task_id}', headers=auth_headers)
    assert res.status_code == 200


def test_cannot_update_other_users_task(client, auth_headers):
    res = client.post('/api/tasks', json={'title': 'Task A'}, headers=auth_headers)
    task_id = res.get_json()['id']

    client.post('/api/register', json={'username': 'userb', 'email': 'b@test.com', 'password': 'pass'})
    res_b = client.post('/api/login', json={'email': 'b@test.com', 'password': 'pass'})
    headers_b = {'Authorization': f'Bearer {res_b.get_json()["access_token"]}'}

    res = client.put(f'/api/tasks/{task_id}', json={'title': 'hacked'}, headers=headers_b)
    assert res.status_code == 403


def test_cannot_delete_other_users_task(client, auth_headers):
    res = client.post('/api/tasks', json={'title': 'Task B'}, headers=auth_headers)
    task_id = res.get_json()['id']

    client.post('/api/register', json={'username': 'userc', 'email': 'c@test.com', 'password': 'pass'})
    res_c = client.post('/api/login', json={'email': 'c@test.com', 'password': 'pass'})
    headers_c = {'Authorization': f'Bearer {res_c.get_json()["access_token"]}'}

    res = client.delete(f'/api/tasks/{task_id}', headers=headers_c)
    assert res.status_code == 403
