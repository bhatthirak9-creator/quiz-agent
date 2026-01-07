import sqlite3
import os
import json
import google.generativeai as genai
from flask import Flask, render_template, request, redirect, url_for, session, g, jsonify

app = Flask(__name__, template_folder='.', static_folder='.', static_url_path='')
app.secret_key = 'super_secret_key_neurallocation' 
DATABASE = 'users.db'

# --- CONFIGURATION: PASTE YOUR GEMINI API KEY BELOW ---
GOOGLE_API_KEY = "YOUR_GEMINI_API_KEY_HERE" 
# ------------------------------------------------------

if GOOGLE_API_KEY != "YOUR_GEMINI_API_KEY_HERE":
    genai.configure(api_key=GOOGLE_API_KEY)

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        cursor = db.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        ''')
        db.commit()

@app.route('/')
def home():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('index.html', username=session.get('username'))

@app.route('/index.html')
def home_redirect():
    return redirect(url_for('home'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        db = get_db()
        cursor = db.cursor()
        cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
        user = cursor.fetchone()
        
        if user and user['password'] == password: 
            session['user_id'] = user['id']
            session['username'] = user['username']
            return redirect(url_for('home'))
        else:
            return render_template('login.html', error="Invalid credentials")
            
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        db = get_db()
        cursor = db.cursor()
        try:
            cursor.execute('INSERT INTO users (username, password) VALUES (?, ?)', (username, password))
            db.commit()
            return redirect(url_for('login'))
        except sqlite3.IntegrityError:
            return render_template('register.html', error="Username already exists")
            
    return render_template('register.html')

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    session.pop('username', None)
    return redirect(url_for('login'))

@app.route('/api/generate', methods=['POST'])
def generate_quiz():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json
    text = data.get('text', '')
    num_questions = data.get('numQuestions', 5)
    
    # Ensure num_questions is reasonable
    try:
        num_questions = int(num_questions)
        if num_questions < 1: num_questions = 1
        if num_questions > 100: num_questions = 100
    except:
        num_questions = 5

    if len(text) < 50:
        return jsonify({"questions": []}) # Too short

    # Fallback if no key
    if GOOGLE_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
        print("WARNING: No Google API Key provided. Returning mock data.")
        # ... (mock data generation - for now we'll just slice or let it be static, 
        # but to be proper let's actually duplicate the mock set if needed or just return standard 3)
        base_mock = [
               {
                    "id": 1,
                    "text": "Which architecture is primarily used in modern large language models for parallel processing?",
                    "options": ["Transformer Architecture", "RNN Sequential", "Static Mapping", "Linear Regression"],
                    "answerIdx": 0,
                    "difficulty": "Medium",
                    "validationNote": "Transformers allow for better scalability through attention mechanisms."
                },
                {
                    "id": 2,
                    "text": "What is the main purpose of the 'Attention mechanism' in AI?",
                    "options": ["To limit memory usage", "To focus on relevant parts of input data", "To increase training time", "To store permanent backups"],
                    "answerIdx": 1,
                    "difficulty": "Easy",
                    "validationNote": "Attention helps the model prioritize specific tokens in a sequence."
                },
                {
                    "id": 3,
                    "text": "In the context of 'Agentic Web', what defines an autonomous agent?",
                    "options": ["Manual input loops", "Self-executing task logic", "Simple search scripts", "Static HTML rendering"],
                    "answerIdx": 1,
                    "difficulty": "Hard",
                    "validationNote": "Agents operate independently based on high-level goals."
                }
        ]
        # Adjust mock size
        import copy
        final_mock = []
        for i in range(num_questions):
            q = copy.deepcopy(base_mock[i % len(base_mock)])
            q['id'] = i + 1
            final_mock.append(q)
            
        return jsonify({
            "concepts": ["Synthetic Intelligence", "Neural Architecture", "Cognitive Computing"],
            "questions": final_mock,
            "mock": True
        })

    try:
        # Configure model with High Creativity (Temperature 0.9) to ensure unique results every time
        generation_config = genai.types.GenerationConfig(
            temperature=0.9,
            top_p=0.95,
            top_k=40,
            max_output_tokens=8192,
        )
        
        model = genai.GenerativeModel('gemini-pro', generation_config=generation_config)
        
        # Add random seed + timestamp to prompt to absolutely guarantee uniqueness
        import random
        import time
        random_seed = f"{random.randint(1000, 9999)}_{int(time.time())}"
        
        prompt = f"""
        Act as a **Creative Exam Setter**. I will give you text, and you must generate a **100% UNIQUE** quiz.
        
        Context Text: "{text[:3000]}..."
        Number of questions to generate: {num_questions}
        Generation ID: {random_seed} (This ID means you MUST avoid any standard/generic outputs)

        CRITICAL INSTRUCTIONS FOR UNIQUENESS:
        1. **NEVER use generic questions** like "What is...?" or "Define...". 
        2. **Use varied phrasing**: Start with "Analyze...", "Why does...", "In the context of...", "Which scenario best fits...".
        3. **DISTINCT OPTIONS**: The 4 options must be distinctly different. Do NOT use "All of the above" or "None of the above". 
        4. **SHUFFLE ANSWERS**: The correct answer usually sits at A or B. FORCE it to move around (A, B, C, D randomly).
        5. **DEEP DIVERSITY**: If the user runs this again, they should get completely DIFFERENT questions. Focus on obscure details, implications, and lateral thinking.

        OUTPUT JSON FORMAT:
        {{
            "concepts": ["UniqueConcept1", "UniqueConcept2", ...],
            "questions": [
                {{
                    "id": 1,
                    "text": "Complex, unique question text here...",
                    "options": ["Creative Option 1", "Creative Option 2", "Creative Option 3", "Creative Option 4"],
                    "answerIdx": 2, // Randomize this (0-3)
                    "difficulty": "Medium", 
                    "validationNote": "Deep analysis of why this specific angle was chosen..."
                }},
                ...
            ]
        }}
        """
        
        response = model.generate_content(prompt)
        # Clean response (sometimes contains markdown ```json ... ```)
        json_str = response.text
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0]
        elif "```" in json_str:
             json_str = json_str.split("```")[1].split("```")[0]
             
        result = json.loads(json_str)
        return jsonify(result)
        
    except Exception as e:
        print(f"AI Generation Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    init_db()
    print("Server running on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
