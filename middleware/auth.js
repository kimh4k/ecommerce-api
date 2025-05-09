const jwt = require('jsonwebtoken');
const { User } = require('../models');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token received:', token);
    }

    if (!token) {
      return res.status(401).json({ 
        message: 'Not authorized, no token',
        code: 'NO_TOKEN'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded token:', decoded);

      // Get user from the token
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });
      console.log('Found user:', user ? user.id : 'null');

      if (!user) {
        console.log('User not found in database');
        return res.status(401).json({ 
          message: 'Not authorized, user not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Check if user is active (only if explicitly set to false)
      if (user.isActive === false) {
        console.log('User is inactive');
        return res.status(401).json({ 
          message: 'Not authorized, user is inactive',
          code: 'USER_INACTIVE'
        });
      }

      // Add user to request object
      req.user = user;
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({ 
        message: 'Not authorized, token failed',
        code: 'TOKEN_INVALID'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      message: 'Server error',
      code: 'SERVER_ERROR'
    });
  }
};

module.exports = { protect }; 