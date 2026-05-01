import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';

vi.mock('../components/Wizard', () => ({
  Wizard: () => <div>Wizard Stub</div>,
}));

describe('App', () => {
  it('renders the main wizard shell and footer copy', () => {
    render(<App />);

    expect(screen.getByText('Wizard Stub')).toBeInTheDocument();
    expect(screen.getByText(/Engineered with Advanced AI Frameworks/i)).toBeInTheDocument();
  });
});
