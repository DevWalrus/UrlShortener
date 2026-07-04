import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthGuard } from './AuthGuard';
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
});
