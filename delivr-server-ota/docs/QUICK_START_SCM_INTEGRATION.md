# Quick Start: Implement Your First Integration (SCM)

**Goal:** Get SCM integration working end-to-end in ~2 hours.

---

## ⏱️ Time Estimate

- **Migration:** 15 minutes
- **Types:** 15 minutes
- **Model:** 15 minutes
- **Controller:** 30 minutes
- **Routes:** 30 minutes
- **Testing:** 15 minutes

**Total:** ~2 hours

---

## 📋 Prerequisites

- [ ] MySQL running locally
- [ ] `delivr_ota` database exists
- [ ] Node.js server can connect to MySQL
- [ ] You've read `SCM_INTEGRATION_IMPLEMENTATION_GUIDE.md`

---

## 🚀 Step-by-Step

### Step 1: Create Migration (15 min)

```bash
cd /Users/jatinkhemchandani/Desktop/delivr-server-ota-managed

# Create migration file
touch migrations/003_tenant_scm_integrations.sql
```

**Copy this SQL:**

```sql
-- Create SCM integrations table
CREATE TABLE IF NOT EXISTS tenant_scm_integrations (
  id VARCHAR(255) PRIMARY KEY,
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  scmType ENUM('GITHUB', 'GITLAB', 'BITBUCKET') NOT NULL,
  displayName VARCHAR(255) NOT NULL,
  
  -- GitHub fields
  githubOrganization VARCHAR(255) NULL,
  githubRepository VARCHAR(255) NULL,
  
  -- Common
  repositoryUrl VARCHAR(512) NOT NULL,
  defaultBranch VARCHAR(255) DEFAULT 'main',
  accessToken TEXT NULL COMMENT 'Encrypted',
  
  -- Status
  isActive BOOLEAN DEFAULT TRUE,
  verificationStatus ENUM('PENDING', 'VALID', 'INVALID', 'EXPIRED') DEFAULT 'PENDING',
  lastVerifiedAt DATETIME NULL,
  
  -- Metadata
  createdByAccountId VARCHAR(255) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_scm_tenant (tenantId, isActive),
  UNIQUE KEY unique_tenant_scm_repo (tenantId, scmType, repositoryUrl)
  
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Foreign keys
ALTER TABLE tenant_scm_integrations
  ADD CONSTRAINT fk_scm_tenant
    FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_scm_created_by
    FOREIGN KEY (createdByAccountId) REFERENCES accounts(id) ON DELETE RESTRICT;
```

**Run migration:**

```bash
mysql -u root -p delivr_ota < migrations/003_tenant_scm_integrations.sql

# Verify
mysql -u root -p delivr_ota -e "DESCRIBE tenant_scm_integrations;"
```

✅ **Checkpoint:** Table should exist with all columns.

---

### Step 2: Create Folder Structure (5 min)

```bash
# Create directories
mkdir -p api/script/storage/integrations/scm
mkdir -p api/script/routes/integrations

# Create files
touch api/script/storage/integrations/scm/scm-types.ts
touch api/script/storage/integrations/scm/scm-models.ts
touch api/script/storage/integrations/scm/scm-controller.ts
touch api/script/storage/integrations/scm/index.ts
touch api/script/storage/integrations/index.ts
touch api/script/routes/integrations/scm-routes.ts
touch api/script/routes/integrations/index.ts
```

---

### Step 3: TypeScript Types (15 min)

**File:** `api/script/storage/integrations/scm/scm-types.ts`

```typescript
export enum SCMType {
  GITHUB = 'GITHUB',
  GITLAB = 'GITLAB',
  BITBUCKET = 'BITBUCKET'
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VALID = 'VALID',
  INVALID = 'INVALID',
  EXPIRED = 'EXPIRED'
}

export interface TenantSCMIntegration {
  id: string;
  tenantId: string;
  scmType: SCMType;
  displayName: string;
  githubOrganization?: string | null;
  githubRepository?: string | null;
  repositoryUrl: string;
  defaultBranch: string;
  accessToken?: string | null;
  isActive: boolean;
  verificationStatus: VerificationStatus;
  lastVerifiedAt?: Date | null;
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSCMIntegrationDto {
  tenantId: string;
  scmType: SCMType;
  displayName: string;
  githubOrganization?: string;
  githubRepository?: string;
  repositoryUrl: string;
  defaultBranch?: string;
  accessToken: string;
  createdByAccountId: string;
}

export interface UpdateSCMIntegrationDto {
  displayName?: string;
  defaultBranch?: string;
  accessToken?: string;
  isActive?: boolean;
}

export interface SafeSCMIntegration extends Omit<
  TenantSCMIntegration,
  'accessToken'
> {
  hasValidToken?: boolean;
}
```

✅ **Checkpoint:** No TypeScript errors.

---

