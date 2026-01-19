import React, { useState } from 'react';
import { Search, Filter, MessageSquare, Plus, Settings, RefreshCw, X } from 'lucide-react';
import LessonCard from '../components/LessonCard';
import NeoDropdown from '../components/NeoDropdown';
import logo from '../assets/logo.png';

import { useTour } from '../components/TourContext';
import { useAuth } from '../components/AuthProvider';

const Home = ({
    activeTab, setActiveTab,
    lessons, publicLessons,
    loading, publicLoading,
    onReview, onEdit, onImport,
    searchQuery, setSearchQuery,
    onShowFeedback,
    filters, setFilters,
    user, onLogin,
    sortBy, onSortChange,
    filterLabel, onLabelChange,
    availableLabels,
    onShowKnowMore,
    onDelete,
    showConfirm,
    onAddLesson,
    onRefresh
}) => {
    const { isActive: isTourActive, startTour } = useTour();
    const { error: authError, isReady: isAuthReady, user: authUser } = useAuth();

    // Derived state moved to top for absolute safety
    const currentLoading = activeTab === 'my-lessons' ? loading : publicLoading;
    const showIntro = activeTab === 'my-lessons' && !loading && !user && !isTourActive;

    const [showSettings, setShowSettings] = useState(false);
    const menuRef = React.useRef(null);

    // Dynamically extract filter options from loaded lessons' metadata
    const filterOptions = React.useMemo(() => {
        const options = {
            standards: new Set(),
            syllabuses: new Set(),
            mediums: new Set(),
            subjects: new Set()
        };

        publicLessons.forEach(lesson => {
            if (lesson.standard) options.standards.add(lesson.standard);
            if (lesson.syllabus) options.syllabuses.add(lesson.syllabus);
            if (lesson.medium) options.mediums.add(lesson.medium);
            if (lesson.subject) options.subjects.add(lesson.subject);
        });

        return {
            standards: Array.from(options.standards).sort(),
            syllabuses: Array.from(options.syllabuses).sort(),
            mediums: Array.from(options.mediums).sort(),
            subjects: Array.from(options.subjects).sort()
        };
    }, [publicLessons]);

    const { standards, syllabuses, mediums, subjects } = filterOptions;


    const getSortedLessons = () => {
        let filtered = filterLabel ? lessons.filter(s => s.label === filterLabel) : lessons;
        if (searchQuery.trim()) filtered = filtered.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));

        return [...filtered].sort((a, b) => {
            if (sortBy === 'Upcoming Review') {
                // Priority: Overdue/Today (past date) < Tomorrow < Future < No Date
                const dateA = a.nextReview ? new Date(a.nextReview) : new Date(8640000000000000);
                const dateB = b.nextReview ? new Date(b.nextReview) : new Date(8640000000000000);
                return dateA.getTime() - dateB.getTime();
            }
            return (b.id || 0) - (a.id || 0);
        });
    };

    const ownedLessonIds = new Set(lessons.map(l => l.lessonId || l.storagePath || l.driveFileId || l.id));

    const filteredPublicLessons = publicLessons.filter(lesson => {
        if (!lesson || !lesson.title) return false;

        const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStandard = !filters.standard || lesson.standard === filters.standard;
        const matchesSyllabus = !filters.syllabus || lesson.syllabus === filters.syllabus;
        const matchesMedium = !filters.medium || lesson.medium === filters.medium;
        const matchesSubject = !filters.subject || lesson.subject === filters.subject;
        return matchesSearch && matchesStandard && matchesSyllabus && matchesMedium && matchesSubject;
    }).map(lesson => ({
        ...lesson,
        isOwned: ownedLessonIds.has(lesson.lessonId || lesson.storagePath || lesson.id)
    })).sort((a, b) => {
        if (sortBy === 'Title') {
            return a.title.localeCompare(b.title);
        }
        return (parseInt(b.id || 0) || 0) - (parseInt(a.id || 0) || 0);
    });

    const currentLessons = activeTab === 'my-lessons' ? lessons : filteredPublicLessons;

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const renderSettingsMenu = () => (
        <div style={{ position: 'relative', display: 'inline-flex' }} ref={menuRef}>
            <button
                className={`icon-btn ${showSettings ? 'active' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    setShowSettings(!showSettings);
                }}
                style={{
                    background: 'none',
                    border: 'none',
                    boxShadow: 'none',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-color)',
                    cursor: 'pointer',
                    opacity: 0.6,
                    padding: 0
                }}
                title="Settings"
            >
                {showSettings ? <X size={20} /> : <Settings size={20} />}
            </button>

            {showSettings && (
                <div className="neo-flat settings-dropdown" style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0,
                    width: '280px',
                    padding: '2rem 1.5rem',
                    zIndex: 2000,
                    borderRadius: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.75rem',
                    border: '1px solid rgba(255,255,255,0.4)',
                    boxShadow: 'var(--neo-box-shadow)'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <input
                                className="neo-input"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    paddingLeft: '38px',
                                    fontSize: '0.9rem',
                                    height: '44px',
                                    boxShadow: 'inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light)'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.5, marginLeft: '4px' }}>Sort By</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            {(activeTab === 'my-lessons' ? [
                                { label: 'Date', value: 'Creation Date' },
                                { label: 'Title', value: 'Title' },
                                { label: 'Marks', value: 'Average Rating' },
                                { label: 'Reviews', value: 'Upcoming Review' }
                            ] : [
                                { label: 'Newest', value: 'Creation Date' },
                                { label: 'Title', value: 'Title' }
                            ]).map(opt => (
                                <button
                                    key={opt.value}
                                    className={`neo-button ${sortBy === opt.value ? 'neo-glow-blue' : ''}`}
                                    onClick={() => onSortChange(opt.value)}
                                    style={{
                                        padding: '0.6rem 0.4rem',
                                        fontSize: '0.8rem',
                                        borderRadius: '10px',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        className="neo-button"
                        onClick={() => {
                            onRefresh?.();
                            setShowSettings(false);
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            padding: '0.9rem',
                            borderRadius: '14px'
                        }}
                    >
                        <RefreshCw size={18} /> Refresh Lessons
                    </button>
                </div>
            )}
        </div>
    );

    const renderTabs = () => (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem', gap: '0.5rem', alignItems: 'center' }}>
            <div id="tabs-container" className="neo-tabs-container" style={{ margin: 0 }}>
                <button
                    id="tab-my-lessons"
                    className={`neo-tab-item ${activeTab === 'my-lessons' ? 'active' : ''}`}
                    onClick={() => setActiveTab('my-lessons')}
                >
                    My Lessons
                </button>
                <button
                    id="tab-lessons"
                    className={`neo-tab-item ${activeTab === 'lessons' ? 'active' : ''}`}
                    onClick={() => setActiveTab('lessons')}
                >
                    Lessons
                </button>
            </div>
        </div>
    );


    const renderMyLessonsFilters = () => {
        const labelOptions = [
            { label: 'All Labels', value: null },
            ...availableLabels.map(lbl => ({ label: lbl, value: lbl }))
        ];

        return (
            <div style={{
                marginBottom: '2rem',
                padding: '0 0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginLeft: '4px', paddingRight: '10px' }}>
                    <span style={{ fontSize: '0.85rem', opacity: 0.6, fontWeight: '600' }}>Filter by Label</span>
                    {renderSettingsMenu()}
                </div>
                <NeoDropdown
                    value={filterLabel}
                    options={labelOptions}
                    onChange={onLabelChange}
                    placeholder="All Labels"
                    displayValue={(val) => val || 'All Labels'}
                />
            </div>
        );
    };

    const renderLessonsFilters = () => (
        <div className="filter-bar neo-inset" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '1.25rem',
            padding: '1.25rem',
            paddingTop: '2.5rem',
            marginBottom: '2.5rem',
            borderRadius: '20px',
            position: 'relative'
        }}>
            <div style={{ position: 'absolute', top: '12px', right: '10px', zIndex: 10 }}>
                {renderSettingsMenu()}
            </div>
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            {(!showIntro || currentLoading) && (
                <>
                    {renderTabs()}
                    {activeTab === 'my-lessons' && renderMyLessonsFilters()}
                    {activeTab === 'lessons' && renderLessonsFilters()}
                </>
            )}

            {showIntro && !currentLoading && (
                <>
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

                        <div className="hero-cta-container">
                            <div className="hero-btn-group">
                                <button
                                    className="hero-btn primary-btn"
                                    onClick={startTour}
                                >
                                    Beginner’s Guide
                                </button>

                                {authUser && !user?.hasDrive ? (
                                    <button
                                        className="hero-btn primary-btn neo-glow-blue"
                                        onClick={() => onLogin('consent')}
                                        style={{ background: 'var(--accent-color)', color: 'white' }}
                                    >
                                        <RefreshCw size={20} className={loading ? 'spin' : ''} />
                                        Complete Sync Setup
                                    </button>
                                ) : !authUser ? (
                                    <button
                                        className="hero-btn hero-btn-google"
                                        onClick={() => onLogin('consent')}
                                        style={{ color: 'var(--text-color)' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                                            Continue with
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1px', fontWeight: '700', fontSize: '1.2rem', letterSpacing: '-0.02em', marginLeft: '2px' }}>
                                                <span style={{ color: '#4285F4' }}>G</span>
                                                <span style={{ color: '#EA4335' }}>o</span>
                                                <span style={{ color: '#FBBC05' }}>o</span>
                                                <span style={{ color: '#4285F4' }}>g</span>
                                                <span style={{ color: '#34A853' }}>l</span>
                                                <span style={{ color: '#EA4335' }}>e</span>
                                            </div>
                                        </div>
                                    </button>
                                ) : null}
                            </div>
                            {authError && (
                                <div style={{
                                    padding: '1rem',
                                    background: 'var(--error-soft)',
                                    borderRadius: '16px',
                                    border: '1px solid var(--error-color)',
                                    color: 'var(--error-color)',
                                    fontSize: '0.85rem',
                                    marginTop: '1rem',
                                    maxWidth: '350px',
                                    textAlign: 'left'
                                }}>
                                    <strong>Connectivity Notice:</strong> {authError}
                                </div>
                            )}
                        </div>
                    </div>



                    <div style={{ padding: '0 1rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '2rem',
                            position: 'relative',
                            minHeight: '48px'
                        }}>
                            <h2 className="responsive-heading" style={{
                                fontSize: '2rem',
                                fontWeight: '800',
                                color: 'var(--accent-color)',
                                flex: 1
                            }}>
                                Lessons
                            </h2>
                        </div>

                        {renderLessonsFilters()}

                        {publicLoading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem' }}>
                                <div className="card-loader-container">
                                    <div className="card-loader-item"></div>
                                    <div className="card-loader-item"></div>
                                    <div className="card-loader-item"></div>
                                </div>
                                <p style={{ marginTop: '1rem', opacity: 0.6, fontSize: '0.9rem', fontWeight: 500 }}>Loading lessons...</p>
                            </div>
                        ) : (
                            <>
                                <div className="lessons-grid" style={{ padding: '0 1.25rem' }}>
                                    {lessons.filter(s => s.id === 'demo-lesson').map(lesson => (
                                        <LessonCard
                                            key={lesson.id}
                                            lesson={lesson}
                                            onReview={onReview}
                                            onEdit={onEdit}
                                            onImport={onImport}
                                            user={user}
                                            onDelete={onDelete}
                                            showConfirm={showConfirm}
                                        />
                                    ))}
                                    {filteredPublicLessons.map(lesson => (
                                        <LessonCard
                                            key={lesson.driveFileId || lesson.id}
                                            lesson={lesson}
                                            onReview={onReview}
                                            onEdit={onEdit}
                                            onImport={onImport}
                                            user={user}
                                            onDelete={onDelete}
                                            showConfirm={showConfirm}
                                        />
                                    ))}
                                </div>

                                {filteredPublicLessons.length === 0 && (
                                    <div style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        padding: '4rem 2rem', textAlign: 'center', gap: '2rem'
                                    }}>
                                        <div style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                                            <div className="neo-flat" style={{ padding: '2rem', borderRadius: '24px', opacity: 0.8 }}>
                                                <MessageSquare size={64} color="var(--accent-color)" />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <h3 style={{ fontSize: '1.4rem' }}>No lessons found</h3>
                                                <p style={{ opacity: 0.7 }}>This filter does not have any files. You can request lessons to the developer via the feedback option.</p>
                                            </div>
                                            <button className="neo-button neo-glow-blue" onClick={onShowFeedback} style={{ padding: '0.8rem 2rem', gap: '8px' }}>
                                                <MessageSquare size={18} /> Request Lessons
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
                    <p style={{ marginTop: '1rem', opacity: 0.6, fontSize: '0.9rem', fontWeight: 500 }}>Loading lessons...</p>
                </div>
            ) : !showIntro && (
                <>
                    {currentLessons.length === 0 && activeTab === 'my-lessons' && (
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            padding: '4rem 2rem', textAlign: 'center', gap: '2rem'
                        }}>
                            <div className="neo-flat" style={{ padding: '3rem', borderRadius: '32px' }}>
                                <img src={logo} alt="Welcome" style={{ width: '120px', height: 'auto' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <h3 style={{ fontSize: '1.4rem' }}>Welcome to Chethan in Cardland!</h3>
                                <p style={{ opacity: 0.7 }}>You don't have any lessons yet. Create your own or explore our Lessons collection.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <button className="neo-button neo-glow-blue" onClick={onAddLesson} style={{ padding: '0.8rem 2rem', gap: '8px' }}>
                                    <Plus size={18} /> Create New Lesson
                                </button>
                                <button className="neo-button" onClick={() => setActiveTab('lessons')} style={{ padding: '0.8rem 2rem', gap: '8px' }}>
                                    <Search size={18} /> Browse Lessons
                                </button>
                            </div>
                        </div>
                    )}

                    {currentLessons.length === 0 && activeTab === 'lessons' && (
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            padding: '4rem 2rem', textAlign: 'center', gap: '2rem'
                        }}>
                            <div style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                                <div className="neo-flat" style={{ padding: '2rem', borderRadius: '24px', opacity: 0.8 }}>
                                    <MessageSquare size={64} color="var(--accent-color)" />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <h3 style={{ fontSize: '1.4rem' }}>No lessons found</h3>
                                    <p style={{ opacity: 0.7 }}>This filter does not have any files. You can request lessons to the developer via the feedback option.</p>
                                </div>
                                <button className="neo-button neo-glow-blue" onClick={onShowFeedback} style={{ padding: '0.8rem 2rem', gap: '8px' }}>
                                    <MessageSquare size={18} /> Request Lessons
                                </button>
                            </div>
                        </div>
                    )}

                    {currentLessons.length > 0 && (
                        <div className="lessons-grid">
                            {currentLessons.map(lesson => (
                                <LessonCard
                                    key={lesson.driveFileId || lesson.id}
                                    lesson={lesson}
                                    onReview={onReview}
                                    onEdit={onEdit}
                                    onImport={onImport}
                                    user={user}
                                    onDelete={onDelete}
                                    showConfirm={showConfirm}
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
