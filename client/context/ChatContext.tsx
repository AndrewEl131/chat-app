import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AuthContext } from "./AuthContext";
import axios from "axios";
import toast from "react-hot-toast";

export const ChatContext = createContext<ChatContextType | null>(null);

type Message = {
   _id: string;
  senderId: string;
  receiverId: string;
  text?: string;
  image?: string;
  seen?: boolean;
  createdAt: string;
};

type ChatUser = {
  _id: string;
  fullName: string;
  profilePic?: string;
  bio: string;
};

type UnseenMessages = Record<string, number>;

type ChatProviderProps = {
  children: ReactNode;
};

type SendMessagePayload = {
  text?: string;
  image?: string;
};


type ChatContextType = {
  messages: Message[];
  users: ChatUser[];
  selectedUser: ChatUser | null;
  unseenMessages: UnseenMessages;
  getUsers: () => Promise<void>;
  getMessages: (userId: string) => Promise<void>;
  sendMessage: (messageData: SendMessagePayload) => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setSelectedUser: React.Dispatch<React.SetStateAction<ChatUser | null>>;
  setUnseenMessages: React.Dispatch<React.SetStateAction<UnseenMessages>>;
};

export const ChatProvider = ({ children }: ChatProviderProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [unseenMessages, setUnseenMessages] = useState<UnseenMessages>({});

  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error("ChatProvider must be used inside AuthProvider");
  }

  const { socket } = auth;

  // function to get all users for sidebar
  const getUsers = async (): Promise<void> => {
    try {
      const { data } = await axios.get("/api/messages/user");
      if (data.success) {
        setUsers(data.users);
        setUnseenMessages(data.unseenMessages);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // function to get messages for selected user
  const getMessages = async (userId: string): Promise<void> => {
    try {
      const { data } = await axios.get(`/api/messages/${userId}`);
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // function to send message to selected user
const sendMessage = async (
  messageData: SendMessagePayload
): Promise<void> => {
  try {
    const { data } = await axios.post(
      `/api/messages/send/${selectedUser?._id}`,
      messageData
    );

    if (data.success) {
  const fixedMessage: Message = {
    ...data.newMessage,
    createdAt:
      data.newMessage.createdAt ?? new Date().toISOString(),
  };

  setMessages((prev) => [...prev, fixedMessage]);
} else {
  toast.error(data.message);
}

  } catch (error: any) {
    toast.error(error.message);
  }
};

  // function to subscribe to messages for selected user
  const subscribeToMessages = async () => {
    if (!socket) return;

    socket.on("newMessage", (newMessage: Message) => {
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        newMessage.seen = true;
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        axios.put(`/api/messages/mark/${newMessage._id}`);
      } else {
        setUnseenMessages((prevUnseenMessages: UnseenMessages) => ({
          ...prevUnseenMessages,
          [newMessage.senderId]: prevUnseenMessages[newMessage.senderId]
            ? prevUnseenMessages[newMessage.senderId] + 1
            : 1,
        }));
      }
    });
  };

  // function to unSubscribe from messages
  const unSubscribeFromMessages = () => {
    if (socket) socket.off("newMessage");
  };

  useEffect(() => {
    subscribeToMessages();
    return () => unSubscribeFromMessages();
  }, [socket, selectedUser]);

  const value: ChatContextType = {
    messages,
    users,
    selectedUser,
    unseenMessages,
    getUsers,
    getMessages,
    sendMessage,
    setMessages,
    setSelectedUser,
    setUnseenMessages,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
