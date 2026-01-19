# Integrations Feature - Implementation Plan

## 🎯 Goal

Implement a complete Integrations management system where:
1. Users can connect SCM (GitHub/GitLab/Bitbucket)
2. Once connected, setup wizard skips completed steps
3. Integrations page shows all configured integrations by category
4. Only Owner has permission to edit integrations

---

## 📋 Available Backend APIs

### SCM Integration Endpoints (Already Implemented)

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| **POST** | `/tenants/:tenantId/integrations/scm/verify` | Verify GitHub token | Owner |
| **POST** | `/tenants/:tenantId/integrations/scm` | Create SCM integration | Owner |
| **GET** | `/tenants/:tenantId/integrations/scm` | Get SCM integration | Owner |
| **PATCH** | `/tenants/:tenantId/integrations/scm` | Update SCM integration | Owner |
| **DELETE** | `/tenants/:tenantId/integrations/scm` | Delete SCM integration | Owner |

### Tenant Info Endpoint
| Method | Endpoint | Purpose |
|--------|----------|---------|
| **GET** | `/tenants/:tenantId` | Get tenant with all integrations array |

**Response includes:**
```json
{
  "organisation": {
    "releaseManagement": {
      "setupComplete": true/false,
      "integrations": [
        {
          "type": "scm",
          "id": "...",
          "scmType": "GITHUB",
          "displayName": "...",
          "owner": "...",
          "repo": "...",
          ...
        }
      ]
    }
  }
}
```

---

## 🏗️ Frontend Implementation Tasks

### Task 1: Create Frontend API Routes

**Purpose:** Proxy backend SCM APIs to frontend

**Files to create:**
1. `app/routes/api.v1.tenants.$tenantId.integrations.scm.verify.ts`
   - POST action for verify endpoint
   
2. `app/routes/api.v1.tenants.$tenantId.integrations.scm.ts`
   - GET loader for fetch
   - POST action for create
   - PATCH action for update
   - DELETE action for delete

**Service methods to add** (in `app/.server/services/Codepush/index.ts`):
```typescript
async verifySCMConnection(data: { userId, tenantId, owner, repo, accessToken, scmType })
async getSCMIntegration(data: { userId, tenantId })
async createSCMIntegration(data: { userId, tenantId, ...integrationData })
async updateSCMIntegration(data: { userId, tenantId, ...updateData })
async deleteSCMIntegration(data: { userId, tenantId })
```

---

### Task 2: Create Integrations Page

**File:** `app/routes/dashboard.$org.integrations.tsx`

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Integrations                                 │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ 🔗 Source Control Management            │ │
│ │                                          │ │
│ │ Connected: GitHub - my-org/my-repo       │ │
│ │ Status: ✅ Verified                      │ │
│ │ [Edit] [Disconnect]                      │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ 📱 Target Platforms                     │ │
│ │                                          │ │
│ │ No platforms configured                  │ │
│ │ [+ Add Platform]                         │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ 🔧 CI/CD Pipelines                      │ │
│ │                                          │ │
│ │ No pipelines configured                  │ │
│ │ [+ Add Pipeline]                         │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ 💬 Communication                        │ │
│ │                                          │ │
│ │ No communication integrations            │ │
│ │ [+ Add Integration]                      │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Component structure:**
```typescript
// Main page component
export default function IntegrationsPage() {
  const { org } = useParams();
  const { data: tenantInfo } = useTenantInfo(org);
  const integrations = tenantInfo?.releaseManagement?.integrations || [];

  return (
    <Container>
      <Title>Integrations</Title>
      
      <IntegrationCategory
        title="Source Control Management"
        icon="🔗"
        integrations={integrations.filter(i => i.type === 'scm')}
        onAdd={() => setShowSCMModal(true)}
      />
      
      <IntegrationCategory
        title="Target Platforms"
        icon="📱"
        integrations={integrations.filter(i => i.type === 'targetPlatform')}
        onAdd={() => setShowPlatformModal(true)}
      />
      
      // ... other categories
    </Container>
  );
}
```

---

### Task 3: Add Integrations to Sidebar

**File:** `app/components/Sidebar.tsx` (or wherever sidebar is defined)

**Add menu item:**
```typescript
{
  label: 'Integrations',
  icon: <IconPlug />,
  path: `/dashboard/${org}/integrations`,
  visible: isOwner  // Only show to owners
}
```

