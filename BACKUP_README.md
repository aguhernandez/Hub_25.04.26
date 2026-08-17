# Database Backup & Restore Guide

## Overview

This project includes automated scripts to backup and restore your entire Supabase database. All data is exported to JSON files that you can keep on your local computer.

## Files

- `backup-database.js` - Exports all tables to JSON files
- `restore-backup.js` - Restores data from JSON backup files
- `backups/` - Directory where backups are stored (organized by date)

## Making a Backup

To create a complete backup of your database:

```bash
node backup-database.js
```

This will:
- Create a folder: `backups/YYYY-MM-DD/`
- Export all 128+ database tables to JSON files
- Generate a summary report (`_backup_summary.json`)

### What Gets Backed Up

Everything:
- User profiles and settings
- All exercises and workouts
- Training programs and logs
- Anthropometry measurements
- Nutrition plans and meal logs
- Teams and memberships
- Chat messages
- Invoices and payments
- Performance data
- And much more...

## Restoring from Backup

To restore data from a backup:

```bash
# Restore from today's backup
node restore-backup.js

# Restore from a specific date
node restore-backup.js 2025-11-24
```

**⚠️ IMPORTANT:**
- This will INSERT data into your database
- It does NOT delete existing data first
- Make sure you're restoring to the correct database
- Consider clearing tables first if you want a clean restore

## Backup Files Location

Backups are saved in: `/project/backups/YYYY-MM-DD/`

Each backup includes:
- One JSON file per table (e.g., `profiles.json`, `workouts.json`)
- A summary file (`_backup_summary.json`) with statistics

## Best Practices

1. **Regular Backups**: Run backups regularly, especially before major changes
2. **Keep Multiple Copies**: Don't rely on just one backup
3. **Test Restores**: Occasionally test your backup files to ensure they work
4. **Store Safely**: Keep backups in multiple locations (local computer, cloud storage, etc.)

## Example Workflow

```bash
# 1. Make a backup
node backup-database.js

# 2. Copy the backup folder to a safe location
cp -r backups/2025-11-24 ~/my-safe-backups/

# 3. If needed later, restore from that backup
node restore-backup.js 2025-11-24
```

## Troubleshooting

### Empty Backups (0 records)

If your backup shows 0 records but you know you have data:
- Check your `.env` file has the correct Supabase credentials
- Verify you're connected to the right database
- Check RLS (Row Level Security) policies aren't blocking access

### Restore Errors

If restore fails:
- Check that the backup files exist
- Verify foreign key dependencies (restore runs in correct order)
- Look for duplicate key errors (data might already exist)

## Manual Backup Alternative

You can also manually download your backups:
1. Open the `backups/` folder in your project
2. Copy the entire date folder to your computer
3. Store it somewhere safe (external drive, cloud storage, etc.)

## Questions?

If you need help with backups or restores, check:
- The summary file in your backup folder
- Error messages in the console output
- Supabase dashboard for database connection issues
