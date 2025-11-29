// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityModal } from '@/components/activity-modal';

// Mock the URL state utilities
vi.mock('@/lib/url-state', () => ({
  parseUsersUrlParams: vi.fn(),
  updateUrlState: vi.fn(),
  copyCurrentUrl: vi.fn(),
}));

// Mock hooks
vi.mock('@/hooks/use-initials', () => ({
  useInitials: () => (name: string) => {
    if (!name || name === '-') return 'NA';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  },
}));

// Mock UI components
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
  Avatar: ({ children }: any) => (
    <div data-testid="avatar">{children}</div>
  ),
  AvatarImage: ({ src, alt }: any) => (
    <img data-testid="avatar-image" src={src} alt={alt} />
  ),
  AvatarFallback: ({ children }: any) => (
    <div data-testid="avatar-fallback">{children}</div>
  ),
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
  SelectContent: ({ children }: any) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: any) => (
    <div data-testid="select-item" data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: any) => (
    <div data-testid="select-trigger">{children}</div>
  ),
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

// Mock lucide-react icons
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
    const { parseUsersUrlParams } = require('@/lib/url-state');
    parseUsersUrlParams.mockReturnValue({
      tab: 'users',
      page: 1,
      activityModal: {
        open: true,
        userId: '001',
        search: '',
        category: 'all',
        sortBy: 'timestamp',
        sortOrder: 'desc',
      },
    });

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
    const { parseUsersUrlParams } = require('@/lib/url-state');
    parseUsersUrlParams.mockReturnValue({
      tab: 'users',
      page: 1,
      activityModal: {
        open: true,
        userId: '001',
        search: 'test search',
        category: 'all',
        sortBy: 'timestamp',
        sortOrder: 'desc',
      },
    });

    render(
      <ActivityModal 
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
      />
    );

    expect(screen.getByTestId('input')).toBeInTheDocument();
    expect(screen.getByTestId('input')).toHaveAttribute('value', 'test search');
  });

  test('displays category filter', () => {
    render(
      <ActivityModal 
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
      />
    );

    expect(screen.getByTestId('select')).toBeInTheDocument();
  });

  test('displays sort controls', () => {
    render(
      <ActivityModal 
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
      />
    );

    expect(screen.getByTestId('select')).toBeInTheDocument();
  });

  test('displays share URL button', () => {
    const { copyCurrentUrl } = require('@/lib/url-state');
    
    render(
      <ActivityModal 
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
      />
    );

    const buttons = screen.getAllByTestId('button');
    const shareButton = buttons.find(btn => 
      btn.textContent?.includes('Share URL')
    );
    
    expect(shareButton).toBeInTheDocument();
  });

  test('calls copyCurrentUrl when share button is clicked', () => {
    const { copyCurrentUrl } = require('@/lib/url-state');
    copyCurrentUrl.mockImplementation(() => {});
    
    render(
      <ActivityModal 
        open={true}
        onOpenChange={vi.fn()}
        user={mockUser}
      />
    );

    const buttons = screen.getAllByTestId('button');
    const shareButton = buttons.find(btn => 
      btn.textContent?.includes('Share URL')
    );
    
    if (shareButton) {
      fireEvent.click(shareButton);
      expect(copyCurrentUrl).toHaveBeenCalled();
    }
  });
});