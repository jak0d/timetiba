import React from 'react';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null,
    key: 'default'
  }),
}));

import { AppLayout } from '../AppLayout';

describe('AppLayout', () => {
  it('component is defined', () => {
    expect(AppLayout).toBeDefined();
  });

  it('is a React component', () => {
    expect(typeof AppLayout).toBe('function');
  });
});