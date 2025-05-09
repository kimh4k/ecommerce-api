const bcrypt = require('bcryptjs');
const { User, Profile, Address, ActivityLog } = require('../models');
const { Op } = require('sequelize');

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Profile,
          as: 'profile'
        },
        {
          model: Address,
          as: 'addresses'
        }
      ],
      attributes: { exclude: ['password'] }
    });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, avatar } = req.body;

    const profile = await Profile.findOne({ where: { userId: req.user.id } });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    await profile.update({
      firstName,
      lastName,
      phone,
      avatar
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'update_profile',
      entityType: 'profile',
      entityId: profile.id
    });

    res.json({ message: 'Profile updated successfully', profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await user.update({ password: hashedPassword });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'change_password',
      entityType: 'user',
      entityId: user.id
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to change password' });
  }
};

// Get user addresses
const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.findAll({
      where: { userId: req.user.id }
    });

    res.json(addresses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch addresses' });
  }
};

// Add new address
const addAddress = async (req, res) => {
  try {
    const addressData = {
      ...req.body,
      userId: req.user.id
    };

    // If this is the first address, make it default
    const addressCount = await Address.count({ where: { userId: req.user.id } });
    if (addressCount === 0) {
      addressData.isDefault = true;
    }

    const address = await Address.create(addressData);

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'add_address',
      entityType: 'address',
      entityId: address.id
    });

    res.status(201).json({ message: 'Address added successfully', address });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add address' });
  }
};

// Update address
const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findOne({
      where: { id, userId: req.user.id }
    });

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    await address.update(req.body);

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'update_address',
      entityType: 'address',
      entityId: address.id
    });

    res.json({ message: 'Address updated successfully', address });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update address' });
  }
};

// Delete address
const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findOne({
      where: { id, userId: req.user.id }
    });

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    await address.destroy();

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'delete_address',
      entityType: 'address',
      entityId: id
    });

    res.json({ message: 'Address deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete address' });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Profile,
        attributes: ['firstName', 'lastName', 'phone', 'avatar']
      }]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching user data' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getCurrentUser
}; 