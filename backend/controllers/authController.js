// controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { database } = require('../config');

// Get MySQL pool from config (should be mysql2/promise pool)
const db = database.mysqlPool;

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your-secret-key-change-in-production', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Map database role and dept to frontend format
const mapUserToFrontend = (user) => {
  let role = 'user';
  if (user.role === 'admin') role = 'admin';
  else if (user.role === 'super-user' || user.role === 'super_user') role = 'super-user';
  else role = 'user';

  const deptMapping = {
    'PDO': 'pdo',
    'Admin': 'admin',
    'Laboratory': 'laboratory',
    'Followup': 'followup',
    'Follow-up': 'followup',
    'IT': 'it-job-order',
    'IT Job Order': 'it-job-order'
  };

  const department = deptMapping[user.dept] || user.dept.toLowerCase();

  return {
    id: user.user_id.toString(),
    email: user.email,
    name: user.name,
    role: role,
    department: department,
    position: user.position
  };
};

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
exports.login = async (req, res) => {
  console.log('🟣 [BACKEND] Login endpoint called');
  console.log('🟣 [BACKEND] Request body:', { username: req.body.username, password: '***' });
  
  try {
    const username = req.body.username || req.body.email;
    const { password } = req.body;

    if (!username || !password) {
      console.log('🔴 [BACKEND] Missing credentials');
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }

    console.log('🟣 [BACKEND] Querying database for user:', username);
    
    // Use promise-based query directly
    const [results] = await db.query('SELECT * FROM user WHERE username = ?', [username]);
    
    console.log('🟣 [BACKEND] Query completed, results count:', results.length);

    if (results.length === 0) {
      console.log('🔴 [BACKEND] User not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    const user = results[0];
    console.log('🟣 [BACKEND] User found:', user.username);
    console.log('🟣 [BACKEND] User department:', user.dept);

    // Check password with bcrypt
    console.log('🟣 [BACKEND] Comparing passwords...');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('🟣 [BACKEND] Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('🔴 [BACKEND] Invalid password');
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Generate token
    console.log('🟣 [BACKEND] Generating token...');
    const token = generateToken(user.user_id);

    // Map user data
    console.log('🟣 [BACKEND] Mapping user data...');
    const userData = mapUserToFrontend(user);
    console.log('🟣 [BACKEND] Mapped user data:', userData);

    // Send response
    console.log('🟣 [BACKEND] Sending success response');
    res.status(200).json({
      success: true,
      token,
      user: userData
    });
    console.log('✅ [BACKEND] Login successful for user:', user.username);
  } catch (error) {
    console.error('🔴 [BACKEND] Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
exports.register = async (req, res) => {
  try {
    const { username, password, name, dept, email, position, role } = req.body;

    if (!username || !password || !name || !dept || !email || !position) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if user exists
    const [existing] = await db.query('SELECT * FROM user WHERE username = ?', [username]);

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this username already exists'
      });
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user with hashed password
    const userRole = role || 'user';
    const [result] = await db.query(
      'INSERT INTO user (username, password, name, dept, email, position, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, name, dept, email, position, userRole]
    );

    // Generate token
    const token = generateToken(result.insertId);

    const userData = {
      id: result.insertId.toString(),
      email: email,
      name: name,
      role: userRole,
      department: dept.toLowerCase(),
      position: position
    };

    res.status(201).json({
      success: true,
      token,
      user: userData
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
exports.logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

// @route   GET /api/auth/verify
// @desc    Verify token
// @access  Private
exports.verify = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      valid: true
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during verification'
    });
  }
};

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const [results] = await db.query('SELECT * FROM user WHERE user_id = ?', [userId]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = results[0];
    const userData = mapUserToFrontend(user);

    res.status(200).json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
};