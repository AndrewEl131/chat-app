import type React from "react";
import assets from "../assets/assets";
import { useContext, useEffect, useRef, useState } from "react";
import { formatMessageTime } from "../lib/utils";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import toast from "react-hot-toast";

export type User = {
  _id: string;
  fullName: string;
  profilePic?: string;
  bio?: string;
  createdAt?: string;
};

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

export default function ChatContainer() {
  const chat = useContext(ChatContext);
  const auth = useContext(AuthContext);

  if (!chat || !auth) {
    throw new Error("ChatContainer must be used inside providers");
  }

  const {
    messages,
    selectedUser,
    setSelectedUser,
    sendMessage,
    getMessages,
  }: ChatContextType = chat;
  const { authUser, onlineUsers } = auth;

  const scrollEnd = useRef<HTMLDivElement | null>(null);

  const [input, setInput] = useState("");

  // Handle sending a message
  const handleSendMessage = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (input.trim() === "") return null;
    await sendMessage({ text: input.trim() });
    setInput("");
  };

  // Handle sending an image
const handleSendImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !file.type.startsWith("image/")) {
    toast.error("Select an image file");
    return;
  }

  // Check file size (optional, but recommended)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    toast.error("Image size should be less than 5MB");
    e.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onloadend = async () => {
    if (typeof reader.result === "string") {
      try {
        await sendMessage({ image: reader.result });
        toast.success("Image sent!");
      } catch (error) {
        toast.error("Failed to send image");
        console.error("Error sending image:", error);
      }
    }
    // Reset the input
    e.target.value = "";
  };

  reader.onerror = () => {
    toast.error("Failed to read image file");
    e.target.value = "";
  };

  // Actually read the file as Data URL
  reader.readAsDataURL(file);
};

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (scrollEnd.current && messages) {
      scrollEnd.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return selectedUser ? (
    <div className="h-full overflow-scroll relative backdrop-blur-lg">
      {/* --- Header --- */}
      <div className="flex items-center gap-3 py-3 mx-4 border-b border-stone-500">
        <img
          src={selectedUser.profilePic || assets.avatar_icon}
          alt=""
          className="w-8 rounded-full"
        />
        <p className="flex-1 text-lg text-white flex items-center gap-2">
          {selectedUser.fullName}
          {onlineUsers.includes(selectedUser._id) && (
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
          )}
        </p>
        <img
          onClick={() => setSelectedUser(null)}
          src={assets.arrow_icon}
          alt=""
          className="md:hidden max-w-7"
        />
        <img src={assets.help_icon} alt="" className="max-md:hidden max-w-5" />
      </div>
      {/* --- Chat Area --- */}
      <div className="flex flex-col overflow-y-scroll p-3 pb-6">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-end gap-2 justify-end ${
              msg.senderId !== authUser?._id && "flex-row-reverse"
            }`}
          >
            {msg.image ? (
              <img
                src={msg.image}
                alt=""
                className="max-w-57.5 border border-gray-700 rounded-lg overflow-hidden mb-8"
              />
            ) : (
              <p
                className={`p-2 max-w-50 md:text-sm font-light rounded-lg mb-8 break-all bg-violet-500/30 text-white ${
                  msg.senderId === authUser?._id
                    ? "rounded-br-none"
                    : "rounded-bl-none"
                }`}
              >
                {msg.text}
              </p>
            )}
            <div className="text-center text-xs">
              <img
                src={
                  msg.senderId === authUser?._id
                    ? authUser.profilePic || assets.avatar_icon
                    : selectedUser.profilePic || assets.avatar_icon
                }
                className="w-7 rounded-full"
                alt=""
              />
              <p className="text-gray-500">
                {formatMessageTime(msg.createdAt)}
              </p>
            </div>
          </div>
        ))}
        <div ref={scrollEnd}></div>
      </div>
      {/* --- Bottom Area --- */}
      <div className="sticky bottom-0 left-0 right-0 flex items-center gap-3 p-3">
        <div className="flex-1 flex items-center bg-gray-100/12 px-3 rounded-full">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" ? handleSendMessage(e) : null)}
            placeholder="Send a message"
            className="flex-1 text-sm p-3 border-none rounded-lg outline-none text-white placeholder-gray-400"
          />
          <input
            onChange={handleSendImage}
            type="file"
            id="image"
            accept="image/png, image/jpeg"
            hidden
          />
          <label htmlFor="image">
            <img
              src={assets.gallery_icon}
              alt=""
              className="w-5 mr-2 cursor-pointer"
            />
          </label>
        </div>
        <img
          onClick={handleSendMessage}
          src={assets.send_button}
          alt=""
          className="w-7 cursor-pointer"
        />
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/10 max-md:hidden">
      <img src={assets.logo_icon} className="max-w-16" alt="" />
      <p className="text-lg font-medium text-white">Chat anytime, anywhere</p>
    </div>
  );
}
