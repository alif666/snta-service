# Secure Note-Taking Application API

Backend service for the Secure Note-Taking Application interview assignment.

## Tech stack

- Node.js
- Express
- TypeScript
- MongoDB with Mongoose
- Vitest and Supertest for integration testing

## Local setup

### Prerequisites

- Node.js 20 or later
- npm

### Installation

```bash
npm install
Copy-Item .env.example .env
```

On macOS or Linux, use:

```bash
cp .env.example .env
```

### Available commands

```bash
npm run dev          # Start the development server
npm run test         # Run integration tests
npm run test:watch   # Run tests in watch mode
npm run typecheck    # Type-check application and tests
npm run build        # Compile the production build
npm start            # Start the compiled application
npm run lint         # Run ESLint
npm run format       # Format source files
```

## MongoDB setup

Create a local environment file from the committed example:

```bash
Copy-Item .env.example .env
```

Set `MONGODB_URI` in `.env` to a local MongoDB or MongoDB Atlas connection string. The server establishes the database connection before it starts listening for requests.

For integration tests, the project uses `mongodb-memory-server`. Tests use an isolated temporary MongoDB instance and do not connect to Atlas.

The database connection is managed by `src/config/database.ts`. It reuses an existing connection and closes the connection during graceful server shutdown.

## API

The API is versioned under `/api/v1`.

### Health check

```text
GET /api/v1/health
```

Successful response:

```json
{
  "success": true,
  "message": "Service is healthy"
}
```

### Authentication

The authentication endpoints are:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

Set these values in `.env`:

```env
JWT_SECRET=use-a-long-random-secret
JWT_EXPIRES_IN=1d
```

After login, send the returned token using:

```text
Authorization: Bearer <access-token>
```

The API never returns or stores plain-text passwords. Passwords are hashed with bcrypt before persistence.

### User management

User-management endpoints require an authenticated administrator token:

```text
GET    /api/v1/users?page=1&limit=20
GET    /api/v1/users/:id
POST   /api/v1/users
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id
GET    /api/v1/users/analytics/interests
```

The list endpoint returns pagination metadata and sorts users by newest first. User responses never include `password` or `passwordHash`.

The admin create endpoint accepts `name`, `email`, `password`, `role`, and optional `interests`. Public registration always creates a regular user; only an administrator can assign the `admin` role.

Example admin create request:

```json
{
  "name": "New User",
  "email": "new-user@example.com",
  "password": "StrongPassword123",
  "role": "user",
  "interests": ["technology"]
}
```

To use these endpoints in Postman, set the collection's `accessToken` variable to a valid administrator JWT and `userId` to a target user ID.

The interest analytics endpoint groups users by each interest, counts unique users, and sorts the results by count in descending order.

Example response:

```json
{
  "success": true,
  "data": {
    "interests": [
      {
        "interest": "technology",
        "userCount": 2
      }
    ]
  }
}
```

### User posts lookup

Administrators can retrieve a user's posts with joined author information:

```text
GET /api/v1/users/:id/posts?page=1&limit=20
```

The endpoint uses a MongoDB aggregation with `$lookup`, returns paginated results sorted by newest first, and exposes only the author's `id`, `name`, and `email`.

### Notes

Authenticated users can create, list, view, update, and delete their own notes. Administrators can list and view notes from all users, while update and delete operations remain ownership-protected.

```text
POST   /api/v1/notes
GET    /api/v1/notes?page=1&limit=20
GET    /api/v1/notes/:id
PATCH  /api/v1/notes/:id
DELETE /api/v1/notes/:id
```

Note lists are paginated and sorted by newest first. Note responses expose `id`, `title`, `content`, `author`, `createdAt`, and `updatedAt`. The note author is always determined by the authenticated user and cannot be changed by the client.

Example note creation request:

```json
{
  "title": "My first note",
  "content": "Important note content"
}
```

Example partial update request:

```json
{
  "title": "Updated title"
}
```

## Testing with Postman

The Postman collection is available at:

```text
docs/postman/snta-service.postman_collection.json
```

Import the collection into Postman and update the `baseUrl` collection variable when the API is deployed.

The collection includes health, authentication, note, administrator user-management, and error-handling requests. The create-note request stores its returned note ID in the `noteId` collection variable for subsequent note requests.

## Project structure

The backend follows a feature-driven structure. Feature-specific routes, controllers, services, repositories, models, validation, and types will live together under `src/modules`. Shared infrastructure belongs under `src/shared`.

### codex resume 01a12376-6e8a-75c3-ac09-b294dea5b64a
