def test_completion_log_written_on_task_complete(client, auth_headers):
    res = client.post('/api/tasks', json={'title': 'Test Task'}, headers=auth_headers)
    task_id = res.get_json()['id']

    res = client.put(f'/api/tasks/{task_id}', json={'is_completed': True}, headers=auth_headers)
    assert res.status_code == 200

    res = client.get('/api/analytics', headers=auth_headers)
    chart = res.get_json()['weekly_chart']
    assert chart[-1]['completed'] >= 1


def test_uncompleting_task_removes_log(client, auth_headers):
    res = client.post('/api/tasks', json={'title': 'Undo Task'}, headers=auth_headers)
    task_id = res.get_json()['id']

    client.put(f'/api/tasks/{task_id}', json={'is_completed': True}, headers=auth_headers)
    client.put(f'/api/tasks/{task_id}', json={'is_completed': False}, headers=auth_headers)

    res = client.get('/api/analytics', headers=auth_headers)
    chart = res.get_json()['weekly_chart']
    assert chart[-1]['completed'] == 0


def test_streak_increments_on_daily_completion(client, auth_headers):
    res = client.post('/api/tasks', json={'title': 'Streak Task'}, headers=auth_headers)
    task_id = res.get_json()['id']

    client.put(f'/api/tasks/{task_id}', json={'is_completed': True}, headers=auth_headers)

    res = client.get('/api/data', headers=auth_headers)
    assert res.get_json()['streak'] >= 1


def test_completing_task_twice_no_duplicate_log(client, auth_headers):
    res = client.post('/api/tasks', json={'title': 'Double Complete'}, headers=auth_headers)
    task_id = res.get_json()['id']

    client.put(f'/api/tasks/{task_id}', json={'is_completed': True}, headers=auth_headers)
    client.put(f'/api/tasks/{task_id}', json={'is_completed': True}, headers=auth_headers)

    res = client.get('/api/analytics', headers=auth_headers)
    chart = res.get_json()['weekly_chart']
    assert chart[-1]['completed'] == 1
