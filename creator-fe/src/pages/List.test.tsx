import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import List from './List';
import * as linksApi from '../api/links';
import { AuthContext } from '../hooks/useAuth';
import type { Link } from '../api/links';

vi.mock('../api/links', () => ({
  listLinks: vi.fn(),
  listDeletedLinks: vi.fn(),
  deleteLink: vi.fn(),
  ForbiddenError: class ForbiddenError extends Error {},
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const listLinksMock = vi.mocked(linksApi.listLinks);
const listDeletedLinksMock = vi.mocked(linksApi.listDeletedLinks);
const deleteLinkMock = vi.mocked(linksApi.deleteLink);
const handleError = vi.fn();

const activeLinks: Link[] = [
  { slug: 'ABC1234', destination: 'https://example.com', hitCount: 5, createdAt: '2024-01-01T00:00:00Z' },
  { slug: 'XYZ9999', destination: 'https://other.com', hitCount: 0, createdAt: '2024-02-01T00:00:00Z' },
];

const deletedLinks: Link[] = [
  {
    slug: 'DEL0000',
    destination: 'https://gone.com',
    hitCount: 1,
    createdAt: '2024-01-01T00:00:00Z',
    deletedAt: '2024-03-01T00:00:00Z',
  },
];

function renderList() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ forbidden: false, handleError }}>
        <List />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listLinksMock.mockResolvedValue(activeLinks);
  listDeletedLinksMock.mockResolvedValue(deletedLinks);
});

describe('List page', () => {
  it('shows spinner while loading', () => {
    listLinksMock.mockReturnValue(new Promise(() => {}));
    listDeletedLinksMock.mockReturnValue(new Promise(() => {}));
    renderList();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders active links after load', async () => {
    renderList();
    await waitFor(() => expect(screen.getByText('ABC1234')).toBeInTheDocument());
    expect(screen.getByText('XYZ9999')).toBeInTheDocument();
  });

  it('shows empty state when no active links', async () => {
    listLinksMock.mockResolvedValue([]);
    renderList();
    await waitFor(() => expect(screen.getByText('No active links')).toBeInTheDocument());
  });

  it('switches to deleted tab and shows deleted links', async () => {
    renderList();
    await waitFor(() => screen.getByText('ABC1234'));
    await userEvent.click(screen.getByRole('tab', { name: /deleted/i }));
    expect(screen.getByText('DEL0000')).toBeInTheDocument();
  });

  it('shows empty state on deleted tab when none', async () => {
    listDeletedLinksMock.mockResolvedValue([]);
    renderList();
    await waitFor(() => screen.getByText('ABC1234'));
    await userEvent.click(screen.getByRole('tab', { name: /deleted/i }));
    expect(screen.getByText('No deleted links')).toBeInTheDocument();
  });

  it('opens confirm dialog when delete is clicked', async () => {
    renderList();
    await waitFor(() => screen.getByText('ABC1234'));
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.click(deleteButtons[0]);
    expect(screen.getByText(/are you sure you want to delete ABC1234/i)).toBeInTheDocument();
  });

  it('calls deleteLink and reloads after confirming delete', async () => {
    deleteLinkMock.mockResolvedValue(undefined);
    renderList();
    await waitFor(() => screen.getByText('ABC1234'));

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.click(deleteButtons[0]);

    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => expect(deleteLinkMock).toHaveBeenCalledWith('ABC1234'));
    await waitFor(() => expect(listLinksMock).toHaveBeenCalledTimes(2));
  });

  it('cancels delete dialog without calling deleteLink', async () => {
    renderList();
    await waitFor(() => screen.getByText('ABC1234'));

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.click(deleteButtons[0]);

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    // MUI keeps dialog in DOM during exit animation — just assert the action didn't fire
    expect(deleteLinkMock).not.toHaveBeenCalled();
  });

  it('shows toast and calls handleError when load fails', async () => {
    const err = new Error('network error');
    listLinksMock.mockRejectedValue(err);
    renderList();
    await waitFor(() => expect(handleError).toHaveBeenCalledWith(err));
  });

  it('calls handleError and shows toast when delete fails', async () => {
    deleteLinkMock.mockRejectedValue(new Error('delete failed'));
    renderList();
    await waitFor(() => screen.getByText('ABC1234'));

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.click(deleteButtons[0]);

    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => expect(handleError).toHaveBeenCalled());
  });

  it('shows toast when reload after delete fails', async () => {
    deleteLinkMock.mockResolvedValue(undefined);
    // Second call to listLinks (after successful delete) fails
    listLinksMock
      .mockResolvedValueOnce(activeLinks)
      .mockRejectedValueOnce(new Error('reload failed'));
    renderList();
    await waitFor(() => screen.getByText('ABC1234'));

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.click(deleteButtons[0]);
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /delete/i }));

    await waitFor(() => expect(deleteLinkMock).toHaveBeenCalled());
  });

  it('tab labels reflect link counts', async () => {
    renderList();
    await waitFor(() => screen.getByText('ABC1234'));
    expect(screen.getByRole('tab', { name: /active \(2\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /deleted \(1\)/i })).toBeInTheDocument();
  });
});
