import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";

// Signup new user
export const signup = async (req, res) => {
  const { fullName, email, password, bio } = req.body;

  try {
    console.log("📝 Signup attempt for:", email);
    
    if (!fullName || !email || !password || !bio)
      return res.json({ success: false, message: "Missing Details" });

    const user = await User.findOne({ email });

    if (user)
      return res.json({ success: false, message: "Account already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      bio,
    });

    console.log("✅ User created:", newUser._id);
    
    // Generate token
    const token = generateToken(newUser._id);
    
    // Debug token generation
    console.log("🔐 Generated token:", token);
    console.log("📏 Token length:", token.length);
    console.log("🔍 Token starts with:", token.substring(0, 20));
    
    // Verify token can be decoded
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("✅ Token self-verified:", decoded);
    } catch (err) {
      console.log("❌ Token self-verification failed:", err.message);
    }

    res.json({
      success: true,
      userData: newUser,
      token: token, // Explicitly send token
      message: "Account created successfully",
    });
  } catch (error) {
    console.log("❌ Signup error:", error.message);
    res.json({
      success: false,
      message: error.message,
    });
  }
};

// Do the same for login function
export const login = async (req, res) => {
  try {
    console.log("🔐 Login attempt for:", req.body.email);
    
    const { email, password } = req.body;
    const userData = await User.findOne({ email });

    if (!userData) {
      console.log("❌ User not found");
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, userData.password);

    if (!isPasswordCorrect) {
      console.log("❌ Incorrect password");
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken(userData._id);
    
    console.log("✅ Login successful for:", userData._id);
    console.log("🔐 Generated token:", token);
    console.log("📏 Token length:", token.length);

    res.json({
      success: true,
      userData: userData,
      token: token, // Explicitly send token
      message: "Login successful",
    });
  } catch (error) {
    console.log("❌ Login error:", error.message);
    res.json({
      success: false,
      message: error.message,
    });
  }
};

// Controller to check if user is authenticated
export const checkAuth = (req, res) => {
  res.json({ success: true, user: req.user });
};

// Controller to update user profile details
export const updateProfile = async (req, res) => {
  try {
    const { profilePic, bio, fullName } = req.body;
    const userId = req.user._id;
    let updatedUser;

    if (!profilePic) {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { bio, fullName },
        { new: true }
      );
    } else {
      const upload = await cloudinary.uploader.upload(profilePic);

      updatedUser = await User.findByIdAndUpdate(
        userId,
        { profilePic: upload.secure_url, bio, fullName },
        { new: true }
      );
    }
    res.json({success: true, user: updatedUser})
  } catch (error) {
    console.log(error.message);
    res.json({success: false, message: error.message})
  }
};

// Add to userController.js
export const testToken = async (req, res) => {
  try {
    const token = req.headers.token;
    console.log("Test endpoint - Token received:", token);
    
    if (!token) {
      return res.json({ success: false, message: "No token" });
    }
    
    // Try to decode without verification first
    const decodedWithoutVerify = jwt.decode(token);
    console.log("Decoded without verify:", decodedWithoutVerify);
    
    // Then verify
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Verified:", decoded);
    
    res.json({ 
      success: true, 
      decoded,
      message: "Token is valid" 
    });
  } catch (error) {
    console.log("Token test error:", error.message);
    res.json({ 
      success: false, 
      message: error.message 
    });
  }
};
