# Simplified Integration Implementation (Using Sequelize Auto-Sync)

Since your existing tables (`accounts`, `apps`, `tenants`) don't have SQL migrations and are likely using Sequelize's `sync()`, let's use the **same approach** for integrations!

---

## 🎯 Key Insight

**You're right!** If your existing system doesn't use SQL migrations, you shouldn't start now. Keep it consistent.

---

## 📝 Simplified Approach (No SQL Migrations)

### Step 1: Create Sequelize Model Only

**File:** `api/script/storage/integrations/scm/scm-models.ts`

```typescript
import { DataTypes, Model, Sequelize } from 'sequelize';
import { TenantSCMIntegration, SCMType, VerificationStatus } from './scm-types';

export function createSCMIntegrationModel(sequelize: Sequelize) {
  class SCMIntegrationModel extends Model<TenantSCMIntegration> 
    implements TenantSCMIntegration {
    
    declare id: string;
    declare tenantId: string;
    declare scmType: SCMType;
    declare displayName: string;
    declare githubOrganization: string | null;
    declare githubRepository: string | null;
    declare repositoryUrl: string;
    declare defaultBranch: string;
    declare accessToken: string | null;
    declare isActive: boolean;
    declare verificationStatus: VerificationStatus;
    declare lastVerifiedAt: Date | null;
    declare createdByAccountId: string;
    declare createdAt: Date;
    declare updatedAt: Date;
  }

  SCMIntegrationModel.init(
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
      },
      tenantId: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: {
          model: 'tenants',  // FK to tenants table
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      scmType: {
        type: DataTypes.ENUM('GITHUB', 'GITLAB', 'BITBUCKET'),
        allowNull: false,
      },
      displayName: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      githubOrganization: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      githubRepository: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      repositoryUrl: {
        type: DataTypes.STRING(512),
        allowNull: false,
      },
      defaultBranch: {
        type: DataTypes.STRING(255),
        defaultValue: 'main',
      },
      accessToken: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      verificationStatus: {
        type: DataTypes.ENUM('PENDING', 'VALID', 'INVALID', 'EXPIRED'),
        defaultValue: 'PENDING',
      },
      lastVerifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdByAccountId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: {
          model: 'accounts',  // FK to accounts table
          key: 'id'
        },
        onDelete: 'RESTRICT'
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'tenant_scm_integrations',
      timestamps: true,
      indexes: [
        {
          name: 'idx_scm_tenant',
          fields: ['tenantId', 'isActive']
        },
        {
          name: 'unique_tenant_scm_repo',
          unique: true,
          fields: ['tenantId', 'scmType', 'repositoryUrl']
        }
      ]
    }
  );

  return SCMIntegrationModel;
}
```

---

### Step 2: Register Model in Storage

**File:** `api/script/storage/storage.ts` (or wherever your models are initialized)

```typescript
import { createSCMIntegrationModel } from './integrations/scm/scm-models';

// Initialize model
const SCMIntegrations = createSCMIntegrationModel(sequelize);

// Define associations
SCMIntegrations.belongsTo(Tenants, { foreignKey: 'tenantId' });
SCMIntegrations.belongsTo(Accounts, { foreignKey: 'createdByAccountId' });

// Sync table (creates table if doesn't exist)
await sequelize.sync({ alter: true }); // or just { } for production

export const storage = {
  // ... existing models
  Accounts,
  Tenants,
  Apps,
  
  // New integration models
  SCMIntegrations,
};
```

---

### Step 3: That's It! Table Auto-Created

When your server starts, Sequelize will:
1. See the new `SCMIntegrationModel`
2. Check if `tenant_scm_integrations` table exists
3. Create it automatically if it doesn't
4. Add foreign keys automatically
5. Create indexes automatically

**No SQL migration needed!**

---

## 🔄 Complete Workflow

```
1. Create TypeScript types       (scm-types.ts)
2. Create Sequelize model        (scm-models.ts)
3. Register in storage           (storage.ts)
4. Restart server                (Sequelize auto-creates table)
5. Create controller & routes    (scm-controller.ts, scm-routes.ts)
6. Test with cURL                ✅
```

---

