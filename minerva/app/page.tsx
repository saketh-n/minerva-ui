"use client";

import React, { useState, useEffect, useRef } from "react";
import YouTube from "react-youtube";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import {
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
} from "@assistant-ui/react";

// Define our own simple chat messages as a fallback
type SimpleChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

// Define WebSocket message type
type WebSocketMessage = {
  id: number;
  action: string;
  vehicle: string;
  callSign: string;
  enemy?: string;
  explanation: string;
  category: 'positive' | 'negative' | 'neutral';
  timestamp: string;
  influence_analysis: any; // This will hold the influence analysis data
  action_mapping?: string;
};

export default function Home() {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<SimpleChatMessage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [influenceAnalysis, setInfluenceAnalysis] = useState<any>(null);
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

  // Connect to WebSocket server
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8765');

    ws.onopen = () => {
      console.log('Connected to WebSocket server');
      setWsConnected(true);
      
      // Add system message when connected
      const connectionMessage: SimpleChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: 'SECURE CONNECTION ESTABLISHED WITH FIELD UNITS'
      };
      setChatMessages(prev => [...prev, connectionMessage]);
    };

    ws.onmessage = (event) => {
      try {
        const wsMessage: WebSocketMessage = JSON.parse(event.data);
        
        // Store the influence analysis data
        if (wsMessage.influence_analysis) {
          setInfluenceAnalysis(wsMessage.influence_analysis);
        }
        
        // Format the timestamp
        const timestamp = wsMessage.timestamp ? 
          new Date(wsMessage.timestamp).toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit' 
          }) : 
          getTimestamp();
        
        // Format the WebSocket message as a user input
        const formattedInput = `${wsMessage.action} ${wsMessage.callSign}`;
        
        // Add message as if it was user input
        const userMessage: SimpleChatMessage = {
          id: `user-${wsMessage.id}`,
          role: 'user',
          content: formattedInput
        };
        
        setChatMessages(prev => [...prev, userMessage]);
        
        // Now create and add the response message
        setTimeout(() => {
          // Format the response content
          const responseContent = `${wsMessage.action.toUpperCase()} | ${wsMessage.vehicle} ${wsMessage.callSign} | ${wsMessage.explanation} ${wsMessage.enemy ? `| ENEMY: ${wsMessage.enemy}` : ''} | ${timestamp}`;
          
          // Add AI response message
          const aiResponseMessage: SimpleChatMessage = {
            id: `response-${wsMessage.id}`,
            role: 'assistant',
            content: responseContent
          };
          
          setChatMessages(prev => [...prev, aiResponseMessage]);
        }, 500); // Add a small delay to make it seem like a response
        
        // Log detailed message for debugging
        console.log('Received message:', wsMessage);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      const errorMessage: SimpleChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: 'ERROR: COMMUNICATION LINK DISRUPTED'
      };
      setChatMessages(prev => [...prev, errorMessage]);
    };

    ws.onclose = () => {
      console.log('Disconnected from WebSocket server');
      setWsConnected(false);
      
      const disconnectMessage: SimpleChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: 'ALERT: FIELD UNIT CONNECTION TERMINATED'
      };
      setChatMessages(prev => [...prev, disconnectMessage]);
    };

    return () => {
      ws.close();
    };
  }, []);

  // Scroll chat to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, runtime.messages]);

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

  // Format timestamp for military-style
  const getTimestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit' 
    });
  };

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="min-h-screen bg-zinc-900 text-green-400 flex">
        {/* Left half - War Game Replay */}
        <div className="w-1/2 p-6">
          <div className="border-2 border-green-700 rounded p-4 mb-4 bg-zinc-800">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-3xl font-mono uppercase tracking-wider">MISSION REPLAY</h1>
            </div>
            <div className="aspect-video rounded overflow-hidden border border-green-700 relative">
              <div className="absolute top-0 left-0 z-10 bg-zinc-800 text-green-400 text-xs font-mono p-1">
                LIVE FEED: DELTA SECTOR
              </div>
              <div className="absolute top-0 right-0 z-10 bg-zinc-800 text-green-400 text-xs font-mono p-1">
                {getTimestamp()} UTC
              </div>
              <YouTube
                videoId="5mSPQlDgzBY"
                opts={videoOpts}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
        
        {/* Right half - Command Chat and Heatmap */}
        <div className="w-1/2 p-6 border-l border-green-700 flex flex-col">
          {/* Command Chat Interface */}
          <div className="mb-4 flex-1 border-2 border-green-700 rounded p-4 bg-zinc-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-mono uppercase tracking-wider">COMMAND UPLINK</h2>
              <div className="flex space-x-1 items-center">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              </div>
            </div>
            <div className="h-[50vh] flex flex-col border border-green-700 bg-zinc-900 rounded">
              <div 
                ref={chatContainerRef} 
                className="flex-1 overflow-y-auto p-3 font-mono text-sm"
              >
                {chatMessagesToShow && chatMessagesToShow.length > 0 ? (
                  // @ts-ignore - Ignoring type issues as we're handling both runtime messages and fallback
                  chatMessagesToShow.map((message: any) => (
                    <div key={message.id} className="mb-3">
                      <div className="text-xs text-green-600 mb-1">
                        {message.role === 'user' 
                          ? '► FIELD COMMANDER [OUTGOING]' 
                          : '◄ COMMAND CENTER [INCOMING]'
                        } | {getTimestamp()}
                      </div>
                      <div className={`p-2 rounded ${
                        message.role === 'user' 
                          ? 'bg-green-900 bg-opacity-20 border border-green-800' 
                          : 'bg-zinc-800 border border-green-900'
                      }`}>
                        {message.content}
                        {useRuntimeChat && message.attachments?.map((attachment: any, index: number) => (
                          <div key={index} className="mt-1 border-t border-green-800 pt-1">
                            {runtime.renderAttachment && runtime.renderAttachment(attachment)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-green-500 text-center py-8 opacity-75">
                    [ AWAITING TRANSMISSION ]
                  </div>
                )}
              </div>
              
              {/* Input form commented out - only receiving WebSocket messages
              <form onSubmit={handleSubmit} className="flex p-2 border-t border-green-700 bg-zinc-800">
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
                  placeholder="Enter message for Command..."
                  className="flex-1 p-2 bg-zinc-900 border border-green-700 rounded-l text-green-400 font-mono placeholder:text-green-600 focus:outline-none focus:ring-1 focus:ring-green-500"
                  disabled={isLoading}
                />
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-green-800 text-black font-mono uppercase tracking-wide rounded-r hover:bg-green-600 focus:outline-none disabled:bg-zinc-700 disabled:text-zinc-500 transition-colors"
                  disabled={isLoading || (useRuntimeChat ? !(runtime.input && runtime.input.trim()) : !chatInput.trim())}
                >
                  {isLoading ? 'SENDING...' : 'TRANSMIT'}
                </button>
              </form>
              */}
              <div className="p-2 border-t border-green-700 bg-zinc-800 text-center">
                <div className="text-green-500 font-mono text-sm">
                  [ INCOMING TRANSMISSIONS ONLY ]
                </div>
              </div>
            </div>
          </div>

          {/* Influence Analysis (formerly Heatmap) */}
          <div className="flex-1 border-2 border-green-700 rounded p-4 bg-zinc-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-mono uppercase tracking-wider">INFLUENCE ANALYSIS</h2>
              <div className="font-mono text-xs px-2 py-1 bg-zinc-700 rounded border border-green-700">
                REFRESHED: {getTimestamp()}
              </div>
            </div>
            <div className="h-[25vh] bg-zinc-900 rounded border border-green-700 p-4 relative overflow-auto">
              <div className="absolute top-2 left-2 text-xs font-mono text-green-600">ANALYSIS TYPE: STRATEGIC INFLUENCE</div>
              
              {!influenceAnalysis ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-green-500 font-mono tracking-wide mb-2">AWAITING DATA TRANSMISSION...</p>
                  
                  {/* Simulated radar scan effect */}
                  <div className="w-32 h-32 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border-2 border-green-500 rounded-full opacity-10 animate-ping"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border border-green-500 rounded-full opacity-20"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] border border-green-500 rounded-full opacity-30"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] border border-green-500 rounded-full opacity-40"></div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 h-full">
                  {/* Top Influencers */}
                  <div className="border border-green-700 bg-zinc-800 bg-opacity-50 p-2 rounded">
                    <h3 className="text-sm font-mono text-green-400 mb-2">TOP INFLUENCE FACTORS</h3>
                    <ul className="text-xs font-mono space-y-1">
                      {Object.keys(influenceAnalysis).map((action, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>{action}:</span>
                          <span className="text-green-300">
                            {influenceAnalysis[action]?.top_3_overall?.features?.slice(0, 3).join(', ') || 'N/A'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Entity Breakdown */}
                  <div className="border border-green-700 bg-zinc-800 bg-opacity-50 p-2 rounded">
                    <h3 className="text-sm font-mono text-green-400 mb-2">ENTITY INFLUENCE SCORES</h3>
                    <ul className="text-xs font-mono space-y-1">
                      {Object.keys(influenceAnalysis).slice(0, 3).map((action, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>{action}:</span>
                          <span className="text-green-300">
                            {influenceAnalysis[action]?.entities?.top_3?.scores
                              ?.map((score: number) => score.toFixed(2))
                              .join(', ') || 'N/A'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Visibility Analysis */}
                  <div className="border border-green-700 bg-zinc-800 bg-opacity-50 p-2 rounded">
                    <h3 className="text-sm font-mono text-green-400 mb-2">VISIBILITY METRICS</h3>
                    <ul className="text-xs font-mono space-y-1">
                      {Object.keys(influenceAnalysis).slice(0, 1).map((action, idx) => (
                        <React.Fragment key={idx}>
                          <li className="flex justify-between">
                            <span>Legacy:</span>
                            <span className="text-green-300">
                              {influenceAnalysis[action]?.visibility?.legacy?.toFixed(2) || 'N/A'}
                            </span>
                          </li>
                          <li className="flex justify-between">
                            <span>Dynasty:</span>
                            <span className="text-green-300">
                              {influenceAnalysis[action]?.visibility?.dynasty?.toFixed(2) || 'N/A'}
                            </span>
                          </li>
                        </React.Fragment>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Mission Impact */}
                  <div className="border border-green-700 bg-zinc-800 bg-opacity-50 p-2 rounded">
                    <h3 className="text-sm font-mono text-green-400 mb-2">MISSION IMPACT</h3>
                    <ul className="text-xs font-mono space-y-1">
                      {Object.keys(influenceAnalysis).slice(0, 3).map((action, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>{action}:</span>
                          <span className="text-green-300">
                            {influenceAnalysis[action]?.mission?.top_3?.scores
                              ?.map((score: number) => score.toFixed(2))
                              .join(', ') || 'N/A'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}