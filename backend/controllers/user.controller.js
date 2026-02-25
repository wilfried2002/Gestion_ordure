const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { AppError } = require('../middlewares/error.middleware');

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, telephone } = req.body;

    if (!name || !email || !password) {
      return next(new AppError('Nom, email et mot de passe sont requis', 400));
    }
    if (password.length < 6) {
      return next(new AppError('Le mot de passe doit contenir au moins 6 caractères', 400));
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return next(new AppError('Email déjà utilisé', 400));

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role, telephone });

    const { password: _pw, ...userOut } = user.toObject();
    res.status(201).json({ success: true, data: userOut });
  } catch (error) {
    next(error);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').populate('quartier', 'nom').lean();
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password').populate('quartier', 'nom').lean();
    if (!user) return next(new AppError('Utilisateur non trouvé', 404));
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { password, ...updateData } = req.body;

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password').lean();

    if (!user) return next(new AppError('Utilisateur non trouvé', 404));
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return next(new AppError('Utilisateur non trouvé', 404));
    res.json({ success: true, message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    next(error);
  }
};