## ⚠️ Important: Sync Options

### Development
```typescript
await sequelize.sync({ alter: true });
// Automatically updates table schema to match model
```

### Production
```typescript
await sequelize.sync();
// Only creates tables if they don't exist
// Won't modify existing tables (safer)
```

### Reset All (Careful!)
```typescript
await sequelize.sync({ force: true });
// DROPS all tables and recreates them
// ⚠️ YOU WILL LOSE ALL DATA
```

---

## 📁 Simplified File Structure

```
api/script/storage/integrations/
├── scm/
│   ├── scm-types.ts           # TypeScript interfaces
│   ├── scm-models.ts          # Sequelize model (auto-creates table)
│   ├── scm-controller.ts      # CRUD operations
│   └── index.ts
├── targets/
│   ├── target-types.ts
│   ├── target-models.ts       # Auto-creates tenant_target_integrations
│   └── ...
└── ...

# NO migrations/ folder needed! ✅
```

---

## 🎯 Updated Quick Start

### Step 1: Create Model (15 min)
```typescript
// api/script/storage/integrations/scm/scm-models.ts
export function createSCMIntegrationModel(sequelize) {
  // ... (see above)
}
```

### Step 2: Register in Storage (5 min)
```typescript
// api/script/storage/storage.ts
const SCMIntegrations = createSCMIntegrationModel(sequelize);
await sequelize.sync({ alter: true });
```

### Step 3: Restart Server (1 min)
```bash
npm run dev
# Table auto-created! ✅
```

### Step 4: Verify Table Created
```bash
mysql -u root -p delivr_ota -e "DESCRIBE tenant_scm_integrations;"
# Should show all columns!
```

### Step 5: Create Controller & Routes (30 min)
```typescript
// Same as before
```

### Step 6: Test (15 min)
```bash
curl -X POST http://localhost:8080/api/v1/integrations/scm ...
# Works! ✅
```

---

## 🤔 When Should You Use SQL Migrations?

Use SQL migrations when:
- ✅ You're deploying to production
- ✅ You have a large team
- ✅ You need rollback capability
- ✅ You want version control for schema
- ✅ You're making complex schema changes

Continue using Sequelize auto-sync when:
- ✅ Small team / solo developer
- ✅ Development environment
- ✅ Rapid prototyping
- ✅ Existing codebase already uses it

**Since your existing codebase uses auto-sync, stick with it for consistency!**

---

## 🚀 Recommended Approach for You

**Option 1: Pure Auto-Sync (Simplest)**
- Skip ALL SQL migrations
- Just create Sequelize models
- Let Sequelize handle everything
- **Pros:** Fast, consistent with existing code
- **Cons:** Less control, production risk

**Option 2: Hybrid (Recommended for Growth)**
- Use auto-sync in development (`{ alter: true }`)
- Generate SQL migrations for production from working schema
- **Pros:** Best of both worlds
- **Cons:** Need to generate migrations later

**Option 3: Pure Migrations (I originally recommended)**
- Write SQL migrations for everything
- More work upfront
- **Pros:** Full control, production-ready
- **Cons:** Inconsistent with existing approach

---

## ✅ My Updated Recommendation

**Go with Option 1 (Pure Auto-Sync) for now!**

Here's why:
1. ✅ Your existing code already uses it
2. ✅ Much faster to implement
3. ✅ Less to learn initially
4. ✅ You can add migrations later when you're production-ready
5. ✅ Consistent with `accounts`, `apps`, `tenants` tables

**You can always add migrations later!**

---

## 📚 Updated Documentation

- Use: `SIMPLIFIED_INTEGRATION_APPROACH.md` (this file)
- Ignore: `003_tenant_scm_integrations.sql` (delete it)
- Keep: Types, models, controllers, routes (same as before)

---

## 🎯 Action Items

1. ✅ Delete `migrations/003_tenant_scm_integrations.sql`
2. ✅ Create `scm-types.ts` and `scm-models.ts`
3. ✅ Register model in `storage.ts`
4. ✅ Restart server (table auto-created)
5. ✅ Create controller and routes
6. ✅ Test with cURL

**Much simpler! You were absolutely right to question it. 🎉**

