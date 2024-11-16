import React from 'react';
import { Send } from 'lucide-react';

const InputArea = () => {
    return (
        <div className="bg-white border-t border-gray-200 p-4">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center bg-white border border-gray-300 rounded-lg">
                    <input type="text" placeholder="Ask anything..." className="flex-1 p-2 outline-none" />
                    <button className="p-2">
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InputArea;