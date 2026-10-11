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

### Demo production data

The repository includes a guarded, idempotent demo seed command. It creates a demo admin, demo member, notes, and public posts without deleting existing records.

Set these values in the deployment environment or a temporary local shell session:

```env
SEED_CONFIRM=seed-demo
SEED_ADMIN_EMAIL=demo-admin@example.com
SEED_ADMIN_PASSWORD=use-a-strong-demo-password
SEED_USER_EMAIL=demo-writer@example.com
SEED_USER_PASSWORD=use-a-strong-demo-password
```

Then run the command from the backend repository while `MONGODB_URI` points to the intended Atlas database:

```bash
npm run seed:demo
```

Remove the seed variables after the command succeeds. The command is not part of the Vercel runtime startup process.

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

The interest analytics endpoint groups users by each interest, counts unique users, includes the users in each group, and supports pagination. A user with multiple interests appears in every applicable group. Duplicate interest values on one user are counted only once.

Example response:

```json
{
  "success": true,
  "data": {
    "interests": [
      {
        "interest": "technology",
        "userCount": 2,
        "users": [
          {
            "id": "user-id",
            "name": "Example User",
            "email": "example@example.com",
            "role": "user"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### Index strategy

The schemas define only indexes used by required filters and list ordering:

- `User.email` unique ascending index supports case-normalized login lookup and prevents duplicate accounts.
- `User.createdAt` descending index supports the administrator directory's newest-first list. The query uses `_id` only as a deterministic tie-breaker.
- `Note.author + createdAt` descending compound index supports a user's own-note list; `Note.createdAt` descending index supports the administrator's all-notes list. The query uses `_id` only as a deterministic tie-breaker.
- `Post.author + createdAt` descending compound index supports the selected-user post lookup; `Post.createdAt` descending index supports the public post list. The aggregation matches and sorts before `$lookup` so these indexes can support the post scan.

MongoDB's built-in `_id` indexes support individual user, note, and post retrieval; no redundant custom `_id` indexes are defined.

### Posts

Posts are publicly readable. Authenticated users can create posts and manage
their own posts. Administrators can manage any post.

```text
POST   /api/v1/posts
GET    /api/v1/posts?page=1&limit=20
GET    /api/v1/posts/:id
PATCH  /api/v1/posts/:id
DELETE /api/v1/posts/:id
GET /api/v1/users/:id/posts?page=1&limit=20
```

The user-post lookup uses a MongoDB aggregation with `$lookup`, returns paginated results sorted by newest first, and exposes only the author's `id`, `name`, and `email`.

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