### Step 4: Sequelize Model (15 min)

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
      id: { type: DataTypes.STRING(255), primaryKey: true },
      tenantId: { type: DataTypes.CHAR(36), allowNull: false },
      scmType: { type: DataTypes.ENUM(...Object.values(SCMType)), allowNull: false },
      displayName: { type: DataTypes.STRING(255), allowNull: false },
      githubOrganization: { type: DataTypes.STRING(255), allowNull: true },
      githubRepository: { type: DataTypes.STRING(255), allowNull: true },
      repositoryUrl: { type: DataTypes.STRING(512), allowNull: false },
      defaultBranch: { type: DataTypes.STRING(255), defaultValue: 'main' },
      accessToken: { type: DataTypes.TEXT, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
      verificationStatus: { 
        type: DataTypes.ENUM(...Object.values(VerificationStatus)), 
        defaultValue: VerificationStatus.PENDING 
      },
      lastVerifiedAt: { type: DataTypes.DATE, allowNull: true },
      createdByAccountId: { type: DataTypes.STRING(255), allowNull: false },
      createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      tableName: 'tenant_scm_integrations',
      timestamps: true,
    }
  );

  return SCMIntegrationModel;
}
```

✅ **Checkpoint:** Model compiles without errors.

---

### Step 5: Database Controller (30 min)

**File:** `api/script/storage/integrations/scm/scm-controller.ts`

```typescript
import { nanoid } from 'nanoid';
import { Model } from 'sequelize';
import { 
  CreateSCMIntegrationDto, 
  UpdateSCMIntegrationDto,
  SafeSCMIntegration,
  VerificationStatus
} from './scm-types';

export class SCMIntegrationController {
  private model: typeof Model;

  constructor(model: typeof Model) {
    this.model = model;
  }

  async create(data: CreateSCMIntegrationDto): Promise<SafeSCMIntegration> {
    const integration = await this.model.create({
      id: nanoid(),
      ...data,
      isActive: true,
      verificationStatus: VerificationStatus.PENDING,
    });
    return this.toSafeObject(integration.toJSON());
  }

  async findById(id: string): Promise<SafeSCMIntegration | null> {
    const integration = await this.model.findByPk(id);
    if (!integration) return null;
    return this.toSafeObject(integration.toJSON());
  }

  async findAll(tenantId?: string): Promise<SafeSCMIntegration[]> {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    
    const integrations = await this.model.findAll({ 
      where,
      order: [['createdAt', 'DESC']]
    });
    
    return integrations.map(i => this.toSafeObject(i.toJSON()));
  }

  async update(id: string, data: UpdateSCMIntegrationDto): Promise<SafeSCMIntegration | null> {
    const integration = await this.model.findByPk(id);
    if (!integration) return null;
    await integration.update(data);
    return this.toSafeObject(integration.toJSON());
  }

  async softDelete(id: string): Promise<boolean> {
    const integration = await this.model.findByPk(id);
    if (!integration) return false;
    await integration.update({ isActive: false });
    return true;
  }

  private toSafeObject(data: any): SafeSCMIntegration {
    const { accessToken, ...safe } = data;
    return { ...safe, hasValidToken: !!accessToken };
  }
}
```

✅ **Checkpoint:** Controller compiles without errors.

---

### Step 6: Express Routes (30 min)

**File:** `api/script/routes/integrations/scm-routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { SCMIntegrationController } from '../../storage/integrations/scm/scm-controller';
import { CreateSCMIntegrationDto, UpdateSCMIntegrationDto } from '../../storage/integrations/scm/scm-types';

export function createSCMRoutes(controller: SCMIntegrationController): Router {
  const router = Router();

  // List all
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.query;
      const integrations = await controller.findAll(tenantId as string);
      res.json({ success: true, data: integrations });
    } catch (error) {
      console.error('[SCM Routes] Error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch integrations' });
    }
  });

  // Get single
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const integration = await controller.findById(req.params.id);
      if (!integration) {
        return res.status(404).json({ success: false, error: 'Not found' });
      }
      res.json({ success: true, data: integration });
    } catch (error) {
      console.error('[SCM Routes] Error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch integration' });
    }
  });

  // Create
  router.post('/', async (req: Request, res: Response) => {
    try {
      const data: CreateSCMIntegrationDto = req.body;
      
      if (!data.tenantId || !data.scmType || !data.repositoryUrl || !data.accessToken) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields' 
        });
      }

      const integration = await controller.create(data);
      res.status(201).json({ success: true, data: integration });
    } catch (error) {
      console.error('[SCM Routes] Error:', error);
      res.status(500).json({ success: false, error: 'Failed to create integration' });
    }
  });

  // Update
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const data: UpdateSCMIntegrationDto = req.body;
      const integration = await controller.update(req.params.id, data);
      
      if (!integration) {
        return res.status(404).json({ success: false, error: 'Not found' });
      }
      
      res.json({ success: true, data: integration });
    } catch (error) {
      console.error('[SCM Routes] Error:', error);
      res.status(500).json({ success: false, error: 'Failed to update integration' });
    }
  });

  // Delete
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await controller.softDelete(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Not found' });
      }
      
      res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
      console.error('[SCM Routes] Error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete integration' });
    }
  });

  return router;
}
```

✅ **Checkpoint:** Routes compile without errors.

---

### Step 7: Wire Everything Together (10 min)

**File:** `api/script/storage/integrations/scm/index.ts`

```typescript
export * from './scm-types';
export * from './scm-models';
export * from './scm-controller';
```

**File:** `api/script/storage/integrations/index.ts`

```typescript
export * from './scm';
```

**File:** `api/script/routes/integrations/index.ts`

```typescript
import { Router } from 'express';
import { createSCMRoutes } from './scm-routes';
import { SCMIntegrationController } from '../../storage/integrations/scm/scm-controller';

