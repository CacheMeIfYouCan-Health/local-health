# Healthcare Access Platform

A healthcare-access platform designed for **underserved but digitally connected communities in South Africa**, particularly townships and rural areas.

The platform connects **local populations with nearby healthcare facilities and independent medical practitioners**, while using community-generated information to make healthcare access easier to navigate.

The platform is focused on **healthcare access, community information, and personal health organisation** rather than diagnosis or personalised medical advice.

---

## Core Product Proposition

Many people in underserved communities can access the internet and smartphones but still struggle to answer basic healthcare-access questions:

* Where is the nearest appropriate healthcare facility?
* What is currently happening at that facility?
* Is the queue long?
* Are other people reporting problems or useful updates?
* Which local medical practitioners are available?
* How can I quickly communicate important personal medical information?
* How can I access emergency services when I have limited airtime?
* How can I manage basic medication reminders?

The platform combines these functions into one application designed around **local healthcare access**.

Unlike a general search engine, the platform is designed around **community-generated, location-aware and healthcare-specific information**.

---

# Target Market

## Primary Market

Digitally connected people living in underserved South African communities, particularly:

* Townships
* Rural communities
* Low- and middle-income communities
* Communities that rely heavily on public healthcare
* Communities where healthcare information is fragmented or difficult to access

## Secondary Market

Independent local medical practitioners and small healthcare practices.

Practitioners can potentially use the platform to:

* Create a professional profile
* Display services offered
* Provide contact information
* Display operating hours and availability
* Reach nearby patients
* Receive enquiries
* Build a digital presence within their local community

The platform should not require large healthcare institutions or government facilities to participate for its core functionality to operate.

---

# Features

## Priority 1 — Core MVP

### 1. Healthcare Facility Map & Information

Display nearby healthcare facilities, including:

* Clinics
* Hospitals
* Pharmacies
* Independent medical practitioners
* Other relevant healthcare facilities

Facility information can include:

* Name
* Address
* Contact information
* Operating hours
* Services offered
* Approximate distance
* Estimated travel time
* Emergency contact information where available

Maps and travel information can use Google Maps or another suitable mapping provider.

---

### 2. Live Queue & Congestion Status

Users can submit information about the current situation at a healthcare facility.

Reports may include:

* Approximate number of people waiting
* Queue/congestion level
* Estimated waiting time
* Type of queue/service
* Timestamp
* Optional description
* Optional location verification

The platform can aggregate recent reports into a simple status such as:

* Low
* Moderate
* High

Older reports should gradually become less relevant.

Queue size and estimated waiting time should remain separate pieces of information.

---

### 3. Facility-Specific Community Forum

Each healthcare facility can have its own community feed.

Users can:

* Post updates
* Ask questions
* Report queue conditions
* Discuss service availability
* Ask about medicine availability
* Share relevant facility information
* Reply to other users
* Upvote useful information
* Confirm information
* Report inappropriate content

The forum allows communities to provide information without requiring the healthcare facility itself to manage the platform.

---

### 4. Personal Medical Information

Users can maintain a personal health profile containing information they choose to store.

Examples may include:

* Allergies
* Medical conditions
* Medication information
* Emergency information
* Other important personal medical details

### Privacy Model

This information is **stored only on the user's device**.

The platform's servers and database should not receive or store this medical information.

The user controls when and how the information is displayed or shared.

This is particularly useful when a person needs to communicate important medical information quickly during a healthcare visit or emergency.

---

### 5. Emergency Call

The application can provide verified emergency contact numbers associated with facilities or emergency services.

The flow should be:

1. User selects an emergency contact.
2. App displays the number.
3. User confirms the call.
4. App opens the device's phone dialler.

The application does **not** dispatch ambulances itself.

Emergency numbers should only be presented when their source can be appropriately verified.

---

### 6. Emergency Airtime Voucher

Users can optionally purchase airtime vouchers independently and store the voucher information **locally on their device**.

The application does not purchase airtime on the user's behalf and does not require a telecom partnership.

The intended flow is:

1. User purchases an airtime voucher normally.
2. User stores the voucher code in the application.
3. The voucher code remains on the device.
4. During an emergency, the user can select the stored voucher.
5. The application assists the user in opening the appropriate phone/USSD dialler flow to redeem the voucher.
6. Once airtime has been loaded, the user can make the required call.

