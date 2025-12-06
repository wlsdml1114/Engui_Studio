// src/components/lora/LoRASelector.tsx

'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Package, ChevronDown, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface LoRAFile {
  id: string;
  name: string;
  fileName: string;
  s3Path: string;
  s3Url: string;
  presignedUrl?: string; // Optional presigned URL with expiration
  fileSize: string;
  extension: string;
  uploadedAt: string;
  workspaceId?: string;
  lastUsed?: string;
}

export interface LoRASelectorProps {
  value: string; // S3 path of selected LoRA
  onChange: (value: string) => void;
  label: string;
  description?: string;
  availableLoras: LoRAFile[];
  onManageClick: () => void;
}

export function LoRASelector({
  value,
  onChange,
  label,
  description,
  availableLoras,
  onManageClick,
}: LoRASelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find the selected LoRA
  const selectedLoRA = useMemo(
    () => availableLoras.find((lora) => lora.s3Path === value),
    [availableLoras, value]
  );

  // Filter LoRAs based on search query
  const filteredLoras = useMemo(() => {
    if (!searchQuery.trim()) {
      return availableLoras;
    }
    const query = searchQuery.toLowerCase();
    return availableLoras.filter(
      (lora) =>
        lora.name.toLowerCase().includes(query) ||
        lora.fileName.toLowerCase().includes(query)
    );
  }, [availableLoras, searchQuery]);

  // Separate recent LoRAs (those with lastUsed)
  const recentLoras = useMemo(() => {
    return filteredLoras
      .filter((lora) => lora.lastUsed)
      .sort((a, b) => {
        const dateA = new Date(a.lastUsed!).getTime();
        const dateB = new Date(b.lastUsed!).getTime();
        return dateB - dateA;
      })
      .slice(0, 3);
  }, [filteredLoras]);

  // All other LoRAs
  const allLoras = useMemo(() => {
    const recentIds = new Set(recentLoras.map((lora) => lora.id));
    return filteredLoras.filter((lora) => !recentIds.has(lora.id));
  }, [filteredLoras, recentLoras]);

  // Format file size
  const formatFileSize = (sizeStr: string): string => {
    const bytes = parseInt(sizeStr, 10);
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  // Format upload date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isDropdownOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isDropdownOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  // Handle LoRA selection
  const handleSelectLoRA = (lora: LoRAFile) => {
    onChange(lora.s3Path);
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  // Handle clear selection
  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={`lora-selector-${label}`}>{label}</Label>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>

      {selectedLoRA ? (
        // Selected LoRA card
        <div className="group rounded-lg border bg-card p-3 sm:p-4 hover:border-primary/50 hover:shadow-sm transition-all duration-200">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors flex-shrink-0">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate group-hover:text-primary transition-colors" title={selectedLoRA.fileName}>
                {selectedLoRA.fileName}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatFileSize(selectedLoRA.fileSize)} • Uploaded{' '}
                {formatDate(selectedLoRA.uploadedAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDropdownOpen(true)}
              className="flex-1 hover:bg-primary/10 transition-colors"
            >
              Change
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="flex-1 hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onManageClick}
              className="flex-1 hover:bg-primary/10 transition-colors"
            >
              Manage
            </Button>
          </div>
        </div>
      ) : (
        // Empty state
        <div className="rounded-lg border border-dashed bg-muted/30 p-3 sm:p-4 hover:bg-muted/50 hover:border-muted-foreground/40 transition-all duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">No LoRA selected</span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDropdownOpen(true)}
                disabled={availableLoras.length === 0}
                className="flex-1 sm:flex-initial hover:bg-primary/10 transition-colors"
              >
                <ChevronDown className="h-4 w-4 mr-1" />
                Select LoRA
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onManageClick}
                className="flex-1 sm:flex-initial hover:bg-primary/10 transition-colors"
              >
                Manage
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full max-w-md rounded-md border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search LoRAs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 focus-visible:ring-primary"
              />
            </div>
          </div>

          {/* LoRA list */}
          <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            {filteredLoras.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{searchQuery ? 'No LoRAs found' : 'No LoRAs available'}</p>
              </div>
            ) : (
              <>
                {/* Recent LoRAs */}
                {recentLoras.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Recent
                    </div>
                    {recentLoras.map((lora) => (
                      <button
                        key={lora.id}
                        type="button"
                        onClick={() => handleSelectLoRA(lora)}
                        className={cn(
                          'w-full px-3 py-2.5 text-left hover:bg-accent transition-colors duration-150',
                          lora.s3Path === value && 'bg-accent/50'
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                            <Package className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" title={lora.fileName}>
                              {lora.fileName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatFileSize(lora.fileSize)} •{' '}
                              {formatDate(lora.uploadedAt)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* All LoRAs */}
                {allLoras.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {recentLoras.length > 0 ? 'All LoRAs' : 'Available LoRAs'}
                    </div>
                    {allLoras.map((lora) => (
                      <button
                        key={lora.id}
                        type="button"
                        onClick={() => handleSelectLoRA(lora)}
                        className={cn(
                          'w-full px-3 py-2.5 text-left hover:bg-accent transition-colors duration-150',
                          lora.s3Path === value && 'bg-accent/50'
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                            <Package className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" title={lora.fileName}>
                              {lora.fileName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatFileSize(lora.fileSize)} •{' '}
                              {formatDate(lora.uploadedAt)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Upload new LoRA button */}
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onManageClick();
                }}
                className="w-full justify-start hover:bg-primary/10 transition-colors"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload New LoRA
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
