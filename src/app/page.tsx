import Sidebar from "../components/Sidebar/page";
import Header from "../components/Header/page";
import ChatArea from "../components/ChatArea/page";
import InputArea from "../components/InputArea/page";
import Footer from "../components/Footer/page";



export default function Home() {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <ChatArea />
        <InputArea />
        <Footer />
      </div>
    </div>
  );
}
