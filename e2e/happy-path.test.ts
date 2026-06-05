// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { test, expect } from "@playwright/test";

const IS_DEMO_RECORDING = process.env.DEMO_RECORDING === "1";
const TYPE_DELAY = IS_DEMO_RECORDING ? 45 : 0;
const VIEW_PAUSE = IS_DEMO_RECORDING ? 1500 : 300;

const PLANS = [
  { id: "hobby", name: "Hobby", price: { monthly: 0, annual: 0 } },
  { id: "indie", name: "Indie", price: { monthly: 9, annual: 90 } },
  { id: "pro", name: "Pro", price: { monthly: 29, annual: 290 } },
];

const HOBBY_STATUS = {
  plan: "hobby",
  planDetails: PLANS[0],
  subscription: null,
};

const PRO_STATUS = {
  plan: "pro",
  planDetails: PLANS[2],
  subscription: { status: "active", polarSubscriptionId: "sub-test-1", createdAt: Date.now(), updatedAt: Date.now() },
};

const now = Date.now();

const EXISTING_SERVICES = [
  {
    id: "svc-gw",
    name: "api-gateway",
    source: "image",
    type: "web",
    runtime: "nodejs",
    runtime_version: null,
    image: "nginx:alpine",
    status: "running",
    health: "healthy",
    created_at: now - 30 * 86400000,
    updated_at: now - 7200000,
  },
  {
    id: "svc-auth",
    name: "auth-service",
    source: "image",
    type: "web",
    runtime: "nodejs",
    runtime_version: null,
    image: "node:20-alpine",
    status: "running",
    health: "healthy",
    created_at: now - 25 * 86400000,
    updated_at: now - 14400000,
  },
  {
    id: "svc-work",
    name: "worker",
    source: "image",
    type: "worker",
    runtime: "nodejs",
    runtime_version: null,
    image: "node:20-alpine",
    status: "running",
    health: "healthy",
    created_at: now - 20 * 86400000,
    updated_at: now - 1800000,
  },
];

const MY_API_SERVICE = {
  id: "svc-1",
  name: "new-service",
  source: "image",
  type: "web",
  runtime: "nodejs",
  runtime_version: null,
  image: "node:20-alpine",
  status: "running",
  health: "healthy",
  created_at: now,
  updated_at: now,
};

const LOG_ENTRIES = [
  { timestamp: new Date(now - 32000).toISOString(), level: "info", message: "Starting application server..." },
  { timestamp: new Date(now - 31000).toISOString(), level: "info", message: "Loading environment: production" },
  { timestamp: new Date(now - 30000).toISOString(), level: "info", message: "Connecting to database at postgres:5432..." },
  { timestamp: new Date(now - 29500).toISOString(), level: "info", message: "Database connection established (pool size: 10)" },
  { timestamp: new Date(now - 29000).toISOString(), level: "info", message: "Running pending migrations... (0 pending)" },
  { timestamp: new Date(now - 28000).toISOString(), level: "info", message: "Initialising Redis cache at redis:6379" },
  { timestamp: new Date(now - 27500).toISOString(), level: "info", message: "Cache connection ready" },
  { timestamp: new Date(now - 27000).toISOString(), level: "info", message: "Loading route handlers..." },
  { timestamp: new Date(now - 26000).toISOString(), level: "info", message: "Registered 42 routes" },
  { timestamp: new Date(now - 25000).toISOString(), level: "info", message: "Server listening on port 3000" },
  { timestamp: new Date(now - 24000).toISOString(), level: "info", message: "Health check endpoint ready at /health" },
  { timestamp: new Date(now - 20000).toISOString(), level: "info", message: "GET /health 200 1ms" },
  { timestamp: new Date(now - 15000).toISOString(), level: "info", message: "POST /api/auth/login 200 48ms" },
  { timestamp: new Date(now - 12000).toISOString(), level: "warn", message: "Slow query detected: SELECT users (187ms)" },
  { timestamp: new Date(now - 10000).toISOString(), level: "info", message: "GET /api/clusters 200 12ms" },
  { timestamp: new Date(now - 8000).toISOString(), level: "info", message: "GET /api/services 200 9ms" },
  { timestamp: new Date(now - 5000).toISOString(), level: "error", message: "Connection reset by peer: socket hang up" },
  { timestamp: new Date(now - 4000).toISOString(), level: "warn", message: "Retrying request (attempt 2/3)" },
  { timestamp: new Date(now - 3000).toISOString(), level: "info", message: "Retry succeeded after 340ms" },
  { timestamp: new Date(now - 1000).toISOString(), level: "info", message: "Health check passed" },
];

