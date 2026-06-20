import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LinkList from '../components/LinkList';
import * as api from '../api';

const MOCK_LINKS = [
  {
    short_code: '100001',
    short_url: 'http://localhost:3000/100001',
    original_url: 'https://example.com/very/long/path',
    created_at: '2024-06-01T00:00:00Z',
  },
  {
    short_code: '100002',
    short_url: 'http://localhost:3000/100002',
    original_url: 'https://another.example.com',
    created_at: '2024-06-02T00:00:00Z',
  },
];

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('LinkList', () => {
  it('renders nothing when the list is empty', async () => {
    vi.spyOn(api, 'getMyLinks').mockResolvedValue([]);
    const { container } = render(<LinkList creatorUuid="test-uuid" newLink={null} />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders all links after loading', async () => {
    vi.spyOn(api, 'getMyLinks').mockResolvedValue(MOCK_LINKS);

    render(<LinkList creatorUuid="test-uuid" newLink={null} />);

    await waitFor(() => {
      expect(screen.getByText('http://localhost:3000/100001')).toBeInTheDocument();
      expect(screen.getByText('http://localhost:3000/100002')).toBeInTheDocument();
    });
  });

  it('shows the "My Links" heading when links are present', async () => {
    vi.spyOn(api, 'getMyLinks').mockResolvedValue(MOCK_LINKS);

    render(<LinkList creatorUuid="test-uuid" newLink={null} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /my links/i })).toBeInTheDocument();
    });
  });

  it('refetches when newLink changes', async () => {
    const spy = vi.spyOn(api, 'getMyLinks').mockResolvedValue(MOCK_LINKS);
    const { rerender } = render(<LinkList creatorUuid="test-uuid" newLink={null} />);

    rerender(<LinkList creatorUuid="test-uuid" newLink={MOCK_LINKS[0]} />);

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  it('renders each link as an anchor pointing to the short URL', async () => {
    vi.spyOn(api, 'getMyLinks').mockResolvedValue(MOCK_LINKS);

    render(<LinkList creatorUuid="test-uuid" newLink={null} />);

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /100001/i });
      expect(link).toHaveAttribute('href', 'http://localhost:3000/100001');
    });
  });
});
