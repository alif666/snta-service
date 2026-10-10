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

## Testing with Postman

The Postman collection is available at:

```text
docs/postman/snta-service.postman_collection.json
```

Import the collection into Postman and update the `baseUrl` collection variable when the API is deployed.

The collection will be updated incrementally as new endpoints are implemented.

## Project structure

The backend follows a feature-driven structure. Feature-specific routes, controllers, services, repositories, models, validation, and types will live together under `src/modules`. Shared infrastructure belongs under `src/shared`.

### codex resume 01a12376-6e8a-75c3-ac09-b294dea5b64a
