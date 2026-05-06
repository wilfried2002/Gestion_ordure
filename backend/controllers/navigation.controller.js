/**
 * navigation.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Contrôleur pour la navigation GPS et l'optimisation d'itinéraires Dijkstra.
 *
 * Routes :
 *   POST /api/navigation/itineraire     — calcule l'itinéraire optimal
 *   POST /api/navigation/prochain-bac  — prochain bac à collecter (agent)
 *   POST /api/navigation/position      — mise à jour GPS du camion (agent)
 */
'use strict';

const Bac      = require('../models/Bac');
const Vehicule = require('../models/Vehicule');
const Collecte = require('../models/Collecte');
const Tournee  = require('../models/Tournee');

const {
  buildGraph,
  dijkstra,
  findNearestNode,
  optimizeMultiStop,
} = require('../services/dijkstra.service');
// buildGraph et dijkstra sont utilisés dans prochainBac (chemin vers le prochain bac).

const { AppError } = require('../middlewares/error.middleware');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers locaux
// ─────────────────────────────────────────────────────────────────────────────

/** Haversine en km (copie locale pour éviter l'import circulaire) */
function haversineCtrl(lat1, lon1, lat2, lon2) {
  const R = 6371, d2r = Math.PI / 180;
  const dLat = (lat2 - lat1) * d2r, dLon = (lon2 - lon1) * d2r;
  const a = Math.sin(dLat / 2) ** 2
          + Math.cos(lat1 * d2r) * Math.cos(lat2 * d2r) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Supprime les bacs dont les coordonnées sont aberrantes (outliers).
 * Algorithme : centroïde + distance médiane → seuil adaptatif.
 * Cas couverts : bac(0,0), bac sur un autre continent, saisie manuelle erronée.
 */
function removeOutliers(bacs) {
  if (bacs.length <= 2) return bacs;

  // Centroïde géographique
  const cLat = bacs.reduce((s, b) => s + b.latitude,  0) / bacs.length;
  const cLng = bacs.reduce((s, b) => s + b.longitude, 0) / bacs.length;

  // Distance de chaque bac au centroïde
  const dists = bacs.map(b => haversineCtrl(cLat, cLng, b.latitude, b.longitude));

  // Distance médiane
  const sorted  = [...dists].sort((a, b) => a - b);
  const median  = sorted[Math.floor(sorted.length / 2)];

  // Seuil adaptatif :
  //   • au moins 30 km  (couvre une grande ville comme Douala)
  //   • au plus 150 km  (évite les sauts inter-régionaux)
  //   • 10× la médiane  (élimine les points vraiment aberrants)
  const threshold = Math.min(Math.max(median * 10, 30), 150);

  const filtered = bacs.filter((_, i) => dists[i] <= threshold);

  // Garde-fou : si tout est filtré (données très dispersées), garder les 5 plus proches du centroïde
  if (filtered.length === 0) {
    return bacs
      .map((b, i) => ({ b, d: dists[i] }))
      .sort((a, x) => a.d - x.d)
      .slice(0, 5)
      .map(({ b }) => b);
  }

  return filtered;
}

/** Convertit un bac Mongoose en nœud de graphe { id, latitude, longitude } */
function bacToNode(bac) {
  return { id: bac._id.toString(), latitude: bac.latitude, longitude: bac.longitude };
}

// buildSegments supprimé : segments générés dans optimizeMultiStop (lignes droites GPS).
// Avantage : O(n) au lieu de O(n² log n), et la ligne s'arrête exactement au dernier bac.

// ─────────────────────────────────────────────────────────────────────────────
// exports.calculerItineraire
// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/navigation/itineraire
 *
 * Calcule l'itinéraire optimal (Dijkstra + nearest-neighbor multi-stops)
 * selon le critère demandé.
 *
 * @body {object} body
 * @body {object}  body.position   - { lat, lng } position actuelle du camion
 * @body {string}  [body.tourneeId] - filtrer sur les bacs d'une tournée
 * @body {string}  [body.zoneId]    - filtrer par zone
 * @body {number}  [body.niveauMin=0] - seuil minimum de remplissage (%)
 * @body {string}  [body.criterium='distance'] - 'distance' | 'temps' | 'priorite'
 */
exports.calculerItineraire = async (req, res, next) => {
  try {
    const {
      position,
      tourneeId,
      zoneId,
      niveauMin  = 0,
      criterium  = 'distance',
    } = req.body;

    if (!position?.lat || !position?.lng) {
      return next(new AppError('La position { lat, lng } est requise.', 400));
    }

    // ── 1. Récupérer les bacs ──────────────────────────────────────────────
    let bacs = [];

    if (tourneeId) {
      // Bacs liés aux points de collecte de la tournée
      const collectes = await Collecte.find({ tourneeId })
        .populate('quartierId')
        .lean();
      const bacIds = collectes.map(c => c.quartierId).filter(Boolean);

      // On charge les bacs de la zone de la tournée
      const tournee = await Tournee.findById(tourneeId).lean();
      const filter  = { createdBy: req.user.id };
      if (tournee?.zoneId) filter.zoneId = tournee.zoneId;
      bacs = await Bac.find(filter).populate('zoneId', 'nom').lean();
    } else {
      const filter = { createdBy: req.user.id };
      if (zoneId)  filter.zoneId = zoneId;
      bacs = await Bac.find(filter).populate('zoneId', 'nom').lean();
    }

    // ── Filtre 1 : coordonnées valides + niveau minimum ───────────────────
    bacs = bacs.filter(
      b => b.latitude  != null && b.longitude != null &&
           b.latitude  !== 0   && b.longitude !== 0   && // (0,0) = Gulf of Guinea = donnée invalide
           Math.abs(b.latitude)  <= 90  &&
           Math.abs(b.longitude) <= 180 &&
           (b.niveauRemplissage ?? 0) >= niveauMin,
    );

    if (!bacs.length) {
      return res.json({
        success: true,
        data: {
          orderedBacs: [], segments: [], totalDistanceKm: 0,
          totalTempsMin: 0, criterium, nbBacs: 0,
        },
      });
    }

    // ── Filtre 2 : suppression des outliers géographiques ────────────────
    // Calcul du centroïde, puis exclusion des bacs > seuil km du centroïde.
    // Évite les routes intercontinentales causées par des données de test erronées.
    bacs = removeOutliers(bacs);

    if (!bacs.length) {
      return res.json({
        success: true,
        data: { orderedBacs: [], segments: [], totalDistanceKm: 0, totalTempsMin: 0, criterium, nbBacs: 0 },
      });
    }

    // ── Filtre 3 : ancrage du startPoint dans le cluster ─────────────────
    // Si la position fournie est trop loin des bacs (GPS hors zone ou position par défaut
    // d'un autre pays), on utilise le centroïde comme point de départ.
    const cLat = bacs.reduce((s, b) => s + b.latitude,  0) / bacs.length;
    const cLng = bacs.reduce((s, b) => s + b.longitude, 0) / bacs.length;
    const distStart = haversineCtrl(position.lat, position.lng, cLat, cLng);
    const startPoint = distStart > 100
      ? { lat: cLat, lng: cLng }   // GPS incohérent → centroïde
      : { lat: position.lat, lng: position.lng };

    // ── 2. Optimisation multi-stops + segments ────────────────────────────
    // Phase 1 : nearest-neighbor greedy   O(n²)
    // Phase 2 : amélioration 2-opt        O(n²·iter)
    // Segments : lignes droites GPS — ligne s'arrête exactement au dernier bac
    const { orderedBacs, totalDistance, estimatedTime, segments } =
      optimizeMultiStop(startPoint, bacs, criterium);

    // ── 3. Réponse ────────────────────────────────────────────────────────
    const orderedBacsWithOrdre = orderedBacs.map((b, i) => ({
      _id:               b._id,
      codeBac:           b.codeBac,
      latitude:          b.latitude,
      longitude:         b.longitude,
      niveauRemplissage: b.niveauRemplissage,
      statut:            b.statut,
      zoneId:            b.zoneId,
      ordre:             i + 1,
    }));

    res.json({
      success: true,
      data: {
        orderedBacs:      orderedBacsWithOrdre,
        segments,
        totalDistanceKm:  Math.round(totalDistance * 10) / 10,
        totalTempsMin:    estimatedTime,
        criterium,
        nbBacs:           orderedBacs.length,
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// exports.prochainBac
// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/navigation/prochain-bac
 *
 * Retourne le prochain bac à collecter et le chemin Dijkstra pour l'atteindre.
 *
 * @body {object}   body.position           - { lat, lng }
 * @body {string}   body.tourneeId
 * @body {string[]} body.bacsDejaCollectes  - ids des bacs déjà collectés
 */
exports.prochainBac = async (req, res, next) => {
  try {
    const { position, tourneeId, bacsDejaCollectes = [] } = req.body;

    if (!position?.lat || !position?.lng) {
      return next(new AppError('La position { lat, lng } est requise.', 400));
    }
    if (!tourneeId) {
      return next(new AppError('tourneeId est requis.', 400));
    }

    // ── 1. Points de collecte de la tournée ──────────────────────────────
    const tournee = await Tournee.findById(tourneeId).populate('zoneId').lean();
    if (!tournee) return next(new AppError('Tournée non trouvée.', 404));

    // Charger les bacs de la zone de la tournée non encore collectés
    const filter = { createdBy: tournee.createdBy };
    if (tournee.zoneId) filter.zoneId = tournee.zoneId._id ?? tournee.zoneId;

    const bacs = await Bac.find(filter).lean();
    const bacsRestants = bacs.filter(
      b => b.latitude && b.longitude && !bacsDejaCollectes.includes(b._id.toString()),
    );

    if (!bacsRestants.length) {
      return res.json({
        success: true,
        data: { prochainBac: null, chemin: [], distanceKm: 0, tempsMin: 0, bacsRestants: 0 },
      });
    }

    // ── 2. Nœud le plus proche ────────────────────────────────────────────
    const nodes    = bacsRestants.map(bacToNode);
    const nearest  = findNearestNode(nodes, position.lat, position.lng);
    const prochainBacDoc = bacsRestants.find(b => b._id.toString() === nearest.id);

    // ── 3. Chemin Dijkstra jusqu'au prochain bac ──────────────────────────
    const startNode = { id: '__start__', latitude: position.lat, longitude: position.lng };
    const allNodes  = [startNode, ...nodes];
    const graph     = buildGraph(allNodes, 6);

    const result    = dijkstra(graph, '__start__', nearest.id);

    // Reconstituer les coords GPS du chemin
    const bacById   = new Map(bacsRestants.map(b => [b._id.toString(), b]));
    const chemin    = result.path.map(id => {
      if (id === '__start__') return { lat: position.lat, lng: position.lng };
      const b = bacById.get(id);
      return b ? { lat: b.latitude, lng: b.longitude } : null;
    }).filter(Boolean);

    const VITESSE  = 30;
    const distKm   = result.totalDistance === Infinity
      ? 0
      : Math.round(result.totalDistance * 100) / 100;
    const tempsMin = Math.round((distKm / VITESSE) * 60);

    res.json({
      success: true,
      data: {
        prochainBac: prochainBacDoc,
        chemin:      chemin.length >= 2 ? chemin : [
          { lat: position.lat, lng: position.lng },
          { lat: prochainBacDoc.latitude, lng: prochainBacDoc.longitude },
        ],
        distanceKm:  distKm,
        tempsMin,
        bacsRestants: bacsRestants.length,
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// exports.mettreAJourPosition
// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/navigation/position
 *
 * Met à jour la position GPS d'un véhicule et vérifie la proximité des bacs.
 *
 * @body {string} body.vehiculeId
 * @body {number} body.lat
 * @body {number} body.lng
 * @body {string} [body.tourneeId]
 */
exports.mettreAJourPosition = async (req, res, next) => {
  try {
    const { vehiculeId, lat, lng, tourneeId } = req.body;

    if (!vehiculeId || lat === undefined || lng === undefined) {
      return next(new AppError('vehiculeId, lat et lng sont requis.', 400));
    }

    // ── 1. Mettre à jour le GPS du véhicule ──────────────────────────────
    const vehicule = await Vehicule.findByIdAndUpdate(
      vehiculeId,
      { 'localisationGPS.lat': lat, 'localisationGPS.lng': lng },
      { new: true },
    ).lean();

    if (!vehicule) return next(new AppError('Véhicule non trouvé.', 404));

    // ── 2. Émettre via Socket.IO (event existant) ─────────────────────────
    const io = req.app.get('io');
    if (io) {
      io.emit('vehicule-position', {
        vehiculeId,
        lat,
        lng,
        immatriculation: vehicule.immatriculation,
        tourneeId: tourneeId ?? null,
      });
    }

    // ── 3. Vérifier la proximité (50 m = 0.05 km) ─────────────────────────
    const SEUIL_KM = 0.05;
    let   bacProche  = null;
    let   proximite  = false;

    if (tourneeId) {
      const tournee    = await Tournee.findById(tourneeId).lean();
      const zoneFilter = { createdBy: req.user.id };
      if (tournee?.zoneId) zoneFilter.zoneId = tournee.zoneId;

      const bacs = await Bac.find(zoneFilter).lean();

      for (const bac of bacs) {
        if (!bac.latitude || !bac.longitude) continue;
        const R    = 6371;
        const dLat = (bac.latitude  - lat) * Math.PI / 180;
        const dLon = (bac.longitude - lng) * Math.PI / 180;
        const a    =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(lat * Math.PI / 180) *
          Math.cos(bac.latitude * Math.PI / 180) *
          Math.sin(dLon / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        if (dist <= SEUIL_KM) {
          bacProche  = bac;
          proximite  = true;

          // Émettre l'alerte proximité via Socket.IO
          if (io) {
            io.emit('bac-proximity-alert', {
              vehiculeId,
              tourneeId,
              bacId:          bac._id,
              codeBac:        bac.codeBac,
              distanceMetres: Math.round(dist * 1000),
            });
          }
          break;
        }
      }
    }

    res.json({ success: true, proximite, bacProche: bacProche ?? null });
  } catch (err) { next(err); }
};
