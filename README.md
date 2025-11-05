# SlotSwapper

**Live Frontend:** [**https://slotswapper-rouge.vercel.app**](https://slotswapper-rouge.vercel.app)
<br>
**Live Backend:** [**https://slotswapper-server.onrender.com**](https://slotswapper-server.onrender.com)

A full-stack, peer-to-peer (P2P) time-slot scheduling application.

## ✨ Features & Technology

This application is a complete, modern web app featuring a decoupled frontend and backend, a real-time notification system, and a cloud-native database.

### Core Features
* **Full JWT Authentication:** Secure user registration and login with password validation.
* **Calendar Event CRUD:** Users can Create, Read, Update, and Delete their own calendar events.
* **P2P Swap System:** Users can mark their events as "swappable," browse a "marketplace" of other users' swappable slots, and send swap requests.
* **Request Management:** A full notification dashboard to "Accept" or "Reject" incoming swaps and view the status of outgoing requests.
* **Real-time Notifications:** Uses **WebSockets** to instantly update users when they receive a request or when their request is accepted/rejected.
* **Glassmorphism UI:** A modern, dark-mode, responsive UI with frosted-glass effects.

### Technology Stack
* **Frontend:** React (Vite), React Router, Axios
* **Backend:** Node.js, Express
* **Database:** PostgreSQL (Hosted on Render)
* **Real-time:** `ws` (WebSockets)
* **Authentication:** `jsonwebtoken` (JWTs), `bcrypt` (password hashing)
* **Testing:** Jest & Supertest
* **Containerization:** Docker & Docker Compose
* **Deployment:**
    * **Frontend:** Vercel (CI/CD from GitHub)
    * **Backend:** Render (Web Service)
    * **Database:** Render (Postgres)

---

## 🚀 How to Run Locally

This project is fully containerized with Docker for a simple, one-command setup.

### Prerequisites
* [Git](https://git-scm.com/downloads)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Must be running)

### Setup Instructions (Docker - Recommended)

This is the easiest and most reliable way to run the project.

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/YourUsername/SlotSwapper.git](https://github.com/YourUsername/SlotSwapper.git)
    cd SlotSwapper
    ```

2.  **Build and run the containers:**
    ```bash
    docker-compose up --build
    ```

3.  **That's it!** The app is now running:
    * **Frontend:** `http://localhost:5173`
    * **Backend:** `http://localhost:4000`

---

##  API Endpoints

All endpoints are prefixed with `/api`. Routes marked with `🔒` require a valid JWT Bearer Token in the `Authorization` header.

### 🔑 Authentication

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Creates a new user. |
| `POST` | `/auth/login` | Logs in a user, returns a JWT token. |

### 📅 Events (CRUD)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/events` 🔒 | Creates a new event for the logged-in user. |
| `GET` | `/events/my-events` 🔒 | Gets all events for the logged-in user. |
| `PUT` | `/events/:eventId` 🔒 | Updates an event's title and times. |
| `PATCH` | `/events/:eventId/status` 🔒 | Updates an event's status (e.g., 'BUSY' or 'SWAPPABLE'). |
| `DELETE` | `/events/:eventId` 🔒 | Deletes one of the user's events. |

### 🔁 Swap Logic

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/swap/swappable-slots` 🔒 | Gets all slots from *other* users marked 'SWAPPABLE'. |
| `POST` | `/swap/request` 🔒 | Submits a new swap request. |
| `POST` | `/swap/response/:requestId` 🔒 | **(Core Logic)** Accepts or rejects an incoming swap. |
| `GET` | `/swap/requests/incoming` 🔒 | Gets the user's pending incoming requests. |
| `GET` | `/swap/requests/outgoing` 🔒 | Gets the user's outgoing requests (pending/accepted/rejected).|
| `DELETE` | `/swap/request/:requestId` 🔒 | Dismisses a resolved (accepted/rejected) request. |

---

## 💡 Assumptions & Challenges

### Assumptions
* All swaps are 1-for-1: a user offers one of their slots in exchange for one of another user's slots.
* Event times are stored in the database in UTC (`TIMESTAMPTZ`) and converted to the user's local timezone on the frontend.
* Once a swap is accepted, the events are simply exchanged, and their status is set back to 'BUSY'.

### Challenges & Solutions

* **Challenge 1: Deployment Database**
    * **Problem:** The project was initially built with **SQLite**. This is a file-based database, which is not supported on Render's free tier due to its "ephemeral" filesystem (all files are deleted on restart).
    * **Solution:** The entire backend was refactored to use **PostgreSQL**. This involved installing the `pg` driver, migrating the database schema (e.g., `AUTOINCREMENT` to `SERIAL`), and updating all SQL queries to use PostgreSQL syntax (e.g., `?` to `$1`, `$2`...). A free Postgres instance was provisioned on Render and connected to the server via the `DATABASE_URL` environment variable.

* **Challenge 2: Containerization**
    * **Problem:** When building the Docker image, native Node modules (`bcrypt`, `sqlite3` before the migration) caused an `invalid ELF header` crash. This was due to the Docker volume mounting the Windows-compiled `node_modules` folder over the Linux-compiled `node_modules` inside the container.
    * **Solution:** This was solved by adding a `.dockerignore` file in both the `client` and `server` directories to exclude the local `node_modules` folder. For the server, an `npm rebuild` command was also added to the `Dockerfile`'s start command to ensure all native modules were compiled for the container's Linux architecture.

* **Challenge 3: Frontend Routing**
    * **Problem:** On the live Vercel site, refreshing the page on `/login` or `/dashboard` resulted in a Vercel 404 error.
    * **Solution:** This was because Vercel was looking for a file named `login.html`. A `vercel.json` file was added to the `client` (root) directory to rewrite all incoming requests to `index.html`, allowing React Router to handle the routing on the client side.
