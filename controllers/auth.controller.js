const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Profile, ActivityLog } = require('../models');
const { Op } = require('sequelize');
const { use } = require('../app');

const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: role || 'user'
    });

    // Create profile with initial values
    await Profile.create({
      userId: user.id,
      firstName: username || email.split('@')[0], // Use username or email prefix as firstName
      lastName: '',
      phone: '',
      avatar: null
    });

    // Log activity
    await ActivityLog.create({
      userId: user.id,
      action: 'register',
      entityType: 'user',
      entityId: user.id
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ 
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active (only if explicitly set to false)
    if (user.isActive === false) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log activity
    await ActivityLog.create({
      userId: user.id,
      action: 'login',
      entityType: 'user',
      entityId: user.id
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // In a real application, you would:
    // 1. Save the reset token to the user record
    // 2. Send an email with the reset link
    // 3. Create a separate endpoint to handle password reset

    res.json({ message: 'Password reset instructions sent to email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Password reset failed' });
  }
};

const logout = async (req, res) => {
  try {
    // Check if user exists in request
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Log activity
    try {
      await ActivityLog.create({
        userId: req.user.id,
        action: 'logout',
        entityType: 'user',
        entityId: req.user.id
      });
    } catch (logError) {
      console.error('Failed to log logout activity:', logError);
      // Continue with logout even if logging fails
    }

    // Clear any session data
    res.clearCookie('token');
    
    // Send success response
    res.status(200).json({ 
      message: 'Logged out successfully',
      code: 'LOGOUT_SUCCESS'
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ 
      message: 'Logout failed',
      code: 'LOGOUT_FAILED',
      error: err.message 
    });
  }
};

module.exports = {
  register,
  login,
  resetPassword,
  logout
}; 