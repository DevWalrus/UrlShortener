import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';
import Forbidden from './Forbidden';
import NotFound from './NotFound';

describe('Home', () => {
  it('renders heading and navigation buttons', () => {
    render(<MemoryRouter><Home /></MemoryRouter>);
    expect(screen.getByText('clinten.dev')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create a link/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /manage links/i })).toBeInTheDocument();
  });
});

describe('Forbidden', () => {
  it('renders 403 message', () => {
    render(<Forbidden />);
    expect(screen.getByText('403')).toBeInTheDocument();
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });
});

describe('NotFound', () => {
  it('renders generic 404 when no slug param', () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>);
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Page not found.')).toBeInTheDocument();
  });

  it('renders slug-specific message when slug param is present', () => {
    render(
      <MemoryRouter initialEntries={['/?slug=ABC1234']}>
        <NotFound />
      </MemoryRouter>,
    );
    expect(screen.getByText(/ABC1234/)).toBeInTheDocument();
  });
});