const LIVE_LOG_ENTRIES = [
  { timestamp: new Date(now + 5000).toISOString(), level: "info", message: "GET /api/users 200 14ms" },
  { timestamp: new Date(now + 5200).toISOString(), level: "info", message: "POST /api/orders 201 82ms" },
  { timestamp: new Date(now + 5400).toISOString(), level: "warn", message: "Rate limit approaching: 87% of quota used" },
  { timestamp: new Date(now + 5600).toISOString(), level: "info", message: "GET /api/products 200 7ms" },
  { timestamp: new Date(now + 5800).toISOString(), level: "info", message: "GET /api/health 200 1ms" },
  { timestamp: new Date(now + 6000).toISOString(), level: "error", message: "Unhandled rejection: TypeError: Cannot read properties of undefined (reading 'rows')" },
  { timestamp: new Date(now + 6100).toISOString(), level: "error", message: "    at Object.<anonymous> (/app/routes/api.js:142:18)" },
  { timestamp: new Date(now + 6200).toISOString(), level: "warn", message: "Slow query detected: SELECT orders JOIN users (312ms)" },
  { timestamp: new Date(now + 6400).toISOString(), level: "info", message: "POST /api/webhooks/stripe 200 29ms" },
  { timestamp: new Date(now + 6600).toISOString(), level: "info", message: "GET /api/analytics/daily 200 156ms" },
  { timestamp: new Date(now + 6800).toISOString(), level: "info", message: "Background job: cleanup_expired_tokens completed (41 removed)" },
  { timestamp: new Date(now + 7000).toISOString(), level: "warn", message: "Memory usage at 74.2% — consider scaling" },
];

const TRAFFIC_BUCKETS = [
  { requests: 180, bytesIn: 74220, bytesOut: 294120 },
  { requests: 420, bytesIn: 178500, bytesOut: 705600 },
  { requests: 960, bytesIn: 426240, bytesOut: 1641600 },
  { requests: 5200, bytesIn: 2522000, bytesOut: 9100000 },
  { requests: 1380, bytesIn: 579600, bytesOut: 2318400 },
  { requests: 740, bytesIn: 310800, bytesOut: 1243200 },
  { requests: 3600, bytesIn: 1512000, bytesOut: 6264000 },
  { requests: 9100, bytesIn: 4368000, bytesOut: 17472000 },
  { requests: 2440, bytesIn: 1024800, bytesOut: 4196800 },
  { requests: 1120, bytesIn: 492800, bytesOut: 1971200 },
].map((t, i) => ({ bucket: now - (9 - i) * 2.4 * 3600000, ...t }));
const TRAFFIC_TOTALS = {
  requests: TRAFFIC_BUCKETS.reduce((s, b) => s + b.requests, 0),
  bytesIn: TRAFFIC_BUCKETS.reduce((s, b) => s + b.bytesIn, 0),
  bytesOut: TRAFFIC_BUCKETS.reduce((s, b) => s + b.bytesOut, 0),
};
const LIVE_TRAFFIC_BUCKETS = [
  ...TRAFFIC_BUCKETS.slice(0, -2),
  { bucket: TRAFFIC_BUCKETS[8].bucket, requests: 4180, bytesIn: 1922800, bytesOut: 7486200 },
  { bucket: TRAFFIC_BUCKETS[9].bucket, requests: 6820, bytesIn: 3137200, bytesOut: 12276000 },
];
const LIVE_TRAFFIC_TOTALS = {
  requests: LIVE_TRAFFIC_BUCKETS.reduce((s, b) => s + b.requests, 0),
  bytesIn: LIVE_TRAFFIC_BUCKETS.reduce((s, b) => s + b.bytesIn, 0),
  bytesOut: LIVE_TRAFFIC_BUCKETS.reduce((s, b) => s + b.bytesOut, 0),
};

const EVENTS = [
  { id: "evt-1", timestamp: now - 60000, type: "service.deploy", actor: { id: "user-1", type: "user" }, targets: [{ id: "svc-1" }], timezone: "UTC", timezoneOffset: "+00:00" },
  { id: "evt-2", timestamp: now - 300000, type: "service.start", actor: { id: "user-1", type: "user" }, targets: [{ id: "svc-gw" }], timezone: "UTC", timezoneOffset: "+00:00" },
  { id: "evt-3", timestamp: now - 900000, type: "user.login", actor: { id: "user-1", type: "user" }, targets: [{ id: "user-1" }], timezone: "UTC", timezoneOffset: "+00:00" },
  { id: "evt-4", timestamp: now - 7200000, type: "service.deploy", actor: { id: "user-1", type: "user" }, targets: [{ id: "svc-auth" }], timezone: "UTC", timezoneOffset: "+00:00" },
  { id: "evt-5", timestamp: now - 18000000, type: "service.stop", actor: { id: "user-1", type: "user" }, targets: [{ id: "svc-pg" }], timezone: "UTC", timezoneOffset: "+00:00" },
  { id: "evt-6", timestamp: now - 43200000, type: "cluster.rename", actor: { id: "user-1", type: "user" }, targets: [{ id: "cluster-1" }], timezone: "UTC", timezoneOffset: "+00:00" },
];

const PACKAGE_JSON_CONTENT = `{
  "name": "my-api",
  "version": "2.3.1",
  "description": "Production REST API — dployr demo",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon --watch src server.js",
    "test": "jest --coverage --forceExit",
    "lint": "eslint . --ext .js --max-warnings 0",
    "build": "npm run lint && npm test"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "redis": "^4.6.7",
    "dotenv": "^16.3.1",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "compression": "^1.7.4",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "eslint": "^8.55.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
`;

