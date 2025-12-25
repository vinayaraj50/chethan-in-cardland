import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

const ImageViewer = ({ imageUrl, onClose }) => {
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleZoomIn = () => {
        setScale(prev => Math.min(prev + 0.5, 5));
    };

    const handleZoomOut = () => {
        const newScale = Math.max(scale - 0.5, 0.5);
        setScale(newScale);
        // Reset position if zooming out to 1x or less
        if (newScale <= 1) {
            setPosition({ x: 0, y: 0 });
        }
    };

    const handleRotate = () => {
        setRotation(prev => (prev + 90) % 360);
    };

    const handleReset = () => {
        setScale(1);
        setRotation(0);
        setPosition({ x: 0, y: 0 });
    };

    const handleDragEnd = (event, info) => {
        // Only allow dragging when zoomed in
        if (scale > 1) {
            setPosition({
                x: position.x + info.offset.x,
                y: position.y + info.offset.y
            });
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="image-viewer-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.95)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                overflow: 'hidden'
            }}
            onClick={onClose}
        >
            {/* Controls */}
            <div
                style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    display: 'flex',
                    gap: '0.5rem',
                    zIndex: 10000
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    className="neo-button icon-btn"
                    onClick={handleZoomIn}
                    title="Zoom In"
                    style={{ background: 'var(--bg-color)' }}
                >
                    <ZoomIn size={20} />
                </button>
                <button
                    className="neo-button icon-btn"
                    onClick={handleZoomOut}
                    title="Zoom Out"
                    style={{ background: 'var(--bg-color)' }}
                >
                    <ZoomOut size={20} />
                </button>
                <button
                    className="neo-button icon-btn"
                    onClick={handleRotate}
                    title="Rotate"
                    style={{ background: 'var(--bg-color)' }}
                >
                    <RotateCw size={20} />
                </button>
                <button
                    className="neo-button icon-btn"
                    onClick={handleReset}
                    title="Reset"
                    style={{ background: 'var(--bg-color)', fontSize: '0.8rem', padding: '8px 12px' }}
                >
                    Reset
                </button>
                <button
                    className="neo-button icon-btn"
                    onClick={onClose}
                    title="Close"
                    style={{ background: 'var(--bg-color)' }}
                >
                    <X size={20} />
                </button>
            </div>

            {/* Zoom Level Indicator */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '2rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--bg-color)',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    boxShadow: '4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {Math.round(scale * 100)}% {scale > 1 && '• Drag to pan'}
            </div>

            {/* Image Container */}
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <motion.img
                    src={imageUrl}
                    alt="Full screen view"
                    drag={scale > 1}
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    dragElastic={0.1}
                    dragMomentum={false}
                    onDragEnd={handleDragEnd}
                    animate={{
                        scale: scale,
                        rotate: rotation,
                        x: position.x,
                        y: position.y
                    }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    style={{
                        maxWidth: scale <= 1 ? '90vw' : 'none',
                        maxHeight: scale <= 1 ? '90vh' : 'none',
                        width: scale > 1 ? 'auto' : undefined,
                        height: scale > 1 ? '90vh' : undefined,
                        objectFit: 'contain',
                        cursor: scale > 1 ? 'grab' : 'zoom-in',
                        userSelect: 'none'
                    }}
                    whileDrag={{ cursor: 'grabbing' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (scale === 1) {
                            handleZoomIn();
                        }
                    }}
                    draggable={false}
                />
            </div>
        </motion.div>
    );
};

export default ImageViewer;
