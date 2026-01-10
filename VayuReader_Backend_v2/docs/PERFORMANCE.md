# Performance & Scaling

Guide to optimizing and scaling VayuReader Backend v2.

## 1. Database Optimization

### MongoDB
-   **Indexing**: Every query MUST use an index.
    -   Run `node scripts/optimizeDb.js` to verify and create indexes.
    -   Key indexes: `phone_number`, `deviceId`, `timestamp`, `text` (search).
-   **Connection Pooling**:
    -   `minPoolSize`: 5
    -   `maxPoolSize`: 50 (Adjust based on load/RAM)
    -   Configured in `src/config/environment.js`.

### Redis
-   Used for high-throughput operations (Rate limit counters, OTPs, Caching).
-   **Persistence**: RDB/AOF can be tuned based on data criticality (OTPs are transient, so lower durability is acceptable for performance).

---

## 2. Infrastructure Scaling

### Horizontal Scaling
The backend is **stateless**. You can run multiple instances (containers) of the backend behind a load balancer (Nginx).

**Requirements**:
1.  **Shared Redis**: All instances must point to the same Redis cluster for shared rate limiting and Pub/Sub.
2.  **Shared Storage**: If using local filesystem for PDF uploads, all instances must mount the same volume (`/uploads`). Ideally, switching to S3/Cloud Storage eliminates this dependency.

### Load Balancing
Nginx is configured as the entry point (`upstream backend`).
-   Use `least_conn` strategy for balanced distribution.
-   Enable `keepalive` connections to upstream node processes.

---

## 3. Application Tuning

### Node.js
-   **Cluster Mode**: PM2 or Docker replicas can be used to utilize multi-core CPUs.
-   **Async I/O**: The codebase uses `async/await` throughout. Avoid blocking operations (synchronous fs, crypto).

### Payload Size
-   **Pagination**: All list endpoints enforce pagination (`limit=100` max).
-   **Projection**: Queries select only necessary fields (`select('-passwordHash')`).
-   **Compression**: Nginx handles GZIP compression for text responses.

---

## 4. Network Optimization

-   **HTTP/2**: Nginx is configured with HTTP/2 support (multiplexing).
-   **CDN**: For global production, put Cloudflare or AWS CloudFront in front of Nginx to cache static assets (PDFs/Images) closer to users.
-   **Keep-Alive**: Configured in Nginx to reduce TCP handshake overhead.

---

## Monitoring Metrics

Critical metrics to track:
1.  **Response Time**: p95/p99 latency.
2.  **Error Rate**: 5xx status codes.
3.  **DB Queries**: Slow query logs > 100ms.
4.  **Redis Memory**: Eviction rate and fragmentation.
5.  **Event Loop Lag**: Node.js process health.
