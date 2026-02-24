# Local Deployment

This guide runs Dashboard Taskline directly on your machine (without app containerization).

## Prerequisites
- Node.js 22+
- pnpm 10+
- MySQL 8+

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment:
```bash
cp .env.example .env
```

3. Ensure your `DATABASE_URL` points to a reachable MySQL instance.

Default local example:
```env
DATABASE_URL=mysql://rtc_user:rtc_password@localhost:3306/rtc_project_manager
```

4. Create database and user (example):
```sql
CREATE DATABASE rtc_project_manager;
CREATE USER 'rtc_user'@'localhost' IDENTIFIED BY 'rtc_password';
GRANT ALL PRIVILEGES ON rtc_project_manager.* TO 'rtc_user'@'localhost';
FLUSH PRIVILEGES;
```

5. Apply schema:
```bash
pnpm db:push
```

6. (Optional) seed sample data:
```bash
pnpm db:seed
```

7. Start development server:
```bash
pnpm dev
```

8. Open:
- `http://localhost:3000`

## Development Commands
- `pnpm dev`
- `pnpm check`
- `pnpm test`
- `pnpm build`
- `npm run verify`

## Troubleshooting

Cannot connect to DB:
- Verify MySQL is running.
- Verify `DATABASE_URL` credentials and database name.
- Check that database/user grants exist.

Port 3000 in use:
- Stop the existing process, or change app port configuration.

## Validation
Before commit:
```bash
npm run verify
```
