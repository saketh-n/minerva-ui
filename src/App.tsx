import React, { useState, useEffect } from "react";
import Message from "./components/Message";
import HeatMap from "./components/HeatMap";
import simulationData from "./assets/entity_simulation.json";

type SimulationMessage = {
  vehicle_type: string;
  call_sign: string;
  action: string;
  explanation: string;
  category: string;
  enemy_type?: string;
  enemy_callsign?: string;
};

function App() {
  const [messages, setMessages] = useState<SimulationMessage[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);

  useEffect(() => {
    // Set up interval to emit messages
    const interval = setInterval(() => {
      // Get the current timestep
      const timestep = simulationData.Timesteps[currentStep];
      
      // Add the new message
      setMessages(prevMessages => [...prevMessages, timestep.message]);
      
      // Update step, loop back to 0 if we reach the end
      setCurrentStep(prev => (prev + 1) % simulationData.Timesteps.length);
      
      // Keep only the last 10 messages to prevent too much memory usage
      setMessages(prevMessages => prevMessages.slice(-10));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentStep]);

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left half - Heatmap */}
      <div className="w-1/2 p-8">
        <h1 className="text-4xl font-bold mb-8">War Game Heatmap</h1>
        <div className="rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
          <HeatMap
            center={[51.505, -0.09]}
            zoom={6}
          />
        </div>
      </div>
      
      {/* Right half - Message Area */}
      <div className="w-1/2 p-8 border-l border-gray-200">
        <h1 className="text-4xl font-bold mb-4">Message Log</h1>
        <div className="h-[calc(100vh-140px)] overflow-y-auto pr-4 border rounded-lg p-4">
          <div className="space-y-1">
            {messages.map((message, index) => (
              <Message 
                key={`${index}-${message.vehicle_type}-${message.call_sign}`}
                vehicle_type={message.vehicle_type}
                call_sign={message.call_sign}
                action={message.action}
                explanation={message.explanation}
                category={message.category}
                enemy_type={message.enemy_type}
                enemy_callsign={message.enemy_callsign}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
