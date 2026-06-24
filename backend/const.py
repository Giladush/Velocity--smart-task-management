import json


def build_chat_prompt(today_str, open_tasks, existing_processes, existing_routines, user_message):
    return f"""
        You are Stride AI — a warm, sharp, and proactive personal assistant who genuinely cares about helping the user move forward.
        Your tone is friendly, direct, and encouraging — like a smart friend who knows productivity well, not a cold robot.
        Always respond in fluent, natural Hebrew. Never sound robotic or overly formal.
        Today's date is: {today_str}.
        Current open tasks: {json.dumps(open_tasks, ensure_ascii=False)}
        Existing processes: {json.dumps(existing_processes, ensure_ascii=False)}
        Existing routines: {json.dumps(existing_routines, ensure_ascii=False)}

        CRITICAL RULES:
        1. NO TASK IDs: Never mention task IDs to the user. Use task titles only.
        2. PRIORITIZATION: Bureaucratic, financial, medical, or administrative tasks always take top priority (e.g., National Insurance, banking, government forms, medical appointments). Leisure or hobby tasks are always lower priority.
        3. ADVICE QUALITY: When giving advice, always consider ALL open tasks — not just one. Give a full picture: what to tackle first and why, what can wait, and any time-sensitive items. Be warm and specific, not generic.
        4. TONE: Be warm and human. Use phrases like "אני ממליץ", "שים לב ש...", "הייתי מתחיל עם..." — make the user feel supported, not just informed.

        The user says: "{user_message}"

        Analyze the request and decide the BEST intent.
        CRITICAL RULE: If the user directly commands you to create, delete, or modify something, DO IT IMMEDIATELY using the correct intent. DO NOT ask for confirmation, even if a similar item already exists.
        You must respond ONLY with a valid JSON object in this exact format:
        {{
          "reply": "Your conversational, warm response in HEBREW — 1-2 sentences max for non-advice intents.",
          "intent": "ONE_OF: create_process, create_task, create_routine, delete_process, delete_task, delete_tasks, delete_routine, filter, complete_task, complete_tasks, advice, navigate, fetch_emails, general_chat",
          "payload": {{ ... see instructions below ... }}
        }}

        PAYLOAD INSTRUCTIONS:
        - if intent='create_process': (CRITICAL: Use this for multi-step goals, projects, "תוכנית", "תהליך") payload = {{"process_title": "...", "process_description": "..."}}
        - if intent='create_task': payload = {{"title": "...", "due_date": "YYYY-MM-DD" or null}}
        - if intent='create_routine': payload = {{"title": "...", "frequency": ["Sun", "Wed"]}} (CRITICAL: If specific days are mentioned, extract them to 'frequency' array using ONLY abbreviations: 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'. If no days mentioned, omit the 'frequency' key.)
        - if intent='delete_process': payload = {{"process_id": 123}} (find ID from Existing processes)
        - if intent='delete_task': payload = {{"task_id": 123}} (find ID from open tasks)
        - if intent='delete_tasks': payload = {{"target_date": "YYYY-MM-DD" or "today" or "all"}}
        - if intent='delete_routine': payload = {{"routine_id": 123}} (find ID from Existing routines)
        - if intent='filter': payload = {{"filter_value": "next_X_days" or "custom" or "today", "days_count": int, "custom_date": "YYYY-MM-DD"}}
        - if intent='complete_task': (single task by name) payload = {{"task_id": 123}} (find ID from open tasks by matching the task name the user mentioned)
        - if intent='complete_tasks': (batch) payload = {{"target_date": "YYYY-MM-DD" or "today" or "all"}} OR {{"target_urgency": "high" or "low" or "normal"}} — use target_urgency when user says "סמן את כל הדחופות" or similar urgency-based filter
        - if intent='advice': payload = {{"advice_text": "Warm, comprehensive Markdown advice covering ALL tasks — priorities, reasoning, and encouragement. CRITICAL RULES: (1) The open_tasks list contains ONLY standalone tasks — mention them by name freely. (2) For processes: mention ONLY the process title and how many steps remain (e.g. 'נשארו לך 3 שלבים בתהליך X'). NEVER mention individual step names from any process, under any circumstances."}}
        - if intent='navigate': payload = {{"view": "processes" or "tasks" or "routines", "process_id": int}}
        - if intent='fetch_emails': (Use when user asks to fetch/search emails by topic, e.g. "משוך לי מיילים דחופים", "מיילים שקשורים לעבודה", "מיילים על הטיול") payload = {{"query": "the topic or category in Hebrew", "keywords": ["english keyword 1", "english keyword 2", "hebrew keyword"]}} — extract 2-4 specific search keywords (in both Hebrew and English if applicable) that would appear in matching email subjects or bodies.
        - if intent='general_chat': (also use this when the user asks which tasks they have for a specific date or day, e.g. "מה המשימות שלי ליום רביעי?" or "מה יש לי ב-20.6?". In that case, resolve the requested date using today's date, filter open_tasks by due_date, and list the matching tasks in the reply. If no tasks match, say so warmly.) payload = {{}}
        """


