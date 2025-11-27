# Architecture Components

## 1. Core API Categories

### Acquisition APIs (User-Facing)

- **Purpose**: Mobile apps interact with these APIs to check for updates and report status
- **Authentication**: Uses deployment keys (no user authentication required)
- **Rate Limiting**: Handled by CloudFront + WAF
- **Caching**: Multi-layer caching with Redis and Memcached

### Management APIs (Developer-Facing)

- **Purpose**: Developers use these APIs to manage apps, deployments, and releases
- **Authentication**: OAuth-based (GitHub, Microsoft, Google)
- **Rate Limiting**: Express rate limiting middleware

## 2. Acquisition API Endpoints

### Update Check APIs

```
GET /updateCheck
GET /v0.1/public/delivr-ota/update_check
```

**Purpose**: Mobile apps query these endpoints to check for available updates

**Key Features**:

- **Dual API Support**: Legacy (`/updateCheck`) and new (`/v0.1/public/delivr-ota/update_check`) endpoints
- **Caching Strategy**: Multi-layer caching with Redis and Memcached
- **Timeout Handling**: Configurable timeouts for Redis (100ms default) and Memcached (100ms default)
- **Rollout Support**: Gradual rollout capabilities with percentage-based distribution
- **Version Validation**: Semantic versioning support with semver library

**Request Parameters**:

- `deploymentKey`: Unique identifier for the deployment
- `appVersion`: Current app version
- `packageHash`: Hash of current package (optional)
- `isCompanion`: Companion app flag (optional)
- `clientUniqueId`: Unique client identifier (optional)
- `label`: Current package label (optional)

**Response Structure**:

```json
{
  "updateInfo": {
    "downloadURL": "string",
    "description": "string",
    "isAvailable": boolean,
    "isMandatory": boolean,
    "appVersion": "string",
    "packageSize": number,
    "packageHash": "string",
    "label": "string"
  }
}
```

### Status Reporting APIs

```
POST /reportStatus/deploy
POST /v0.1/public/delivr-ota/report_status/deploy
POST /reportStatus/download
POST /v0.1/public/delivr-ota/report_status/download
```

**Purpose**: Mobile apps report deployment and download status for analytics

**Deploy Status Reporting**:
- Tracks successful deployments
- Updates Redis counters for analytics
- Supports both legacy and new API versions

**Download Status Reporting**:
- Tracks package downloads
- Increments download counters in Redis
- Used for deployment analytics and monitoring

## 3. Data Architecture

### Core Data Models

#### Account

```typescript
interface Account {
  id: string;
  email: string;
  name: string;
  createdTime: number;
}
```

#### App

```typescript
interface App {
  id: string;
  name: string;
  accountId: string;
  tenantId?: string;
  createdTime: number;
}
```

#### Deployment

```typescript
interface Deployment {
  id: string;
  name: string;
  key: string; // Deployment key used by mobile apps
  packageId?: string; // Current package reference
  appId: string;
  createdTime: number;
}
```

#### Package

```typescript
interface Package {
  id: string;
  appVersion: string;
  packageHash: string;
  blobUrl: string;
  size: number;
  deploymentId: string;
  createdTime: number;
  label: string;
  isMandatory: boolean;
  description: string;
}
```

### Database Relationships

```
Account (1) ──→ (N) App
App (1) ──→ (N) Deployment
Deployment (1) ──→ (N) Package (History)
Deployment (1) ──→ (1) Package (Current)
```

## 4. Caching Strategy

### Caching Architecture

#### Memcached (Optional)

- **Purpose**: Primary caching layer for update check responses
- **TTL**: Configurable (default 60 seconds)
- **Key Format**: URL-based keys with query parameters
- **Fallback**: Graceful degradation if Memcached is unavailable

#### Storage (Primary Data Source)

- **Purpose**: Persistent data storage (Azure Blob Storage or local emulation)
- **Fallback**: Used when Memcached fails or is unavailable

#### Redis (Analytics Only)

