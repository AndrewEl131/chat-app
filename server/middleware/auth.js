import jwt from "jsonwebtoken"; 
import User from "../models/User.js";

export const protectRoute = async (req, res, next) => {
  try {
    console.log("=== PROTECT ROUTE DEBUG ===");
    console.log("Full headers:", JSON.stringify(req.headers, null, 2));
    console.log("Token from headers.token:", req.headers.token);
    console.log("Token length:", req.headers.token ? req.headers.token.length : 0);
    console.log("Token type:", typeof req.headers.token);
    
    let token = req.headers.token;

    if (!token) {
      console.log("❌ No token found in headers.token");
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Check if token is a string
    if (typeof token !== 'string') {
      console.log("❌ Token is not a string:", token);
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    // Trim any whitespace
    token = token.trim();
    console.log("Token after trim:", token);
    console.log("Token length after trim:", token.length);

    // Try to decode and verify
    console.log("Attempting to verify token...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token decoded successfully:", decoded);

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      console.log("❌ User not found for ID:", decoded.userId);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("✅ Authentication successful for user:", user._id);
    req.user = user;
    next();
  } catch (error) {
    console.log("❌ JWT Error details:", error.message);
    console.log("❌ JWT name:", error.name);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
        error: error.message,
      });
    }
    
    res.status(401).json({
      success: false,
      message: "Authentication failed",
      error: error.message,
    });
  }
}
