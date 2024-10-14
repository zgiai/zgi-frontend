import React from 'react';

const ChatArea = () => {
    return (
        <div className="flex-1 overflow-auto p-4">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-center mb-4">
                    <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">What is new</span>
                </div>
                <div className="text-center mb-4">
                    <h2 className="text-2xl font-bold mb-2">How can I help you?</h2>
                    <p className="text-sm text-gray-500">LLMChat is free to use with daily limits. Sign in required.</p>
                </div>
                <div className="text-center mb-4">
                    <p className="text-sm text-gray-500">Try these example prompts or craft your own message</p>
                </div>
                <div className="flex justify-center space-x-2 mb-4">
                    <button className="px-3 py-1 bg-gray-200 rounded-md text-sm">Top-rated Restaurants</button>
                    <button className="px-3 py-1 bg-gray-200 rounded-md text-sm">Recent news in city</button>
                    <button className="px-3 py-1 bg-gray-200 rounded-md text-sm">Summarize article</button>
                </div>
            </div>
        </div>
    );
};

export default ChatArea;