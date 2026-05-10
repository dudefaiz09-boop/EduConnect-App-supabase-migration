# EduConnect-App

A comprehensive education management system connecting students, parents, and teachers with features for attendance, assignments, fees, and communication.

## 🚀 Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Lucide React, Framer Motion
- **Backend:** Node.js, Express, Firebase Admin SDK, Google Generative AI
- **Mobile:** React Native, Firebase
- **Testing:** Jest, Supertest, Playwright, Artillery
- **CI/CD:** GitHub Actions, Cloud Run

## 📁 Architecture

The project follows a modular monolithic architecture for the backend:

- `server.ts`: Entry point.
- `src/server/app.ts`: Express application configuration and middleware.
- `src/server/routes/`: Modular API routes.
- `src/server/middleware/`: Custom middleware (auth, permissions).
- `src/server/lib/`: External library initializations (Firebase, AI).

## 🛠 Getting Started

### Prerequisites

- Node.js (v18+)
- Firebase Account
- Google Gemini API Key

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment variables in `.env`:
    ```bash
    GEMINI_API_KEY=your_key
    ```
4.  Run development server:
    ```bash
    npm run dev
    ```

## 🧪 Testing

Run API tests:
```bash
npm test
```

Run UI tests:
```bash
npm run test:ui
```

## 🔒 Security

- Content Security Policy (CSP) enabled via Helmet.
- Input validation using Zod.
- Rate limiting on API routes.
- Secure authentication via Firebase Auth.
- Role-based access control (RBAC).

## 📄 License

MIT
