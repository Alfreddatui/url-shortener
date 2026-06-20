import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShortenForm from '../components/ShortenForm';
import * as api from '../api';

const MOCK_LINK = {
  short_code: '100001',
  short_url: 'http://localhost:3000/100001',
  original_url: 'https://example.com',
  created_at: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('ShortenForm', () => {
  it('renders the URL input and Shorten button', () => {
    render(<ShortenForm creatorUuid="test-uuid" onSuccess={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /shorten/i })).toBeInTheDocument();
  });

  it('shows the short link and fires onSuccess after a successful submit', async () => {
    vi.spyOn(api, 'createLink').mockResolvedValue(MOCK_LINK);
    const onSuccess = vi.fn();

    render(<ShortenForm creatorUuid="test-uuid" onSuccess={onSuccess} />);
    await userEvent.type(screen.getByRole('textbox'), 'https://example.com');
    await userEvent.click(screen.getByRole('button', { name: /shorten/i }));

    await waitFor(() => {
      expect(screen.getByText('http://localhost:3000/100001')).toBeInTheDocument();
      expect(onSuccess).toHaveBeenCalledWith(MOCK_LINK);
    });
  });

  it('shows an error alert when the API call rejects', async () => {
    vi.spyOn(api, 'createLink').mockRejectedValue(new Error('Invalid URL'));

    render(<ShortenForm creatorUuid="test-uuid" onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByRole('textbox'), 'not-a-url');
    await userEvent.click(screen.getByRole('button', { name: /shorten/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid URL');
    });
  });

  it('marks the input as aria-invalid when there is an error', async () => {
    vi.spyOn(api, 'createLink').mockRejectedValue(new Error('Bad request'));

    render(<ShortenForm creatorUuid="test-uuid" onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByRole('textbox'), 'bad');
    await userEvent.click(screen.getByRole('button', { name: /shorten/i }));

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('shows a Copy button (Web Share API is not available in jsdom)', async () => {
    vi.spyOn(api, 'createLink').mockResolvedValue(MOCK_LINK);

    render(<ShortenForm creatorUuid="test-uuid" onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByRole('textbox'), 'https://example.com');
    await userEvent.click(screen.getByRole('button', { name: /shorten/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    });
  });

  it('calls createLink with the correct url and creatorUuid', async () => {
    const spy = vi.spyOn(api, 'createLink').mockResolvedValue(MOCK_LINK);

    render(<ShortenForm creatorUuid="my-uuid-123" onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByRole('textbox'), 'https://example.com');
    await userEvent.click(screen.getByRole('button', { name: /shorten/i }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('https://example.com', 'my-uuid-123');
    });
  });
});