- **Purpose**: Analytics counters and deployment status tracking
- **Operations**: Increment counters for downloads and deployments
- **Timeout**: 100ms default timeout with graceful fallback
- **Note**: Redis is NOT used for caching update check responses

### Cache Key Strategy

```typescript
// Memcached keys for update checks
function getUrlKey(originalUrl: string): string {
  const obj = URL.parse(originalUrl, true);
  return `${obj.pathname}?${queryString.stringify(obj.query)}`;
}
```

## 5. Performance Optimizations

### Timeout Management

- **Redis Timeout**: 100ms (configurable via REDIS_TIMEOUT)
- **Memcached Timeout**: 100ms (configurable via MEMCACHED_TIMEOUT)
- **Graceful Degradation**: System continues to function even if caching layers fail

### Health Check System

```typescript
// Health check logic
const storageOrRedis = Promise.any([
  storage.checkHealth(),
  Promise.race([
    redisManager.checkHealth(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Redis timeout")), 30)
    )
  ])
]);
```

### Request Processing Pipeline

1. **Input Sanitization**: Clean and validate incoming requests
2. **Rate Limiting**: CloudFront + WAF (removed Express rate limiting)
3. **Authentication**: Deployment key validation
4. **Caching Check**: Memcached → Storage fallback (Redis used only for analytics)
5. **Response Generation**: Cached or fresh data
6. **Analytics Update**: Redis counter updates

## 6. Monitoring & Analytics

### Metrics Collection

- **Download Counters**: Track package downloads per deployment
- **Deployment Counters**: Track successful deployments
- **Error Tracking**: Datadog integration for error monitoring
- **Performance Metrics**: Request timing and cache hit rates

### Redis Analytics

```typescript
// Analytics operations
redisManager.incrementLabelStatusCount(deploymentKey, label, DOWNLOADED);
redisManager.incrementLabelStatusCount(deploymentKey, label, DEPLOYED);
```

## 7. API Versioning Strategy

### Dual API Support

- **Legacy APIs**: `/updateCheck`, `/reportStatus/*`
- **New APIs**: `/v0.1/public/delivr-ota/*`
- **Backward Compatibility**: Both versions supported simultaneously
- **Migration Path**: Gradual migration from legacy to new APIs

## 8. Error Handling

### Error Categories

- **Malformed Requests**: 400 Bad Request
- **Authentication Errors**: 401 Unauthorized
- **Not Found**: 404 Not Found
- **Server Errors**: 500 Internal Server Error

### Error Response Format

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": "string"
  }
}
```

## 9. Scalability Considerations

### Horizontal Scaling

- **Stateless Design**: No server-side session storage
- **Load Balancing**: Compatible with Azure Load Balancer
- **Database Scaling**: Supports read replicas and connection pooling

### Performance Tuning

- **Connection Pooling**: Database connection management
- **Cache Optimization**: Multi-layer caching strategy
- **Request Timeouts**: Configurable timeout values
- **Memory Management**: Efficient object lifecycle management

## Conclusion

The Delivr OTA Server's acquisition APIs provide a robust, scalable architecture for mobile app update management. The multi-layer caching strategy, comprehensive error handling, and dual API versioning ensure high availability and backward compatibility. The architecture is designed to handle high-volume mobile app traffic while maintaining low latency and high reliability.

Load testing confirms production readiness with:

- **Sustainable Capacity**: 96k RPM with <5% error rate
- **Resource Efficiency**: CPU/Memory well within safe limits
- **Clear Scaling Boundaries**: Defined thresholds for horizontal scaling
- **Performance Baselines**: Established monitoring metrics for production

### Key Strengths:

- **High Performance**: Multi-layer caching with graceful degradation
- **Scalability**: Stateless design with horizontal scaling support
- **Reliability**: Comprehensive error handling and health checks
- **Flexibility**: Support for both legacy and modern API versions
- **Monitoring**: Built-in analytics and error tracking
- **Production Validated**: Load tested up to 120k RPM with clear capacity boundaries
