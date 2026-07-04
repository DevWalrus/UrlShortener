import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthGuard } from './AuthGuard';
import { useAuth } from '../hooks/useAuth';
import * as linksApi from '../api/links';

vi.mock('../api/links', () => ({
  checkAuth: vi.fn(),
  ForbiddenError: class ForbiddenError extends Error {},
}));

const checkAuthMock = vi.mocked(linksApi.checkAuth);

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={(
            <AuthGuard>
              <div>Protected content</div>
            </AuthGuard>
          )}
        />
        <Route path="/403" element={<div>Forbidden page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('AuthGuard', () => {
  it('shows spinner while auth check is in flight', () => {
    checkAuthMock.mockReturnValue(new Promise(() => {}));
    renderGuard();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders children after successful auth check', async () => {
    checkAuthMock.mockResolvedValue(undefined);
    renderGuard();
    await waitFor(() => expect(screen.getByText('Protected content')).toBeInTheDocument());
  });

  it('navigates to /403 when checkAuth throws ForbiddenError', async () => {
    checkAuthMock.mockRejectedValue(new linksApi.ForbiddenError());
    renderGuard();
    await waitFor(() => expect(screen.getByText('Forbidden page')).toBeInTheDocument());
  });

  it('renders children when checkAuth throws a non-ForbiddenError', async () => {
    checkAuthMock.mockRejectedValue(new Error('network error'));
    renderGuard();
    await waitFor(() => expect(screen.getByText('Protected content')).toBeInTheDocument());
    expect(screen.queryByText('Forbidden page')).not.toBeInTheDocument();
  });

  it('handleError navigates to /403 when called with ForbiddenError', async () => {
    checkAuthMock.mockResolvedValue(undefined);

    function TriggerChild() {
      const { handleError } = useAuth();
      return (
        <button onClick={() => handleError(new linksApi.ForbiddenError())}>trigger</button>
      );
    }

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<AuthGuard><TriggerChild /></AuthGuard>} />
          <Route path="/403" element={<div>Forbidden page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByRole('button', { name: 'trigger' }));
    await userEvent.click(screen.getByRole('button', { name: 'trigger' }));
    await waitFor(() => expect(screen.getByText('Forbidden page')).toBeInTheDocument());
  });

  it('handleError does nothing for non-ForbiddenError', async () => {
    checkAuthMock.mockResolvedValue(undefined);

    function TriggerChild() {
      const { handleError } = useAuth();
      return (
        <button onClick={() => handleError(new Error('network'))}>trigger</button>
      );
    }

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<AuthGuard><TriggerChild /></AuthGuard>} />
          <Route path="/403" element={<div>Forbidden page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByRole('button', { name: 'trigger' }));
    await userEvent.click(screen.getByRole('button', { name: 'trigger' }));
    expect(screen.queryByText('Forbidden page')).not.toBeInTheDocument();
  });
});