**Example implementation:**
```typescript
import { IconPlug } from '@tabler/icons-react';

const menuItems = [
  { label: 'Dashboard', icon: <IconHome />, path: `/dashboard/${org}` },
  { label: 'Apps', icon: <IconApps />, path: `/dashboard/${org}/apps` },
  { label: 'Releases', icon: <IconRocket />, path: `/dashboard/${org}/releases` },
  { 
    label: 'Integrations', 
    icon: <IconPlug />, 
    path: `/dashboard/${org}/integrations`,
    ownerOnly: true  // Only visible to owners
  },
  { label: 'Settings', icon: <IconSettings />, path: `/dashboard/${org}/settings` },
];
```

---

### Task 4: Create SCM Connection Form

**Component:** `app/components/Integrations/SCMConnectionForm.tsx`

**Features:**
- GitHub token input (masked)
- Owner/repo input
- Real-time verification
- Success/error feedback

**Flow:**
```
1. User enters GitHub details
   ↓
2. Click "Verify Connection"
   ↓
3. Call POST /api/v1/tenants/:tenantId/integrations/scm/verify
   ↓
4. If verified ✅
   ↓
5. Call POST /api/v1/tenants/:tenantId/integrations/scm (create)
   ↓
6. Invalidate tenant info cache
   ↓
7. Show success message
   ↓
8. Close modal
```

**Component structure:**
```typescript
export function SCMConnectionForm({ tenantId, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    scmType: 'GITHUB',
    owner: '',
    repo: '',
    accessToken: '',
    displayName: ''
  });
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleVerify = async () => {
    // Call verify API
    const response = await fetch(`/api/v1/tenants/${tenantId}/integrations/scm/verify`, {
      method: 'POST',
      body: JSON.stringify({
        owner: form.owner,
        repo: form.repo,
        accessToken: form.accessToken,
        scmType: form.scmType
      })
    });
    
    if (response.ok) {
      setVerified(true);
    }
  };

  const handleConnect = async () => {
    // Call create API
    const response = await fetch(`/api/v1/tenants/${tenantId}/integrations/scm`, {
      method: 'POST',
      body: JSON.stringify(form)
    });
    
    if (response.ok) {
      onSuccess();
    }
  };

  return (
    <Modal>
      <Select
        label="SCM Type"
        value={form.scmType}
        data={['GITHUB', 'GITLAB', 'BITBUCKET']}
      />
      
      <TextInput label="Owner" value={form.owner} />
      <TextInput label="Repository" value={form.repo} />
      <PasswordInput label="Access Token" value={form.accessToken} />
      <TextInput label="Display Name" value={form.displayName} />
      
      <Button onClick={handleVerify} loading={verifying}>
        Verify Connection
      </Button>
      
      {verified && (
        <Alert color="green">
          ✅ Connection verified successfully!
        </Alert>
      )}
      
      <Group>
        <Button onClick={handleCancel} variant="subtle">Cancel</Button>
        <Button onClick={handleConnect} disabled={!verified}>
          Connect
        </Button>
      </Group>
    </Modal>
  );
}
```

---

### Task 5: Update Setup Wizard to Skip Completed Steps

**File:** `app/routes/dashboard.$org.releases.setup.tsx`

**Logic:**
```typescript
export const loader = authenticateLoaderRequest(async ({ params, user }) => {
  const { org } = params;
  
  // Get tenant info with integrations
  const tenantInfo = await getTenantInfo(org);
  const integrations = tenantInfo.releaseManagement?.integrations || [];
  
  // Check what's already configured
  const hasScm = integrations.some(i => i.type === 'scm');
  const hasTargetPlatform = integrations.some(i => i.type === 'targetPlatform');
  
  // If SCM already connected, skip to next step
  if (hasScm) {
    return redirect(`/dashboard/${org}/releases/setup?step=targets`);
  }
  
  // If all required steps done, go to dashboard
  if (hasScm && hasTargetPlatform) {
    return redirect(`/dashboard/${org}/releases`);
  }
  
  return json({ org, integrations });
});
```

**Wizard logic:**
```typescript
const steps = [
  {
    id: 'scm',
    label: 'Connect GitHub',
    completed: integrations.some(i => i.type === 'scm'),
    skip: true  // Skip if already completed
  },
  {
    id: 'targets',
    label: 'Target Platforms',
    completed: integrations.some(i => i.type === 'targetPlatform'),
    skip: false
  },
  // ...
];

// Auto-skip completed steps
useEffect(() => {
  if (steps[currentStep].completed && steps[currentStep].skip) {
    goToNextStep();
  }
}, [currentStep]);
```

---

## 🔒 Permissions

**Owner Only:**
- ✅ View integrations page
- ✅ Add new integrations
- ✅ Edit existing integrations
- ✅ Delete integrations

**Editor/Viewer:**
- ❌ Cannot access integrations page
- ❌ Redirect to dashboard if they try

