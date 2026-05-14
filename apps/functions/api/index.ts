// Vercel API entrypoint when the Vercel project root is apps/functions.
// The build command compiles the Express app into dist before packaging.
import app from '../dist/index.js';

export default app;
