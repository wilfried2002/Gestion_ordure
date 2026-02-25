/**
 * Retourne un filtre MongoDB basé sur le rôle de l'utilisateur connecté.
 *
 * - ADMIN   → { createdBy: req.user.id }  (chaque admin voit seulement ses propres ressources)
 * - Autres  → {}                           (accès lecture sur les ressources de référence)
 */
module.exports = function adminScope(req) {
  if (req.user.role === 'ADMIN') return { createdBy: req.user.id };
  return {};
};