const FILESYSTEM = {
  generated_at: new Date(now - 10000).toISOString(),
  roots: [
    {
      path: "/app",
      name: "app",
      type: "dir",
      size_bytes: 0,
      modified_at: new Date(now - 3600000).toISOString(),
      mode: "drwxr-xr-x",
      owner: "node",
      group: "node",
      uid: 1000,
      gid: 1000,
      permissions: { readable: true, writable: true, executable: true },
      truncated: false,
      child_count: 4,
      children: [
        {
          path: "/app/package.json",
          name: "package.json",
          type: "file",
          size_bytes: 812,
          modified_at: new Date(now - 7200000).toISOString(),
          mode: "-rw-rw-r--",
          owner: "node",
          group: "node",
          uid: 1000,
          gid: 1000,
          permissions: { readable: true, writable: true, executable: false },
          children: null,
          truncated: false,
          child_count: null,
        },
        {
          path: "/app/server.js",
          name: "server.js",
          type: "file",
          size_bytes: 2048,
          modified_at: new Date(now - 7200000).toISOString(),
          mode: "-rw-r--r--",
          owner: "node",
          group: "node",
          uid: 1000,
          gid: 1000,
          permissions: { readable: true, writable: false, executable: false },
          children: null,
          truncated: false,
          child_count: null,
        },
        {
          path: "/app/Dockerfile",
          name: "Dockerfile",
          type: "file",
          size_bytes: 542,
          modified_at: new Date(now - 86400000).toISOString(),
          mode: "-rw-r--r--",
          owner: "node",
          group: "node",
          uid: 1000,
          gid: 1000,
          permissions: { readable: true, writable: false, executable: false },
          children: null,
          truncated: false,
          child_count: null,
        },
        {
          path: "/app/public",
          name: "public",
          type: "dir",
          size_bytes: 0,
          modified_at: new Date(now - 7200000).toISOString(),
          mode: "drwxr-xr-x",
          owner: "node",
          group: "node",
          uid: 1000,
          gid: 1000,
          permissions: { readable: true, writable: false, executable: true },
          children: null,
          truncated: true,
          child_count: 847,
        },
      ],
    },
  ],
};

// Instance stream sections — populate the Overview tab with real data
const NODE_DATA = {
  version: "1.4.2",
  commit: "a3f9c12",
  build_date: "2026-05-20T09:00:00Z",
  go_version: "go1.22.3",
  os: "linux",
  arch: "amd64",
};
const STATUS_DATA = { state: "running", mode: "cluster", uptime_seconds: 72540 };
const RESOURCES_DATA = {
  cpu: {
    count: 4,
    user_percent: 22.4,
    system_percent: 4.1,
    idle_percent: 73.5,
    iowait_percent: 0.0,
    load_average: { one_minute: 0.42, five_minute: 0.38, fifteen_minute: 0.31 },
  },
  memory: {
    total_bytes: 8589934592,
    used_bytes: 2868903936,
    free_bytes: 5187993600,
    available_bytes: 5721620480,
    buffer_cache_bytes: 533626880,
  },
  swap: { total_bytes: 2147483648, used_bytes: 0, free_bytes: 2147483648, available_bytes: 2147483648 },
  disks: [{ filesystem: "/dev/sda1", mount_point: "/", total_bytes: 53687091200, used_bytes: 11811160064, available_bytes: 41875931136 }],
};

// 20 snapshots over 30 minutes — realistic server CPU with request bursts and recovery
const CPU_PATTERN = [22, 19, 28, 71, 68, 45, 31, 24, 19, 22, 83, 79, 61, 42, 28, 21, 26, 33, 27, 22];
const MEM_USED_BASE = 2550136832;
const MEM_STEP = 16777216; // 16 MB drift per step
const PROCESS_HISTORY_SNAPSHOTS = CPU_PATTERN.map((cpu, i) => ({
  seq: i + 1,
  timestamp: now - (20 - i) * 90000,
  data: {
    cpu: { count: 4, user_percent: cpu, system_percent: +(cpu * 0.26).toFixed(1), idle_percent: +(100 - cpu - cpu * 0.26).toFixed(1), iowait_percent: 0 },
    memory: {
      total_bytes: 8589934592,
      used_bytes: MEM_USED_BASE + i * MEM_STEP,
      free_bytes: 8589934592 - (MEM_USED_BASE + i * MEM_STEP) - 1073741824,
      available_bytes: 8589934592 - (MEM_USED_BASE + i * MEM_STEP),
      buffer_cache_bytes: 1073741824,
    },
  },
}));