**Implementation:**
```typescript
// In loader
export const loader = authenticateLoaderRequest(async ({ params, user }) => {
  const { org } = params;
  
  // Check if user is owner
  const tenantInfo = await getTenantInfo(org);
  if (tenantInfo.role !== 'Owner') {
    return redirect(`/dashboard/${org}`);  // Redirect non-owners
  }
  
  return json({ ... });
});
```

---

## 🎨 UI Components Needed

### 1. IntegrationCard
```typescript
<Card>
  <Group>
    <Avatar>{icon}</Avatar>
    <div>
      <Text fw={600}>{displayName}</Text>
      <Text size="sm" c="dimmed">{subtitle}</Text>
    </div>
    <Badge color={status === 'VALID' ? 'green' : 'red'}>
      {status}
    </Badge>
  </Group>
  <Group mt="md">
    <Button size="xs" onClick={onEdit}>Edit</Button>
    <Button size="xs" color="red" onClick={onDelete}>Disconnect</Button>
  </Group>
</Card>
```

### 2. IntegrationCategory
```typescript
<Stack>
  <Group>
    <Title order={3}>{icon} {title}</Title>
  </Group>
  
  {integrations.length === 0 ? (
    <Card>
      <Text c="dimmed">No {title.toLowerCase()} configured</Text>
      <Button mt="md" onClick={onAdd}>+ Add {title}</Button>
    </Card>
  ) : (
    <Stack>
      {integrations.map(int => (
        <IntegrationCard key={int.id} {...int} />
      ))}
      <Button variant="light" onClick={onAdd}>+ Add Another</Button>
    </Stack>
  )}
</Stack>
```

---

## 📊 State Management

### Cache Invalidation
After creating/updating/deleting integrations:
```typescript
import { useQueryClient } from 'react-query';

const queryClient = useQueryClient();

// After successful mutation
await queryClient.invalidateQueries(['tenant-info', tenantId]);
```

### Optimistic Updates
```typescript
const mutation = useMutation(createSCMIntegration, {
  onMutate: async (newIntegration) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['tenant-info', tenantId]);
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(['tenant-info', tenantId]);
    
    // Optimistically update
    queryClient.setQueryData(['tenant-info', tenantId], old => ({
      ...old,
      releaseManagement: {
        ...old.releaseManagement,
        integrations: [...old.releaseManagement.integrations, newIntegration]
      }
    }));
    
    return { previous };
  },
  onError: (err, newIntegration, context) => {
    // Rollback on error
    queryClient.setQueryData(['tenant-info', tenantId], context.previous);
  }
});
```

---

## ✅ Testing Checklist

### Setup Wizard
- [ ] New tenant with no integrations → Shows SCM step
- [ ] Tenant with SCM connected → Skips SCM step
- [ ] Complete all steps → Redirects to dashboard
- [ ] Refresh during wizard → Maintains state

### Integrations Page
- [ ] Owner can access page
- [ ] Editor/Viewer redirected to dashboard
- [ ] Empty state shows correctly
- [ ] SCM integration displays with correct data
- [ ] Can add new SCM integration
- [ ] Can edit existing integration
- [ ] Can delete integration with confirmation
- [ ] Sensitive tokens not visible in UI

### Navigation
- [ ] Integrations tab visible to owners only
- [ ] Active state on integrations page
- [ ] Breadcrumbs work correctly

---

## 🚀 Implementation Order

1. **Frontend API Routes** (Day 1)
   - Create API proxy routes
   - Add service methods
   - Test with Postman/curl

2. **Integrations Page** (Day 1-2)
   - Create basic layout
   - Add category sections
   - Display existing integrations from tenant info

3. **SCM Connection Form** (Day 2)
   - Create form component
   - Add verification logic
   - Handle success/error states

4. **Sidebar Integration** (Day 2)
   - Add menu item
   - Add owner-only logic
   - Test navigation

5. **Setup Wizard Updates** (Day 3)
   - Add skip logic for completed steps
   - Test various scenarios
   - Handle edge cases

6. **Polish & Testing** (Day 3)
   - Add loading states
   - Add error handling
   - Add success notifications
   - Test all flows

---

## 📝 Summary

**What exists:**
- ✅ Backend APIs for SCM (verify, create, get, update, delete)
- ✅ Tenant info API with integrations array
- ✅ TypeScript types for integrations

**What needs to be built:**
- ❌ Frontend API routes
- ❌ Integrations page component
- ❌ SCM connection form
- ❌ Sidebar menu item
- ❌ Setup wizard skip logic

**Estimated effort:** 2-3 days for full implementation

---

**Status:** 📋 Planning complete, ready for implementation when needed!

