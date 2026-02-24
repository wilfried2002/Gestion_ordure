const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { AppError } = require('../middlewares/error.middleware');

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').populate('quartier', 'nom');
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password').populate('quartier', 'nom');
    if (!user) return next(new AppError('Utilisateur non trouvé', 404));
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { password, ...updateData } = req.body;

    // Si un nouveau mot de passe est fourni, le hacher
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

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
