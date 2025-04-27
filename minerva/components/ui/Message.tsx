import React from "react";

type Category = 'positive' | 'negative' | 'neutral';

type MessageProps = {
  action: string;
  vehicle: string;
  callSign: string;
  enemy?: string;  // Optional field
  explanation: string;
  category: Category;
};

const getCategoryStyles = (category: Category): string => {
  switch (category) {
    case 'positive':
      return 'bg-green-100';
    case 'negative':
      return 'bg-red-100';
    default:
      return 'bg-gray-100';
  }
};

const Message: React.FC<MessageProps> = ({ action, vehicle, callSign, enemy, explanation, category }) => (
  <div className="mb-3">
    <div className={`${getCategoryStyles(category)} rounded-lg px-4 py-3 inline-block max-w-[90%]`}>
      <h1 className="text-lg font-bold">{vehicle}: {callSign}</h1>
      <h2 className="text-md font-semibold mt-1">{action}</h2>
      {enemy && (
        <h2 className="text-md font-semibold mt-1 text-red-600">Enemy: {enemy}</h2>
      )}
      <p className="text-sm text-gray-700 mt-2">{explanation}</p>
    </div>
  </div>
);

export default Message;