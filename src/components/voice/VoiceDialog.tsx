'use client';

import React, { useState } from 'react';
import { XMarkIcon, SpeakerWaveIcon, StarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useElevenLabsVoices, VoiceWithSamples } from '@/hooks/useElevenLabsVoices';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';

export interface VoiceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onVoiceSelect: (voiceId: string) => void;
    initialVoiceId?: string;
}

export default function VoiceDialog({ isOpen, onClose, onVoiceSelect, initialVoiceId }: VoiceDialogProps) {
    const { voices, isLoading, fetchVoiceSamples, playSample, toggleFavorite, refetch } = useElevenLabsVoices();
    const [selectedVoice, setSelectedVoice] = useState<string>(initialVoiceId || '');
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

    const filteredVoices = showFavoritesOnly
        ? voices.filter(v => v.isFavorite)
        : voices;

    const handleVoiceClick = (voiceId: string) => {
        setSelectedVoice(voiceId);
    };

    const handleFavoriteToggle = (voice: VoiceWithSamples) => {
        toggleFavorite(voice.voice_id, voice.name);
    };

    const handleConfirm = () => {
        if (selectedVoice) {
            onVoiceSelect(selectedVoice);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <div className="p-6 pb-4 border-b">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle>Select Voice</DialogTitle>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => refetch()}
                                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                                    title="Refresh Voices"
                                >
                                    <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                </button>
                                <button
                                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                                    className="px-3 py-1.5 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                                >
                                    {showFavoritesOnly ? 'Show All Voices' : 'Show Favorites Only'}
                                </button>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Voice Grid */}
                    <div className="flex flex-col gap-2">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-muted-foreground">Loading voices...</div>
                            </div>
                        ) : filteredVoices.length === 0 ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-muted-foreground">
                                    {showFavoritesOnly ? 'No favorite voices yet' : 'No voices available'}
                                </div>
                            </div>
                        ) : (
                            filteredVoices.map((voice) => {
                                const hasSamples = !!voice.samples?.audio_base64;
                                const isFav = voice.isFavorite;

                                return (
                                    <div
                                        key={voice.voice_id}
                                        className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${selectedVoice === voice.voice_id
                                            ? 'border-primary bg-primary/10'
                                            : 'border-border bg-background hover:bg-muted/50'
                                            }`}
                                        onClick={() => handleVoiceClick(voice.voice_id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col">
                                                <div className="text-sm font-medium">
                                                    {voice.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {voice.category}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={async (e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (voice.isLoadingSamples) return;

                                                    if (hasSamples) {
                                                        playSample(voice.voice_id);
                                                    } else {
                                                        const base64 = await fetchVoiceSamples(voice.voice_id);
                                                        if (base64) {
                                                            playSample(voice.voice_id, base64);
                                                        }
                                                    }
                                                }}
                                                className={`p-2 rounded-full transition-colors ${hasSamples
                                                        ? 'hover:bg-green-100 dark:hover:bg-green-900 text-green-600'
                                                        : 'text-muted-foreground hover:bg-muted'
                                                    }`}
                                                title={hasSamples ? "Play sample" : "Load sample"}
                                            >
                                                {voice.isLoadingSamples ? (
                                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <SpeakerWaveIcon className={`w-4 h-4 ${hasSamples ? 'fill-current' : ''}`} />
                                                )}
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleFavoriteToggle(voice);
                                                }}
                                                className={`p-2 rounded-full transition-colors ${isFav
                                                    ? 'text-yellow-400 hover:text-yellow-500'
                                                    : 'text-muted-foreground hover:text-yellow-400'
                                                    }`}
                                                title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                                            >
                                                <StarIcon className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="p-6 pt-4 border-t bg-background">
                    {/* Selected Voice Details */}
                    {selectedVoice && (
                        <div className="mb-4">
                            <div className="p-4 bg-muted/20 rounded-lg">
                                <div className="space-y-2">
                                    <h3 className="text-sm font-medium">
                                        Selected: {voices.find(v => v.voice_id === selectedVoice)?.name}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                            {voices.find(v => v.voice_id === selectedVoice)?.samples?.text || "No sample loaded"}
                                        </span>
                                        {(() => {
                                            const voice = voices.find(v => v.voice_id === selectedVoice);
                                            if (!voice) return null;
                                            const hasSamples = !!voice.samples?.audio_base64;

                                            return (
                                                <button
                                                    onClick={async (e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        if (voice.isLoadingSamples) return;

                                                        if (hasSamples) {
                                                            playSample(voice.voice_id);
                                                        } else {
                                                            const base64 = await fetchVoiceSamples(voice.voice_id);
                                                            if (base64) {
                                                                playSample(voice.voice_id, base64);
                                                            }
                                                        }
                                                    }}
                                                    className={`p-2 rounded-md transition-colors ${hasSamples
                                                            ? 'hover:bg-green-600 bg-green-500 text-white'
                                                            : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                                                        }`}
                                                    title={hasSamples ? "Play selected sample" : "Load sample"}
                                                >
                                                    {voice.isLoadingSamples ? (
                                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <SpeakerWaveIcon className="w-4 h-4" />
                                                    )}
                                                </button>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <div className="flex justify-between w-full">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!selectedVoice}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Confirm Selection
                            </button>
                        </div>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
