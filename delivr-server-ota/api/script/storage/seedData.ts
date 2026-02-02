import 'module-alias/register';
import { Sequelize } from "sequelize";
import { createModelss } from "./aws-storage";
import { NODE_ENV_VALUES } from "../constants/env";

// Define the Sequelize connection
const sequelize = new Sequelize("codepushdb", "root", "root", {
  host: process.env.DB_HOST || "db",
  dialect: "mysql",
});

// Seed data
const seedData = {
  accounts: [
    { id: "id_0", email: "user1@example.com", name: "User One", createdTime: new Date().getTime() },
    { id: "id_1", email: "user2@example.com", name: "User Two", createdTime: new Date().getTime() },
  ],
  accountChannels: [
    {
      id: "channel_1",
      accountId: "id_0",
      externalChannelId: "google-oauth-sub-123456789",
      channelType: "google_oauth",
      channelMetadata: JSON.stringify({
        email: "user1@example.com",
        email_verified: true,
        given_name: "User",
        family_name: "One",
        locale: "en"
      }),
      isActive: true,
    },
    {
      id: "channel_2",
      accountId: "id_1",
      externalChannelId: "google-oauth-sub-987654321",
      channelType: "google_oauth",
      channelMetadata: JSON.stringify({
        email: "user2@example.com",
        email_verified: true,
        given_name: "User",
        family_name: "Two",
        locale: "en"
      }),
      isActive: true,
    },
    {
      id: "channel_3",
      accountId: "id_0",
      externalChannelId: "slack-user-U123ABC456",
      channelType: "slack",
      channelMetadata: JSON.stringify({
        team_id: "T123DEF789",
        username: "user.one",
        real_name: "User One"
      }),
      isActive: true,
    },
  ],
  tenants: [
    { id: "tenant_1", displayName: "Organization One", createdBy: "id_0" },
    { id: "tenant_2", displayName: "Organization Two", createdBy: "id_1" },
  ],
  apps: [
    { id: "id_2", name: "App One", accountId: "id_0", tenantId: "tenant_1", createdTime: new Date().getTime() },
    { id: "id_3", name: "App Two", accountId: "id_1", tenantId: "tenant_2", createdTime: new Date().getTime() },
    { id: "id_4", name: "Independent App", accountId: "id_0", createdTime: new Date().getTime() }, // App without a tenant association
  ],
  collaborators: [
    { email: "user1@example.com", accountId: "id_0", appId: "id_2", permission: "Owner", isCreator: false },
    { email: "user2@example.com", accountId: "id_1", appId: "id_3", permission: "Owner", isCreator: false },
  ],
  deployments: [
    {
      id: "id_5",
      name: "Deployment One",
      key: "O25dwjupnmTCC-q70qC1CzWfO73NkSR75brivk",
      appId: "id_2",
      packageId: "pkg_1", // Link deployment to package
      createdTime: 1731269070,
    },
    {
      id: "id_6",
      name: "Deployment for App Two",
      key: "deployment_key_2",
      appId: "id_3",
      packageId: "pkg_current_2", // Link to the current package
      createdTime: 1731269070,
    },
  ],
  packages: [
    {
      id: "pkg_1",  // Assign a UUID or specific ID here
      appVersion: "1.0.0",
      blobUrl: "https://codepush-secondary.blob.core.windows.net/storagev2/z98_ktyhgijjKQai7fIvDj6z_t6pb984637d-14f4-409d-9646-13a0665a3902",
      description: "Minor improvements",
      isDisabled: false,
      isMandatory: false,
      label: "v1",
      manifestBlobUrl: "https://codepush-secondary.blob.core.windows.net/storagev2",
      packageHash: "d581c94fa2c00b144f1b9a5cf786787826bdf4a9e12e4941c8d2541efc7518ed",
      releasedBy: "user1@example.com",
      releaseMethod: "Upload",
      size: 256994,
      uploadTime: 1731269070,
      deploymentId: "id_5",
      rollout: 100,
    },
    {
      id: "pkg_current_1",
      appVersion: "1.0.0",
      blobUrl: "https://example.com/blob_v1",
      description: "Current version of App One",
      isDisabled: false,
      isMandatory: true,
      label: "v2",
      manifestBlobUrl: "https://example.com/manifest_v1",
      packageHash: "hash_1",
      releasedBy: "user1@example.com",
      releaseMethod: "Upload",
      size: 1024,
      uploadTime: new Date().getTime(),
      deploymentId: "id_5", // Links to the current deployment
      rollout: 100,
    },
    {
      id: "pkg_current_2",
      appVersion: "1.2.0",
      blobUrl: "https://example.com/blob_v2",
      description: "Current version of App Two",
      isDisabled: false,
      isMandatory: false,
      label: "v2",
      manifestBlobUrl: "https://example.com/manifest_v2",
      packageHash: "hash_2",
      releasedBy: "user2@example.com",
      releaseMethod: "Upload",
      size: 2048,
      uploadTime: new Date().getTime(),
      deploymentId: "id_6", // Links to the current deployment
      rollout: 100,
    },
    {
      id: "pkg_hist_1",
      appVersion: "1.2.3",
      blobUrl: "https://example.com/blob_v0.9",
      description: "Previous version of App One",
      isDisabled: false,
      isMandatory: false,
      label: "v3",
      manifestBlobUrl: "https://example.com/manifest_v0.9",
      packageHash: "hash_old_1",
      releasedBy: "user1@example.com",
      releaseMethod: "Upload",
      size: 900,
      uploadTime: new Date().getTime() - 1000000,
      deploymentId: "id_5",
      rollout: 100,
    },
  ],
  accessKeys: [
    {
      id: "id_6",
      name: "accessKey1",
      accountId: "id_0",
      createdBy: "admin",
      createdTime: new Date().getTime(),
      friendlyName: "Default Access Key",
      expires: 1735689600000,
      scope: "All",  // Fixed: Must match ENUM value 'All' (capital A)
    },
  ],
  platformStoreMappings: [
    {
      id: "platform_android_001",
      platform: "ANDROID" as const,
      allowedStoreTypes: ["PLAY_STORE", "MICROSOFT_STORE", "FIREBASE"],
    },
    {
      id: "platform_ios_001",
      platform: "IOS" as const,
      allowedStoreTypes: ["APP_STORE", "TESTFLIGHT", "FIREBASE"],
    },
  ],
};

