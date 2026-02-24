# RTC Project Manager - Quick Start Guide

Complete guide to running the RTC Project Manager locally on your machine.

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

1. **Node.js** (v22.x or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **pnpm** (v10.x or higher)
   - Install: `npm install -g pnpm`
   - Verify installation: `pnpm --version`

3. **MySQL** (v8.0 or higher)
   - **Option A - Local MySQL:**
     - Download from: https://dev.mysql.com/downloads/mysql/
     - Or use Docker: `docker run --name mysql -e MYSQL_ROOT_PASSWORD=password -p 3306:3306 -d mysql:8.0`
   
   - **Option B - Docker Compose (Recommended):**
     - Install Docker Desktop: https://www.docker.com/products/docker-desktop/
     - Docker Compose is included with Docker Desktop

---

## Installation Methods

Choose one of the following methods to run the application:

### Method 1: Docker Compose (Recommended - Easiest)

This method automatically sets up both the application and MySQL database.

#### Step 1: Extract the Archive

```bash
tar -xzf rtc-project-manager-complete-v1.2.0.tar.gz
cd rtc-project-manager
```

#### Step 2: Create Environment File

```bash
cp .env.example .env
```

The `.env.example` file already contains sensible defaults for Docker. No changes needed!

#### Step 3: Start Everything

```bash
docker-compose up -d
```

This command will:
- Start MySQL database on port 3306
- Build and start the application on port 3000
- Automatically create the database schema

#### Step 4: Seed the Database

```bash
docker-compose exec app pnpm db:push
docker-compose exec app pnpm exec tsx seed-database.mjs
```

#### Step 5: Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

#### Managing the Application

```bash
# View logs
docker-compose logs -f

# Stop the application
docker-compose down

# Restart the application
docker-compose restart

# Stop and remove all data
docker-compose down -v
```

---

### Method 2: Local Development (Full Control)

This method runs the application directly on your machine.

#### Step 1: Extract the Archive

```bash
tar -xzf rtc-project-manager-complete-v1.2.0.tar.gz
cd rtc-project-manager
```

#### Step 2: Install Dependencies

```bash
pnpm install
```

This will install all required Node.js packages (~500MB).

#### Step 3: Setup MySQL Database

Create a new MySQL database:

```sql
CREATE DATABASE rtc_projects;
CREATE USER 'rtc_user'@'localhost' IDENTIFIED BY 'rtc_password';
GRANT ALL PRIVILEGES ON rtc_projects.* TO 'rtc_user'@'localhost';
FLUSH PRIVILEGES;
```

#### Step 4: Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and update the database connection:

```env
DATABASE_URL=mysql://rtc_user:rtc_password@localhost:3306/rtc_projects
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**Important:** Change `JWT_SECRET` to a random string for security.

#### Step 5: Initialize Database

```bash
pnpm db:push
```

This creates all necessary tables in your database.

#### Step 6: Seed Sample Data

```bash
pnpm exec tsx seed-database.mjs
```

This populates the database with:
- 14 project templates (369 tasks total)
- 4 sample projects (Summer Heat Campaign, Alexander Dennis Event, etc.)

#### Step 7: Start the Application

```bash
pnpm dev
```

The application will start on `http://localhost:3000`

---

## Verification

After starting the application, verify everything works:

### 1. Check the Dashboard

Navigate to `http://localhost:3000` and you should see:
- Total Projects: 4
- Total Tasks: ~100+
- Recent projects listed

### 2. Test Template Selection

1. Click "New Project" button
2. You should see 14 template cards
3. Click any template (e.g., "Marketing Campaign")
4. Task preview should appear showing all tasks grouped by phase
5. Fill in project details and click "Create Project"

### 3. Run Tests

```bash
pnpm test
```

Expected output: **20/20 tests passing**

---

## Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
- Verify MySQL is running: `mysql -u root -p`
- Check DATABASE_URL in `.env` file
- Ensure database exists: `SHOW DATABASES;`

### Issue: "Port 3000 already in use"

**Solution:**
- Find process using port 3000: `lsof -i :3000` (Mac/Linux) or `netstat -ano | findstr :3000` (Windows)
- Kill the process or change port in `server/_core/index.ts`

### Issue: "pnpm: command not found"

**Solution:**
```bash
npm install -g pnpm
```

### Issue: Docker containers won't start

**Solution:**
- Check Docker is running: `docker ps`
- View logs: `docker-compose logs`
- Restart Docker Desktop
- Remove old containers: `docker-compose down -v && docker-compose up -d`

### Issue: Database schema errors

**Solution:**
```bash
# Reset database
pnpm db:push
pnpm exec tsx seed-database.mjs
```

---

## Project Structure

```
rtc-project-manager/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable UI components
│   │   └── lib/           # Utilities and tRPC client
│   └── index.html
├── server/                # Backend Express + tRPC API
│   ├── routers.ts         # API endpoints
│   ├── db.ts              # Database queries
│   └── _core/             # Framework code
├── drizzle/               # Database schema and migrations
│   └── schema.ts
├── shared/                # Shared types and constants
├── docker-compose.yml     # Docker configuration
├── Dockerfile             # Application container
├── package.json           # Dependencies and scripts
└── README.md              # Project documentation
```

---

## Available Scripts

```bash
# Development
pnpm dev              # Start dev server with hot reload
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm db:push          # Push schema changes to database

# Testing
pnpm test             # Run all tests
pnpm check            # TypeScript type checking
pnpm format           # Format code with Prettier
```

---

## Features Overview

### Dashboard
- Project and task statistics
- Recent projects list
- Upcoming deadlines widget
- Quick access to all features

### Project Management
- Create projects from 14 templates
- Edit project details
- Track project status and progress
- Export projects to Excel

### Task Management
- Add, edit, and delete tasks
- Filter by status, priority, owner
- Sort by due date, priority, status
- Track dependencies and approvals

### Visualization
- Calendar view for project dates
- Gantt chart for timeline visualization
- Progress tracking and completion rates

### Templates
- 14 pre-built project templates
- 369 tasks across all templates
- Automatic task creation from templates

---

## Next Steps

1. **Explore the Templates**: Click "Templates" in the navigation to see all 14 project types
2. **Create Your First Project**: Use "New Project" button and select a template
3. **Customize Tasks**: Edit tasks to match your workflow
4. **Export to Excel**: Use the export button on any project detail page

---

## Support

For issues or questions:
- Check the troubleshooting section above
- Review `README.md` for detailed documentation
- Check `CHANGELOG.md` for recent changes

---

**Author:** Daniel Charboneau  
**Version:** 1.2.0  
**License:** MIT
