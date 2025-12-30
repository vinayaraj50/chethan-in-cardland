import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const NeoDropdown = ({
    label,
    value,
    options,
    onChange,
    placeholder = 'Select...',
    displayValue = (val) => val,
    style = {},
    children
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'relative', width: '100%', ...style }}>
            {label && <span style={{ fontSize: '0.85rem', opacity: 0.6, fontWeight: '600', marginLeft: '4px' }}>{label}</span>}
            <button
                className="neo-select"
                style={{
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    width: '100%',
                    position: 'relative',
                    height: '48px' // Consistent height
                }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {value ? displayValue(value) : placeholder}
                </span>
                <ChevronDown
                    size={18}
                    style={{
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.3s',
                        marginLeft: '8px',
                        flexShrink: 0
                    }}
                />
            </button>

            {isOpen && (
                <div className="neo-flat" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '8px',
                    zIndex: 1000,
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    boxShadow: '10px 10px 20px var(--shadow-dark), -10px -10px 20px var(--shadow-light)'
                }}>
                    {children}
                    {options.map((opt, idx) => {
                        const isSelected = value === opt.value;
                        return (
                            <button
                                key={idx}
                                className={`neo-button ${isSelected ? 'neo-inset' : ''}`}
                                style={{
                                    padding: '10px 14px',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    boxShadow: isSelected ? 'inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light)' : 'none',
                                    background: isSelected ? 'var(--accent-soft)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    width: '100%',
                                    textAlign: 'left',
                                    justifyContent: 'flex-start',
                                    color: isSelected ? 'var(--accent-color)' : 'var(--text-color)',
                                    fontWeight: isSelected ? '700' : '500'
                                }}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default NeoDropdown;