The application should not silently execute the airtime recharge. The user should remain in control of the dialler/USSD action.

### Airtime Privacy

Voucher codes are:

* Stored locally on the device
* Not stored in the backend
* Not stored in the database
* Not transmitted to the platform
* Controlled by the user

If the device is lost or compromised, locally stored voucher information may still be exposed, so local protection/encryption should be considered.

---

### 7. Medication Reminder

Users can create medication reminders on their device.

Reminders can include:

* Medication name
* Time
* Frequency
* One-time or recurring schedules

Notifications should be handled through the mobile application and device notification system.

The reminder feature does not prescribe medication or provide medical advice.

---

### 8. Local Medical Practitioner Discovery

Independent practitioners can create profiles that allow nearby users to discover them.

Possible information includes:

* Practitioner name
* Practice name
* Profession
* Services
* Location
* Operating hours
* Contact information
* Availability
* Enquiries or booking options

This creates a potential paid service for practitioners while providing local communities with more accessible healthcare options.

Practitioners should not need to depend on large institutional partnerships to participate.

---

### 9. Multilingual Support

The application should support multiple South African languages to improve accessibility.

Languages can initially be introduced incrementally rather than attempting to implement all languages simultaneously.

Important areas for localisation include:

* Navigation
* Facility information
* Queue reporting
* Forum categories
* Notifications
* Instructions
* Safety and privacy information
* Basic feature descriptions

Community-generated content may remain in the language in which it was submitted, with translation potentially introduced later.

---

# Priority 2 — Trust & Community Intelligence

## Location-Verified Reports

Users can optionally allow the application to verify that they were near a selected healthcare facility when submitting a report.

The system should avoid exposing the user's precise location publicly.

Instead, the platform can record information such as:

* Whether the report was location verified
* Timestamp
* Approximate relationship to the facility

The objective is to improve confidence in community-generated information without publicly exposing user locations.

---

## Trusted Contributors

The platform should distinguish between **identity claims and demonstrated reliability**.

A user can initially self-declare that they are a healthcare worker and receive a **self-declared healthcare-worker badge**.

However, the badge itself should not automatically make their information trusted.

Contributor reliability can instead develop through:

* Location-verified reports
* Consistent reporting
* Community confirmations
* Useful forum contributions
* Agreement with other reports
* Historical contribution quality

This creates a progression from ordinary community contributor to trusted contributor.

Optional credential verification can be introduced later without making institutional participation a requirement for the platform to function.

---

## Data Confidence

Information can receive a confidence level based on factors such as:

* Number of recent reports
* Report freshness
* Location verification
* Agreement between reports
* Contributor reliability
* Historical consistency

This allows the platform to communicate uncertainty instead of presenting every community report as fact.

---

## Community Reliability

Users can build reputation through useful contributions rather than simply posting frequently.

Potential signals include:

* Verified reports
* Confirmations from other users
* Accurate historical reports
* Useful forum contributions
* Agreement with other verified reports

The system should reward **quality and reliability rather than quantity**.

---

## Points & Rewards

Users may receive points for useful community participation.

Potential activities include:

* Submitting verified reports
* Confirming accurate information
* Providing useful community updates
* Participating constructively in forums

Future uses for points could include:

* Rewards
* Services
* Reminder-related functionality
* Other platform benefits

The reward system should avoid encouraging spam or unnecessary submissions.

---

## AI Content Classification

AI can later assist with:

* Categorising forum posts
* Identifying duplicate reports
* Detecting spam
* Detecting abusive content
* Identifying potentially important updates
* Structuring community-generated information

AI should support moderation and organisation rather than provide medical diagnoses.

---

## Facility Operational Updates

The platform can allow relevant information about facilities to be surfaced through community contributions, such as:

* Temporary service interruptions
* Queue changes
* Department availability
* Changes in operating hours
* Other access-related updates

Community information should remain distinguishable from officially verified facility information.

---

# Priority 3 — Advanced Intelligence

## Predictive Waiting Times

Historical queue and waiting-time information could eventually be used to estimate likely waiting times.

Potential inputs include:

* Historical reports
* Time of day
* Day of week
* Current reports
* Location-verified reports
* Congestion levels

---

## Real-Time Congestion Detection

