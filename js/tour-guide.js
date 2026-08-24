/**
 * Equity Labs - Interactive Tour Guide Engine
 * Modern, dark-mode native spotlight tour & onboarding system.
 * 
 * Features:
 * - Dynamic spotlight cutout over targeted elements
 * - Glassmorphic popover tooltips with progress indicators & callout tips
 * - Auto-scrolling and viewport collision detection
 * - Keyboard navigation (ArrowRight, ArrowLeft, Escape)
 * - LocalStorage state persistence
 * - Modular step definitions for Finance Tracker & Site Overview
 */

export class TourGuide {
    constructor(tourId, steps = [], options = {}) {
        this.tourId = tourId;
        this.steps = steps;
        this.options = Object.assign({
            autoScroll: true,
            showProgress: true,
            onStart: null,
            onComplete: null,
            onSkip: null
        }, options);

        this.currentStepIndex = -1;
        this.overlayContainer = null;
        this.highlightRing = null;
        this.popover = null;
        this.spotlightPath = null;
        this.activeTarget = null;
        this.isStarted = false;

        // Bound event handlers for clean removal
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleResize = this._handleResize.bind(this);
    }

    /**
     * Check if tour was previously completed by user
     */
    isCompleted() {
        return localStorage.getItem(`equitylabs_tour_completed_${this.tourId}`) === 'true';
    }

    /**
     * Mark tour as completed in localStorage
     */
    setCompleted() {
        localStorage.setItem(`equitylabs_tour_completed_${this.tourId}`, 'true');
    }

    /**
     * Reset completion state
     */
    reset() {
        localStorage.removeItem(`equitylabs_tour_completed_${this.tourId}`);
    }

    /**
     * Start the tour at specified step index
     */
    start(startIndex = 0) {
        if (!this.steps || this.steps.length === 0) return;

        this._createDOM();
        this.isStarted = true;
        this.currentStepIndex = startIndex;
        
        window.addEventListener('keydown', this._handleKeyDown);
        window.addEventListener('resize', this._handleResize);
        window.addEventListener('scroll', this._handleResize, true);

        if (typeof this.options.onStart === 'function') {
            this.options.onStart(this);
        }

        this.showStep(this.currentStepIndex);
    }

    /**
     * Display a specific step index
     */
    showStep(index, direction = 'next') {
        if (index < 0 || index >= this.steps.length) {
            this.end(true);
            return;
        }

        this.currentStepIndex = index;
        const step = this.steps[index];

        // Find target element
        let targetElem = null;
        if (typeof step.target === 'function') {
            targetElem = step.target();
        } else if (typeof step.target === 'string') {
            targetElem = document.querySelector(step.target);
        }

        // If target element is hidden or missing, auto-advance in requested direction
        if (!targetElem || !this._isElementVisible(targetElem)) {
            console.warn(`[TourGuide] Step ${index + 1} target '${step.target}' not visible. Skipping.`);
            const nextIndex = direction === 'prev' ? index - 1 : index + 1;
            if (nextIndex >= 0 && nextIndex < this.steps.length) {
                this.showStep(nextIndex, direction);
            } else {
                this.end(true);
            }
            return;
        }

        // Remove active target class from previous
        if (this.activeTarget) {
            this.activeTarget.classList.remove('tour-target-active');
        }

        this.activeTarget = targetElem;
        this.activeTarget.classList.add('tour-target-active');

        // Optional onShow callback
        if (typeof step.onShow === 'function') {
            step.onShow(step, targetElem);
        }

        // Scroll element into view smoothly if enabled
        if (this.options.autoScroll) {
            targetElem.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }

        // Give a slight delay for smooth scroll to finalize, then update UI
        setTimeout(() => {
            if (!this.isStarted) return;
            this._updateSpotlight(targetElem);
            this._renderPopoverContent(step, index);
            this._positionPopover(targetElem, step.placement || 'auto');
        }, 180);
    }

    next() {
        this.showStep(this.currentStepIndex + 1, 'next');
    }

    prev() {
        this.showStep(this.currentStepIndex - 1, 'prev');
    }

