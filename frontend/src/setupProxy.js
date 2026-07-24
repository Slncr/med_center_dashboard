const { createProxyMiddleware } = require("http-proxy-middleware");

function parseIpRoomMap(raw) {
  const result = {};
  if (!raw) return result;
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed || !trimmed.includes("=")) continue;
    const [ip, roomId] = trimmed.split("=", 2);
    if (ip && roomId) {
      result[ip.trim()] = roomId.trim();
    }
  }
  return result;
}

function normalizeIp(ip) {
  if (!ip) return "";
  const value = String(ip).trim();
  return value.startsWith("::ffff:") ? value.slice(7) : value;
}

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) {
    return normalizeIp(xff.split(",")[0]);
  }
  const xRealIp = req.headers["x-real-ip"];
  if (xRealIp) {
    return normalizeIp(xRealIp);
  }
  return normalizeIp(req.socket?.remoteAddress || "");
}

const ipRoomMap = parseIpRoomMap(
  process.env.ROOM_DISPLAY_IP_ROOM_MAP || "192.168.0.44=4",
);

module.exports = function (app) {
  // Монитор без ?room= → редирект по IP до загрузки SPA
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }

    const path = (req.path || "").replace(/\/$/, "") || "/";
    if (path !== "/room") {
      next();
      return;
    }

    const url = new URL(req.originalUrl || req.url, "http://localhost");
    const hasRoom = url.searchParams.has("room");
    const hasMonitor =
      url.searchParams.has("monitorId") || url.searchParams.has("monitor_id");

    if (!hasRoom && !hasMonitor) {
      const clientIp = getClientIp(req);
      const roomId = ipRoomMap[clientIp];
      if (roomId) {
        res.redirect(302, `/room?room=${roomId}`);
        return;
      }
    }

    next();
  });

  app.use(
    "/api",
    createProxyMiddleware({
      target: process.env.API_PROXY_TARGET || "http://localhost:8000",
      changeOrigin: true,
      ws: true,
      // Без onError необработанный ECONNRESET роняет весь CRA-процесс
      onError: (err, _req, res) => {
        console.warn("[api-proxy]", err.code || err.message);
        if (res && typeof res.writeHead === "function" && !res.headersSent) {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ detail: "API unavailable" }));
        }
      },
      onProxyReq: (proxyReq, req) => {
        const clientIp = getClientIp(req);
        if (clientIp) {
          proxyReq.setHeader("X-Real-IP", clientIp);
          proxyReq.setHeader("X-Forwarded-For", clientIp);
        }
        proxyReq.on("error", (err) => {
          console.warn("[api-proxy-req]", err.code || err.message);
        });
      },
      onProxyRes: (proxyRes) => {
        proxyRes.on("error", (err) => {
          console.warn("[api-proxy-res]", err.code || err.message);
        });
      },
    }),
  );
};
