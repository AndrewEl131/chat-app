import React, {
  createContext,
  useEffect,
  useState,
} from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { io, Socket } from "socket.io-client";
import type { ReactNode } from "react";

/* ------------------ TYPES ------------------ */

type User = {
  _id: string;
  fullName: string;
  bio: string;
  profilePic?: string;
};


type AuthContextType = {
  axios: typeof axios;
  authUser: User | null;
  onlineUsers: string[];
  socket: Socket | null;
  login: (state: string, credentials: unknown) => Promise<void>;
  logout: () => void;
  updateProfile: (body: unknown) => Promise<void>;
};

/* ------------------ SETUP ------------------ */

const backendUrl = import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL = backendUrl;

export const AuthContext = createContext<AuthContextType | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

/* ------------------ PROVIDER ------------------ */

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  /* ------------------ LOGIN ------------------ */


const login = async (state: string, credentials: unknown): Promise<void> => {
  try {
    console.log(`🔍 Attempting ${state} with credentials:`, credentials);
    
    const { data } = await axios.post(`/api/auth/${state}`, credentials);
    console.log("📦 Server response:", data);

    if (data.success) {
      console.log("✅ Login/signup successful");
      console.log("Token received:", data.token);
      console.log("Token type:", typeof data.token);
      console.log("Token length:", data.token ? data.token.length : "No token");
      
      // CRITICAL: Make sure token exists
      if (!data.token) {
        toast.error("No token received from server");
        return;
      }
      
      if (typeof data.token !== 'string') {
        toast.error(`Invalid token type: ${typeof data.token}`);
        return;
      }
      
      // Clean the token
      const token = data.token.trim();
      console.log("Cleaned token:", token);
      
      // 1. Save to localStorage FIRST
      localStorage.setItem("token", token);
      console.log("✅ Token saved to localStorage");
      
      // 2. Set token state
      setToken(token);
      
      // 3. Set axios headers
      axios.defaults.headers.common['token'] = token;
      console.log("✅ Axios headers set");
      
      // 4. Set auth user
      setAuthUser(data.userData);
      console.log("✅ Auth user set:", data.userData._id);
      
      // 5. Connect socket
      connectSocket(data.userData);
      
      toast.success(data.message);
    } else {
      console.log("❌ Server returned success: false");
      toast.error(data.message);
    }
  } catch (error: any) {
    console.error("❌ Login/signup error:", error);
    
    // More detailed error logging
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    
    toast.error(error.response?.data?.message || error.message);
  }
};

// Update checkAuth function
const checkAuth = async (): Promise<void> => {
  try {
    // Get token from localStorage
    const token = localStorage.getItem("token");
    console.log("🔍 Checking auth with token:", token);
    
    if (!token) {
      console.log("No token found in localStorage");
      return;
    }
    
    // Set header
    axios.defaults.headers.common['token'] = token.trim();
    
    const { data } = await axios.get("/api/auth/check");
    console.log("Auth check response:", data);

    if (data.success) {
      setAuthUser(data.user);
      connectSocket(data.user);
      console.log("✅ User authenticated:", data.user._id);
    }
  } catch (error: any) {
    console.error("Auth check error:", error.response?.data || error.message);
    // Clear invalid token
    localStorage.removeItem("token");
    setToken(null);
    setAuthUser(null);
  }
};

// Update the useEffect
useEffect(() => {
  console.log("AuthProvider mounted");
  checkAuth();
}, []);

  /* ------------------ LOGOUT ------------------ */

  const logout = (): void => {
  localStorage.removeItem("token");
  setToken(null);
  setAuthUser(null);
  setOnlineUsers([]);

  delete axios.defaults.headers.common["token"];

  socket?.disconnect();
  setSocket(null);

  toast.success("Logged out successfully");
};


  /* ------------------ UPDATE PROFILE ------------------ */

  const updateProfile = async (body: unknown): Promise<void> => {
    try {
      const { data } = await axios.put("/api/auth/update-profile", body);

      if (data.success) {
        setAuthUser(data.user);
        toast.success("Profile updated successfully");
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  /* ------------------ SOCKET ------------------ */

  const connectSocket = (userData: User): void => {
    if (!userData || socket?.connected) return;

    const newSocket = io(backendUrl, {
      query: { userId: userData._id },
    });

    setSocket(newSocket);

    newSocket.on("getOnlineUsers", (userIds: string[]) => {
      setOnlineUsers(userIds);
    });
  };

  /* ------------------ EFFECT ------------------ */

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["token"] = token;
    }
    checkAuth();
  }, []);

  /* ------------------ CONTEXT VALUE ------------------ */

  const value: AuthContextType = {
    axios,
    authUser,
    onlineUsers,
    socket,
    login,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
