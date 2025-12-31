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
    const standards = ['V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    const syllabuses = ['NCERT', 'Kerala'];
    const mediums = ['Malayalam', 'English'];
    const subjects = ['Maths', 'Social Science', 'Science', 'English', 'Malayalam', 'Hindi'];

    const filteredPublicStacks = publicStacks.filter(stack => {
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
            {(!showIntro || currentLoading) && renderTabs()}
            {(!showIntro || currentLoading) && renderSearchBar()}

            {activeTab === 'my' && !showIntro && renderMyStacksFilters()}
            {activeTab === 'ready-made' && renderReadyMadeFilters()}

            {showIntro && (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '2rem 1rem 4rem 1rem', textAlign: 'center'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2.5rem' }}>
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
                            fontSize: '1.2rem',
                            fontWeight: '500',
                            opacity: 0.8,
                            marginTop: '1.5rem',
                            maxWidth: '450px',
                            margin: '1.5rem auto 0 auto'
                        }}>
                            Free flashcards made from previous exam questions and patterns.
                        </p>
                    </div>

                    <div className="hero-cta-container">
                        <button
                            className="neo-button neo-glow-blue hero-btn primary-btn"
                            onClick={() => setActiveTab('ready-made')}
                        >
                            Ready-made cards
                        </button>

                        <button
                            className="neo-button hero-btn secondary-btn"
                            onClick={onShowKnowMore}
                        >
                            Know more
                        </button>
                    </div>

                </div>
            )}

            {currentLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <div className="loader">Loading stacks...</div>
                </div>
            ) : (
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
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem'
                        }}>
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
