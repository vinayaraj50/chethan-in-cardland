import React, { useState } from 'react';
import { Search, Filter, Download, MessageSquare } from 'lucide-react';
import StackCard from '../components/StackCard';
import NeoDropdown from '../components/NeoDropdown';
import logo from '../assets/logo.png';

const Home = ({
    activeTab, setActiveTab,
    stacks, publicStacks,
    loading, publicLoading,
    onReview, onEdit, onImport,
    searchQuery, setSearchQuery,
    onShowFeedback,
    filters, setFilters,
    user, onLogin,
    sortBy, onSortChange,
    filterLabel, onLabelChange,
    availableLabels,
    onShowKnowMore
}) => {
    const [showSearch, setShowSearch] = useState(false);
    const standards = ['V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    const syllabuses = ['NCERT', 'Kerala'];
    const mediums = ['Malayalam', 'English'];
    const subjects = ['Maths', 'Social Science', 'Science', 'English', 'Malayalam', 'Hindi'];

    const getSortedStacks = () => {
        let filtered = filterLabel ? stacks.filter(s => s.label === filterLabel) : stacks;
        if (searchQuery.trim()) filtered = filtered.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));

        return [...filtered].sort((a, b) => {
            if (sortBy === 'Upcoming Review') {
                // Priority: Overdue/Today (past date) < Tomorrow < Future < No Date
                // Use a very large date for stacks without a nextReview date to push them to the end
                const dateA = a.nextReview ? new Date(a.nextReview) : new Date(8640000000000000);
                const dateB = b.nextReview ? new Date(b.nextReview) : new Date(8640000000000000);
                return dateA.getTime() - dateB.getTime();
            }
            // Fallback to ID if no specific sort criteria matches or for stable sort
            return (b.id || 0) - (a.id || 0);
        });
    };

    const filteredPublicStacks = publicStacks.filter(stack => {
        // Safety checks: ensure stack has required properties
        if (!stack || !stack.title) return false;

        const matchesSearch = stack.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStandard = !filters.standard || stack.standard === filters.standard;
        const matchesSyllabus = !filters.syllabus || stack.syllabus === filters.syllabus;
        const matchesMedium = !filters.medium || stack.medium === filters.medium;
        const matchesSubject = !filters.subject || stack.subject === filters.subject;
        return matchesSearch && matchesStandard && matchesSyllabus && matchesMedium && matchesSubject;
    });

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const renderTabs = () => (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <div className="neo-tabs-container">
                <button
                    className={`neo-tab-item ${activeTab === 'my' ? 'active' : ''}`}
                    onClick={() => {
                        console.log('Switching to My Cards');
                        setActiveTab('my');
                    }}
                >
                    My Cards
                </button>
                <button
                    className={`neo-tab-item ${activeTab === 'ready-made' ? 'active' : ''}`}
                    onClick={() => {
                        console.log('Switching to Ready-made Section');
                        setActiveTab('ready-made');
                    }}
                >
                    Ready-made
                </button>
            </div>
        </div>
    );

    const renderSearchBar = () => (
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input
                className="neo-input"
                placeholder={`Search ${activeTab === 'my' ? 'my' : 'ready-made'} stacks...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: '45px' }}
            />
        </div>
    );

    const renderMyStacksFilters = () => {
        const sortOptions = [
            { label: 'Upcoming Review', value: 'Upcoming Review' },
            { label: 'Creation Date', value: 'Creation Date' },
            { label: 'Number of Cards', value: 'Number of Cards' },
            { label: 'Average Rating', value: 'Average Rating' },
            { label: 'Last Reviewed', value: 'Last Reviewed' }
        ];

        const labelOptions = [
            { label: 'All Labels', value: null },
            ...availableLabels.map(lbl => ({ label: lbl, value: lbl }))
        ];

        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2.5rem',
                padding: '0.5rem'
            }}>
                <NeoDropdown
                    label="Sort by"
                    value={sortBy}
                    options={sortOptions}
                    onChange={onSortChange}
                />
                <NeoDropdown
                    label="Filter by Label"
                    value={filterLabel}
                    options={labelOptions}
                    onChange={onLabelChange}
                    placeholder="All Labels"
                    displayValue={(val) => val || 'All Labels'}
                />
            </div>
        );
    };

    const renderReadyMadeFilters = () => (
        <div className="filter-bar neo-inset" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1.25rem',
            padding: '1.25rem',
            marginBottom: '2.5rem',
            borderRadius: '20px'
        }}>
            <NeoDropdown
                label="Standard"
                value={filters.standard}
                options={[{ label: 'All Standards', value: '' }, ...standards.map(s => ({ label: `Standard ${s}`, value: s }))]}
                onChange={(val) => handleFilterChange('standard', val)}
                placeholder="All Standards"
                displayValue={(val) => val ? `Standard ${val}` : 'All Standards'}
            />
            <NeoDropdown
                label="Syllabus"
                value={filters.syllabus}
                options={[{ label: 'All Syllabuses', value: '' }, ...syllabuses.map(s => ({ label: s, value: s }))]}
                onChange={(val) => handleFilterChange('syllabus', val)}
                placeholder="All Syllabuses"
                displayValue={(val) => val || 'All Syllabuses'}
            />
            <NeoDropdown
                label="Medium"
                value={filters.medium}
                options={[{ label: 'All Mediums', value: '' }, ...mediums.map(m => ({ label: m, value: m }))]}
                onChange={(val) => handleFilterChange('medium', val)}
                placeholder="All Mediums"
                displayValue={(val) => val || 'All Mediums'}
            />
            <NeoDropdown
                label="Subject"
                value={filters.subject}
                options={[{ label: 'All Subjects', value: '' }, ...subjects.map(s => ({ label: s, value: s }))]}
                onChange={(val) => handleFilterChange('subject', val)}
                placeholder="All Subjects"
                displayValue={(val) => val || 'All Subjects'}
            />
        </div>
    );

    const currentLoading = activeTab === 'my' ? loading : publicLoading;
    const currentStacks = activeTab === 'my' ? stacks : filteredPublicStacks;

    const showIntro = activeTab === 'my' && !loading && (!user || stacks.length === 0 || (stacks.length === 1 && stacks[0].id === 'demo-stack'));

    // We no longer return early here to keep tabs and search bar visible
    // if (currentLoading) { ... }

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Show tabs and search only if not guest or if loading */}
            {(!showIntro || currentLoading) && (
                <>
                    {renderTabs()}
                    {renderSearchBar()}
                    {activeTab === 'my' && renderMyStacksFilters()}
                    {activeTab === 'ready-made' && renderReadyMadeFilters()}
                </>
            )}

            {showIntro && !currentLoading && (
                <>
                    {/* Hero Section */}
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        padding: '3rem 1rem', textAlign: 'center', minHeight: '50vh'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1rem' }}>
                            <h1 style={{
                                fontSize: 'clamp(2.5rem, 8vw, 3.5rem)',
                                fontWeight: '800',
                                lineHeight: '1.1',
                                color: '#4f46e5',
                                margin: 0
                            }}>
                                Study smarter.<br />Remember longer.
                            </h1>
                            <p style={{
                                fontSize: 'clamp(1rem, 3vw, 1.15rem)',
                                fontWeight: '500',
                                opacity: 0.9,
                                marginTop: '1.5rem',
                                maxWidth: '650px',
                                margin: '1.5rem auto 0 auto',
                                lineHeight: '1.7',
                                padding: '0 10px'
                            }}>
                                Powered by scientifically proven strategies such as spaced repetition and active recall, this app makes learning easier and helps you remember longer.
                                <button
                                    onClick={onShowKnowMore}
                                    style={{
                                        background: 'rgba(79, 70, 229, 0.1)',
                                        border: 'none',
                                        color: '#4f46e5',
                                        cursor: 'pointer',
                                        padding: '2px 8px',
                                        fontSize: '0.8rem',
                                        fontWeight: '700',
                                        display: 'inline-block',
                                        marginLeft: '8px',
                                        borderRadius: '6px',
                                        verticalAlign: 'middle',
                                        boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.5), inset -1px -1px 2px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    know more
                                </button>
                            </p>
                        </div>

                        <div className="hero-cta-container" style={{
                            display: 'flex',
                            gap: '1.25rem',
                            alignItems: 'center',
                            marginTop: '1.2rem',
                            flexWrap: 'wrap',
                            justifyContent: 'center'
                        }}>
                            <button
                                className="neo-button neo-glow-blue hero-btn primary-btn"
                                onClick={() => onReview(stacks.find(s => s.id === 'demo-stack'))}
                                style={{
                                    padding: '1rem 2rem',
                                    whiteSpace: 'nowrap',
                                    minWidth: '180px'
                                }}
                            >
                                See how it works
                            </button>

                            <button
                                className="neo-button hero-btn secondary-btn"
                                onClick={() => onLogin()}
                                style={{
                                    padding: '1rem 2rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    whiteSpace: 'nowrap',
                                    minWidth: '180px'
                                }}
                            >
                                <span style={{ fontSize: '1rem' }}>Get started with</span>
                                <img
                                    src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg"
                                    alt="Google"
                                    style={{ height: '18px', marginTop: '2px' }}
                                />
                            </button>
                        </div>
                    </div>



                    {/* Ready-made Flashcards Section for Guests */}
                    <div style={{ padding: '0 1rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '2rem',
                            position: 'relative',
                            minHeight: '48px'
                        }}>
                            {showSearch ? (
                                <div style={{ width: '100%', maxWidth: '600px', position: 'relative', animation: 'fadeIn 0.2s' }}>
                                    <input
                                        className="neo-input"
                                        autoFocus
                                        placeholder="Search public stacks..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{ width: '100%', paddingRight: '40px' }}
                                        onBlur={() => !searchQuery && setShowSearch(false)}
                                    />
                                    <button
                                        onClick={() => setShowSearch(false)}
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            opacity: 0.5
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <h2 className="responsive-heading" style={{
                                        fontSize: '2rem',
                                        fontWeight: '800',
                                        color: 'var(--accent-color)',
                                        flex: 1
                                    }}>
                                        Ready-made Flashcards
                                    </h2>
                                    <button
                                        className="neo-button icon-btn"
                                        onClick={() => setShowSearch(true)}
                                        style={{
                                            position: 'absolute',
                                            right: 0,
                                            borderRadius: '50%',
                                            width: '44px',
                                            height: '44px'
                                        }}
                                        title="Search Stacks"
                                    >
                                        <Search size={20} />
                                    </button>
                                </>
                            )}
                        </div>

                        {renderReadyMadeFilters()}

                        {publicLoading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem' }}>
                                <div className="card-loader-container">
                                    <div className="card-loader-item"></div>
                                    <div className="card-loader-item"></div>
                                    <div className="card-loader-item"></div>
                                </div>
                                <p style={{ marginTop: '1rem', opacity: 0.6, fontSize: '0.9rem', fontWeight: 500 }}>Loading ready-made stacks...</p>
                            </div>
                        ) : (
                            <>
                                <div className="stacks-grid" style={{ padding: '0 1.25rem' }}>
                                    {stacks.filter(s => s.id === 'demo-stack').map(stack => (
                                        <StackCard
                                            key={stack.id}
                                            stack={stack}
                                            onReview={onReview}
                                            onEdit={onEdit}
                                            onImport={onImport}
                                            user={user}
                                        />
                                    ))}
                                    {filteredPublicStacks.map(stack => (
                                        <StackCard
                                            key={stack.driveFileId || stack.id}
                                            stack={stack}
                                            onReview={onReview}
                                            onEdit={onEdit}
                                            onImport={onImport}
                                            user={user}
                                        />
                                    ))}
                                </div>

                                {filteredPublicStacks.length === 0 && (
                                    <div style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        padding: '4rem 2rem', textAlign: 'center', gap: '2rem'
                                    }}>
                                        <div style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                                            <div className="neo-flat" style={{ padding: '2rem', borderRadius: '24px', opacity: 0.8 }}>
                                                <MessageSquare size={64} color="var(--accent-color)" />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <h3 style={{ fontSize: '1.4rem' }}>No stacks found</h3>
                                                <p style={{ opacity: 0.7 }}>This filter does not have any files. You can request flashcards to the developer via the feedback option.</p>
                                            </div>
                                            <button className="neo-button neo-glow-blue" onClick={onShowFeedback} style={{ padding: '0.8rem 2rem', gap: '8px' }}>
                                                <MessageSquare size={18} /> Request Flashcards
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </>
            )}

            {currentLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem' }}>
                    <div className="card-loader-container">
                        <div className="card-loader-item"></div>
                        <div className="card-loader-item"></div>
                        <div className="card-loader-item"></div>
                    </div>
                    <p style={{ marginTop: '1rem', opacity: 0.6, fontSize: '0.9rem', fontWeight: 500 }}>Loading stacks...</p>
                </div>
            ) : !showIntro && (
                <>
                    {currentStacks.length === 0 && activeTab === 'ready-made' && (
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            padding: '4rem 2rem', textAlign: 'center', gap: '2rem'
                        }}>
                            <div style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                                <div className="neo-flat" style={{ padding: '2rem', borderRadius: '24px', opacity: 0.8 }}>
                                    <MessageSquare size={64} color="var(--accent-color)" />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <h3 style={{ fontSize: '1.4rem' }}>No stacks found</h3>
                                    <p style={{ opacity: 0.7 }}>This filter does not have any files. You can request flashcards to the developer via the feedback option.</p>
                                </div>
                                <button className="neo-button neo-glow-blue" onClick={onShowFeedback} style={{ padding: '0.8rem 2rem', gap: '8px' }}>
                                    <MessageSquare size={18} /> Request Flashcards
                                </button>
                            </div>
                        </div>
                    )}

                    {currentStacks.length > 0 && (
                        <div className="stacks-grid">
                            {currentStacks.map(stack => (
                                <StackCard
                                    key={stack.driveFileId || stack.id}
                                    stack={stack}
                                    onReview={onReview}
                                    onEdit={onEdit}
                                    onImport={onImport}
                                    user={user}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Home;
