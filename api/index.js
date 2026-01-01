import app, { connectDB } from "../server/app.js";

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  await connectDB();
  return app(req, res);
}