    end(isCompleted = false) {
        if (!this.isStarted) return;

        this.isStarted = false;

        if (this.activeTarget) {
            this.activeTarget.classList.remove('tour-target-active');
            this.activeTarget = null;
        }

        window.removeEventListener('keydown', this._handleKeyDown);
        window.removeEventListener('resize', this._handleResize);
        window.removeEventListener('scroll', this._handleResize, true);

        if (this.overlayContainer) {
            this.overlayContainer.classList.remove('tour-active');
            setTimeout(() => {
                if (this.overlayContainer && this.overlayContainer.parentNode) {
                    this.overlayContainer.parentNode.removeChild(this.overlayContainer);
                }
                this.overlayContainer = null;
            }, 300);
        }

        if (isCompleted) {
            this.setCompleted();
            if (typeof this.options.onComplete === 'function') {
                this.options.onComplete(this);
            }
        } else {
            if (typeof this.options.onSkip === 'function') {
                this.options.onSkip(this);
            }
        }
    }

    /* ==========================================
       Internal DOM & Positioning Methods
       ========================================== */

    _createDOM() {
        // Cleanup existing if any
        const existing = document.getElementById(`tour-overlay-${this.tourId}`);
        if (existing) existing.remove();

        // Create overlay structure
        const container = document.createElement('div');
        container.id = `tour-overlay-${this.tourId}`;
        container.className = 'tour-overlay-container';

        // SVG Mask layer
        container.innerHTML = `
            <svg class="tour-spotlight-svg" width="100%" height="100%">
                <defs>
                    <mask id="tour-spotlight-mask-${this.tourId}">
                        <rect x="0" y="0" width="100%" height="100%" fill="white"/>
                        <rect id="tour-spotlight-cutout-${this.tourId}" x="0" y="0" width="0" height="0" rx="12" ry="12" fill="black"/>
                    </mask>
                </defs>
                <rect x="0" y="0" width="100%" height="100%" fill="rgba(6, 8, 13, 0.75)" mask="url(#tour-spotlight-mask-${this.tourId})"/>
            </svg>
            <div class="tour-highlight-ring" id="tour-highlight-ring-${this.tourId}"></div>
            <div class="tour-popover" id="tour-popover-${this.tourId}" role="dialog" aria-modal="true">
                <div class="tour-popover-arrow"></div>
                <div class="tour-popover-header">
                    <span class="tour-step-badge" id="tour-step-badge">Step 1 of 1</span>
                    <button class="tour-close-btn" id="tour-close-btn" aria-label="Close tour">&times;</button>
                </div>
                <div class="tour-progress-bar-wrap">
                    <div class="tour-progress-bar-fill" id="tour-progress-fill"></div>
                </div>
                <h4 class="tour-popover-title" id="tour-popover-title">Title</h4>
                <div class="tour-popover-body" id="tour-popover-body">Body text</div>
                <div class="tour-tip-box" id="tour-tip-box" style="display:none;">
                    <i class="bi bi-lightbulb-fill"></i>
                    <span id="tour-tip-text"></span>
                </div>
                <div class="tour-popover-footer">
                    <button class="tour-btn tour-btn-skip" id="tour-btn-skip">Skip Tour</button>
                    <div style="display: flex; gap: 6px;">
                        <button class="tour-btn tour-btn-prev" id="tour-btn-prev">
                            <i class="bi bi-chevron-left"></i> Back
                        </button>
                        <button class="tour-btn tour-btn-next" id="tour-btn-next">
                            Next <i class="bi bi-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(container);
        this.overlayContainer = container;
        this.spotlightPath = container.querySelector(`#tour-spotlight-cutout-${this.tourId}`);
        this.highlightRing = container.querySelector(`#tour-highlight-ring-${this.tourId}`);
        this.popover = container.querySelector(`#tour-popover-${this.tourId}`);

        // Bind inner action buttons
        container.querySelector('#tour-close-btn').onclick = () => this.end(false);
        container.querySelector('#tour-btn-skip').onclick = () => this.end(false);
        container.querySelector('#tour-btn-prev').onclick = () => this.prev();
        container.querySelector('#tour-btn-next').onclick = () => this.next();

        // Trigger fade in animation
        requestAnimationFrame(() => {
            container.classList.add('tour-active');
        });
    }