export function createIntegrationRoutes(storage: any): Router {
  const router = Router();
  
  const scmController = new SCMIntegrationController(storage.SCMIntegrations);
  router.use('/scm', createSCMRoutes(scmController));
  
  return router;
}
```

**File:** `api/script/index.ts` (modify existing)

```typescript
// Add this import at the top
import { createIntegrationRoutes } from './routes/integrations';

// Add this after other routes
app.use('/api/v1/integrations', createIntegrationRoutes(storage));
```

**File:** `api/script/storage/storage.ts` (modify existing)

```typescript
import { createSCMIntegrationModel } from './integrations/scm/scm-models';

// In your storage initialization:
const SCMIntegrations = createSCMIntegrationModel(sequelize);

// Export it:
export const storage = {
  // ... existing models
  SCMIntegrations,
};
```

✅ **Checkpoint:** Server starts without errors.

---

### Step 8: Test It! (15 min)

**Terminal 1: Start server**

```bash
cd /Users/jatinkhemchandani/Desktop/delivr-server-ota-managed
npm run dev
# Wait for "Server listening on port 8080"
```

**Terminal 2: Test endpoints**

```bash
# 1. Create integration
curl -X POST http://localhost:8080/api/v1/integrations/scm \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "NJEG6wOk7e",
    "scmType": "GITHUB",
    "displayName": "Test Repo",
    "githubOrganization": "myorg",
    "githubRepository": "myrepo",
    "repositoryUrl": "https://github.com/myorg/myrepo",
    "accessToken": "ghp_test123",
    "createdByAccountId": "acc_test"
  }'

# Expected: 201 Created with integration object (no accessToken visible)

# 2. List integrations
curl http://localhost:8080/api/v1/integrations/scm?tenantId=NJEG6wOk7e

# Expected: 200 OK with array of integrations

# 3. Get single (use ID from step 1)
curl http://localhost:8080/api/v1/integrations/scm/{ID}

# Expected: 200 OK with integration object

# 4. Update
curl -X PATCH http://localhost:8080/api/v1/integrations/scm/{ID} \
  -H "Content-Type: application/json" \
  -d '{"displayName": "Updated Name"}'

# Expected: 200 OK with updated integration

# 5. Delete
curl -X DELETE http://localhost:8080/api/v1/integrations/scm/{ID}

# Expected: 200 OK with success message

# 6. Verify deleted (should be inactive)
curl http://localhost:8080/api/v1/integrations/scm/{ID}

# Expected: 200 OK but isActive: false
```

✅ **Checkpoint:** All endpoints return expected responses.

---

## 🎉 Success Criteria

You're done when:

- [x] Table exists in MySQL
- [x] Server starts without errors
- [x] Can create integration (POST)
- [x] Can list integrations (GET)
- [x] Can get single integration (GET)
- [x] Can update integration (PATCH)
- [x] Can delete integration (DELETE)
- [x] Access token is NOT visible in responses
- [x] hasValidToken is `true` when token exists

---

## 🐛 Common Issues

### Error: "Cannot find module 'nanoid'"

```bash
npm install nanoid
```

### Error: "Model not initialized"

Make sure you added the model to `storage.ts` exports.

### Error: "Column doesn't exist"

Re-run the migration:

```bash
mysql -u root -p delivr_ota < migrations/003_tenant_scm_integrations.sql
```

### Error: "Cannot read property 'toJSON'"

Model might be null. Check if table has data:

```bash
mysql -u root -p delivr_ota -e "SELECT * FROM tenant_scm_integrations;"
```

---

## ✅ Next Steps

Once SCM is working:

1. ✅ **Commit your work**
   ```bash
   git add .
   git commit -m "feat: implement SCM integrations"
   ```

2. 📋 **Update checklist**
   - Mark all SCM checkboxes as done in `INTEGRATION_IMPLEMENTATION_CHECKLIST.md`

3. 🔄 **Repeat for other integrations**
   - Targets (App Store, Play Store)
   - Pipelines (Jenkins, GitHub Actions)
   - Communication (Slack)
   - Tickets (Jira)

4. 🎨 **Frontend integration**
   - Update setup wizard to call these APIs
   - Replace mock data with real API calls

---

## 📚 Reference

- Full guide: `SCM_INTEGRATION_IMPLEMENTATION_GUIDE.md`
- Checklist: `INTEGRATION_IMPLEMENTATION_CHECKLIST.md`
- Flow diagram: `INTEGRATION_FLOW_DIAGRAM.md`
- Main README: `README_INTEGRATIONS.md`

**You're ready to build! 🚀**

