# RTC Project Manager

A comprehensive project management web application designed for RTC with 14 standardized project templates, full task management with dependencies, dashboard analytics, and Excel export capabilities.

## Quick Start

Choose your preferred deployment method:

### Option 1: Docker (Recommended)

```bash
# Extract archive
tar -xzf rtc-project-manager-complete.tar.gz
cd rtc-project-manager

# Start with Docker Compose
docker-compose up -d

# Initialize database
docker-compose exec app pnpm db:push

# Seed sample data (optional)
docker-compose exec app pnpm exec tsx seed-database.mjs

# Access application
open http://localhost:3000
```

See **DOCKER_SETUP.md** for detailed Docker instructions.

### Option 2: Local Installation

```bash
# Extract archive
tar -xzf rtc-project-manager-complete.tar.gz
cd rtc-project-manager

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Initialize database
pnpm db:push

# Seed sample data (optional)
pnpm exec tsx seed-database.mjs

# Start development server
pnpm dev
```

See **LOCAL_DEPLOYMENT.md** for detailed local setup instructions.

## Features

### Project Management
- **14 Standardized Templates** - Marketing Campaign, Event Plan, Presentation, Survey, Press Release, Social Media Campaign, Planning Study, Poster, Video Project, Public Notice, Media Buy, Op-Ed, and more
- **Visual Template Icons** - Each template displays a distinctive icon for easy recognition (Megaphone, Calendar, Video, etc.)
- **Full CRUD Operations** - Create, read, update, and delete projects and tasks
- **Status Tracking** - Planning, Active, On Hold, Complete with visual indicators
- **Template-Based Creation** - Start new projects from pre-configured templates with phases and sample tasks

### Task Management
- **Dependency Tracking** - Link tasks with dependencies for proper sequencing
- **Priority Levels** - High, Medium, Low priority assignments
- **Status Updates** - Not Started, In Progress, Complete, Blocked
- **Owner Assignment** - Assign tasks to team members
- **Approval Workflow** - Mark tasks requiring approval
- **Progress Tracking** - Completion percentages and timeline management

### Dashboard & Analytics
- **Real-Time Statistics** - Total projects, active projects, task counts, completion rates
- **Recent Projects Widget** - Quick access to latest projects
- **Upcoming Deadlines** - 14-day deadline tracker
- **Visual Indicators** - Status badges and progress bars

### Excel Export
- **Standardized Format** - Three-sheet workbook (Instructions, Dashboard, Project Plan)
- **16-Column Structure** - Task ID, Description, Phase, Timeline, Dependencies, Owner, Status, Priority, Budget, Approval, and more
- **Data Validation** - Dropdown lists for consistent data entry
- **TaskLine Compatible** - Optimized for Launchpad TaskLine integration

### Sample Data Included
- **14 Project Templates** - Pre-configured with phases and sample tasks
- **4 Sample Projects** - Based on actual RTC workflows:
  - Summer Heat Campaign 2025
  - Alexander Dennis Grand Opening Event
  - AAMP Phase 1 Planning Study
  - rideRTC Rewards Program Launch

## Technology Stack

### Frontend
- **React 19** - Modern UI framework
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first styling
- **shadcn/ui** - High-quality component library
- **Wouter** - Lightweight routing
- **tRPC React Query** - Type-safe API client

### Backend
- **Node.js 22** - Server runtime
- **Express 4** - Web framework
- **tRPC 11** - End-to-end type-safe APIs
- **Drizzle ORM** - Type-safe database toolkit
- **MySQL 8** - Relational database
- **ExcelJS** - Excel file generation

### DevOps
- **Docker & Docker Compose** - Containerization
- **Vitest** - Unit testing framework
- **pnpm** - Fast package manager
- **TypeScript** - Static type checking

## Project Structure

```
rtc-project-manager/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── pages/         # Dashboard, Projects, Templates, etc.
│   │   ├── components/    # Reusable UI components
│   │   └── lib/           # tRPC client and utilities
├── server/                # Express + tRPC backend
│   ├── db.ts              # Database query helpers
│   ├── routers.ts         # API procedures
│   ├── excelExport.ts     # Excel generation
│   └── *.test.ts          # Unit tests
├── drizzle/               # Database schema and migrations
├── shared/                # Shared types and constants
├── Dockerfile             # Docker build configuration
├── docker-compose.yml     # Multi-container setup
├── LOCAL_DEPLOYMENT.md    # Local setup guide
├── DOCKER_SETUP.md        # Docker deployment guide
└── seed-database.mjs      # Database seeding script
```

## Documentation

- **LOCAL_DEPLOYMENT.md** - Complete guide for local installation and development
- **DOCKER_SETUP.md** - Docker deployment instructions and troubleshooting
- **todo.md** - Development task tracking and feature checklist

## Requirements

### For Docker Deployment
- Docker 20.x or higher
- Docker Compose 2.x or higher

### For Local Development
- Node.js 22.x or higher
- pnpm 10.x or higher
- MySQL 8.0 or higher

## Default Credentials

### MySQL Database (Docker)
- **Host:** localhost
- **Port:** 3306
- **Database:** rtc_project_manager
- **User:** rtc_user
- **Password:** rtc_password

### Application
- **Port:** 3000
- **URL:** http://localhost:3000

**Security Note:** Change all default passwords and JWT secrets for production deployments.

## Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm test` - Run unit tests
- `pnpm db:push` - Apply database migrations
- `pnpm check` - TypeScript type checking
- `pnpm format` - Format code with Prettier

## Testing

The application includes comprehensive unit tests:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test -- --watch

# Run tests with coverage
pnpm test -- --coverage
```

Test files are located in `server/*.test.ts` and cover:
- Project CRUD operations
- Task management
- Template retrieval
- Dashboard statistics
- Authentication flows

## Production Deployment

For production deployments:

1. **Update Environment Variables** - Set secure JWT_SECRET and database credentials
2. **Enable SSL/TLS** - Configure HTTPS with valid certificates
3. **Set Up Backups** - Regular MySQL database backups
4. **Configure Monitoring** - Application and database monitoring
5. **Resource Limits** - Set appropriate Docker resource constraints
6. **Reverse Proxy** - Use Nginx or Traefik for load balancing

See DOCKER_SETUP.md for detailed production deployment instructions.

## Troubleshooting

### Database Connection Issues
- Verify MySQL is running and accessible
- Check DATABASE_URL in .env file
- Ensure database and user exist

### Port Conflicts
- Change port in docker-compose.yml or .env
- Stop conflicting services

### Build Errors
- Clear node_modules and reinstall: `pnpm install`
- Rebuild Docker images: `docker-compose build --no-cache`

### Permission Errors
- Fix file ownership: `chown -R $USER:$USER .`
- Run Docker with appropriate permissions

## Support & Maintenance

For issues, questions, or feature requests:

1. Check the troubleshooting sections in LOCAL_DEPLOYMENT.md and DOCKER_SETUP.md
2. Review test files for usage examples
3. Examine code comments in key files

## License

This project is licensed under the MIT License.

## Author

**Daniel Charboneau**

## Version

1.0.0 - January 2026

## Acknowledgments

Built with modern web technologies and designed specifically for RTC project management workflows. Includes sample data based on actual RTC projects and standardized templates optimized for TaskLine integration.
