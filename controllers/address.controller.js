const { Address, ActivityLog } = require('../models');

// Get user's addresses
const getUserAddresses = async (req, res) => {
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

// Get address by ID
const getAddressById = async (req, res) => {
  try {
    const address = await Address.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    res.json(address);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch address' });
  }
};

// Create new address
const createAddress = async (req, res) => {
  try {
    const { 
      name,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      postalCode,
      phone,
      isDefault
    } = req.body;

    // Validate required fields
    if (!name || !addressLine1 || !city || !state || !country || !postalCode || !phone) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, addressLine1, city, state, country, postalCode, and phone are required' 
      });
    }

    // If this is set as default, unset any existing default address
    if (isDefault) {
      await Address.update(
        { isDefault: false },
        { where: { userId: req.user.id } }
      );
    }

    const address = await Address.create({
      userId: req.user.id,
      name,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      postalCode,
      phone,
      isDefault: isDefault || false
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'create_address',
      entityType: 'address',
      entityId: address.id
    });

    res.status(201).json({
      message: 'Address created successfully',
      address
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create address' });
  }
};

// Update address
const updateAddress = async (req, res) => {
  try {
    const { 
      name,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      postalCode,
      phone,
      isDefault
    } = req.body;

    const address = await Address.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // If this is set as default, unset any existing default address
    if (isDefault) {
      await Address.update(
        { isDefault: false },
        { 
          where: { 
            userId: req.user.id,
            id: { [Op.ne]: address.id }
          }
        }
      );
    }

    await address.update({
      name,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      postalCode,
      phone,
      isDefault
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'update_address',
      entityType: 'address',
      entityId: address.id
    });

    res.json({
      message: 'Address updated successfully',
      address
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update address' });
  }
};

// Delete address
const deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id
      }
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
      entityId: req.params.id
    });

    res.json({ message: 'Address deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete address' });
  }
};

module.exports = {
  getUserAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress
}; 