# Healthcare Queue & Access App

A crowdsourced healthcare-access platform designed to help South African communities understand what is happening at nearby healthcare facilities.

The platform focuses on finding healthcare facilities, understanding current queue and congestion conditions, sharing facility-specific updates, managing basic health routines, and connecting communities through health and wellness activities.

The app is **not intended to provide medical diagnoses or personalised medical advice**.

## Features

### 🔴 Priority 1 — MVP

* **Facility Map & Information** — Discover nearby clinics, hospitals and pharmacies, view facility information, and see approximate travel distance/time.
* **Live Queue Status** — Submit and view current queue conditions, including queue size, estimated waiting time, timestamps and Low/Moderate/High congestion status.
* **Facility-Specific Forum** — Each facility has its own community feed for queue updates, service updates, medicine availability, questions and general discussion.
* **Emergency Call Button** — Facilities with verified emergency/ambulance numbers can provide a confirmation-based button that opens the phone dialler.
* **Medication Reminder** — Create one-time or recurring medication reminders with push notifications.
* **Community Exercise Planner** — Create and join community wellness activities such as walks, running groups, aerobics and outdoor workouts.
* **Multilingual Support** — Support multiple South African languages for navigation, facility information, notifications, instructions and other important user-facing content.

### 🟠 Priority 2 — Trust & Intelligence

* **Location-Verified Reports** — Optionally verify that a user is near a facility when submitting a report.
* **Data Confidence** — Combine report freshness, location verification, report agreement and other signals to indicate confidence in facility information.
* **Community Reliability** — Reward users for accurate and useful contributions rather than simply rewarding quantity.
* **Medicine Price Finder** — Compare medicine prices across supported pharmacies.
* **Points & Rewards** — Introduce a simple community participation and rewards system.
* **AI Content Classification** — Automatically categorise forum posts and community reports.
* **Duplicate & Spam Detection** — Identify duplicate, abusive, suspicious or spam content.
* **Community Confirmations** — Allow users to confirm information submitted by other users.
* **Facility Operational Updates** — Surface community-reported changes to facility services and operations.

### 🟡 Priority 3 — Advanced Intelligence

* **Predictive Waiting Times** — Estimate waiting conditions using historical and current data.
* **Real-Time Congestion Estimation** — Use aggregated location metadata as one signal for facility congestion.
* **Anomaly Detection** — Detect unusual facility activity compared with historical patterns.
* **Advanced NLP Report Aggregation** — Convert unstructured community posts into structured healthcare-access information.
* **Medicine Availability Intelligence** — Analyse community reports and other available information about medicine availability.
* **Advanced Community Rewards** — Expand the participation and rewards system.
* **Expanded Language Translation** — Extend multilingual support and consider translation of community-generated content.

### 🟢 Future Ecosystem

* Community non-emergency transport
* Partnerships with licensed transport providers
* Advanced reward redemption
* Advert-based rewards
* Referral incentives
* Donations and community funding
* Other healthcare-access partnerships

## Tech Stack

* **Neon PostgreSQL** — Database
* **GitHub Actions** — CI/testing and repository workflows
* **Azure** — Hosting and deployment
* **Express.js + Node.js** — Backend/API
* **Next.js + JavaScript** — Frontend
* **Socket.IO** — Real-time communication
* **Google Maps or similar mapping provider** — Location and travel information
* **AI/NLP services** — Content classification, moderation and report aggregation

## Project Structure

```text
healthcare-app/

├── frontend/
│   ├── app/             # Pages/routes
│   ├── components/      # Reusable UI components
│   ├── lib/             # API/socket integrations
│   ├── utils/           # Helper functions
│   └── public/          # Static assets
│
├── backend/
│   ├── controllers/     # Request handling and application logic
│   ├── db/              # PostgreSQL connection and SQL queries
│   ├── middleware/      # Request validation, authentication, etc.
│   ├── routes/          # API endpoints and route definitions
│   └── server.js        # Express server configuration
│
└── README.md
```

## Development

Clone the repository:

```bash
git clone <repository-url>

cd healthcare-app
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

Each feature should generally follow the same architecture:

```text
Frontend → Express API → PostgreSQL
```

Feature ownership should rotate during development so that team members gain experience working across the frontend, backend and database.

## Naming Conventions

### Pages / Routes

Use lowercase kebab-case:

```text
app/facility-map/page.js
app/queue-status/page.js
app/self-study/page.js
```

### Components

Use PascalCase:

```text
FacilityCard.js
QueueStatus.js
ForumPost.js
MedicationReminder.js
EmergencyButton.js
```

### Helper Functions / Utilities

Use camelCase:

```text
calculateDistance.js
formatTime.js
calculateConfidence.js
```

### Assets

Store static assets in `public/`:

```text
public/images/

public/icons/
```

Keep implementations simple and understandable. The primary goal is **learning, consistency and integration**, rather than production-level complexity.

## Backend Architecture

Keep backend responsibilities separated:

```text
Request
   ↓
Middleware       # Validate, authenticate, parse, etc.
   ↓
Route            # Decide which controller handles the request
   ↓
Controller       # Handle request and application logic
   ↓
Database         # Execute SQL queries
```

Use the corresponding folders for each responsibility:

```text
backend/

├── controllers/     # Request handling and application logic
├── db/              # PostgreSQL connection and SQL queries
├── middleware/      # Request validation, authentication, etc.
├── routes/          # API endpoints and route definitions
└── server.js        # Express server configuration
```

Do not place database queries directly inside routes or unrelated application logic inside middleware.

## Privacy & Safety

The platform should minimise the personal information it collects.

Users should not be encouraged to submit:

* Patient names
* Patient medical records
* Patient photographs
* Confidential patient information
* Private staff information
* Passwords or internal access credentials

Location verification should only be used when necessary. Exact user locations should not be publicly displayed.

The platform should:

* Follow POPIA requirements where applicable.
* Collect only necessary information.
* Clearly explain location usage.
* Avoid exposing precise user locations.
* Provide reporting and moderation mechanisms.
* Clearly distinguish community reports from verified official information.

The Emergency Call feature does **not** dispatch ambulances. It only provides access to verified facility emergency numbers through the user's phone dialler.

## Product Direction

The core product loop is:

```text
Find a facility
      ↓
See what is happening
      ↓
Contribute information
      ↓
Communicate with the community
      ↓
Manage your health
      ↓
Participate in community wellness
```

The primary differentiator is turning **real-time community contributions into useful healthcare-access intelligence**.

The platform should remain:

* Community-driven
* Accessible
* Multilingual
* Privacy-conscious
* Location-aware when necessary
* Data-driven
* Focused on healthcare access rather than medical diagnosis
