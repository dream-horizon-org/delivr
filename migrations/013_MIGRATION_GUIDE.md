# Migration 013: Platform Targets Column

## Overview
This migration adds the `platformTargets` column to the `release_configurations` table to support the new API contract where platforms and targets are combined into a single array structure.

## What Changed

### Database Schema
**Before:**
```json
{
  "platforms": ["ANDROID", "IOS"],
  "targets": ["PLAY_STORE", "APP_STORE"]
}
```

**After:**
```json
{
  "platformTargets": [
    { "platform": "ANDROID", "target": "PLAY_STORE" },
    { "platform": "IOS", "target": "APP_STORE" }
  ]
}
```

## Running the Migration

### Prerequisites
1. Backup your database first:
   ```bash
   mysqldump -u root -p codepushdb release_configurations > backup_release_configs_$(date +%Y%m%d).sql
   ```

2. Ensure no releases are being created during migration

### Execute Migration

```bash
# Connect to MySQL
mysql -u root -p codepushdb

# Run the migration
source /path/to/migrations/013_add_platform_targets_column.sql
```

**OR** using Docker:

```bash
docker exec -i delivr-mysql mysql -u root -proot codepushdb < migrations/013_add_platform_targets_column.sql
```

### Verify Migration

After running, check the output:

1. **Column Added**: Should show `platformTargets` column exists
2. **Data Migrated**: Shows count of migrated configs
3. **Sample Data**: Displays formatted platformTargets JSON

Expected output:
```
+-------------------+---------------+------------------+-----------------+
| status            | total_configs | migrated_configs | pending_configs |
+-------------------+---------------+------------------+-----------------+
| Migration Status  |             5 |                5 |               0 |
+-------------------+---------------+------------------+-----------------+
```

### Manual Verification

```sql
-- Check a specific config
SELECT 
  id,
  name,
  JSON_PRETTY(platforms) as old_platforms,
  JSON_PRETTY(targets) as old_targets,
  JSON_PRETTY(platformTargets) as new_platformTargets
FROM release_configurations
WHERE id = 'your_config_id';

-- Should show:
-- old_platforms:  ["ANDROID", "IOS"]
-- old_targets:    ["PLAY_STORE", "APP_STORE"]
-- new_platformTargets: [
--   {"platform": "ANDROID", "target": "PLAY_STORE"},
--   {"platform": "IOS", "target": "APP_STORE"}
-- ]
```

## Rollback

If you need to rollback:

```bash
mysql -u root -p codepushdb < migrations/013_add_platform_targets_column_rollback.sql
```

**Note**: Rollback is safe because old `platforms` and `targets` columns are preserved.

## Backend Service Updates Needed

After running this migration, update your backend services:

### 1. ReleaseConfigService (Read Operations)

**File**: `api/script/services/release-config.service.ts`

```typescript
// OLD: Read from separate columns
const config = {
  platforms: row.platforms,
  targets: row.targets,
};

// NEW: Read from platformTargets
const config = {
  platformTargets: row.platformTargets,
  // For backward compatibility:
  platforms: row.platforms,
  targets: row.targets,
};
```

### 2. ReleaseConfigService (Write Operations)

**File**: `api/script/services/release-config.service.ts`

```typescript
// OLD: Write to separate columns
INSERT INTO release_configurations (platforms, targets) 
VALUES (?, ?);

// NEW: Write to platformTargets
INSERT INTO release_configurations (platformTargets, platforms, targets) 
VALUES (?, ?, ?);  -- Include old columns for compatibility
```

### 3. Update Type Definitions

**File**: `api/script/types/release-config.types.ts`

```typescript
export interface PlatformTarget {
  platform: 'ANDROID' | 'IOS';
  target: 'PLAY_STORE' | 'APP_STORE' | 'WEB';
}

export interface ReleaseConfiguration {
  id: string;
  // ... other fields
  
  // NEW field (primary)
  platformTargets: PlatformTarget[];
  
  // OLD fields (deprecated but kept for compatibility)
  /** @deprecated Use platformTargets instead */
  platforms?: string[];
  /** @deprecated Use platformTargets instead */
  targets?: string[];
}
```

## BFF Layer (Already Updated ✅)

The BFF layer in `delivr-web-panel-managed` is already updated to handle transformations:

- **UI → Backend**: Transforms `targets` array to `platformTargets` array
- **Backend → UI**: Transforms `platformTargets` array back to `targets` array

Files updated:
- `app/routes/api.v1.tenants.$tenantId.release-config._index.ts`
- `app/routes/api.v1.tenants.$tenantId.release-config.$configId.ts`
- `app/utils/platform-mapper.ts`

## Testing Checklist

After migration and service updates:

- [ ] Create new release config via UI
- [ ] Verify platformTargets is populated in database
- [ ] Edit existing release config
- [ ] Verify data loads correctly in UI
- [ ] Clone existing release config
- [ ] Create release using config
- [ ] Check logs for any errors

## Troubleshooting

### Issue: Migration shows 0 migrated configs

**Cause**: Existing configs have NULL or empty targets

**Solution**: Manual data fix needed for those specific configs

```sql
-- Find configs with issues
SELECT id, name, platforms, targets 
FROM release_configurations 
WHERE platformTargets IS NULL;

-- Manually set platformTargets for specific config
UPDATE release_configurations
SET platformTargets = JSON_ARRAY(
  JSON_OBJECT('platform', 'ANDROID', 'target', 'PLAY_STORE')
)
WHERE id = 'config_id_here';
```

### Issue: Backend still reads from old columns

**Cause**: Service layer not updated

**Solution**: Update ReleaseConfigService to read from `platformTargets` column

### Issue: UI shows empty platforms

**Cause**: BFF transformation expecting old format

**Solution**: BFF should already handle this. Check transformation logic in:
- `app/routes/api.v1.tenants.$tenantId.release-config._index.ts`

## Timeline

1. **Phase 1**: Run migration (adds column + migrates data) ✅
2. **Phase 2**: Update backend services to use new column
3. **Phase 3**: Test thoroughly
4. **Phase 4**: Deprecate old columns (future migration)
5. **Phase 5**: Remove old columns (future migration)

## Support

If you encounter issues:
1. Check migration output logs
2. Verify column exists: `DESCRIBE release_configurations;`
3. Check sample data: `SELECT * FROM release_configurations LIMIT 1;`
4. Review backend service logs

## Related Documentation

- API Contract: `RELEASE_CONFIG_API_CONTRACT.md`
- Platform Mapper Utilities: `app/utils/platform-mapper.ts`
- BFF Transformation Guide: `APP_STORE_INTEGRATION_COMPLETE.md`