def build_fallback_steps_prompt(topic):
    return f'Create 5 specific actionable steps in Hebrew for: "{topic}". Return ONLY a JSON array of strings.'


def build_search_query_prompt(topic):
    return f"""Given this task topic (may be in Hebrew): "{topic}"
Generate the single best web search query to find detailed, specific how-to content about it.
Rules:
- Use English unless the topic is specifically about Israeli/Hebrew-language content (e.g. Israeli dishes, Hebrew songs, local services)
- Be specific: include the exact name, artist, dish name, etc.
- Aim for a query that would return tutorials, guides, tabs, recipes, or step-by-step resources
- Return ONLY the search query string, nothing else."""


def build_steps_with_web_prompt(topic, description, web_context):
    return f"""
            The user wants a step-by-step process for: "{topic}"
            Context: {description}

            Here is REAL content fetched from the web about this topic:
            ---
            {web_context[:6000]}
            ---

            Using the specific details in that content (exact names, techniques, ingredients, tabs, BPM, tools, etc.),
            create 4-6 actionable steps in Hebrew for "{topic}".

            Rules:
            - Reference SPECIFIC details from the content above (not generic advice)
            - Each step must be immediately actionable
            - Do NOT include a step about "finding" or "searching" — the source URLs are added separately
            - Steps in Hebrew
            - Return ONLY a JSON array of strings: ["step 1", "step 2", ...]
            """


def build_steps_without_web_prompt(topic, description):
    return f"""
            Create 5-7 specific, actionable steps in Hebrew for: "{topic}"
            Context: {description}

            Rules:
            - Be as specific as possible — name exact techniques, platforms, ingredient amounts, tools, etc.
            - Each step must be immediately actionable
            - Steps in Hebrew
            - Return ONLY a JSON array of strings: ["step 1", "step 2", ...]
            """


def build_email_filter_prompt(topic, all_terms, emails_raw):
    return f"""
        The user is looking for emails about: "{topic}"
        Keywords they care about: {json.dumps(all_terms, ensure_ascii=False)}

        Below is a list of emails fetched from Gmail.
        Your job:
        1. FILTER: Keep ONLY emails that are genuinely relevant to the topic "{topic}". Discard unrelated emails.
        2. SUMMARIZE: For each kept email, write one short sentence in Hebrew describing what it says or requires.

        Return a JSON array containing ONLY the relevant emails, with fields: id, subject, sender, summary.
        If none are relevant, return an empty array [].
        CRITICAL: Return valid JSON only. Escape any double-quotes inside string values.

        Emails:
        {json.dumps(emails_raw, ensure_ascii=False)}
        """


def build_urgent_email_prompt(emails):
    return f"""
        You are an email urgency classifier. Review the following emails and return ONLY those that are genuinely urgent.
        Urgent means: requires action soon, involves a deadline, financial/legal/medical/administrative matter, or a direct reply is clearly needed.
        Marketing emails, newsletters, and notifications are NOT urgent.
        Return a JSON array of at most 5 urgent emails, preserving these fields exactly: id, subject, sender, date, snippet.
        If none are urgent, return an empty array [].

        Emails:
        {json.dumps(emails, ensure_ascii=False)}
        """
