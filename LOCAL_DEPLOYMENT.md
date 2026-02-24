# RTC Project Manager - Local Deployment Guide

This guide provides step-by-step instructions for running the RTC Project Manager application on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (version 22.x or higher) - [Download here](https://nodejs.org/)
- **pnpm** (version 10.x or higher) - Install with `npm install -g pnpm`
- **MySQL** (version 8.0 or higher) - [Download here](https://dev.mysql.com/downloads/mysql/)

Alternatively, you can use Docker to run both the application and database (see DOCKER_SETUP.md).

## Installation Steps

### 1. Extract the Archive

Extract the `rtc-project-manager.zip` file to your desired location:

```bash
unzip rtc-project-manager.zip
cd rtc-project-manager
```

### 2. Install Dependencies

Install all required Node.js packages using pnpm:

```bash
pnpm install
```

This will install all dependencies defined in `package.json`, including React, Express, tRPC, Drizzle ORM, and other required libraries.

### 3. Configure Environment Variables

Create a `.env` file in the project root by copying the example template:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database Configuration
DATABASE_URL=mysql://rtc_user:rtc_password@localhost:3306/rtc_project_manager

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# OAuth Configuration (optional - for Manus Auth integration)
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://auth.manus.im
VITE_APP_ID=rtc-project-manager

# Owner/Admin Configuration
OWNER_OPEN_ID=admin
OWNER_NAME=Administrator

# Application Settings
NODE_ENV=development
VITE_APP_TITLE=RTC Project Manager
VITE_APP_LOGO=/logo.png
```

**Important:** Change the `JWT_SECRET` to a secure random string for production use. You can generate one using:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Set Up MySQL Database

Create a new MySQL database and user:

```sql
CREATE DATABASE rtc_project_manager;
CREATE USER 'rtc_user'@'localhost' IDENTIFIED BY 'rtc_password';
GRANT ALL PRIVILEGES ON rtc_project_manager.* TO 'rtc_user'@'localhost';
FLUSH PRIVILEGES;
```

**Note:** Update the `DATABASE_URL` in your `.env` file if you use different credentials.

### 5. Initialize Database Schema

Run the database migrations to create all required tables:

```bash
pnpm db:push
```

This command will:
- Generate migration files from the schema defined in `drizzle/schema.ts`
- Apply migrations to your MySQL database
- Create tables for users, projects, tasks, and templates

### 6. Seed Sample Data (Optional)

Populate the database with 14 project templates and sample projects:

```bash
pnpm db:seed
```

This will create:
- 14 standardized project templates (Marketing Campaign, Event Plan, Survey, etc.)
- 4 sample projects based on actual RTC workflows:
  - Summer Heat Campaign 2025
  - Alexander Dennis Grand Opening
  - AAMP Phase 1 Planning Study
  - rideRTC Rewards Program Launch

### 7. Start the Development Server

Run the application in development mode:

```bash
pnpm dev
```

The application will start on **http://localhost:3000**

You should see output similar to:

```
[OAuth] Initialized with baseURL: https://api.manus.im
Server running on http://localhost:3000/
```

### 8. Access the Application

Open your web browser and navigate to:

```
http://localhost:3000
```

You should see the RTC Project Manager dashboard with:
- Summary statistics (total projects, tasks, completion rates)
- Recent projects list
- Upcoming deadlines widget
- Navigation to Projects and Templates pages

## Available Scripts

The following npm scripts are available in the project:

- **`pnpm dev`** - Start development server with hot reload
- **`pnpm build`** - Build for production (compiles both frontend and backend)
- **`pnpm start`** - Start production server (requires `pnpm build` first)
- **`pnpm test`** - Run all vitest unit tests
- **`pnpm db:push`** - Generate and apply database migrations
- **`pnpm check`** - Run TypeScript type checking without emitting files
- **`pnpm format`** - Format code with Prettier

## Project Structure

```
rtc-project-manager/
├── client/                 # Frontend React application
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components (Dashboard, Projects, etc.)
│   │   ├── lib/           # tRPC client and utilities
│   │   ├── App.tsx        # Main app component with routing
│   │   └── main.tsx       # Application entry point
├── server/                # Backend Express + tRPC application
│   ├── _core/             # Core framework files (auth, context, etc.)
│   ├── db.ts              # Database query helpers
│   ├── routers.ts         # tRPC API procedures
│   ├── excelExport.ts     # Excel generation utility
│   └── *.test.ts          # Vitest test files
├── drizzle/               # Database schema and migrations
│   └── schema.ts          # Table definitions
├── shared/                # Shared constants and types
├── seed-database.mjs      # Database seeding script
├── package.json           # Dependencies and scripts
├── docker-compose.yml     # Docker configuration
├── Dockerfile             # Docker build instructions
└── .env.example           # Environment variables template
```

## Features Overview

### Dashboard
- Real-time project and task statistics
- Active projects widget
- Upcoming deadlines tracker
- Quick navigation to create new projects

### Projects Management
- View all projects with status indicators
- Create projects from 14 standardized templates
- Edit project details and status
- Delete projects with confirmation
- Export projects to Excel format

### Project Detail View
- View all tasks for a specific project
- Task list with status, priority, and owner information
- Progress indicators and completion percentages
- Excel export button for project plan

### Templates Library
- Browse all 14 project templates
- View template details including phases and sample tasks
- Create new projects directly from templates

### Excel Export
- Generate standardized Excel files from project data
- Three-sheet workbook format:
  - Instructions sheet
  - Dashboard sheet with project overview
  - Project Plan sheet with all tasks
- Includes data validation dropdowns
- Compatible with Launchpad TaskLine integration

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. Verify MySQL is running:
   ```bash
   mysql -u root -p
   ```

2. Check your `DATABASE_URL` in `.env` matches your MySQL configuration

3. Ensure the database exists:
   ```sql
   SHOW DATABASES;
   ```

### Port Already in Use

If port 3000 is already in use, you can change it by setting the `PORT` environment variable:

```bash
PORT=3001 pnpm dev
```

### Module Not Found Errors

If you encounter module import errors:

1. Delete `node_modules` and reinstall:
   ```bash
   rm -rf node_modules
   pnpm install
   ```

2. Clear pnpm cache:
   ```bash
   pnpm store prune
   pnpm install
   ```

### TypeScript Errors

Run type checking to identify issues:

```bash
pnpm check
```

## Production Deployment

For production deployment:

1. Build the application:
   ```bash
   pnpm build
   ```

2. Set environment to production:
   ```bash
   export NODE_ENV=production
   ```

3. Start the production server:
   ```bash
   pnpm start
   ```

For containerized deployment with Docker, see **DOCKER_SETUP.md**.

## Authentication Notes

This application is designed to work with Manus OAuth for authentication. When running standalone:

- The OAuth integration will attempt to connect to Manus servers
- For local development without Manus, you may need to modify the authentication flow
- The `OWNER_OPEN_ID` in `.env` determines the admin user

## Support

For issues or questions:

- Check the troubleshooting section above
- Review the code comments in key files
- Examine the test files in `server/*.test.ts` for usage examples

## Next Steps

After successful deployment, consider:

1. **Customizing Templates** - Modify templates in the database to match your organization's workflows
2. **Adding Team Members** - Extend the user management system for multi-user support
3. **Implementing Task Filtering** - Add filters by owner, priority, and status on project detail pages
4. **Setting Up Backups** - Configure regular MySQL database backups
5. **Configuring SSL** - Set up HTTPS for production deployments

---

**Author:** Daniel Charboneau  
**Version:** 1.0.0  
**Last Updated:** January 2026
