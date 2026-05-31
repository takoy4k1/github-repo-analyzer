# RepoMind Explainer - Frontend Client

This is the React + Vite client web application for RepoMind Explainer.

## 💻 Tech Stack & Dependencies
- **Core**: React.js, React Router DOM (Navigation), React Context (Authentication)
- **Styling**: Tailwind CSS v4, custom utility classes, CSS custom variables for themes
- **Graphics**: Framer Motion (page animations), Lucide React (vector icons), Recharts (health scorecard graphs)
- **API Communication**: Axios interceptors (attaching JWT token, handling 401 redirects)

## 🛠️ Run Locally
1. Ensure the Node API is running in the backend folder.
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Launch Vite development server:
   ```bash
   npm run dev
   ```
4. Access the web app at `http://localhost:5173`.

For full setup documentation (including database configuration, environment variables, and visual design guidelines), please check out the master [root README.md](../README.md).