// Seed function
async function seed() {
  try {
    // Initialize models
    const models = createModelss(sequelize);
    
    // NOTE: We use SQL migrations to manage schema, not Sequelize sync
    // Migrations are in /migrations folder and should be run manually
    // await sequelize.sync({ alter: false }); // REMOVED - causes FK constraint conflicts

    // Check if database already has data
    const accountCount = await models.Account.count();
    
    if (accountCount > 0) {
      console.log("⏭️  Database already contains data. Skipping seeding to preserve existing data.");
      console.log(`   Found ${accountCount} accounts. To force re-seed, clear the database manually.`);
      return;
    }

    console.log("🌱 Database is empty. Starting seeding process...");

    // Disable foreign key checks for seeding
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

    // Clear existing seed data in reverse order (to avoid FK constraints)
    // Note: This should never run now since we check for data above, but keeping for safety
    await models.AccessKey.destroy({ where: {} });
    await models.Package.destroy({ where: {} });
    await models.Deployment.destroy({ where: {} });
    await models.Collaborator.destroy({ where: {} });
    await models.App.destroy({ where: {} });
    await models.Tenant.destroy({ where: {} });
    await models.AccountChannel.destroy({ where: {} });
    await models.Account.destroy({ where: {} });

    // Re-enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

    // Insert seed data in order
    await models.Account.bulkCreate(seedData.accounts);
    await models.AccountChannel.bulkCreate(seedData.accountChannels);
    await models.Tenant.bulkCreate(seedData.tenants);
    await models.App.bulkCreate(seedData.apps);
    await models.Collaborator.bulkCreate(seedData.collaborators);
    
    // Insert deployments with `currentPackageId` temporarily set to `null`
    await models.Deployment.bulkCreate(seedData.deployments.map((deployment) => ({
      ...deployment,
      packageId: null, // Temporarily set to null to break circular dependency
    })));
    await models.Package.bulkCreate(seedData.packages);
    
    // Update deployments with their package IDs
    await Promise.all(seedData.deployments.map(async (deployment) => {
      if (deployment.packageId) {
        await models.Deployment.update(
          { packageId: deployment.packageId },
          { where: { id: deployment.id } }
        );
      }
    }));
    await models.AccessKey.bulkCreate(seedData.accessKeys);
    
    // Insert platform store mappings (static reference data)
    // Use INSERT IGNORE or ON DUPLICATE KEY UPDATE to handle existing data
    await Promise.all(seedData.platformStoreMappings.map(async (mapping) => {
      const existing = await models.PlatformStoreMapping.findOne({
        where: { platform: mapping.platform }
      });
      
      if (!existing) {
        await models.PlatformStoreMapping.create(mapping);
      } else {
        await models.PlatformStoreMapping.update(
          { allowedStoreTypes: mapping.allowedStoreTypes },
          { where: { platform: mapping.platform } }
        );
      }
    }));

    console.log("✅ Seed data has been inserted successfully.");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
  } finally {
    await sequelize.close();
  }
}

if (process.env.NODE_ENV !== NODE_ENV_VALUES.PROD) {
  seed();
} else {
  // Do nothing
}
