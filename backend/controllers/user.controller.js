const User       = require('../models/User');
const bcrypt     = require('bcryptjs');
const { AppError } = require('../middlewares/error.middleware');

// ─── ADMIN : créer un utilisateur (agent, citoyen ou autre admin) ─────────────
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, telephone, ville } = req.body;

    if (!name || !email || !password)
      return next(new AppError('Nom, email et mot de passe sont requis', 400));
    if (password.length < 6)
      return next(new AppError('Le mot de passe doit contenir au moins 6 caractères', 400));

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return next(new AppError('Email déjà utilisé', 400));

    const hashed = await bcrypt.hash(password, 10);
    // createdBy = admin connecté → cet utilisateur lui appartient
    const user = await User.create({ name, email, password: hashed, role, telephone, ville, createdBy: req.user.id });

    const { password: _pw, ...userOut } = user.toObject();
    res.status(201).json({ success: true, data: userOut });
  } catch (error) { next(error); }
};

// ─── ADMIN : lister uniquement ses utilisateurs ───────────────────────────────
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ createdBy: req.user.id })
      .select('-password')
      .populate('quartier', 'nom')
      .lean();
    res.json({ success: true, count: users.length, data: users });
  } catch (error) { next(error); }
};

// ─── Obtenir un utilisateur par ID (propriété vérifiée pour ADMIN) ────────────
exports.getUserById = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, createdBy: req.user.id };
    const user = await User.findOne(filter).select('-password').populate('quartier', 'nom').lean();
    if (!user) return next(new AppError('Utilisateur non trouvé', 404));
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};

// ─── ADMIN : modifier un utilisateur lui appartenant ─────────────────────────
exports.updateUser = async (req, res, next) => {
  try {
    const { password, ...updateData } = req.body;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      updateData,
      { new: true, runValidators: true }
    ).select('-password').lean();

    if (!user) return next(new AppError('Utilisateur non trouvé ou accès refusé', 404));
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};

// ─── ADMIN : supprimer un utilisateur lui appartenant ────────────────────────
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!user) return next(new AppError('Utilisateur non trouvé ou accès refusé', 404));
    res.json({ success: true, message: 'Utilisateur supprimé avec succès' });
  } catch (error) { next(error); }
};
