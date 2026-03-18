# 📁 Portfolio Builder

A beginner-friendly student portfolio web app built with **plain Python**, **NeonDB (PostgreSQL)**, **HTML/CSS/JS**, and **Groq AI**.

---

## ⚙️ Setup Instructions

### 1. Prerequisites
Ensure you have the following installed:
- **Python 3.11**
- **Git**

### 2. Clone and Install
```bash
git clone https://github.com/chakrateja70/portfolio_builder
cd portfolio_builder
pip install -r requirements.txt
```

### 3. Environment Setup
Create a `.env` file in the root `portfolio_builder/` directory with the following keys:
```env
# Database format: postgresql://user:password@host:port/dbname?sslmode=require
DB_URL=your_neondb_connection_string
GROQ_API_KEY=your_groq_api_key_here
SECRET_KEY=any_secure_random_string_here (optional to change)
```
> **Tip:** You can get `DB_URL` from [NeonDB](https://neon.tech) and `GROQ_API_KEY` from the [Groq Console](https://console.groq.com).

### 4. Database Migrations
Before running the app, you need to create the necessary database tables. Run the migration script:
```bash
cd migrations
python migrate.py
```
*(If the script lives in a `migrations` folder, run `cd migrations && python migrate.py` instead).*
If successful, you will see `✅ All tables created successfully!`.

### 5. Running the Application
The backend is powered by FastAPI and Uvicorn. Start the development server from the `server` directory:

```bash
cd server
uvicorn main:app --reload
```

### 6. View in Browser
Once the server is running, open your browser and navigate to the frontend:
- **Login/Registration:** Open `http://localhost:8000/login.html` (or `register.html`).
*(Note: Because the app serves static HTML files, ensure you are accessing them through the FastAPI server route if configured, or via a Live Server extension if serving the frontend separately).*

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