    _updateSpotlight(elem) {
        if (!elem || !this.spotlightPath || !this.highlightRing) return;

        const rect = elem.getBoundingClientRect();
        const padding = 8;
        const minHeight = 48;
        const minWidth = 100;

        const effectiveWidth = Math.max(rect.width, minWidth);
        const effectiveHeight = Math.max(rect.height, minHeight);

        const x = Math.max(0, rect.left - padding);
        const y = Math.max(0, rect.top - padding);
        const width = effectiveWidth + (padding * 2);
        const height = effectiveHeight + (padding * 2);

        // Update SVG cutout rect
        this.spotlightPath.setAttribute('x', x);
        this.spotlightPath.setAttribute('y', y);
        this.spotlightPath.setAttribute('width', width);
        this.spotlightPath.setAttribute('height', height);

        // Update highlight ring overlay
        this.highlightRing.style.left = `${x}px`;
        this.highlightRing.style.top = `${y}px`;
        this.highlightRing.style.width = `${width}px`;
        this.highlightRing.style.height = `${height}px`;
    }

    _renderPopoverContent(step, index) {
        const total = this.steps.length;
        const stepBadge = this.overlayContainer.querySelector('#tour-step-badge');
        const progressFill = this.overlayContainer.querySelector('#tour-progress-fill');
        const titleElem = this.overlayContainer.querySelector('#tour-popover-title');
        const bodyElem = this.overlayContainer.querySelector('#tour-popover-body');
        const tipBox = this.overlayContainer.querySelector('#tour-tip-box');
        const tipText = this.overlayContainer.querySelector('#tour-tip-text');
        const prevBtn = this.overlayContainer.querySelector('#tour-btn-prev');
        const nextBtn = this.overlayContainer.querySelector('#tour-btn-next');

        // Badge & Progress
        stepBadge.textContent = `Step ${index + 1} of ${total}`;
        progressFill.style.width = `${((index + 1) / total) * 100}%`;

        // Title with optional icon
        const iconHtml = step.icon ? `<i class="${step.icon} me-1"></i>` : '';
        titleElem.innerHTML = `${iconHtml}${step.title}`;

        // Body
        bodyElem.innerHTML = step.content;

        // Tip Box
        if (step.tip) {
            tipText.innerHTML = step.tip;
            tipBox.style.display = 'flex';
        } else {
            tipBox.style.display = 'none';
        }

        // Prev Button state
        if (index === 0) {
            prevBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'inline-flex';
        }

        // Next/Finish Button state
        if (index === total - 1) {
            nextBtn.className = 'tour-btn tour-btn-finish';
            nextBtn.innerHTML = 'Finish Tour <i class="bi bi-check-lg"></i>';
        } else {
            nextBtn.className = 'tour-btn tour-btn-next';
            nextBtn.innerHTML = 'Next <i class="bi bi-chevron-right"></i>';
        }
    }

    _positionPopover(targetElem, preferredPlacement = 'auto') {
        if (!targetElem || !this.popover) return;

        const targetRect = targetElem.getBoundingClientRect();
        const popoverRect = this.popover.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margin = 16;

        let placement = preferredPlacement;

        // Auto placement determination or collision flip
        const spaceTop = targetRect.top;
        const spaceBottom = viewportHeight - targetRect.bottom;
        const popoverHeight = popoverRect.height || 260;

        if (placement === 'top' && spaceTop < popoverHeight + margin) {
            placement = 'bottom';
        } else if (placement === 'bottom' && spaceBottom < popoverHeight + margin && spaceTop >= popoverHeight + margin) {
            placement = 'top';
        } else if (placement === 'auto') {
            placement = spaceBottom >= popoverHeight + margin ? 'bottom' : (spaceTop >= popoverHeight + margin ? 'top' : 'bottom');
        }

        let top = 0;
        let left = 0;

        if (placement === 'bottom') {
            top = targetRect.bottom + margin;
            left = targetRect.left + (targetRect.width / 2) - (popoverRect.width / 2);
        } else if (placement === 'top') {
            top = targetRect.top - popoverRect.height - margin;
            left = targetRect.left + (targetRect.width / 2) - (popoverRect.width / 2);
        } else if (placement === 'left') {
            top = targetRect.top + (targetRect.height / 2) - (popoverRect.height / 2);
            left = targetRect.left - popoverRect.width - margin;
        } else if (placement === 'right') {
            top = targetRect.top + (targetRect.height / 2) - (popoverRect.height / 2);
            left = targetRect.right + margin;
        }

        // Keep inside viewport boundaries
        const navbarHeight = 70; // Avoid navbar overlap at top
        if (left < margin) left = margin;
        if (left + popoverRect.width > viewportWidth - margin) {
            left = viewportWidth - popoverRect.width - margin;
        }
        if (top < navbarHeight) top = navbarHeight;
        if (top + popoverRect.height > viewportHeight - margin) {
            top = viewportHeight - popoverRect.height - margin;
        }

        this.popover.setAttribute('data-placement', placement);
        this.popover.style.left = `${left}px`;
        this.popover.style.top = `${top}px`;

        requestAnimationFrame(() => {
            this.popover.classList.add('tour-popover-visible');
        });
    }

