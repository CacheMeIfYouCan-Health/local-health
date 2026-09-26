# Study App

A collaborative study platform built as a preparation project for our upcoming hackathon.

The goal is to practice building and integrating full-stack features while following consistent development conventions across the team.

## Features

* **Study Chat** — Ask questions, provide answers, and like useful solutions.
* **Live Study Tracking** — See active group members, study progress, timers, and questions.
* **Leaderboard** — Rank members based on study progress, answers, and received likes.
* **Self Study** — Access shared study material and track individual progress.

## Tech Stack

### Frontend

* Next.js
* JavaScript
* CSS / Tailwind CSS

### Backend

* Node.js
* Express

### Database

* PostgreSQL
* Supabase

### Real-time

* Socket.IO

## Project Structure

```text
study-app/
├── frontend/
│   ├── app/             # Pages/routes
│   ├── components/      # Reusable UI components
│   ├── lib/             # API/socket integrations
│   ├── utils/            # Helper functions
│   └── public/           # Static assets
│
├── backend/
│   └── ...
│
└── README.md
```

## Development

Clone the repository:

```bash
git clone <repository-url>
cd study-app
```

Install dependencies:

```bash
cd frontend
npm install

cd ../backend
npm install
```

Run the frontend and backend separately during development.

## Team Convention

Each feature should follow the same general architecture:

```text
Frontend → Express API → PostgreSQL
```

Feature ownership will rotate during development so every team member works with the frontend, backend, and database.

### Naming Conventions

**Pages / Routes**

Use lowercase kebab-case:

```text
app/leaderboard/page.js
app/self-study/page.js
```

**Components**

Use PascalCase:

```text
StudyTimer.js
QuestionCard.js
LeaderboardTable.js
```

**Helper Functions / Utilities**

Use camelCase:

```text
formatTime.js
calculateScore.js
```

**Assets**

Store static assets in `public/`:

```text
public/images/
public/icons/
```

Keep implementations simple and understandable. The primary goal is **learning, consistency, and integration**, not production-level complexity.


### Backend Architecture

Keep responsibilities separated:

```text 
Request
  ↓
Middleware     # Validate, authenticate, parse, etc.
  ↓
Route          # Decide which controller handles the request
  ↓
Controller     # Handle the request and application logic
  ↓
Database       # Execute SQL queries
```

Use the corresponding folders for each responsibility:

```text
backend/
├── controllers/    # Request handling and application logic
├── db/             # PostgreSQL connection and SQL queries
├── middleware/     # Request validation, authentication, etc.
├── routes/         # API endpoints and route definitions
└── server.js       # Express server configuration
```

Keep responsibilities separated. Do not place database queries directly inside routes or put unrelated application logic inside middleware.
