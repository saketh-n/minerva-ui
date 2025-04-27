# Military Message Log

A real-time message logging system that displays military-style messages with vehicle types, call signs, and mission status updates. The system consists of a Python WebSocket server that emits messages and a React frontend that displays them in real-time.

## Features

- Real-time message updates via WebSocket
- Military-style message format with call signs
- Color-coded messages based on status (positive, negative, neutral)
- Vehicle types and optional enemy information
- Clean, modern UI with Tailwind CSS

## Project Structure

```
message-log/
├── src/                    # React frontend source
│   ├── components/         # React components
│   │   └── Message.tsx    # Message component
│   ├── App.tsx            # Main App component
│   └── index.css          # Tailwind CSS imports
├── server/                 # Python backend
│   ├── message_server.py  # WebSocket server
│   └── requirements.txt   # Python dependencies
└── package.json           # Node.js dependencies
```

## Prerequisites

- Node.js (v16 or higher)
- Python (v3.8 or higher)
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd message-log
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Set up Python virtual environment and install dependencies:
   ```bash
   cd server
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

## Running the Application

1. Start the Python WebSocket server:
   ```bash
   cd server
   python message_server.py
   ```

2. In a new terminal, start the React development server:
   ```bash
   cd message-log
   npm run dev
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

## Message Format

Messages follow this structure:
- Vehicle Type: Call Sign (e.g., "Fighter Jet: Raptor 1-1")
- Action (e.g., "ENGAGE", "PATROL", "RETURN TO BASE")
- Optional Enemy Information
- Detailed Explanation

Messages are color-coded:
- 🟢 Green: Positive outcomes (mission success, return to base)
- 🔴 Red: Combat situations or negative events
- ⚪ Gray: Neutral activities (patrol, reconnaissance)

## Development

- Frontend is built with React, TypeScript, and Tailwind CSS
- Backend uses Python's websockets library
- Messages are emitted every 3 seconds with randomized content
- WebSocket connection is maintained at `ws://localhost:8765`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
