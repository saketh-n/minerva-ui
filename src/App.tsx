import React, { useState, useEffect } from "react";
import Message from "./components/Message";

type Category = 'positive' | 'negative' | 'neutral';

type MessageType = {
  id: number;
  action: string;
  vehicle: string;
  callSign: string;
  enemy?: string;
  explanation: string;
  category: Category;
};

function App() {
  const [messages, setMessages] = useState<MessageType[]>([]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8765');

    ws.onopen = () => {
      console.log('Connected to WebSocket server');
    };

    ws.onmessage = (event) => {
      const newMessage = JSON.parse(event.data);
      setMessages(prevMessages => [...prevMessages, newMessage]);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('Disconnected from WebSocket server');
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left half - War Game Replay */}
      <div className="w-1/2 p-8">
        <h1 className="text-4xl font-bold mb-8">War Game Replay</h1>
        <div className="bg-gray-200 rounded-lg aspect-video flex items-center justify-center">
          <p className="text-gray-600 text-lg">Video Player Placeholder</p>
        </div>
      </div>
      
      {/* Right half - Message Area and Heatmap */}
      <div className="w-1/2 p-8 border-l border-gray-200 flex flex-col">
        {/* Message Area */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Message Log</h1>
          <div className="h-[40vh] overflow-y-auto pr-4 border rounded-lg p-4">
            <div className="space-y-1">
              {messages.map((message) => (
                <Message 
                  key={message.id} 
                  action={message.action}
                  vehicle={message.vehicle}
                  callSign={message.callSign}
                  enemy={message.enemy}
                  explanation={message.explanation}
                  category={message.category as Category}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Heatmap Placeholder */}
        <div className="flex-1 bg-gray-200 rounded-lg flex items-center justify-center">
          <p className="text-gray-600 text-lg">Heatmap Goes Here</p>
        </div>
      </div>
    </div>
  );
}

export default App;
