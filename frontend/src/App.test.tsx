import React from 'react';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
}));

// Simple test to verify App component exists
test('App component is defined', () => {
  const App = require('./App').default;
  expect(App).toBeDefined();
});
