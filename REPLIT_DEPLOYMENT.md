# Deploying RTC Project Manager to Replit

This guide provides step-by-step instructions for deploying the RTC Project Manager application to Replit.

## Prerequisites

### 1. External MySQL Database

Replit doesn't provide built-in MySQL, so you'll need an external database. Choose one:

#### Option A: PlanetScale (Recommended - Free Tier)
1. Go to [planetscale.com](https://planetscale.com)
2. Sign up for free account
3. Create new database: `rtc-projects`
4. Get connection string from "Connect" tab
5. Format: `mysql://username:password@host.aws.connect.psdb.cloud/rtc-projects?sslaccept=strict`

#### Option B: Railway ($5/month)
1. Go to [railway.app](https://railway.app)
2. Create new project
3. Add MySQL database
4. Copy connection string from Variables tab

#### Option C: Supabase (Free Tier)
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Get PostgreSQL connection string
4. Note: Requires changing Drizzle adapter to `drizzle-orm/postgres-js`

### 2. Replit Account
- Sign up at [replit.com](https://replit.com)
- Free tier is sufficient for development/testing

## Deployment Steps

### Step 1: Create Replit Project

**Method A: Import from ZIP**
1. Download `rtc-project-manager-v1.3.0.tar.gz`
2. Extract locally: `tar -xzf rtc-project-manager-v1.3.0.tar.gz`
3. In Replit, click "+ Create Repl"
4. Select "Import from GitHub" or upload folder
5. Choose "Node.js" template

**Method B: Import from GitHub** (if you've pushed to GitHub)
1. Click "+ Create Repl"
2. Select "Import from GitHub"
3. Enter repository URL
4. Replit will auto-detect Node.js

### Step 2: Configure Secrets

In Replit, open **Tools > Secrets** and add:

```
DATABASE_URL=mysql://user:password@host:3306/database
JWT_SECRET=your-random-secret-key-here
```

**Generate JWT_SECRET:**
```bash
# In Replit Shell
openssl rand -base64 32
```

### Step 3: Install Dependencies

In Replit Shell:
```bash
pnpm install
```

This will install all required packages (~200MB, takes 2-3 minutes).

### Step 4: Initialize Database

Run migrations to create tables:
```bash
pnpm db:push
```

Expected output:
```
✓ Applying migrations...
✓ Done!
```

### Step 5: Seed Sample Data

Load 14 templates and 4 sample projects:
```bash
pnpm exec tsx seed-database.mjs
```

Expected output:
```
✓ Cleared existing data
✓ Created 14 templates
✓ Created 4 sample projects
✓ Created sample tasks
Database seeded successfully!
```

### Step 6: Build Application

```bash
pnpm build
```

This compiles TypeScript and bundles the frontend (~30 seconds).

### Step 7: Start Application

Click the **Run** button in Replit, or in Shell:
```bash
pnpm start
```

The application will start on port 3000. Replit will automatically provide a public URL.

### Step 8: Access Application

Replit will show a webview with your application. You can also:
- Click the "Open in new tab" icon
- Share the public URL: `https://your-repl-name.your-username.repl.co`

## Verification Checklist

After deployment, verify:

- [ ] Application loads without errors
- [ ] Dashboard displays statistics (4 projects, ~100 tasks)
- [ ] Can navigate to Projects, Templates, Calendar, Gantt Chart
- [ ] Can create new project from template
- [ ] Template icons display correctly
- [ ] Can add/edit tasks
- [ ] Can edit project details
- [ ] Task filtering works (status, priority, owner)
- [ ] Calendar view shows projects
- [ ] Gantt chart renders timelines
- [ ] Excel export downloads files

## Troubleshooting

### Database Connection Errors

**Error:** `Error: connect ECONNREFUSED`

**Solution:**
1. Verify DATABASE_URL in Secrets is correct
2. Check database is running (PlanetScale dashboard)
3. Ensure connection string includes SSL parameters
4. For PlanetScale: add `?sslaccept=strict` to connection string

### Port Binding Errors

**Error:** `Error: listen EADDRINUSE :::3000`

**Solution:**
- Replit automatically sets PORT environment variable
- Our app uses `process.env.PORT || 3000`
- Restart the Repl

### Build Errors

**Error:** `Module not found` or TypeScript errors

**Solution:**
```bash
# Clean install
rm -rf node_modules
pnpm install
pnpm build
```

### Migration Errors

**Error:** `Table already exists`

**Solution:**
- Database already has tables from previous run
- Either drop tables manually or use fresh database
- Or skip `pnpm db:push` if tables exist

### Seed Data Errors

**Error:** `Duplicate entry` or foreign key constraints

**Solution:**
```bash
# Clear and re-seed
pnpm exec tsx seed-database.mjs
```

The seed script automatically clears existing data.

## Development vs Production

### Development Mode
```bash
pnpm dev
```
- Hot reload enabled
- Source maps included
- Detailed error messages

### Production Mode (Default on Replit)
```bash
pnpm build
pnpm start
```
- Optimized bundle
- Better performance
- Recommended for Replit deployment

## Replit-Specific Notes

### File Persistence
- All files in your Repl are persistent
- Database connection is external, so data persists independently
- No need to worry about ephemeral storage

### Environment Variables
- Use Replit Secrets (Tools > Secrets) for sensitive data
- Never commit `.env` file
- `.env.replit.example` shows required variables

### Always-On
- Free Repls sleep after inactivity
- Upgrade to Hacker plan ($7/month) for always-on
- Or use external cron service to ping your Repl

### Custom Domain
- Replit provides: `https://repl-name.username.repl.co`
- Custom domains available with paid plans

## Updating the Application

To update code:

1. **Edit files** in Replit editor
2. **Rebuild** if needed: `pnpm build`
3. **Restart** by clicking Stop then Run

For major updates:
1. Download new package
2. Replace files in Repl
3. Run `pnpm install` if dependencies changed
4. Run `pnpm db:push` if schema changed
5. Rebuild and restart

## Performance Optimization

### For Better Performance:

1. **Use Production Build**
   ```bash
   pnpm build
   pnpm start
   ```

2. **Optimize Database**
   - Use connection pooling (already configured)
   - Keep database geographically close to Replit servers
   - PlanetScale has edge caching

3. **Monitor Resources**
   - Replit provides 0.5 vCPU and 512MB RAM on free tier
   - Upgrade if needed for better performance

## Support

### Common Issues

1. **Slow initial load** - Normal, Replit is waking up
2. **Database timeout** - Check external database status
3. **Build failures** - Clear node_modules and reinstall

### Getting Help

- Review error messages in Replit Console
- Check Replit Logs (Tools > Logs)
- Verify all Secrets are set correctly
- Ensure external database is accessible

## Next Steps

After successful deployment:

1. **Customize** - Update project templates for your needs
2. **Add users** - Implement team member management
3. **Backup** - Export data regularly via Excel export
4. **Monitor** - Check Replit analytics and database usage

## Security Notes

- Never expose JWT_SECRET or DATABASE_URL
- Use Replit Secrets for all sensitive data
- Regularly update dependencies: `pnpm update`
- Consider enabling 2FA on Replit account

---

**Congratulations!** Your RTC Project Manager is now running on Replit with all features operational.
