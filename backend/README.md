# Habit Tracker Backend

This is the backend server for the AuraHabit application. It provides RESTful API endpoints for authentication, habit tracking, goal management, and analytics.

## Project Structure

```
backend/
├── server.js                 # Main entry point
├── package.json
├── .env.example
├── config/
│   └── db.js                 # Database connection logic
├── models/
│   ├── User.js
│   ├── Habit.js
│   ├── Completion.js
│   ├── Goal.js
│   └── Achievement.js
├── controllers/
│   ├── authController.js
│   ├── habitController.js
│   ├── completionController.js
│   ├── goalController.js
│   └── analyticsController.js
├── middleware/
│   ├── authMiddleware.js
│   └── errorMiddleware.js
└── services/
    ├── streakService.js
    ├── analyticsService.js
    └── achievementService.js
```

## Scripts

- `npm install` - Install dependencies
- `npm start` - Start the server (uses `node server.js`)
- `npm run dev` - (If nodemon is installed) automatically restart on changes

## Environment Variables

Create a `.env` file in the root with:
- `JWT_SECRET` - Secret key for JWT signing
- `PORT` - Server port (default: 4000)
- `MONGODB_URI` - MongoDB connection string (default: `mongodb://127.0.0.1:27017/habit_tracker`)

## Database

The app uses MongoDB via Mongoose. It will attempt to connect to MongoDB Atlas first, then fall back to an in-memory database for development.

## API Endpoints

- `/api/auth/*` - Authentication (signup, login, logout)
- `/api/habits/*` - Habit management
- `/api/goals/*` - Goal management
- `/api/completions/*` - Completion tracking
- `/api/analytics/*` - Analytics and statistics
- `/api/export/*` - Data export (CSV/JSON)

## Running the Server

1. Ensure Node.js and npm are installed.
2. Run `npm install` to install dependencies.
3. Start the server: `node server.js`.
4. Visit `http://localhost:4000` for the frontend UI.

## Testing

Use Postman or any REST client to test the endpoints. Ensure you include the `Authorization` header with a valid JWT token for protected routes.