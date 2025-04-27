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
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-4xl font-bold mb-8">Message Log</h1>
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
  );
}

export default App;
