import app, { connectDB } from "../server/app.js";

export const config = {
  api: {
    bodyParser: false
  }
};

// vercel.json rewrites every /api/* request here as /api/index?path=<rest>.
// Restore the original path so Express routing sees /api/<rest>.
const restorePath = (req) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/index" || url.pathname === "/api/index/" || url.pathname === "/api") {
    const rest = url.searchParams.get("path");
    if (rest !== null) {
      url.searchParams.delete("path");
      url.pathname = `/api/${rest.replace(/^\/+/, "")}`;
      req.url = url.pathname + url.search;
    }
  }
};

export default async function handler(req, res) {
  restorePath(req);
  await connectDB();
  return app(req, res);
}
