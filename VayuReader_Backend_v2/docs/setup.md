# Setup & Installation

## Prerequisites
- **Node.js** >= 18 (LTS)
- **npm** >= 9
- **Docker** & **Docker‑Compose** (for MongoDB, Redis, Nginx)
- **MongoDB** (if running locally without Docker)
- **Redis** (if running locally without Docker)

## Local Development
1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd VayuReader_Backend_v2
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Create environment file**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set the required variables (see `CONFIGURATION.md`).
4. **Start supporting services**
   ```bash
   docker-compose up -d mongodb redis nginx
   ```
   - MongoDB will be exposed on `mongodb://localhost:27017/vayu_reader`
   - Redis on `redis://localhost:6379`
5. **Run the backend**
   ```bash
   npm run dev   # uses nodemon for hot‑reloading
   ```
   The API will be reachable at `http://localhost:3000/api/`.

## Production Build (Docker)
```bash
# Build multi‑stage Docker image and start containers
docker-compose -f docker-compose.prod.yml up --build -d
```
- The production compose file disables hot‑reloading, enables TLS (if configured), and runs the app with `node src/server.js`.
- Environment variables should be supplied via a secure secret manager or `.env.production`.

## Common Commands
| Command | Description |
| ------- | ----------- |
| `npm run lint` | Run ESLint on the codebase |
| `npm test` | Execute Jest test suite |
| `npm run start` | Start the server (no hot reload) |
| `npm run dev` | Start the server with nodemon |
| `docker-compose down` | Stop and remove all containers |

---
For more details on each step, see the sections below.
