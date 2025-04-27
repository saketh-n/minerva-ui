"use client";

import React, { useState, useEffect, useRef } from "react";
import Message from "../components/ui/Message";
import YouTube from "react-youtube";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import {
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
} from "@assistant-ui/react";

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

// Define our own simple chat messages as a fallback
type SimpleChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [connected, setConnected] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<SimpleChatMessage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Initialize chat runtime
  const runtime = useChatRuntime({
    api: "/api/chat",
    adapters: {
      attachments: new CompositeAttachmentAdapter([
        new SimpleImageAttachmentAdapter(),
        new SimpleTextAttachmentAdapter(),
      ]),
    },
  });

  // Function to scroll chat to bottom
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Scroll chat to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, runtime.messages]);

  // WebSocket connection for military messages
  useEffect(() => {
    let ws: WebSocket | null = null;
    
    try {
      ws = new WebSocket('ws://localhost:8765');
      
      ws.onopen = () => {
        console.log('Connected to WebSocket server');
        setConnected(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const newMessage = JSON.parse(event.data);
          setMessages(prevMessages => [...prevMessages, newMessage]);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnected(false);
      };
      
      ws.onclose = () => {
        console.log('Disconnected from WebSocket server');
        setConnected(false);
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      setConnected(false);
    }
    
    return () => {
      if (ws) ws.close();
    };
  }, []);

  // Add demo messages if WebSocket connection fails
  useEffect(() => {
    if (!connected && messages.length === 0) {
      const demoMessages: MessageType[] = [
        {
          id: 1,
          action: "Spotted enemy tank",
          vehicle: "Drone",
          callSign: "Eagle-Eye",
          enemy: "T-90 Tank",
          explanation: "Enemy tank moving south along ridge line",
          category: "neutral"
        },
        {
          id: 2,
          action: "Engaging target",
          vehicle: "Artillery",
          callSign: "Thunder-1",
          enemy: "Infantry Squad",
          explanation: "Firing on enemy position with HE rounds",
          category: "positive"
        },
        {
          id: 3,
          action: "Under fire",
          vehicle: "Humvee",
          callSign: "Road-Runner",
          enemy: "Sniper",
          explanation: "Taking small arms fire from northern tree line",
          category: "negative"
        }
      ];
      
      // Add messages with a delay between each
      let index = 0;
      const interval = setInterval(() => {
        if (index < demoMessages.length) {
          setMessages(prev => [...prev, demoMessages[index]]);
          index++;
        } else {
          clearInterval(interval);
        }
      }, 1500);
      
      return () => clearInterval(interval);
    }
  }, [connected, messages.length]);

  // Handle chat submission - first try with runtime, fallback to simple chat
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If input is empty, do nothing
    if (!chatInput.trim()) return;
    
    try {
      // First try the runtime's handleSubmit
      if (runtime?.handleSubmit) {
        runtime.setInput && runtime.setInput(chatInput);
        setChatInput('');
        runtime.handleSubmit(e);
      } else {
        // Fallback to simple chat implementation
        setIsSubmitting(true);
        
        // Add user message immediately
        const userMessage: SimpleChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          content: chatInput
        };
        
        setChatMessages(prev => [...prev, userMessage]);
        setChatInput('');
        
        // Simulate response with a delay
        setTimeout(() => {
          const assistantMessage: SimpleChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: getSimulatedResponse(chatInput)
          };
          
          setChatMessages(prev => [...prev, assistantMessage]);
          setIsSubmitting(false);
        }, 1000);
      }
    } catch (error) {
      console.error('Error submitting message:', error);
      setIsSubmitting(false);
    }
  };
  
  // Simple response simulator for the fallback chat
  const getSimulatedResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
      return 'Hello Commander, how may I assist you today?';
    }
    
    if (lowerInput.includes('status') || lowerInput.includes('update')) {
      return 'All units are operational. Northern sector is currently engaged with enemy forces. Southern perimeter remains secure.';
    }
    
    if (lowerInput.includes('enemy') || lowerInput.includes('threat')) {
      return 'Enemy forces detected in grid coordinates A5 through C7. Reconnaissance reports show armored vehicles and infantry units moving towards our eastern flank.';
    }
    
    if (lowerInput.includes('air support') || lowerInput.includes('reinforcement')) {
      return 'Air support is available. Two F-16 jets are on standby. Reinforcements can be deployed within 20 minutes to your position.';
    }
    
    return 'Acknowledged, Commander. I\'ve logged your message and forwarded it to the appropriate units. Do you need any specific intelligence or support?';
  };

  const videoOpts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 1,
    },
  };

  // Determine which chat system to use - runtime's messages or our fallback
  const useRuntimeChat = runtime?.messages && runtime.messages.length > 0;
  const chatMessagesToShow = useRuntimeChat ? runtime.messages : chatMessages;
  const isLoading = useRuntimeChat ? runtime.isLoading : isSubmitting;

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="min-h-screen bg-white flex">
        {/* Left half - War Game Replay */}
        <div className="w-1/2 p-8">
          <h1 className="text-4xl font-bold mb-8">War Game Replay</h1>
          <div className="aspect-video rounded-lg overflow-hidden">
            <YouTube
              videoId="5mSPQlDgzBY"
              opts={videoOpts}
              className="w-full h-full"
            />
          </div>
        </div>
        
        {/* Right half - Message Area and Heatmap */}
        <div className="w-1/2 p-8 border-l border-gray-200 flex flex-col">
          {/* Military Message Log */}
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <h1 className="text-3xl font-bold">Battlefield Updates</h1>
              <div className={`ml-3 w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} 
                   title={connected ? 'Connected to server' : 'Not connected to server'}>
              </div>
            </div>
            <div className="h-[35vh] overflow-y-auto pr-4 border rounded-lg p-4 bg-gray-50">
              <div className="space-y-1">
                {messages.length > 0 ? (
                  messages.map((message) => (
                    <Message 
                      key={message.id} 
                      action={message.action}
                      vehicle={message.vehicle}
                      callSign={message.callSign}
                      enemy={message.enemy}
                      explanation={message.explanation}
                      category={message.category}
                    />
                  ))
                ) : (
                  <div className="text-gray-500 text-center py-10">
                    Waiting for battlefield updates...
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Command Chat Interface */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-3">Command Chat</h2>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div 
                ref={chatContainerRef} 
                className="h-[20vh] overflow-y-auto mb-3 px-2"
              >
                {chatMessagesToShow && chatMessagesToShow.length > 0 ? (
                  // @ts-ignore - Ignoring type issues as we're handling both runtime messages and fallback
                  chatMessagesToShow.map((message: any) => (
                    <div key={message.id} 
                         className={`p-2 rounded mb-2 ${message.role === 'user' ? 'bg-blue-100 ml-auto max-w-[80%]' : 'bg-white border max-w-[80%]'}`}>
                      <div className="font-semibold text-sm text-gray-700">
                        {message.role === 'user' ? 'You' : 'Command Center'}
                      </div>
                      <div className="mt-1">{message.content}</div>
                      {useRuntimeChat && message.attachments?.map((attachment: any, index: number) => (
                        <div key={index} className="mt-1">
                          {runtime.renderAttachment && runtime.renderAttachment(attachment)}
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-center py-8">
                    Start a conversation with Command Center
                  </div>
                )}
              </div>
              
              <form onSubmit={handleSubmit} className="flex">
                <input
                  type="text"
                  value={useRuntimeChat ? (runtime.input || '') : chatInput}
                  onChange={(e) => {
                    if (useRuntimeChat && runtime.setInput) {
                      runtime.setInput(e.target.value);
                    } else {
                      setChatInput(e.target.value);
                    }
                  }}
                  placeholder="Type a message to Command Center..."
                  className="flex-1 p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <button 
                  type="submit" 
                  className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
                  disabled={isLoading || (useRuntimeChat ? !(runtime.input && runtime.input.trim()) : !chatInput.trim())}
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </div>

          {/* Heatmap */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-3">Battlefield Heatmap</h2>
            <div className="h-full bg-gray-200 rounded-lg flex items-center justify-center">
              <p className="text-gray-600 text-lg">Heatmap Visualization Coming Soon</p>
            </div>
          </div>
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}