Aggregated location information could potentially be used to estimate activity around a healthcare facility.

This would only indicate potential activity around the facility and should not automatically be interpreted as the number of patients.

Privacy-preserving aggregation would be required.

---

## Advanced NLP & Report Aggregation

Natural-language processing could identify relationships between multiple community reports.

Potential uses include:

* Combining similar reports
* Detecting contradictory information
* Extracting queue information
* Identifying recurring facility issues
* Detecting unusual changes in community reports

---

## Healthcare Access Intelligence

As the platform accumulates community-generated data, it could eventually identify broader patterns in healthcare accessibility.

Examples include:

* Recurring congestion periods
* Facility-specific access patterns
* Common service availability problems
* Community healthcare-access trends

The objective is to understand **healthcare access**, not diagnose or treat medical conditions.

---

# Future Ecosystem

Potential future features include:

* Advanced practitioner tools
* Practitioner subscriptions
* Practitioner analytics
* Expanded rewards
* Referrals
* Advertising
* Donations
* Additional community healthcare services
* Expanded language translation
* Community non-emergency transport
* Licensed healthcare-provider integrations

Any emergency transport functionality would require a separate legal, safety and operational model.

---

# Technology Stack

## Web Application

* Next.js
* JavaScript
* CSS / Tailwind CSS

## Mobile Application

* React Native
* Expo

The mobile application provides access to device-specific functionality such as:

* Push notifications
* Local storage
* Device location
* Phone dialler
* Offline personal medical information
* Other device capabilities

---

## Backend

* Node.js
* Express
* PostgreSQL
* Neon
* Socket.IO

Backend architecture:

```text
Request
   ↓
Middleware
   ↓
Route
   ↓
Endpoint
   ↓
Controller
   ↓
Database / Service
```

---

## Infrastructure

* GitHub
* GitHub Actions
* Azure

---

## External Services

Potential integrations include:

* Google Maps or another mapping provider
* AI/NLP services
* Push notification services
* Other services required for specific platform functionality

The core application should remain functional without requiring large healthcare institutions to integrate with the system.

---

# Project Structure

```text
/
├── frontend/
├── mobile/
├── backend/
├── README.md
└── .gitignore
```

---

# Authentication

Users should have accounts so that the platform can maintain:

* User profiles
* Contribution history
* Reputation
* Points/rewards
* Medication reminders
* Practitioner profiles
* Application preferences

Authentication information is handled by the backend.

Personal medical information is an exception: it should remain on the user's device and should not be stored in the platform database.

---

# Privacy & Safety

The platform should follow a data-minimisation approach.

The application should avoid collecting unnecessary:

* Patient names
* Medical records
* Confidential patient information
* Private staff information
* Exact public locations
* Passwords
* Internal facility credentials

Personal medical information should remain **local to the user's device**.

Location information used for report verification should be minimised and should not expose precise user locations publicly.

Community-generated information should be clearly distinguished from officially verified information.

The platform is intended to improve **healthcare access and information**, not provide medical diagnosis or personalised medical treatment advice.

---

# Development Principles

### Community First

The platform should provide value to local communities even without institutional participation.

### Privacy First

Collect and transmit only information that is necessary for the platform's functionality.

### Mobile First

Device-specific functionality should be handled through the React Native/Expo mobile application.

### Trust Through Evidence

A user's reliability should be based on demonstrated contribution quality rather than simply self-declared status.

### Local Healthcare Focus

The platform should prioritise local healthcare facilities, practitioners and communities rather than attempting to become a general-purpose healthcare application.

### Accessibility

The application should account for:

* Low-connectivity environments
* Mobile-first usage
* Multiple South African languages
* Users with different levels of digital literacy
* Offline access to important user-controlled information

---

# Product Direction

The platform's central loop is:

```text
Find healthcare
      ↓
Understand current conditions
      ↓
Contribute information
      ↓
Communicate with the community
      ↓
Access local practitioners
      ↓
Manage personal health information
      ↓
Return and contribute again
```

The core differentiator is the combination of:

* Local healthcare discovery
* Community-generated access information
* Location-aware trust
* Local medical practitioner discovery
* Device-only personal medical information
* Emergency access tools
* Multilingual accessibility

The platform is ultimately intended to make **healthcare access more understandable, accessible and community-driven for underserved but digitally connected South African communities.**
