// src/components/lora/LoRAPairSelector.tsx

'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Package, ChevronDown, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';

export interface LoRAFile {
  id: string;
  name: string;
  fileName: string;
  s3Path: string;
  s3Url: string;
  presignedUrl?: string;
  fileSize: string;
  extension: string;
  uploadedAt: string;
  workspaceId?: string;
  lastUsed?: string;
}

interface LoRAPair {
  baseName: string;
  high?: LoRAFile;
  low?: LoRAFile;
  isComplete: boolean;
}

export interface LoRAPairSelectorProps {
  highValue: string; // S3 path of selected high LoRA
  lowValue: string; // S3 path of selected low LoRA
  highWeight: number; // Weight for high LoRA (0-1)
  lowWeight: number; // Weight for low LoRA (0-1)
  onHighChange: (value: string) => void;
  onLowChange: (value: string) => void;
  onHighWeightChange: (weight: number) => void;
  onLowWeightChange: (weight: number) => void;
  availableLoras: LoRAFile[];
  onManageClick: () => void;
}

export function LoRAPairSelector({
  highValue,
  lowValue,
  highWeight,
  lowWeight,
  onHighChange,
  onLowChange,
  onHighWeightChange,
  onLowWeightChange,
  availableLoras,
  onManageClick,
}: LoRAPairSelectorProps) {
  const { t } = useI18n();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Group LoRAs into pairs
  const loraPairs = useMemo(() => {
    const pairs = new Map<string, LoRAPair>();

    availableLoras.forEach((lora) => {
      const fileName = lora.fileName.toLowerCase();
      let baseName = lora.name;
      let type: 'high' | 'low' | null = null;

      if (fileName.includes('_high') || fileName.includes('-high')) {
        baseName = lora.name.replace(/_high|_High|-high|-High/gi, '');
        type = 'high';
      } else if (fileName.includes('_low') || fileName.includes('-low')) {
        baseName = lora.name.replace(/_low|_Low|-low|-Low/gi, '');
        type = 'low';
      }

      if (!pairs.has(baseName)) {
        pairs.set(baseName, {
          baseName,
          high: undefined,
          low: undefined,
          isComplete: false,
        });
      }

      const pair = pairs.get(baseName)!;
      if (type === 'high') {
        pair.high = lora;
      } else if (type === 'low') {
        pair.low = lora;
      }

      pair.isComplete = !!(pair.high && pair.low);
    });

    return Array.from(pairs.values()).sort((a, b) => {
      if (a.isComplete && !b.isComplete) return -1;
      if (!a.isComplete && b.isComplete) return 1;
      return a.baseName.localeCompare(b.baseName);
    });
  }, [availableLoras]);

  // Filter pairs based on search query
  const filteredPairs = useMemo(() => {
    if (!searchQuery.trim()) {
      return loraPairs;
    }
    const query = searchQuery.toLowerCase();
    return loraPairs.filter((pair) =>
      pair.baseName.toLowerCase().includes(query)
    );
  }, [loraPairs, searchQuery]);

  // Find selected pair
  const selectedPair = useMemo(() => {
    return loraPairs.find(
      (pair) =>
        pair.high?.s3Path === highValue || pair.low?.s3Path === lowValue
    );
  }, [loraPairs, highValue, lowValue]);

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

  // Handle click outside
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

  // Handle pair selection
  const handleSelectPair = (pair: LoRAPair) => {
    if (pair.high) onHighChange(pair.high.s3Path);
    if (pair.low) onLowChange(pair.low.s3Path);
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  // Handle clear
  const handleClear = () => {
    onHighChange('');
    onLowChange('');
  };

  return (
    <div className="space-y-2 relative">
      <div className="flex items-center justify-between">
        <Label>{t('loraManagement.selector.label')}</Label>
        <span className="text-xs text-muted-foreground">{t('loraManagement.selector.description')}</span>
      </div>

      {selectedPair ? (
        // Selected pair card
        <div className="rounded-lg border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition-all duration-200">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-5 w-5 text-primary" />
            <h4 className="font-medium text-sm">{selectedPair.baseName}</h4>
            {selectedPair.isComplete && (
              <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded">{t('loraManagement.status.complete')}</span>
            )}
          </div>

          {/* High/Low with weights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* High LoRA */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{t('loraManagement.status.high')}</span>
                {selectedPair.high && (
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(selectedPair.high.fileSize)}
                  </span>
                )}
              </div>
              {selectedPair.high && (
                <>
                  <p className="text-xs truncate" title={selectedPair.high.fileName}>
                    {selectedPair.high.fileName}
                  </p>
                  <div className="space-y-1">
                    <Label htmlFor="high-weight" className="text-xs">{t('loraManagement.selector.weight')}</Label>
                    <Input
                      id="high-weight"
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={highWeight}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val >= 0 && val <= 1) {
                          onHighWeightChange(val);
                        }
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Low LoRA */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{t('loraManagement.status.low')}</span>
                {selectedPair.low && (
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(selectedPair.low.fileSize)}
                  </span>
                )}
              </div>
              {selectedPair.low && (
                <>
                  <p className="text-xs truncate" title={selectedPair.low.fileName}>
                    {selectedPair.low.fileName}
                  </p>
                  <div className="space-y-1">
                    <Label htmlFor="low-weight" className="text-xs">{t('loraManagement.selector.weight')}</Label>
                    <Input
                      id="low-weight"
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={lowWeight}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val >= 0 && val <= 1) {
                          onLowWeightChange(val);
                        }
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDropdownOpen(true)}
              className="flex-1"
            >
              {t('loraManagement.actions.change')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="flex-1"
            >
              {t('loraManagement.actions.clear')}
            </Button>
          </div>
        </div>
      ) : (
        // Empty state
        <div className="rounded-lg border border-dashed bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('loraManagement.selector.noLoraSelected')}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDropdownOpen(true)}
              disabled={loraPairs.length === 0}
            >
              <ChevronDown className="h-4 w-4 mr-1" />
              {t('loraManagement.selector.selectPair')}
            </Button>
          </div>
        </div>
      )}

      {/* Dropdown */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 left-0 right-0 rounded-md border bg-background shadow-lg animate-in fade-in-0 zoom-in-95"
        >
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder={t('loraManagement.selector.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Pair list */}
          <div className="max-h-80 overflow-y-auto">
            {filteredPairs.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{searchQuery ? t('loraManagement.selector.noPairsFound') : t('loraManagement.selector.noPairsAvailable')}</p>
              </div>
            ) : (
              <>
                {filteredPairs.map((pair) => (
                  <button
                    key={pair.baseName}
                    type="button"
                    onClick={() => handleSelectPair(pair)}
                    className="w-full px-3 py-3 text-left hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Package className={`h-4 w-4 ${pair.isComplete ? 'text-green-500' : 'text-yellow-500'}`} />
                      <span className="text-sm font-medium">{pair.baseName}</span>
                      {pair.isComplete ? (
                        <span className="text-xs bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded">{t('loraManagement.status.complete')}</span>
                      ) : (
                        <span className="text-xs bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded">{t('loraManagement.status.incomplete')}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium">{t('loraManagement.status.high')}:</span> {pair.high ? '✓' : '✗'}
                      </div>
                      <div>
                        <span className="font-medium">{t('loraManagement.status.low')}:</span> {pair.low ? '✓' : '✗'}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* Upload button */}
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onManageClick();
                }}
                className="w-full justify-start"
              >
                <Upload className="h-4 w-4 mr-2" />
                {t('loraManagement.selector.uploadNewLora')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
