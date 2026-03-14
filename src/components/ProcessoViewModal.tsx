'use client';

import React from 'react';
import { Processo } from '@/lib/types';
import ProcessoDetalhes from './ProcessoDetalhes';

interface Props {
    item: Processo;
    onClose: () => void;
}

export default function ProcessoViewModal({ item, onClose }: Props) {
    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 1000 }}>
            <div className="modal" style={{ 
                maxWidth: '1100px', 
                width: '95%',
                maxHeight: '92vh', 
                overflowY: 'auto',
                padding: '32px',
                position: 'relative'
            }}>
                <button 
                    className="modal-close" 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '24px',
                        fontSize: '24px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        zIndex: 10
                    }}
                >
                    ✕
                </button>
                
                <ProcessoDetalhes item={item} />
                
                <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={onClose}>
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