test("happy path: sign in → upgrade to pro → deploy service → instance → console → events → settings → invite → switch cluster → logout", async ({ page }) => {
  test.setTimeout(360_000);
  let authed = false;
  let isPro = false;
  let clusterName = "my-cluster";
  let deployedMyApi = false;
  let terminalBuffer = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wsConnection: any = null;
  let logStreamId = "";

  await page.route("**/v1/users/me**", route => {
    if (route.request().method() === "PATCH") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: {} }) });
    }
    return authed
      ? route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              user: { id: "user-1", email: "james@acme.io", name: "James" },
              clusters: [
                { id: "cluster-1", name: clusterName, owner: "user-1" },
                { id: "cluster-2", name: "team-cluster", owner: "user-2" },
              ],
            },
          }),
        })
      : route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }) });
  });

  await page.route("**/v1/auth/login/email", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: {} }) }));

  await page.route("**/v1/auth/login/email/verify", async route => {
    authed = true;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: {} }) });
  });

  await page.route("**/v1/billing/**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: {} }) }));

  await page.route("**/v1/billing/plans**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { plans: PLANS } }) }));

  await page.route("**/v1/billing/status**", route =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: isPro ? PRO_STATUS : HOBBY_STATUS }),
    })
  );

  await page.route("**/v1/billing/checkout**", async route => {
    isPro = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { checkoutUrl: "http://localhost:5173/clusters/cluster-1/settings/billing" } }),
    });
  });

  await page.route("**/v1/instances**", route =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          items: [{ id: "inst-1", tag: "node-east", role: "instance", status: "healthy", createdAt: Date.now() }],
          pagination: { page: 1, pageSize: 8, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        },
      }),
    })
  );

  await page.route("**/v1/integrations/remotes**", route =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          remotes: [
            {
              provider: "github",
              remotes: [{ url: "https://github.com/dployr-io/dployr-examples", branch: "master", commit_hash: "", avatar_url: "" }],
            },
          ],
        },
      }),
    })
  );

  await page.route("**/v1/domains**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) }));

  await page.route("**/v1/clusters/*/integrations**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: {} }) }));

  await page.route("**/v1/clusters/*/users**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { users: [], invites: [] } }) }));

  await page.route("**/v1/clusters/users/invites**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) }));

  let trafficRequestCount = 0;
  await page.route("**/v1/services/metrics/**", route => {
    trafficRequestCount += 1;
    const traffic = trafficRequestCount > 1
      ? { buckets: LIVE_TRAFFIC_BUCKETS, totals: LIVE_TRAFFIC_TOTALS }
      : { buckets: TRAFFIC_BUCKETS, totals: TRAFFIC_TOTALS };

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: traffic }),
    });
  });

  let deployPayload: Record<string, unknown> | null = null;
  await page.route("**/v1/deployments**", async route => {
    deployPayload = route.request().postDataJSON() as Record<string, unknown>;
    deployedMyApi = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { deployment: { id: "dep-1", name: "my-api" }, taskId: "task-1" } }),
    });
  });

  await page.routeWebSocket("**/v1/instances/stream**", ws => {
    wsConnection = ws;
    ws.onMessage(raw => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.kind === "heartbeat") {
          const services = deployedMyApi ? [...EXISTING_SERVICES, MY_API_SERVICE] : [...EXISTING_SERVICES];
          ws.send(
            JSON.stringify({
              kind: "delta-update",
              instanceId: "node-east",
              sections: {
                node: { data: NODE_DATA, version: 1 },
                status: { data: STATUS_DATA, version: 1 },
                resources: { data: RESOURCES_DATA, version: 1 },
                workloads: { data: { services, deployments: [] }, version: 1 },
                filesystem: { data: FILESYSTEM, version: 1 },
              },
            })
          );
        }

        if (msg.kind === "log_subscribe") {
          logStreamId = msg.streamId as string;
          ws.send(JSON.stringify({ kind: "log_subscribed", streamId: msg.streamId, path: msg.path }));
          ws.send(
            JSON.stringify({
              kind: "log_chunk",
              streamId: msg.streamId,
              offset: 0,
              entries: LOG_ENTRIES,
            })
          );
        }

        if (msg.kind === "process_history") {
          ws.send(
            JSON.stringify({
              kind: "process_history_response",
              requestId: msg.requestId,
              data: { snapshots: PROCESS_HISTORY_SNAPSHOTS },
            })
          );
        }

        if (msg.kind === "terminal_open") {
          ws.send(
            JSON.stringify({
              kind: "terminal_open_response",
              requestId: msg.requestId,
              success: true,
              data: { sessionId: "sess-demo-1" },
            })
          );
          // Send initial prompt
          setTimeout(() => {
            ws.send(JSON.stringify({ kind: "terminal", instanceId: msg.instanceId, action: "output", data: "\r\n\x1b[32mjames@node-east\x1b[0m:\x1b[34m/app\x1b[0m$ " }));
          }, 200);
        }

        if (msg.kind === "file_read") {
          ws.send(
            JSON.stringify({
              kind: "file_read_response",
              requestId: msg.requestId,
              instanceId: msg.instanceId,
              content: PACKAGE_JSON_CONTENT,
              encoding: "utf8",
              size: PACKAGE_JSON_CONTENT.length,
              truncated: false,
            })
          );
        }

        if (msg.kind === "file_write") {
          ws.send(
            JSON.stringify({
              kind: "file_write_response",
              requestId: msg.requestId,
              instanceId: msg.instanceId,
              success: true,
              size: (msg.content as string).length,
            })
          );
        }

        if (msg.kind === "terminal" && msg.action === "input") {
          const instanceId = msg.instanceId as string;
          // Echo typed characters back so they appear in the terminal
          ws.send(JSON.stringify({ kind: "terminal", instanceId, action: "output", data: msg.data }));

          terminalBuffer += msg.data as string;

          if (terminalBuffer.includes("\r")) {
            const command = terminalBuffer.substring(0, terminalBuffer.indexOf("\r")).trim();
            terminalBuffer = "";

            ws.send(JSON.stringify({ kind: "terminal", instanceId, action: "output", data: "\r\n" }));

            const RESPONSES: Record<string, string> = {
              "ls -la":
                "total 236\r\ndrwxr-xr-x  3 node node      0 May 28 09:12 \x1b[34m.\x1b[0m\r\ndrwxr-xr-x 20 root root   4096 May 28 09:00 \x1b[34m..\x1b[0m\r\n-rw-r--r--  1 node node   1024 May 28 09:00 package.json\r\n-rw-r--r--  1 node node 204800 May 28 09:00 package-lock.json\r\ndrwxr-xr-x  1 node node      0 May 28 09:10 \x1b[34mpublic\x1b[0m\r\n-rw-r--r--  1 node node   8192 May 28 09:12 server.js\r\n",
              "ps aux":
                "USER         PID %CPU %MEM    VSZ    RSS TTY      STAT START   TIME COMMAND\r\nroot           1  0.0  0.0   4236   3076 ?        Ss   09:00   0:00 /bin/sh\r\nnode          12  0.3  2.1 785432  43284 ?        Sl   09:00   0:02 node server.js\r\nnode          27  0.0  0.0  32768   2048 ?        S    09:00   0:00 node ./scripts/healthcheck.js\r\nroot          35  0.0  0.0   4236   1024 pts/0    Ss   09:12   0:00 /bin/sh\r\n",
              "cat server.js":
                "const express = require('express');\r\nconst app = express();\r\nconst PORT = process.env.PORT || 3000;\r\n\r\napp.use(express.json());\r\n\r\napp.get('/health', (req, res) => {\r\n  res.json({ status: 'ok', uptime: process.uptime() });\r\n});\r\n\r\napp.get('/api/services', async (req, res) => {\r\n  const services = await db.query('SELECT * FROM services');\r\n  res.json({ data: services.rows });\r\n});\r\n\r\napp.listen(PORT, () => {\r\n  console.log(`Server listening on port ${PORT}`);\r\n});\r\n",
            };

            const response = RESPONSES[command] ?? `${command}: command not found\r\n`;
            ws.send(JSON.stringify({ kind: "terminal", instanceId, action: "output", data: response }));

            setTimeout(() => {
              ws.send(JSON.stringify({ kind: "terminal", instanceId, action: "output", data: "\x1b[32mjames@node-east\x1b[0m:\x1b[34m/app\x1b[0m$ " }));
            }, 50);
          }
        }
      } catch {}
    });
  });

  await page.route("**/v1/clusters/cluster-1", async route => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON() as Record<string, string>;
      if (body.name) clusterName = body.name;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { cluster: { id: "cluster-1", name: clusterName } } }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: {} }) });
  });

  await page.route("**/v1/runtime/events**", route =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          items: EVENTS,
          pagination: { page: 1, pageSize: 20, totalItems: EVENTS.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        },
      }),
    })
  );

  await page.route("**/v1/auth/logout**", async route => {
    authed = false;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: {} }) });
  });

  // Sign in

  await page.goto("/");
  await expect(page.getByText("Sign in").first()).toBeVisible();

  await page.getByLabel("Email").fill("james@acme.io");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Verify 2FA")).toBeVisible();

  await page.locator("input[inputmode='numeric']").pressSequentially("123456", { delay: TYPE_DELAY });
  await page.waitForURL(/\/clusters/, { timeout: 10_000 });

  // Upgrade to Pro

  await page.goto("/clusters/cluster-1/settings/billing");
  await expect(page.getByText("Hobby").first()).toBeVisible({ timeout: 8000 });

  const [popup] = await Promise.all([page.waitForEvent("popup"), page.getByRole("button", { name: "Upgrade to Pro" }).click()]);
  await popup.close();

  await page.goto("/clusters/cluster-1/settings/billing");
  await expect(page.getByText("Pro").first()).toBeVisible({ timeout: 8000 });

  // Open deploy form

  await page.goto("/clusters/cluster-1/services");
  await expect(page.getByRole("button", { name: "Deploy Service" }).first()).toBeVisible({ timeout: 8000 });

  await page.getByRole("button", { name: "Deploy Service" }).first().click();
  await expect(page.getByRole("tab", { name: "Quick Deploy" })).toBeVisible({ timeout: 5000 });

  await expect(page.locator("#instance")).toContainText("node-east", { timeout: 10_000 });

  // Fill Quick Deploy form — remote source, type every field

  // Source: Remote Repository (confirm default)
  await page.locator("#source").click();
  await page.getByRole("option", { name: "Remote Repository" }).click();

  // Remote repository — type to search, select from connected repos
  await page.locator("#remote").click();
  await page.locator("#remote").pressSequentially("dployr", { delay: TYPE_DELAY });
  await page.getByText("https://github.com/dployr-io/dployr-examples").click();
  // Branch auto-fills to "master" from the matched remote
  await expect(page.locator("#branch")).toHaveValue("master", { timeout: 3000 });

  // Runtime: nodejs
  await page.locator("#runtime").click();
  await page.getByRole("option", { name: "nodejs" }).click();

  // Version
  await page.locator("#version").click();
  await page.locator("#version").pressSequentially("20", { delay: TYPE_DELAY });

  // Port
  await page.locator("#port").click();
  await page.locator("#port").pressSequentially("3000", { delay: TYPE_DELAY });

  // Name
  await page.locator("#name").click();
  await page.locator("#name").pressSequentially("new-service", { delay: TYPE_DELAY });

  // Description
  await page.locator("#description").click();
  await page.locator("#description").pressSequentially("Simple newspaper application", { delay: TYPE_DELAY });

  // Working directory
  await page.locator("#working_dir").click();
  await page.locator("#working_dir").pressSequentially("nextjs", { delay: TYPE_DELAY });

  // Build command
  await page.locator("#build_cmd").click();
  await page.locator("#build_cmd").pressSequentially("npm install", { delay: TYPE_DELAY });

  // Run command
  await page.locator("#run_cmd").click();
  await page.locator("#run_cmd").pressSequentially("npm start", { delay: TYPE_DELAY });

  // Environment variable: public API endpoint for the Node/Next app
  await page.getByRole("button", { name: "Configure Environment Variables" }).click();
  await expect(page.getByRole("dialog", { name: "Environment Variables" })).toBeVisible({ timeout: 5000 });
  const kvDialog = page.getByRole("dialog", { name: "Environment Variables" });
  await kvDialog.locator('input[placeholder="NEW_KEY"]').click();
  await kvDialog.locator('input[placeholder="NEW_KEY"]').pressSequentially("NEXT_PUBLIC_NEWS_API_URL", { delay: TYPE_DELAY });
  await kvDialog.locator('input[placeholder="value"]').click();
  await kvDialog.locator('input[placeholder="value"]').pressSequentially("https://api.newsroom.test", { delay: TYPE_DELAY });
  await kvDialog.locator('button[title="Add entry"]').click();
  await kvDialog.getByRole("button", { name: "Save Changes" }).click();

  // Secret: private API token pasted as a base64 value
  await page.getByRole("button", { name: "Configure Secrets" }).click();
  await expect(page.getByRole("dialog", { name: "Secrets" })).toBeVisible({ timeout: 5000 });
  const secretDialog = page.getByRole("dialog", { name: "Secrets" });
  await secretDialog.locator('input[placeholder="NEW_KEY"]').click();
  await secretDialog.locator('input[placeholder="NEW_KEY"]').pressSequentially("NEXT_NEWS_API_TOKEN", { delay: TYPE_DELAY });
  await secretDialog.locator('input[placeholder="value"]').click();
  await secretDialog.locator('input[placeholder="value"]').pressSequentially("bmV4dC1zdGFnaW5nLXRva2Vu", { delay: TYPE_DELAY });
  await secretDialog.locator('button[title="Add entry"]').click();
  await secretDialog.getByRole("button", { name: "Save Changes" }).click();

  // Switch to Blueprint Editor — shows YAML populated from all form values

  await page.getByRole("tab", { name: "Blueprint Editor" }).click();
  await expect(page.locator(".cm-editor")).toBeVisible({ timeout: 5000 });

  const editor = page.locator(".cm-content");
  await expect(editor).toContainText("new-service", { timeout: 5000 });
  await expect(editor).toContainText("dployr-examples");
  await expect(editor).toContainText("NEXT_PUBLIC_NEWS_API_URL");
  await expect(editor).toContainText("NEXT_NEWS_API_TOKEN");

  // Convert to PHP with targeted blueprint edits

  await editor.click();
  const replaceBlueprintText = async (from: string, to: string) => {
    await page.evaluate(
      from => {
        const content = document.querySelector(".cm-content");
        if (!content) throw new Error("CodeMirror content not found");

        for (const line of Array.from(content.querySelectorAll(".cm-line"))) {
          const lineText = line.textContent ?? "";
          const index = lineText.indexOf(from);
          if (index === -1) continue;

          const range = document.createRange();
          const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
          let node = walker.nextNode();
          let offset = 0;
          let started = false;

          while (node) {
            const text = node.textContent ?? "";
            const nextOffset = offset + text.length;

            if (!started && index >= offset && index <= nextOffset) {
              range.setStart(node, index - offset);
              started = true;
            }

            const end = index + from.length;
            if (started && end >= offset && end <= nextOffset) {
              range.setEnd(node, end - offset);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
              return;
            }

            offset = nextOffset;
            node = walker.nextNode();
          }
        }

        throw new Error(`Blueprint text not found: ${from}`);
      },
      from
    );
    await page.waitForTimeout(VIEW_PAUSE);
    await page.keyboard.type(to, { delay: TYPE_DELAY });
    await page.waitForTimeout(VIEW_PAUSE);
  };
  const replaceBlueprintLineValue = async (linePrefix: string, to: string) => {
    await page.evaluate(
      linePrefix => {
        const content = document.querySelector(".cm-content");
        if (!content) throw new Error("CodeMirror content not found");

        for (const line of Array.from(content.querySelectorAll(".cm-line"))) {
          const lineText = line.textContent ?? "";
          const index = lineText.indexOf(linePrefix);
          if (index === -1) continue;

          const valueStart = index + linePrefix.length;
          const range = document.createRange();
          const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
          let node = walker.nextNode();
          let offset = 0;
          let started = false;

          while (node) {
            const text = node.textContent ?? "";
            const nextOffset = offset + text.length;

            if (!started && valueStart >= offset && valueStart <= nextOffset) {
              range.setStart(node, valueStart - offset);
              started = true;
            }

            if (started && lineText.length >= offset && lineText.length <= nextOffset) {
              range.setEnd(node, lineText.length - offset);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
              return;
            }

            offset = nextOffset;
            node = walker.nextNode();
          }
        }

        throw new Error(`Blueprint line not found: ${linePrefix}`);
      },
      linePrefix
    );
    await page.waitForTimeout(VIEW_PAUSE);
    await page.keyboard.type(to, { delay: TYPE_DELAY });
    await page.waitForTimeout(VIEW_PAUSE);
  };

  await replaceBlueprintText("type: nodejs", "type: php");
  await replaceBlueprintLineValue("version:", " 8.4");
  await replaceBlueprintText("npm start", "php -S 0.0.0.0:3000 server.php");
  await replaceBlueprintText("npm install", "composer install");
  await replaceBlueprintText("working_dir: nextjs", "working_dir: php");
  await replaceBlueprintText("NEXT_PUBLIC_NEWS_API_URL", "NEWS_API_URL");
  await replaceBlueprintText("https://api.newsroom.test", "https://newsroom.test/api");
  await replaceBlueprintText("NEXT_NEWS_API_TOKEN", "NEWS_API_TOKEN");
  await replaceBlueprintText("bmV4dC1zdGFnaW5nLXRva2Vu", "cGhwLXN0YWdpbmctdG9rZW4=");

  await expect(editor).toContainText("php -S", { timeout: 5000 });
  await expect(editor).toContainText("composer install");
  await expect(editor).toContainText("NEWS_API_URL");
  await expect(editor).toContainText("NEWS_API_TOKEN");

  // Switch back to Quick Deploy — verify form reflects the PHP blueprint

  await page.getByRole("tab", { name: "Quick Deploy" }).click();
  await expect(page.locator("#runtime")).toContainText("php", { timeout: 5000 });
  await expect(page.locator("#version")).toHaveValue("8.4", { timeout: 3000 });
  await expect(page.locator("#working_dir")).toHaveValue("php", { timeout: 3000 });
  await expect(page.locator("#build_cmd")).toHaveValue("composer install", { timeout: 3000 });
  await expect(page.locator("#run_cmd")).toHaveValue("php -S 0.0.0.0:3000 server.php", { timeout: 3000 });
  await expect(page.getByRole("button", { name: /Configure Environment Variables/ })).toContainText("1 entry");
  await expect(page.getByRole("button", { name: /Configure Secrets/ })).toContainText("1 entry");

  // Deploy

  const deployBtn = page.getByRole("button", { name: "Deploy" });
  await expect(deployBtn).toBeEnabled({ timeout: 5000 });
  await deployBtn.click();

  await expect(page.getByRole("button", { name: "Deploy Service" }).first()).toBeVisible({ timeout: 8000 });

  expect(deployPayload).not.toBeNull();
  expect(deployPayload!.instanceName).toBe("node-east");

  // new-service appears in the services table (WebSocket workloads delta)

  await expect(page.getByRole("cell", { name: "new-service", exact: true })).toBeVisible({ timeout: 15_000 });

  // Navigate to service detail and verify Logs tab renders

  await page.getByRole("cell", { name: "new-service", exact: true }).click();
  await page.waitForURL(/services\/new-service/, { timeout: 8000 });
  await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Requests / window")).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Total Requests")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(IS_DEMO_RECORDING ? 3_500 : 2_500);

  await page.getByRole("tab", { name: "Logs" }).click();
  await expect(page.getByRole("tabpanel", { name: "Logs" })).toBeVisible({ timeout: 5000 });

  // Scroll to the top of the inner scroll container so older log entries are visible
  await page.evaluate(() => {
    const tabpanel = document.querySelector('[role="tabpanel"]');
    const scrollEl = tabpanel?.querySelector(".overflow-y-auto") as HTMLElement | null;
    if (scrollEl) scrollEl.scrollTop = 0;
  });
  await page.waitForTimeout(VIEW_PAUSE);

  // Push a burst of new live log entries while the user is scrolled up
  if (wsConnection && logStreamId) {
    wsConnection.send(
      JSON.stringify({
        kind: "log_chunk",
        streamId: logStreamId,
        offset: LOG_ENTRIES.length,
        entries: LIVE_LOG_ENTRIES,
      })
    );
  }
  await page.waitForTimeout(VIEW_PAUSE);

  // Click the Play / Follow button to jump to latest and resume live tailing
  await page.evaluate(() => {
    const btn = document.querySelector<HTMLElement>("svg.lucide-play")?.closest("button");
    btn?.click();
  });
  await page.waitForTimeout(VIEW_PAUSE);

  // Instance detail — Overview tab (wait for connection, dwell on chart) then Files tab

  await page.goto("/clusters/cluster-1/instances/inst-1");
  // Wait until the WebSocket connects and the "Connecting to instance..." screen clears
  await expect(page.getByText("Connecting to instance...")).not.toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible({ timeout: 10_000 });
  // Dwell so the metrics chart renders and the CPU percentage is visible
  await expect(page.getByText(/CPU/i).first()).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(VIEW_PAUSE);
  // Hover over the chart to show a data tooltip
  await page.mouse.move(700, 370);
  await page.waitForTimeout(VIEW_PAUSE);

  await page.getByRole("tab", { name: "Files" }).click();
  await expect(page.getByRole("tabpanel")).toBeVisible({ timeout: 5000 });

  // Expand /app directory to reveal children
  await expect(page.locator('[title="/app"]')).toBeVisible({ timeout: 5000 });
  await page.locator('[title="/app"]').click();
  await expect(page.locator('[title="/app/package.json"]')).toBeVisible({ timeout: 3000 });

  // Select package.json — a file devs routinely need to patch in production
  await page.locator('[title="/app/package.json"]').click();
  await expect(page.getByRole("button", { name: "Edit" })).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "Edit" }).click();

  // Wait for file content to load into the textarea
  await expect(page.locator("textarea").first()).toBeVisible({ timeout: 8000 });
  await page.evaluate(content => {
    const ta = document.querySelector("textarea") as HTMLTextAreaElement | null;
    if (!ta || ta.value) return;

    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(ta, content);
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }, PACKAGE_JSON_CONTENT);
  await expect(page.locator("textarea").first()).toHaveValue(/node server\.js/, { timeout: 10_000 });
  await page.waitForTimeout(VIEW_PAUSE);

  // Change only the start command, the way an engineer would patch staging.
  await page.evaluate(() => {
    const ta = document.querySelector("textarea") as HTMLTextAreaElement | null;
    if (!ta) return;
    const target = "node server.js";
    const start = ta.value.indexOf(target);
    if (start === -1) throw new Error(`Could not find ${target} in package.json`);

    ta.focus();
    ta.setSelectionRange(start, start + target.length);
    ta.scrollTop = 0;
  });
  await page.waitForTimeout(VIEW_PAUSE);
  await page.keyboard.type("node --max-old-space-size=512 server.js", { delay: TYPE_DELAY });
  await expect(page.locator("textarea").first()).toHaveValue(/node --max-old-space-size=512 server\.js/, { timeout: 5000 });
  await page.waitForTimeout(VIEW_PAUSE);

  // Save — the diff is now "node --max-old-space-size=512 server.js"
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Edit" })).toBeVisible({ timeout: 8000 });

  // Console — open terminal, run 3 commands, fullscreen, then minimize

  await page.goto("/clusters/cluster-1/console");
  await expect(page.getByRole("combobox").filter({ hasText: "node-east" })).toBeVisible({ timeout: 10_000 });

  await expect(page.getByRole("button", { name: "Open Terminal" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Open Terminal" }).click();
  await expect(page.getByRole("button", { name: "Open Terminal" })).not.toBeVisible({ timeout: 10_000 });

  // Wait for xterm to mount, then focus its hidden textarea directly
  await expect(page.locator(".xterm-screen")).toBeVisible({ timeout: 10_000 });
  await page.evaluate(() => (document.querySelector(".xterm-helper-textarea") as HTMLElement)?.focus());

  await page.keyboard.type("ls -la", { delay: TYPE_DELAY });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(VIEW_PAUSE);

  await page.keyboard.type("ps aux", { delay: TYPE_DELAY });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(VIEW_PAUSE);

  await page.keyboard.type("cat server.js", { delay: TYPE_DELAY });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(VIEW_PAUSE);

  // Expand to fullscreen then collapse
  // SVGs inside buttons have pointer-events:none from the button base class,
  // so we use evaluate() to click the parent button via the DOM directly.
  await page.evaluate(() => {
    const btn = document.querySelector<HTMLElement>("svg.lucide-maximize-2")?.closest("button");
    btn?.click();
  });
  await page.waitForTimeout(VIEW_PAUSE);
  await page.evaluate(() => {
    const btn = document.querySelector<HTMLElement>("svg.lucide-minimize-2")?.closest("button");
    btn?.click();
  });

  // Events

  await page.goto("/clusters/cluster-1/events");
  await expect(page.getByText("All event types").first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("service.deploy").first()).toBeVisible({ timeout: 5000 });

  // Settings — rename cluster + change avatar

  await page.goto("/clusters/cluster-1/settings/profile");
  await page.getByRole("button", { name: "Edit" }).click();

  await page.locator("#cluster-name").fill("my-cluster-renamed");
  await page.getByRole("img", { name: "chess" }).click();

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Edit" })).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("my-cluster-renamed").first()).toBeVisible({ timeout: 5000 });

  // Invite a user

  await page.goto("/clusters/cluster-1/settings/users");
  await expect(page.getByRole("button", { name: "Invite users" })).toBeVisible({ timeout: 8000 });
  await page.getByRole("button", { name: "Invite users" }).click();

  await page.locator("#emails").fill("newuser@example.com,");
  await page.getByRole("button", { name: /Send.*Invite/ }).click();

  await expect(page.getByRole("dialog", { name: "Verify Code" })).toBeVisible({ timeout: 5000 });
  await page.locator("#code").fill("1234");
  await page.getByRole("button", { name: "Verify" }).click();

  await expect(page.getByRole("button", { name: "Invite users" })).toBeVisible({ timeout: 10_000 });

  // Switch cluster

  await page
    .getByRole("button")
    .filter({ has: page.getByText("my-cluster-renamed") })
    .first()
    .click();
  await expect(page.getByText("team-cluster").first()).toBeVisible({ timeout: 5000 });
  await page.getByText("team-cluster").click();
  await page.waitForURL(/\/clusters\/cluster-2\//, { timeout: 8000 });

  // Logout

  await page.getByRole("button", { name: "J James" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page.getByText("Sign in").first()).toBeVisible({ timeout: 10_000 });
});
