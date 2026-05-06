/**
 * Cache en mémoire (Map + TTL).
 * Utilisé sur les endpoints coûteux en calcul (stats, performances).
 * La clé inclut l'userId pour ne pas mélanger les données de plusieurs admins.
 */

const store = new Map(); // clé → { data, expiresAt }

/**
 * Crée un middleware de cache GET avec un TTL configurable.
 * @param {number} ttlMs  Durée de vie en millisecondes (défaut : 5 min)
 */
function cache(ttlMs = 5 * 60 * 1000) {
  return (req, res, next) => {
    // Cache uniquement les requêtes GET authentifiées
    if (req.method !== 'GET' || !req.user) return next();

    const key = `${req.user.id}:${req.originalUrl}`;
    const hit  = store.get(key);

    if (hit && hit.expiresAt > Date.now()) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(hit.data);
    }

    // Intercepter res.json pour stocker la réponse
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200) {
        store.set(key, { data: body, expiresAt: Date.now() + ttlMs });
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Invalide toutes les entrées en cache dont la clé commence par le préfixe donné.
 * Appeler après une mutation (ex : updateConfig).
 * @param {string} userId
 * @param {string} prefix   ex : '/api/performances'
 */
function invalidate(userId, prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(`${userId}:`) && key.includes(prefix)) {
      store.delete(key);
    }
  }
}

module.exports = { cache, invalidate };
