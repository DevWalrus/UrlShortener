import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Create from './Create';
import * as linksApi from '../api/links';
import { AuthContext } from '../hooks/useAuth';

vi.mock('../api/links', () => ({
  createLink: vi.fn(),
  ForbiddenError: class ForbiddenError extends Error {},
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const createLinkMock = vi.mocked(linksApi.createLink);
const handleError = vi.fn();

function renderCreate() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ forbidden: false, handleError }}>
        <Create />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('Create page — slug sanitization', () => {
  it('uppercases typed slug', async () => {
    renderCreate();
    const slugInput = screen.getByLabelText(/custom slug/i);
    await userEvent.type(slugInput, 'abc');
    expect(slugInput).toHaveValue('ABC');
  });

  it('strips non-alphanumeric characters from slug', async () => {
    renderCreate();
    const slugInput = screen.getByLabelText(/custom slug/i);
    await userEvent.type(slugInput, 'a-b_c!');
    expect(slugInput).toHaveValue('ABC');
  });

  it('truncates slug to 7 characters', async () => {
    renderCreate();
    const slugInput = screen.getByLabelText(/custom slug/i);
    await userEvent.type(slugInput, 'ABCDEFGH');
    expect(slugInput).toHaveValue('ABCDEFG');
  });
});

describe('Create page — form submission', () => {
  const link = {
    slug: 'ABC1234',
    destination: 'https://example.com',
    hitCount: 0,
    createdAt: '2024-01-01T00:00:00Z',
  };

  it('calls createLink with destination and clears form on success', async () => {
    createLinkMock.mockResolvedValue(link);
    renderCreate();

    await userEvent.type(screen.getByLabelText(/destination url/i), 'https://example.com');
    await userEvent.click(screen.getByRole('button', { name: /create link/i }));

    await waitFor(() => expect(createLinkMock).toHaveBeenCalledWith({
      destination: 'https://example.com',
      customSlug: undefined,
    }));
    await waitFor(() => expect(screen.getByLabelText(/destination url/i)).toHaveValue(''));
  });

  it('shows the short link result after creation', async () => {
    createLinkMock.mockResolvedValue(link);
    renderCreate();

    await userEvent.type(screen.getByLabelText(/destination url/i), 'https://example.com');
    await userEvent.click(screen.getByRole('button', { name: /create link/i }));

    await waitFor(() =>
      expect(screen.getByDisplayValue('https://clinten.dev/ABC1234')).toBeInTheDocument(),
    );
  });

  it('passes customSlug to createLink when filled', async () => {
    createLinkMock.mockResolvedValue(link);
    renderCreate();

    await userEvent.type(screen.getByLabelText(/destination url/i), 'https://example.com');
    await userEvent.type(screen.getByLabelText(/custom slug/i), 'MY7SLUG');
    await userEvent.click(screen.getByRole('button', { name: /create link/i }));

    await waitFor(() => expect(createLinkMock).toHaveBeenCalledWith({
      destination: 'https://example.com',
      customSlug: 'MY7SLUG',
    }));
  });

  it('calls handleError on API failure', async () => {
    createLinkMock.mockRejectedValue(new Error('slug already taken'));
    renderCreate();

    await userEvent.type(screen.getByLabelText(/destination url/i), 'https://example.com');
    await userEvent.click(screen.getByRole('button', { name: /create link/i }));

    await waitFor(() => expect(handleError).toHaveBeenCalled());
  });

  it('shows fallback error message when thrown value is not an Error', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createLinkMock.mockRejectedValue('unexpected string rejection' as any);
    renderCreate();

    await userEvent.type(screen.getByLabelText(/destination url/i), 'https://example.com');
    await userEvent.click(screen.getByRole('button', { name: /create link/i }));

    await waitFor(() => expect(handleError).toHaveBeenCalled());
  });

  it('disables button while submitting', async () => {
    createLinkMock.mockReturnValue(new Promise(() => {}));
    renderCreate();

    await userEvent.type(screen.getByLabelText(/destination url/i), 'https://example.com');
    await userEvent.click(screen.getByRole('button', { name: /create link/i }));

    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
  });
});
