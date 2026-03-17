# 📁 Portfolio Builder

A beginner-friendly student portfolio web app built with **plain Python**, **NeonDB (PostgreSQL)**, **HTML/CSS/JS**, and **Groq AI**.

---

## 🗂️ Project Structure

```
portfolio_builder/
├── server/
│   ├── server.py       ← Start the server from here
│   ├── router.py       ← URL routing
│   ├── auth.py         ← Register / Login / Sessions
│   ├── profile.py      ← Profile CRUD (projects, skills, etc.)
│   ├── ai_handler.py   ← Groq AI: Q&A + Personal Assistant
│   ├── db.py           ← Database connection helper
│   └── config.py       ← Loads .env variables
├── migrations/
│   └── migrate.py      ← Run once to create DB tables
├── frontend/
│   ├── register.html
│   ├── login.html
│   ├── profile.html
│   ├── css/style.css
│   └── js/
│       ├── auth.js
│       ├── profile.js
│       └── ai.js
├── .env                ← Put your API keys here
└── requirements.txt
```

---

## ⚙️ Setup Instructions

### Step 1 — Install Python dependencies
```bash
pip install -r requirements.txt
```

### Step 2 — Configure your `.env` file
Open `.env` and fill in:
```
DB_URL=postgresql://user:password@host/dbname?sslmode=require
GROQ_API_KEY=your_groq_api_key_here
SECRET_KEY=any_random_string
```

- **DB_URL**: Get from [NeonDB](https://neon.tech) — copy the connection string
- **GROQ_API_KEY**: Get from [Groq Console](https://console.groq.com)

### Step 3 — Run the migration (create tables)
```bash
cd migrations
python migrate.py
```
You should see: `✅ All tables created successfully!`

### Step 4 — Start the server
```bash
cd server
python server.py
```

### Step 5 — Open in browser
```
http://localhost:8080
```

---

## 🗄️ Database Tables

| Table | What it stores |
|-------|---------------|
| `users` | Email, username, hashed password |
| `sessions` | Login tokens |
| `basic_details` | Name, phone, bio, location |
| `projects` | Project title, description, tech, URL |
| `experience` | Company, role, duration, description |
| `skills` | Skill name + level |
| `achievements` | Title, description, date |
| `links` | GitHub, LinkedIn, portfolio, other |

---

## 🤖 AI Features

### Mode 1 — Q&A Chat
- Ask any career/coding/resume question
- Powered by Groq (LLaMA 3)

### Mode 2 — Personal Assistant
- Type natural language commands to update your profile:
  - `"update my name to Teja"`
  - `"set my github to https://github.com/teja"`
  - `"change my location to Hyderabad"`
  - `"update my bio to Full Stack Developer"`

---

## 📄 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/register` | Register new user |
| POST | `/api/login` | Login |
| POST | `/api/logout` | Logout |
| GET/POST | `/api/profile/basic` | Basic details |
| GET/POST | `/api/profile/projects` | Projects list / add |
| DELETE | `/api/profile/projects/<id>` | Delete project |
| GET/POST | `/api/profile/experience` | Experience list / add |
| DELETE | `/api/profile/experience/<id>` | Delete experience |
| GET/POST | `/api/profile/skills` | Skills list / add |
| DELETE | `/api/profile/skills/<id>` | Delete skill |
| GET/POST | `/api/profile/achievements` | Achievements list / add |
| DELETE | `/api/profile/achievements/<id>` | Delete achievement |
| GET/POST | `/api/profile/links` | Links |
| POST | `/api/ai/chat` | Q&A mode |
| POST | `/api/ai/assistant` | Personal assistant mode |
