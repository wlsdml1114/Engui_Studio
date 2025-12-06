"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
} from '@/components/ui/dialog';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { validateLoRAFileClient } from '@/lib/loraValidation';
import { Upload, Trash2, Package, AlertCircle, CheckCircle, X, RefreshCw } from 'lucide-react';

// TypeScript interfaces
interface LoRAFile {
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
}

interface LoRAPair {
  baseName: string;
  high?: LoRAFile;
  low?: LoRAFile;
  isComplete: boolean;
}

interface LoRAManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoRAUploaded?: () => void;
  workspaceId?: string;
}

export function LoRAManagementDialog({
  open,
  onOpenChange,
  onLoRAUploaded,
  workspaceId,
}: LoRAManagementDialogProps) {
  const [loras, setLoras] = useState<LoRAFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group LoRAs into pairs (high/low)
  const groupLoRAsIntoPairs = useCallback((loraList: LoRAFile[]): LoRAPair[] => {
    const pairs = new Map<string, LoRAPair>();

    loraList.forEach((lora) => {
      // Extract base name by removing _high or _low suffix
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
      } else {
        // If no high/low suffix, treat as standalone
        pair.high = lora;
      }

      pair.isComplete = !!(pair.high && pair.low);
    });

    return Array.from(pairs.values()).sort((a, b) => {
      // Sort complete pairs first, then by name
      if (a.isComplete && !b.isComplete) return -1;
      if (!a.isComplete && b.isComplete) return 1;
      return a.baseName.localeCompare(b.baseName);
    });
  }, []);

  const loraPairs = groupLoRAsIntoPairs(loras);

  // Fetch LoRAs with retry logic
  const fetchLoras = useCallback(async (retryCount = 0) => {
    const maxRetries = 2;
    setIsLoading(true);
    setError(null);
    
    try {
      const url = workspaceId 
        ? `/api/lora?workspaceId=${workspaceId}`
        : '/api/lora';
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      
      const data = await response.json();

      if (data.success) {
        setLoras(data.loras);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to fetch LoRAs');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch LoRAs';
      
      // Retry on network errors
      if (retryCount < maxRetries && (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('timeout'))) {
        console.log(`Retrying fetch (attempt ${retryCount + 1}/${maxRetries})...`);
        setTimeout(() => fetchLoras(retryCount + 1), 1000 * (retryCount + 1)); // Exponential backoff
        return;
      }
      
      setError(`${errorMessage}${retryCount > 0 ? ' (after retries)' : ''}`);
      console.error('Error fetching LoRAs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  // Fetch LoRAs when dialog opens
  useEffect(() => {
    if (open) {
      fetchLoras();
    }
  }, [open, fetchLoras]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Handle file upload with retry logic
  const handleFileUpload = async (file: File, retryCount = 0) => {
    const maxRetries = 2;
    
    // Validate file
    const validation = validateLoRAFileClient(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (workspaceId) {
        formData.append('workspaceId', workspaceId);
      }

      // Simulate progress (since we can't track actual upload progress easily)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/lora/upload', {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(60000), // 60 second timeout for uploads
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`✓ ${file.name} uploaded successfully!`);
        await fetchLoras();
        onLoRAUploaded?.();
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
      
      // Retry on network errors
      if (retryCount < maxRetries && (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('timeout'))) {
        console.log(`Retrying upload (attempt ${retryCount + 1}/${maxRetries})...`);
        setError(`Upload failed, retrying... (attempt ${retryCount + 1}/${maxRetries})`);
        setTimeout(() => handleFileUpload(file, retryCount + 1), 2000 * (retryCount + 1)); // Exponential backoff
        return;
      }
      
      setError(`Upload failed: ${errorMessage}${retryCount > 0 ? ' (after retries)' : ''}. Please try again.`);
      console.error('Error uploading LoRA:', err);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle file input change (supports multiple files)
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Upload all selected files
      for (let i = 0; i < files.length; i++) {
        await handleFileUpload(files[i]);
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle delete with retry logic
  const handleDelete = async (id: string, retryCount = 0) => {
    const maxRetries = 2;
    setError(null);
    setSuccessMessage(null);
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/lora/${id}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const data = await response.json();

      if (data.success) {
        // Close confirmation dialog first
        setDeleteConfirmId(null);
        
        // Show success message
        if (data.warning) {
          setSuccessMessage(`✓ LoRA deleted (Note: ${data.warning})`);
        } else {
          setSuccessMessage('✓ LoRA deleted successfully!');
        }
        
        // Refresh the list
        await fetchLoras();
        onLoRAUploaded?.();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error(data.error || 'Delete failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete LoRA';
      
      // Retry on network errors
      if (retryCount < maxRetries && (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('timeout'))) {
        console.log(`Retrying delete (attempt ${retryCount + 1}/${maxRetries})...`);
        setTimeout(() => handleDelete(id, retryCount + 1), 1000 * (retryCount + 1)); // Exponential backoff
        return;
      }
      
      setError(`Delete failed: ${errorMessage}${retryCount > 0 ? ' (after retries)' : ''}. Please try again.`);
      console.error('Error deleting LoRA:', err);
      setDeleteConfirmId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: string): string => {
    const size = parseInt(bytes, 10);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  // Handle S3 sync
  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/lora/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          workspaceId,
          userId: 'user-with-settings' // TODO: Get from auth context
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const data = await response.json();

      if (data.success) {
        if (data.synced.length > 0) {
          setSuccessMessage(`✓ Synced ${data.synced.length} LoRA(s) from S3!`);
        } else {
          setSuccessMessage('✓ All LoRAs are already synced');
        }
        await fetchLoras();
        onLoRAUploaded?.();
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync LoRAs';
      setError(`Sync failed: ${errorMessage}. Please try again.`);
      console.error('Error syncing LoRAs:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPortal>
          <DialogOverlay className="z-[110]" />
          <DialogPrimitive.Content
            className="fixed left-[50%] top-[50%] z-[110] grid w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-h-[90vh] overflow-y-auto"
          >
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
            <DialogHeader>
              <DialogTitle>LoRA Management</DialogTitle>
              <DialogDescription>
                Upload and manage your LoRA models (.safetensors, .ckpt, max 5GB)
              </DialogDescription>
          </DialogHeader>

          {/* Messages */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm">{error}</p>
                {error.includes('Please try again') && (
                  <button
                    onClick={() => fetchLoras()}
                    className="text-xs underline hover:no-underline mt-1 opacity-80 hover:opacity-100 transition-opacity"
                  >
                    Retry now
                  </button>
                )}
              </div>
              <button
                onClick={() => setError(null)}
                className="text-current hover:opacity-70 transition-opacity"
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-md text-green-400">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm flex-1">{successMessage}</span>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-current hover:opacity-70 transition-opacity"
                aria-label="Dismiss message"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Upload Section */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-all duration-200 ${
              isDragging
                ? 'border-primary bg-primary/10 scale-[1.02]'
                : 'border-muted-foreground/25 hover:border-muted-foreground/40 hover:bg-muted/30'
            } ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                !isUploading && fileInputRef.current?.click();
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".safetensors,.ckpt"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
              disabled={isUploading}
            />
            
            <Upload className={`h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 transition-colors ${
              isDragging ? 'text-primary' : 'text-muted-foreground'
            }`} />
            
            {isUploading ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Uploading...</p>
                <div className="w-full max-w-xs mx-auto bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium mb-2">
                  Drag & drop LoRA file here
                </p>
                <p className="text-xs text-muted-foreground mb-4">or click to browse</p>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  variant="outline"
                  size="sm"
                  className="hover:bg-primary/10 transition-colors"
                >
                  Browse Files
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  .safetensors, .ckpt • Max 5GB
                </p>
              </>
            )}
          </div>

          {/* LoRA List Section */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Your LoRAs {loras.length > 0 && `(${loras.length})`}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync from S3'}
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent mb-4" role="status">
                  <span className="sr-only">Loading...</span>
                </div>
                <p className="text-sm">Loading LoRAs...</p>
              </div>
            ) : loras.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No LoRAs uploaded yet</p>
                <p className="text-sm mt-1">
                  Upload your first LoRA to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {loraPairs.map((pair) => (
                  <Card 
                    key={pair.baseName} 
                    className={`group hover:border-primary/50 hover:shadow-md transition-all duration-200 ${
                      pair.isComplete ? 'border-green-500/30' : 'border-yellow-500/30'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Pair Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className={`h-5 w-5 ${pair.isComplete ? 'text-green-500' : 'text-yellow-500'}`} />
                            <h4 className="font-medium text-sm">{pair.baseName}</h4>
                            {pair.isComplete ? (
                              <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded">Complete</span>
                            ) : (
                              <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded">Incomplete</span>
                            )}
                          </div>
                        </div>

                        {/* High/Low Files */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {/* High LoRA */}
                          <div className={`p-3 rounded-md border ${pair.high ? 'bg-muted/30 border-muted' : 'bg-muted/10 border-dashed border-muted-foreground/20'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-muted-foreground">HIGH</span>
                              {pair.high && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmId(pair.high!.id);
                                  }}
                                  aria-label={`Delete ${pair.high.fileName}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            {pair.high ? (
                              <>
                                <p className="text-xs truncate" title={pair.high.fileName}>
                                  {pair.high.fileName}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatFileSize(pair.high.fileSize)} • {formatDate(pair.high.uploadedAt)}
                                </p>
                              </>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">Not uploaded</p>
                            )}
                          </div>

                          {/* Low LoRA */}
                          <div className={`p-3 rounded-md border ${pair.low ? 'bg-muted/30 border-muted' : 'bg-muted/10 border-dashed border-muted-foreground/20'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-muted-foreground">LOW</span>
                              {pair.low && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmId(pair.low!.id);
                                  }}
                                  aria-label={`Delete ${pair.low.fileName}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            {pair.low ? (
                              <>
                                <p className="text-xs truncate" title={pair.low.fileName}>
                                  {pair.low.fileName}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatFileSize(pair.low.fileSize)} • {formatDate(pair.low.uploadedAt)}
                                </p>
                              </>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">Not uploaded</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => {
        if (!open) setDeleteConfirmId(null);
      }}>
        <DialogPortal>
          <DialogOverlay className="z-[120]" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-[120] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          <DialogHeader>
            <DialogTitle>Delete LoRA</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this LoRA? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  );
}
