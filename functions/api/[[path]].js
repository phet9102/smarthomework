// Cloudflare Pages Function: every request to /api/* is handled here.
// Cloudflare builds this automatically when the project is connected to Git.
import { handleApi } from '../../server/api.js';

export const onRequest = (context) => handleApi(context.request, context.env);
