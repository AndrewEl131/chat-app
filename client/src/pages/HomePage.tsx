import { useContext, useState } from "react";
import ChatContainer from "../components/ChatContainer";
import RightSideBar from "../components/RightSideBar";
import SideBar from "../components/SideBar";
import { ChatContext } from "../../context/ChatContext";

export type User = {
  _id: string;
  fullName: string;
  profilePic?: string;
  bio?: string;
  createdAt?: string;
};



export default function HomePage() {
  const chat = useContext(ChatContext)
  if(!chat) return;
   const { selectedUser } = chat;

  return (
    <div className="border w-full h-screen sm:px-[15%] sm:py-[5%]">
      <div
        className={`backdrop-blur-xl border-2 border-gray-600 rounded-2xl overflow-hidden h-full grid grid-cols-1 relative ${
          selectedUser
            ? "md:grid-cols-[1fr_1.5fr_1fr] xl:grid-cols-[1fr_2fr_1fr]"
            : "md:grid-cols-2"
        }`}
      >
        <SideBar />
        <ChatContainer />
        <RightSideBar />
      </div>
    </div>
  );
}
