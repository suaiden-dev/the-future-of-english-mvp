import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Loader2 } from 'lucide-react';

interface DocumentViewerModalProps {
    url: string;
    filename: string;
    onClose: () => void;
}

export function DocumentViewerModal({ url, filename, onClose }: DocumentViewerModalProps) {
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [loading, setLoading] = useState(true);

    // Determinar tipo de arquivo
    const fileType = filename.split('.').pop()?.toLowerCase();
    const isPdf = fileType === 'pdf';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileType || '');

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
    const handleRotate = () => setRotation(prev => (prev + 90) % 360);
    const handleReset = () => { setScale(1); setRotation(0); };

    const handleIframeLoad = () => setLoading(false);
    const handleImageLoad = () => setLoading(false);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[70]">
            <div className="relative w-full h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800 text-white shrink-0">
                    <h3 className="text-lg font-medium truncate max-w-md pr-4">{filename}</h3>

                    <div className="flex items-center gap-2">
                        {isImage && (
                            <>
                                <button onClick={handleZoomOut} className="p-2 hover:bg-gray-800 rounded-lg transition-colors" title="Zoom Out">
                                    <ZoomOut className="w-5 h-5" />
                                </button>
                                <span className="text-sm min-w-[50px] text-center hidden sm:inline">{Math.round(scale * 100)}%</span>
                                <button onClick={handleZoomIn} className="p-2 hover:bg-gray-800 rounded-lg transition-colors" title="Zoom In">
                                    <ZoomIn className="w-5 h-5" />
                                </button>
                                <button onClick={handleRotate} className="p-2 hover:bg-gray-800 rounded-lg transition-colors" title="Rotate">
                                    <RotateCw className="w-5 h-5" />
                                </button>
                                <button onClick={handleReset} className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors hidden sm:block">
                                    Reset
                                </button>
                                <div className="w-px h-6 bg-gray-700 mx-2" />
                            </>
                        )}

                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-red-900/50 hover:text-red-400 rounded-lg transition-colors"
                            title="Close"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 relative overflow-hidden bg-gray-900 flex items-center justify-center">
                    {loading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
                            <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
                            <p>Loading document...</p>
                        </div>
                    )}

                    {isPdf ? (
                        <iframe
                            src={`${url}#toolbar=0`}
                            className="w-full h-full border-0"
                            onLoad={handleIframeLoad}
                            title={`PDF Viewer - ${filename}`}
                        />
                    ) : isImage ? (
                        <div
                            className="overflow-auto w-full h-full flex items-center justify-center p-4"
                            style={{ cursor: scale > 1 ? 'grab' : 'default' }}
                        >
                            <img
                                src={url}
                                alt={filename}
                                onLoad={handleImageLoad}
                                style={{
                                    transform: `scale(${scale}) rotate(${rotation}deg)`,
                                    transition: 'transform 0.2s ease-out',
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    objectFit: 'contain'
                                }}
                                draggable={false}
                            />
                        </div>
                    ) : (
                        <div className="text-center text-white p-8">
                            <p className="text-xl mb-4">Preview not available for this file type.</p>
                            <a
                                href={url}
                                download={filename}
                                className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Download File
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
