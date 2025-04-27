# Minerva UI

A real-time military message logging system that displays messages with vehicle types, call signs, and mission status updates. The application connects to a WebSocket server to receive messages and displays them in a modern, military-style interface with influence analysis metrics.

## Features

- Real-time message updates via WebSocket
- Military-style message format with call signs
- Color-coded messages based on status (positive, negative, neutral)
- Vehicle types and optional enemy information
- Influence analysis metrics and visualizations
- Clean, modern UI with Tailwind CSS
- Built with Next.js and TypeScript

## Project Structure

```
minerva-ui/
├── minerva/               # Next.js application
│   ├── app/               # Next.js app directory
│   │   └── page.tsx      # Main application page
│   ├── components/        # React components
│   ├── lib/               # Utility functions
│   └── package.json       # Next.js dependencies
└── package.json           # Root package.json
```

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd minerva-ui
   ```

2. Install root dependencies:
   ```bash
   npm install
   ```

3. Install Next.js application dependencies:
   ```bash
   cd minerva
   npm install
   ```

## Running the Application

1. Start the WebSocket server (requires separate setup, not included in this repository).

2. In a terminal, start the Next.js development server:
   ```bash
   cd minerva
   npm run dev
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

Note: The application expects a WebSocket server running at `ws://localhost:8765`. Make sure the WebSocket server is running before starting the application.

## Message Format

Messages follow this structure:
- Vehicle Type: Call Sign (e.g., "Fighter Jet: Raptor 1-1")
- Action (e.g., "ENGAGE", "PATROL", "RETURN TO BASE")
- Optional Enemy Information
- Detailed Explanation
- Timestamp

Messages are color-coded:
- 🟢 Green: Positive outcomes (mission success, return to base)
- 🔴 Red: Combat situations or negative events
- ⚪ Gray: Neutral activities (patrol, reconnaissance)

## Influence Analysis

The application displays various influence analysis metrics for each message:
- Top Influence Factors
- Entity Influence Scores
- Visibility Metrics
- Mission Impact

## Development

- Frontend is built with Next.js, TypeScript, and Tailwind CSS
- Uses @assistant-ui/react components for chat interface
- WebSocket connection is maintained at `ws://localhost:8765`
- Supports both WebSocket messages and direct chat input

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
