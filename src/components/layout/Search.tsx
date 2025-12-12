import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import { Product } from '../../utils/types';
import { PRODUCT_DATABASE } from '../../data/productDatabase';
import { TRAINING_MODULES } from '../../data/trainingContent';
import { NAV_LINKS } from '../../data/navigation';
import InfoModal from '../InfoModal';
import ProductInfoModal from '../ProductInfoModal';

// --- Sub-components ---

interface SearchResultItemProps {
  title: string;
  description?: string;
  category: string;
  onClick: () => void;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ title, description, category, onClick }) => (
    <button onClick={onClick} className="w-full text-left p-3 rounded-lg hover:bg-background-secondary transition-colors flex justify-between items-center group">
        <div>
            <p className="font-semibold text-text-primary group-hover:text-accent">{title}</p>
            {description && <p className="text-sm text-text-secondary truncate">{description}</p>}
        </div>
        <span className="text-xs font-mono bg-background text-text-secondary px-2 py-1 rounded-md flex-shrink-0 ml-4 border border-border-color">{category}</span>
    </button>
);

const SearchIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);


// --- Main Search Component ---

const Search: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ products: Product[]; training: typeof TRAINING_MODULES; pages: any[] }>({ products: [], training: [], pages: [] });
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);

    // Initialize Fuse.js instances for fuzzy search
    const productFuse = useMemo(() => new Fuse(PRODUCT_DATABASE, {
        keys: [
            { name: 'name', weight: 0.4 },
            { name: 'sku', weight: 0.3 },
            { name: 'description', weight: 0.2 },
            { name: 'tags', weight: 0.1 },
        ],
        threshold: 0.3, // Lower = more strict, higher = more fuzzy
        includeScore: true,
        minMatchCharLength: 2,
    }), []);

    const trainingFuse = useMemo(() => new Fuse(TRAINING_MODULES, {
        keys: [
            { name: 'title', weight: 0.7 },
            { name: 'contentPages.content', weight: 0.3 },
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 2,
    }), []);

    const pageFuse = useMemo(() => new Fuse(NAV_LINKS, {
        keys: ['label'],
        threshold: 0.3,
        includeScore: true,
    }), []);

    // Keyboard shortcut listener (Cmd+K / Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                setIsOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);
    
    // Focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen])

    // Debounced fuzzy search logic with Fuse.js
    useEffect(() => {
        const handler = setTimeout(() => {
            if (!query.trim()) {
                setResults({ products: [], training: [], pages: [] });
                return;
            }

            // Perform fuzzy search with Fuse.js
            const productResults = productFuse.search(query)
                .slice(0, 5)
                .map(result => result.item);

            const trainingResults = trainingFuse.search(query)
                .slice(0, 3)
                .map(result => result.item);

            const pageResults = pageFuse.search(query)
                .slice(0, 3)
                .map(result => result.item);

            setResults({
                products: productResults,
                training: trainingResults,
                pages: pageResults,
            });

        }, 200);

        return () => {
            clearTimeout(handler);
        };
    }, [query, productFuse, trainingFuse, pageFuse]);

    const handleCloseModal = () => {
        setIsOpen(false);
        setQuery('');
    };

    const handleProductClick = (product: Product) => {
        setSelectedProduct(product);
    };

    const handlePageClick = (path: string) => {
        handleCloseModal();
        navigate(path);
    };

    const handleCloseProductModal = () => {
        setSelectedProduct(null);
        // Do not close search modal, so user can continue searching
    }

    const hasResults = results.products.length > 0 || results.training.length > 0 || results.pages.length > 0;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="hidden md:flex items-center gap-2 text-sm text-text-secondary bg-background-secondary border border-border-color rounded-md px-3 py-2 hover:bg-border-color hover:text-text-primary transition-colors w-64 text-left"
                aria-label="Search (Ctrl+K)"
            >
                <SearchIcon className="h-4 w-4" />
                <span>Search...</span>
                <kbd className="ml-auto text-xs font-mono bg-background border border-border-color rounded px-1.5 py-0.5">⌘K</kbd>
            </button>

            <InfoModal isOpen={isOpen} onClose={handleCloseModal} className="max-w-2xl" title={null}>
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                         <SearchIcon className="h-5 w-5 text-text-secondary" />
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search for products, features, or training..."
                        className="w-full p-3 pl-10 border-2 border-border-color rounded-lg bg-input-bg focus:outline-none focus:border-accent"
                    />
                </div>
                
                <div className="mt-4 max-h-[60vh] overflow-y-auto">
                    {query && !hasResults && <p className="text-center text-text-secondary p-4">No results found for "{query}".</p>}
                    
                    {results.products.length > 0 && (
                        <div className="mb-4">
                            <h4 className="font-bold text-sm uppercase text-text-secondary px-3 mb-1">Products</h4>
                            {results.products.map(p => <SearchResultItem key={p.sku} title={p.name} description={p.sku} category={p.category} onClick={() => handleProductClick(p)} />)}
                        </div>
                    )}
                    
                    {results.training.length > 0 && (
                        <div className="mb-4">
                            <h4 className="font-bold text-sm uppercase text-text-secondary px-3 mb-1">Training Modules</h4>
                            {results.training.map(t => <SearchResultItem key={t.id} title={t.title} category="Training" onClick={() => handlePageClick('/training')} />)}
                        </div>
                    )}

                    {results.pages.length > 0 && (
                        <div>
                            <h4 className="font-bold text-sm uppercase text-text-secondary px-3 mb-1">Pages</h4>
                            {results.pages.map(p => <SearchResultItem key={p.path} title={p.label} category="Navigation" onClick={() => handlePageClick(p.path)} />)}
                        </div>
                    )}
                </div>
            </InfoModal>

            {selectedProduct && (
                <ProductInfoModal
                    isOpen={!!selectedProduct}
                    onClose={handleCloseProductModal}
                    product={selectedProduct}
                />
            )}
        </>
    );
};

export default Search;