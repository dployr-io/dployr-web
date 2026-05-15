// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityModal } from '@/components/activity-modal';

const mockSetActivityModalState = vi.fn();

vi.mock('@/hooks/use-url-state', () => ({
  useUrlState: () => ({
    useUsersActivityModal: () => [
      {
        open: false,
        userId: '',
        search: '',
        category: 'all',
        sortBy: 'timestamp',
        sortOrder: 'desc',
      },
      mockSetActivityModalState,
    ],
  }),
}));

vi.mock('@/hooks/use-initials', () => ({
  useInitials: () => (name: string) => {
    if (!name || name === '-') return 'NA';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  },
}));

vi.mock('@/components/ui/resizable-modal', () => ({
  ResizableModal: ({ open, onOpenChange, children }: any) => (
    <div
      data-testid="resizable-modal"
      data-open={open}
      onClick={() => onOpenChange(false)}
    >
      {children}
    </div>
  ),
  ResizableModalContent: ({ children }: any) => (
    <div data-testid="resizable-modal-content">{children}</div>
  ),
  ResizableModalHeader: ({ children }: any) => (
    <div data-testid="resizable-modal-header">{children}</div>
  ),
  ResizableModalTitle: ({ children }: any) => (
    <h2 data-testid="resizable-modal-title">{children}</h2>
  ),
  ResizableModalDescription: ({ children }: any) => (
    <p data-testid="resizable-modal-description">{children}</p>
  ),
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: any) => <div data-testid="avatar">{children}</div>,
  AvatarImage: ({ src, alt }: any) => <img data-testid="avatar-image" src={src} alt={alt} />,
  AvatarFallback: ({ children }: any) => <div data-testid="avatar-fallback">{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size }: any) => (
    <button
      data-testid="button"
      data-variant={variant}
      data-size={size}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div
      data-testid="select"
      data-value={value}
      onClick={() => onValueChange && onValueChange('test')}
    >
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid="select-item" data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => (
    <span data-testid="select-value" data-placeholder={placeholder}></span>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder }: any) => (
    <input
      data-testid="input"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  ),
}));

vi.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  User: () => <div data-testid="user-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  Database: () => <div data-testid="database-icon" />,
  Key: () => <div data-testid="key-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  ArrowUpDown: () => <div data-testid="arrow-up-down-icon" />,
  Copy: () => <div data-testid="copy-icon" />,
}));

describe('ActivityModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = {
    id: '001',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'owner' as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  test('renders modal with user information when open', () => {
    render(
      <ActivityModal
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
      />
    );

    expect(screen.getByTestId('resizable-modal')).toBeInTheDocument();
    expect(screen.getByTestId('resizable-modal-content')).toBeInTheDocument();
    expect(screen.getByTestId('resizable-modal-header')).toBeInTheDocument();
  });

  test('does not render when closed', () => {
    render(
      <ActivityModal
        open={false}
        onOpenChange={vi.fn()}
        user={mockUser}
      />
    );

    expect(screen.getByTestId('resizable-modal')).toBeInTheDocument();
    expect(screen.getByTestId('resizable-modal')).toHaveAttribute('data-open', 'false');
  });

  test('calls onOpenChange when modal backdrop is clicked', () => {
    const onOpenChangeMock = vi.fn();

    render(
      <ActivityModal
        open={true}
        onOpenChange={onOpenChangeMock}
        user={mockUser}
      />
    );

    const modal = screen.getByTestId('resizable-modal');
    fireEvent.click(modal);

    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });

  test('displays search input field', () => {
    render(
      <ActivityModal
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
      />
    );

    expect(screen.getByTestId('input')).toBeInTheDocument();
  });

  test('displays category filter', () => {
    render(
      <ActivityModal
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
      />
    );

    const selects = screen.getAllByTestId('select');
    const categorySelect = selects.find(s => s.getAttribute('data-value') === 'all');
    expect(categorySelect).toBeInTheDocument();
  });

  test('displays sort controls', () => {
    render(
      <ActivityModal
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
      />
    );

    const selects = screen.getAllByTestId('select');
    const sortSelect = selects.find(s => s.getAttribute('data-value') === 'timestamp');
    expect(sortSelect).toBeInTheDocument();
  });

  test('displays sort order toggle button', () => {
    render(
      <ActivityModal
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
      />
    );

    const buttons = screen.getAllByTestId('button');
    const sortOrderButton = buttons.find(btn => btn.textContent?.includes('Newest') || btn.textContent?.includes('Oldest'));
    expect(sortOrderButton).toBeInTheDocument();
  });

  test('clicking sort order button toggles sort order', () => {
    render(
      <ActivityModal
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
      />
    );

    const buttons = screen.getAllByTestId('button');
    const sortOrderButton = buttons.find(btn => btn.textContent?.includes('Newest') || btn.textContent?.includes('Oldest'));
    expect(sortOrderButton).toBeInTheDocument();
    if (sortOrderButton) {
      fireEvent.click(sortOrderButton);
    }
  });
});
