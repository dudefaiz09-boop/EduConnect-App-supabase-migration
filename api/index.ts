// Vercel serverless entrypoint.
// Import the Express app source directly.
// Do not import apps/functions/src/index.ts because that file starts app.listen() for local server usage.
// This avoids serverless crashes caused by stale or missing apps/functions/dist/app.js.
// Keep the .ts extension explicit so Vercel's TypeScript function loader resolves the source file.
import app from '../apps/functions/src/app.ts';

export default app;
