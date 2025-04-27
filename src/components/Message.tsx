import React from "react";

type MessageProps = {
  vehicle_type: string;
  call_sign: string;
  action: string;
  explanation: string;
  category: string;
  enemy_type?: string;
  enemy_callsign?: string;
};

const getCategoryStyles = (category: string): string => {
  switch (category) {
    case 'Good':
      return 'bg-green-900 text-green-100';
    case 'Bad':
      return 'bg-red-900 text-red-100';
    default:
      return 'bg-gray-700 text-gray-100';
  }
};

const Message: React.FC<MessageProps> = ({ 
  vehicle_type, 
  call_sign, 
  action, 
  explanation, 
  category,
  enemy_type,
  enemy_callsign
}) => (
  <div className="mb-3">
    <div className={`${getCategoryStyles(category)} rounded-lg px-4 py-3 inline-block max-w-[90%]`}>
      <h1 className="text-lg font-bold">{vehicle_type}:{call_sign}</h1>
      <h2 className="text-md font-semibold mt-1">{action}</h2>
      {enemy_type && enemy_callsign && (
        <h2 className="text-md font-semibold mt-1 text-red-300">{enemy_type}:{enemy_callsign}</h2>
      )}
      <p className="text-sm mt-2 opacity-90">{explanation}</p>
    </div>
  </div>
);

export default Message; 