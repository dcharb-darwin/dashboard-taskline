# RTC Project Manager - Docker Setup Guide

This guide provides instructions for running the RTC Project Manager application using Docker and Docker Compose.

## Prerequisites

Ensure you have the following installed on your system:

- **Docker** (version 20.x or higher) - [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose** (version 2.x or higher) - Usually included with Docker Desktop

Verify your installation:

```bash
docker --version
docker-compose --version
```

## Quick Start

### 1. Extract and Navigate

Extract the project archive and navigate to the directory:

```bash
unzip rtc-project-manager.zip
cd rtc-project-manager
```

### 2. Configure Environment (Optional)

The `docker-compose.yml` file includes default environment variables. For production or custom configurations, create a `.env` file:

```bash
cp .env.example .env
```

Edit the `.env` file to customize:

```env
# JWT Secret (generate a secure random string for production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# OAuth Configuration (if using Manus Auth)
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://auth.manus.im
VITE_APP_ID=rtc-project-manager

# Owner/Admin Configuration
OWNER_OPEN_ID=admin
OWNER_NAME=Administrator
```

**Security Note:** Always change the `JWT_SECRET` for production deployments.

### 3. Build and Start Services

Build the Docker images and start all services:

```bash
docker-compose up -d
```

This command will:
- Pull the MySQL 8.0 image
- Build the application Docker image
- Create a MySQL container with persistent storage
- Create an application container
- Start both services in detached mode

**First-time build** may take 5-10 minutes depending on your internet connection and system performance.

### 4. Wait for Database Initialization

The application waits for the database to be healthy before starting. Monitor the startup process:

```bash
docker-compose logs -f app
```

You should see:

```
[OAuth] Initialized with baseURL: https://api.manus.im
Server running on http://localhost:3000/
```

Press `Ctrl+C` to exit the logs view.

### 5. Initialize Database Schema

Run the database migrations inside the application container:

```bash
docker-compose exec app pnpm db:push
```

This creates all required tables (users, projects, tasks, templates).

### 6. Seed Sample Data (Optional)

Populate the database with templates and sample projects:

```bash
docker-compose exec app pnpm exec tsx seed-database.mjs
```

This adds:
- 14 project templates
- 4 sample projects (Summer Heat Campaign, Alexander Dennis Event, etc.)

### 7. Access the Application

Open your web browser and navigate to:

```
http://localhost:3000
```

The RTC Project Manager dashboard should be visible with all features operational.

## Docker Services

The `docker-compose.yml` defines two services:

### Database Service (`db`)

- **Image:** mysql:8.0
- **Port:** 3306 (exposed to host)
- **Credentials:**
  - Root password: `rtc_root_password`
  - Database: `rtc_project_manager`
  - User: `rtc_user`
  - Password: `rtc_password`
- **Volume:** `mysql_data` (persistent storage)
- **Health Check:** Ensures database is ready before app starts

### Application Service (`app`)

- **Build:** Custom Dockerfile (multi-stage build)
- **Port:** 3000 (exposed to host)
- **Depends On:** Database service (waits for health check)
- **Environment:** Production mode with configurable variables

## Docker Commands Reference

### View Running Containers

```bash
docker-compose ps
```

### View Logs

```bash
# All services
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# Specific service
docker-compose logs app
docker-compose logs db
```

### Stop Services

```bash
# Stop without removing containers
docker-compose stop

# Stop and remove containers (data persists in volumes)
docker-compose down
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart app
```

### Execute Commands in Containers

```bash
# Run database migrations
docker-compose exec app pnpm db:push

# Run tests
docker-compose exec app pnpm test

# Access MySQL shell
docker-compose exec db mysql -u rtc_user -prtc_password rtc_project_manager

# Access application shell
docker-compose exec app sh
```

### Rebuild Application

After code changes, rebuild the application image:

```bash
# Rebuild and restart
docker-compose up -d --build app

# Force complete rebuild
docker-compose build --no-cache app
docker-compose up -d app
```

### Clean Up Everything

Remove all containers, networks, and volumes:

```bash
# Remove containers and networks (keeps volumes)
docker-compose down

# Remove everything including volumes (DELETES ALL DATA)
docker-compose down -v

# Remove unused Docker resources
docker system prune -a
```

## Data Persistence

### MySQL Data Volume

Database data is stored in a Docker volume named `mysql_data`. This ensures:

- Data persists across container restarts
- Data survives `docker-compose down`
- Data is only deleted with `docker-compose down -v`

### Backup Database

Create a backup of the MySQL database:

```bash
docker-compose exec db mysqldump -u rtc_user -prtc_password rtc_project_manager > backup.sql
```

### Restore Database

Restore from a backup file:

```bash
docker-compose exec -T db mysql -u rtc_user -prtc_password rtc_project_manager < backup.sql
```

## Port Configuration

By default, the application uses these ports:

- **Application:** 3000
- **MySQL:** 3306

To change ports, edit `docker-compose.yml`:

```yaml
services:
  app:
    ports:
      - "8080:3000"  # Change host port to 8080
  
  db:
    ports:
      - "3307:3306"  # Change MySQL host port to 3307
```

After editing, restart services:

```bash
docker-compose down
docker-compose up -d
```

## Production Deployment

For production deployments with Docker:

### 1. Update Environment Variables

Create a production `.env` file with secure values:

```env
JWT_SECRET=<generate-secure-random-string>
NODE_ENV=production
```

Generate a secure JWT secret:

```bash
openssl rand -hex 32
```

### 2. Use Docker Secrets (Recommended)

For sensitive data, use Docker secrets instead of environment variables:

```yaml
secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  
services:
  app:
    secrets:
      - jwt_secret
```

### 3. Configure Reverse Proxy

Use Nginx or Traefik as a reverse proxy with SSL:

```nginx
server {
    listen 443 ssl;
    server_name rtc-pm.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4. Set Resource Limits

Add resource constraints in `docker-compose.yml`:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 5. Enable Auto-Restart

Ensure containers restart automatically:

```yaml
services:
  app:
    restart: unless-stopped
  db:
    restart: unless-stopped
```

## Troubleshooting

### Container Won't Start

Check logs for errors:

```bash
docker-compose logs app
docker-compose logs db
```

### Database Connection Failed

1. Verify database is running:
   ```bash
   docker-compose ps db
   ```

2. Check database health:
   ```bash
   docker-compose exec db mysqladmin ping -h localhost -u root -prtc_root_password
   ```

3. Verify connection string in environment variables

### Port Already in Use

If port 3000 or 3306 is already in use:

1. Stop conflicting services
2. Or change ports in `docker-compose.yml` (see Port Configuration section)

### Out of Disk Space

Docker images and volumes can consume significant space:

```bash
# Check Docker disk usage
docker system df

# Clean up unused resources
docker system prune -a

# Remove specific volume (DELETES DATA)
docker volume rm rtc-project-manager_mysql_data
```

### Application Shows Old Code

Rebuild the image without cache:

```bash
docker-compose build --no-cache app
docker-compose up -d app
```

### Permission Errors

If you encounter permission errors:

```bash
# Fix ownership of project files
sudo chown -R $USER:$USER .

# Or run Docker commands with sudo
sudo docker-compose up -d
```

## Development with Docker

For active development, you can mount the source code as a volume:

```yaml
services:
  app:
    volumes:
      - ./client:/app/client
      - ./server:/app/server
      - ./drizzle:/app/drizzle
    command: pnpm dev
```

This enables hot-reload during development.

## Multi-Stage Build Explanation

The Dockerfile uses a multi-stage build for efficiency:

**Stage 1 (Builder):**
- Installs all dependencies (including dev dependencies)
- Compiles TypeScript and builds frontend
- Creates optimized production bundles

**Stage 2 (Production):**
- Uses smaller base image
- Copies only production dependencies
- Copies built artifacts from builder stage
- Results in smaller final image (~300MB vs ~1GB)

## Health Checks

The database service includes a health check:

```yaml
healthcheck:
  test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
  interval: 10s
  timeout: 5s
  retries: 5
```

The application waits for this health check before starting.

## Networking

Docker Compose creates a default network for service communication:

- Services communicate using service names (`db`, `app`)
- Application connects to database using `db:3306`
- External access via exposed ports

## Monitoring

Monitor container resource usage:

```bash
# Real-time stats
docker stats

# Specific container
docker stats rtc-project-manager-app
```

## Scaling (Advanced)

Scale the application service (requires load balancer):

```bash
docker-compose up -d --scale app=3
```

**Note:** Database cannot be scaled without additional configuration (replication, clustering).

---

**Author:** Daniel Charboneau  
**Version:** 1.0.0  
**Last Updated:** January 2026
