import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');
const indexHtml         = join(browserDistFolder, 'index.html');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Serve static files from /browser (JS, CSS, assets, etc.)
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Toutes les requêtes non-statiques sont traitées par le moteur Angular SSR.
 * Si Angular ne peut pas rendre la route (guard retourne false, route inconnue…)
 * on retombe sur le fallback SPA → on renvoie index.html.
 * Le navigateur reçoit l'app Angular et gère le routing côté client.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => {
      if (response) {
        writeResponseToNodeResponse(response, res);
      } else {
        // Filet de sécurité SPA : renvoie index.html pour toute route inconnue.
        // Le navigateur prend le relai et Angular router fait le reste.
        res.sendFile(indexHtml);
      }
    })
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