    _handleKeyDown(e) {
        if (!this.isStarted) return;
        if (e.key === 'ArrowRight' || e.key === 'Enter') {
            e.preventDefault();
            this.next();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.prev();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.end(false);
        }
    }

    _handleResize() {
        if (!this.isStarted || !this.activeTarget) return;
        this._updateSpotlight(this.activeTarget);
        this._positionPopover(this.activeTarget, this.steps[this.currentStepIndex]?.placement || 'auto');
    }

    _isElementVisible(elem) {
        if (!elem || !elem.isConnected) return false;
        const style = window.getComputedStyle(elem);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    }
}

/* ==========================================
   Step Configurations for Equity Labs
   ========================================== */

/**
 * Detailed 10-step tour for Finance Tracker
 */
export const financeTrackerTourSteps = [
    {
        target: '.finance-header-hero',
        title: 'Welcome to Finance Tracker',
        icon: 'bi bi-piggy-bank-fill',
        content: 'Your complete end-to-end encrypted dashboard for tracking net worth, investment portfolios, bank balances, credit liabilities, and future financial projections.',
        tip: '<strong>Pro Tip:</strong> All financial entries are securely encrypted in your browser before syncing to cloud database storage.',
        placement: 'bottom'
    },
    {
        target: '.month-navigator',
        title: 'Month Navigation & Controls',
        icon: 'bi bi-calendar3',
        content: 'Navigate seamlessly month-by-month using the left/right arrows. Use the control buttons on the right to access future forecasts, section visibility preferences, and privacy amount masking.',
        tip: 'Click the <i class="bi bi-eye-slash"></i> icon to quickly mask/unmask sensitive figures when viewing in public.',
        placement: 'bottom'
    },
    {
        target: '#financialSummarySection',
        title: 'Financial Summary Bar',
        icon: 'bi bi-cash-stack',
        content: 'View aggregated monthly totals for your <strong>Income</strong>, <strong>Expenditure</strong> (Bank + Cards), <strong>Invested</strong> amounts, <strong>Bank Balances</strong>, and <strong>Tax</strong> liabilities.',
        tip: 'Click on the <strong>Income</strong> or <strong>Tax</strong> cards to quickly log income or tax payments for the active month.',
        placement: 'bottom'
    },
    {
        target: '#netWorthSection',
        title: 'Net Worth & Solvency Overview',
        icon: 'bi bi-trophy-fill',
        content: 'Real-time calculation of your total wealth: <code>Total Assets - Total Liabilities = Net Worth</code>. Also includes dedicated trackers for your <strong>EPFO Provident Fund</strong> and <strong>CIBIL Credit Score</strong>.',
        tip: 'Click EPFO or CIBIL cards directly to update your latest provident fund balance or credit rating.',
        placement: 'bottom'
    },
    {
        target: '#investmentCategoriesSection',
        title: 'Investment Portfolio Tracker',
        icon: 'bi bi-collection-fill',
        content: 'Organize investments into buckets like Mutual Funds, Stocks, Fixed Deposits, Gold, Crypto, and Real Estate. Set target monthly SIP goals and update current asset valuations.',
        tip: 'Click <strong>+ Add Category</strong> to create custom investment buckets tailored to your portfolio strategy.',
        placement: 'bottom'
    },
    {
        target: '#bankAccountsSection',
        title: 'Bank Accounts Management',
        icon: 'bi bi-bank',
        content: 'Keep track of liquid balances across all your Savings, Salary, FD, and Cash accounts to get an accurate cash-flow baseline.',
        tip: 'Adding your bank accounts ensures your liquid net worth and emergency cash buffer calculations remain accurate.',
        placement: 'bottom'
    },
    {
        target: '#creditCardsSection',
        title: 'Credit Cards & Liability Tracking',
        icon: 'bi bi-credit-card-2-back-fill',
        content: 'Log statement balances, credit limits, and payment due dates across all your credit cards to avoid missed payment penalties.',
        tip: 'High credit card utilization will automatically raise alerts to protect your CIBIL score.',
        placement: 'bottom'
    },
    {
        target: '#analyticsSmartInsightsCard',
        title: 'Smart AI Financial Insights',
        icon: 'bi bi-lightbulb-fill',
        content: 'Equity Labs dynamically evaluates your financial health, warning you of high outflow ratios, low cash reserves, or under-invested monthly surpluses.',
        tip: 'Filter insights by <em>Wealth Growth</em>, <em>Savings & Outflows</em>, or <em>Safety & Buffer</em> chips.',
        placement: 'bottom'
    },
    {
        target: '#financialHealthSection',
        title: 'Financial Health Index & Solvency Rating',
        icon: 'bi bi-shield-heart-fill',
        content: 'Automated 0-to-100 score indicating your financial resilience, solvency rating, and emergency runway.',
        tip: 'Click <strong>View Action Plan</strong> for step-by-step personalized recommendations to improve your health score!',
        placement: 'bottom'
    },
    {
        target: () => document.querySelector('#equitybot-fab') || document.querySelector('#headerRightActions') || document.querySelector('.finance-header-hero'),
        title: 'AI Financial Assistant (EquityBot)',
        icon: 'bi bi-robot',
        content: 'Have questions about asset allocation, emergency funds, or stock analysis? Click the floating AI assistant icon anytime to converse with EquityBot!',
        tip: 'Try asking EquityBot: <em>"Analyze my financial health"</em> or <em>"How should I split my monthly income?"</em>',
        placement: 'top'
    }
];

