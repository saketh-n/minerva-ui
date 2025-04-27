# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Lint/Test Commands
- Build: `npm run build` - Runs TypeScript compiler and Vite build
- Dev: `npm run dev` - Starts Vite development server
- Lint: `npm run lint` - Runs ESLint on TypeScript/TSX files
- Preview: `npm run preview` - Starts Vite preview server

## Code Style Guidelines
- **TypeScript**: Use strict typing with no implicit any. Define interfaces for props and state.
- **React**: Follow React hooks best practices. Use functional components with hooks.
- **Formatting**: Use standard indentation (2 spaces) and semicolons.
- **Imports**: Group imports by external libraries, then internal modules.
- **Component Structure**: Props interface at top, followed by helper functions, then component.
- **Error Handling**: Use try/catch blocks for async operations.
- **Naming**: PascalCase for components, camelCase for variables and functions.
- **State Management**: Prefer useState/useEffect for local state; useRef for values persisting across renders.
- **CSS**: Use Tailwind utility classes or component-scoped CSS.