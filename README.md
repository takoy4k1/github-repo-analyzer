# RepoMind Explainer - AI-Powered Codebase Intelligence Dashboard

RepoMind Explainer is a state-of-the-art developer dashboard designed to analyze, visualize, and explain GitHub repositories. By integrating AI-driven insights, Mermaid system topology diagrams, automated security scanning, staleness metrics, and semantic RAG chat, it lets developers onboard onto complex codebases in minutes.

The design utilizes a premium, warm off-white cream (`#fdfbf7`) theme with deep bronze (`#422a0a`) accents, optimized for high contrast, responsiveness, and dark mode.

---

## 🚀 Key Features

*   **Repository Analytics & Health Score**: Evaluates repos on code quality, active maintenance, and security, rendering detailed status lists and prioritized onboarding guides.
*   **System Topology Maps**: Automatically renders interactive visual layouts (Mermaid flowcharts) outlining module structures, database relations, and routing patterns.
*   **Security Auditor**: Scans package manifests and source codes for credential leaks and dependency vulnerabilities with severity categorization (Critical, High, Medium, Low).
*   **Dead Code Detector**: Flags files untouched beyond specified configurations (30, 60, 90, or 180 days) as stale.
*   **RAG Semantic Chat**: Provides context-aware discussions with the code structure utilizing OpenAI embeddings and vector-based semantic retrieval.
*   **Local & GitHub Authentication**: Support for both secure local email/password registration (backed by `bcryptjs` encryption) and standard GitHub OAuth login.

---

## 🛠️ Tech Stack

*   **Backend**: Node.js, Express, MongoDB (Mongoose), JSON Web Tokens (JWT), `bcryptjs`, `simple-git`.
*   **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Recharts (visual indicators), Lucide Icons.
*   **AI Engine**: OpenAI/xAI APIs for embeddings and context-aware chat prompts.

---

## 💻 Local Setup & Installation

### Prerequisites
*   Node.js (v18+)
*   MongoDB running locally (`mongodb://localhost:27017`)

### 1. Backend Setup
1. Navigate to the backend directory:
    ```bash
    cd backend
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Configure the environment variables in a `.env` file:
    ```env
    PORT=5001
    MONGO_URI=mongodb://localhost:27017/repomind
    JWT_SECRET=your_jwt_secret_key
    XAI_API_KEY=your_openai_or_xai_api_key
    FRONTEND_URL=http://localhost:5173
    NODE_ENV=development
    ```
4. Run the development server:
    ```bash
    npm run dev
    ```

### 2. Frontend Setup
1. Navigate to the frontend directory:
    ```bash
    cd ../frontend
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Run the Vite development server:
    ```bash
    npm run dev
    ```
4. Open your browser and navigate to `http://localhost:5173`.

---

## 🎨 Visual System & Themes
RepoMind features full responsive adaptive styling:
*   **Light Theme**: Soft Cream (`#fdfbf7`), Soft Ivory (`#f7f4ec`), Warm Muted Borders (`#dfd9c8`), Charcoal Text (`#242520`), and Deep Bronze Accents (`#422a0a`).
*   **Dark Theme**: Charcoal Gray (`#0d1117`), Dark Panel (`#161b22`), Dark Borders (`#30363d`), Light Gray Text (`#c9d1d9`), and Soft Gold Accents (`#d4a373`).