/**
 * Site Overview Tour Steps
 */
export const siteOverviewTourSteps = [
    {
        target: '#navBrandLink',
        title: 'Welcome to Equity Labs',
        icon: 'bi bi-flask',
        content: 'Your intelligence platform for fundamental stock analysis, portfolio tracking, and personal finance management.',
        tip: 'Access all features anytime using the main top navigation bar.',
        placement: 'bottom'
    },
    {
        target: '#navAnalysisLink',
        title: 'Fundamental Analysis Engine',
        icon: 'bi bi-bar-chart-line',
        content: 'Analyze Indian stocks with DCF intrinsic valuation models, Peter Lynch formulas, Graham numbers, peer comparisons, and financial ratio breakdown.',
        placement: 'bottom'
    },
    {
        target: '#navStockManagerLink',
        title: 'Stock Portfolio Manager',
        icon: 'bi bi-wallet2',
        content: 'Track equity holdings, buy/sell transactions, unrealized P&L, dividend tracking, and portfolio sector weightings.',
        placement: 'bottom'
    },
    {
        target: '#navFinanceTrackerLink',
        title: 'Encrypted Personal Finance Tracker',
        icon: 'bi bi-piggy-bank',
        content: 'Manage month-on-month budget snapshots, bank accounts, credit liabilities, EPFO, and future wealth forecasts.',
        placement: 'bottom'
    },
    {
        target: '#navTakeTourBtn',
        title: 'Replay Guided Tours Anytime',
        icon: 'bi bi-compass',
        content: 'Whenever you want to refresh your memory or learn new features, click this <strong>Take a Tour</strong> button!',
        placement: 'bottom'
    }
];

/* ==========================================
   Helper Exports & Window Global Registrations
   ========================================== */

let financeTourInstance = null;
let siteTourInstance = null;

export function getFinanceTrackerTour() {
    if (!financeTourInstance) {
        financeTourInstance = new TourGuide('finance_tracker', financeTrackerTourSteps, {
            onComplete: () => {
                console.log('[TourGuide] Finance Tracker tour completed.');
            }
        });
    }
    return financeTourInstance;
}

export function getSiteTour() {
    if (!siteTourInstance) {
        siteTourInstance = new TourGuide('site_overview', siteOverviewTourSteps);
    }
    return siteTourInstance;
}

window.startFinanceTrackerTour = function(forceReplay = true) {
    const tour = getFinanceTrackerTour();
    if (forceReplay) tour.reset();
    tour.start(0);
};

window.startSiteTour = function(forceReplay = true) {
    const tour = getSiteTour();
    if (forceReplay) tour.reset();
    tour.start(0);
};
