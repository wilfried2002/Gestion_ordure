const jwt = require('jsonwebtoken');

exports.authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Accès refusé : authentification requise" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: "Session expirée. Veuillez vous reconnecter." });
    }
    return res.status(401).json({ success: false, message: "Token invalide. Veuillez vous reconnecter." });
  }
};

exports.roleMiddleware = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Accès interdit" });
    }
    next();
  };
};
