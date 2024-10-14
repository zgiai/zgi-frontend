import React from 'react';
import { Plus, Search, MessageCircle } from 'lucide-react';

const Sidebar = () => {
    return (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
            <button className="m-4 p-2 bg-black text-white rounded-md flex items-center justify-center">
                <Plus className="mr-2" size={18} />
                New Chat
            </button>

            <div className="px-4 mb-4">
                <div className="flex items-center bg-gray-100 rounded-md p-2">
                    <Search size={18} className="text-gray-500 mr-2" />
                    <input type="text" placeholder="Search" className="bg-transparent outline-none w-full" />
                    <span className="text-xs text-gray-500">⌘K</span>
                </div>
            </div>

            <div className="px-4 py-2">
                <div className="flex items-center text-purple-600">
                    <MessageCircle size={18} className="mr-2" />
                    <span>Explore Assistants</span>
                </div>
            </div>

            <div className="px-4 py-2">
                <h3 className="font-semibold mb-2">Examples</h3>
                <ul className="text-sm text-gray-600">
                    <li className="mb-1">(Example) Top-Rated Restaurants...</li>
                    <li className="mb-1">(Example) Top Performing...</li>
                    <li className="mb-1">(Example) JavaScript Function to...</li>
                </ul>
            </div>

            <div className="px-4 py-2">
                <h3 className="font-semibold mb-2">Last 7 Days</h3>
                <ul className="text-sm text-gray-600">
                    <li className="mb-1">Untitled</li>
                </ul>
            </div>

            <div className="mt-auto px-4 py-4">
                <button className="w-full p-2 border border-gray-300 rounded-md flex items-center justify-center">
                    SignIn
                </button>
            </div>

            <div className="px-4 py-2 flex justify-between items-center text-sm text-gray-500">
                <div className="flex items-center">
                    <button className="mr-2">Add API</button>
                    <button>Settings</button>
                </div>
                <span>v 1.0.3</span>
            </div>
        </div>
    );
};

export default Sidebar;