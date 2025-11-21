// =====================================================
// GLASSMORPHISM TECH - ANIMATED GRADIENT BACKGROUND
// =====================================================

class AnimatedGradient {
    constructor() {
        this.canvas = document.getElementById('neuralCanvas');
        
        if (!this.canvas) {
            console.warn('Canvas #neuralCanvas not found');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.blobs = [];
        this.animationId = null;
        this.time = 0;

        this.init();
        this.animate();
        this.handleResize();
    }

    init() {
        // Dimensionner le canvas
        this.canvas.width = window.innerWidth;
        this.canvas.height = Math.max(document.body.scrollHeight, window.innerHeight);

        // Créer 12 blobs de gradient : bordeaux foncé vers rouge pâle
        // Répartis sur tout l'espace avec des vitesses variées pour éviter les regroupements
        this.blobs = [
            {
                x: window.innerWidth * 0.1,
                y: window.innerHeight * 0.15,
                radius: 140,
                color: 'rgba(127, 29, 29, 0.12)', // Bordeaux foncé
                speedX: 0.6,
                speedY: 0.4,
                angle: 0
            },
            {
                x: window.innerWidth * 0.85,
                y: window.innerHeight * 0.25,
                radius: 150,
                color: 'rgba(185, 28, 28, 0.12)', // Rouge bordeaux
                speedX: -0.8,
                speedY: 0.5,
                angle: Math.PI * 0.3
            },
            {
                x: window.innerWidth * 0.45,
                y: window.innerHeight * 0.9,
                radius: 130,
                color: 'rgba(220, 38, 38, 0.1)', // Rouge medium
                speedX: 0.7,
                speedY: -0.9,
                angle: Math.PI * 1.7
            },
            {
                x: window.innerWidth * 0.95,
                y: window.innerHeight * 0.65,
                radius: 120,
                color: 'rgba(239, 68, 68, 0.08)', // Rouge standard
                speedX: -1.0,
                speedY: -0.6,
                angle: Math.PI * 1.2
            },
            {
                x: window.innerWidth * 0.2,
                y: window.innerHeight * 0.5,
                radius: 145,
                color: 'rgba(252, 165, 165, 0.1)', // Rouge clair
                speedX: 0.5,
                speedY: 0.8,
                angle: Math.PI * 0.8
            },
            {
                x: window.innerWidth * 0.65,
                y: window.innerHeight * 0.1,
                radius: 135,
                color: 'rgba(254, 202, 202, 0.1)', // Rouge pâle
                speedX: -0.4,
                speedY: 0.9,
                angle: Math.PI * 0.1
            },
            {
                x: window.innerWidth * 0.05,
                y: window.innerHeight * 0.75,
                radius: 140,
                color: 'rgba(127, 29, 29, 0.09)', // Bordeaux foncé
                speedX: 0.9,
                speedY: -0.7,
                angle: Math.PI * 1.4
            },
            {
                x: window.innerWidth * 0.75,
                y: window.innerHeight * 0.45,
                radius: 125,
                color: 'rgba(220, 38, 38, 0.11)', // Rouge medium
                speedX: -0.6,
                speedY: 0.7,
                angle: Math.PI * 0.6
            },
            {
                x: window.innerWidth * 0.35,
                y: window.innerHeight * 0.3,
                radius: 130,
                color: 'rgba(239, 68, 68, 0.11)', // Rouge standard
                speedX: 0.8,
                speedY: 0.5,
                angle: Math.PI * 0.4
            },
            {
                x: window.innerWidth * 0.55,
                y: window.innerHeight * 0.8,
                radius: 135,
                color: 'rgba(185, 28, 28, 0.1)', // Rouge bordeaux
                speedX: -0.7,
                speedY: -0.8,
                angle: Math.PI * 1.6
            },
            {
                x: window.innerWidth * 0.15,
                y: window.innerHeight * 0.35,
                radius: 145,
                color: 'rgba(252, 165, 165, 0.1)', // Rouge clair
                speedX: 0.4,
                speedY: -0.6,
                angle: Math.PI * 0.9
            },
            {
                x: window.innerWidth * 0.9,
                y: window.innerHeight * 0.05,
                radius: 128,
                color: 'rgba(254, 202, 202, 0.11)', // Rouge pâle
                speedX: -0.5,
                speedY: 1.0,
                angle: Math.PI * 0.2
            }
        ];
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.time += 0.005;

        // Animer et dessiner chaque blob
        this.blobs.forEach((blob, index) => {
            // Mouvement fluide en forme de lemniscate (infini)
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            const radiusX = this.canvas.width * 0.3;
            const radiusY = this.canvas.height * 0.2;
            
            blob.angle += blob.speedX * 0.001;
            
            blob.x = centerX + Math.cos(blob.angle) * radiusX * (1 + Math.sin(blob.angle * 2) * 0.3);
            blob.y = centerY + Math.sin(blob.angle) * radiusY * (1 + Math.cos(blob.angle * 1.5) * 0.3);

            // Effet de respiration sur le rayon
            const breathingRadius = blob.radius + Math.sin(this.time + index) * 50;

            // Créer le gradient radial
            const gradient = this.ctx.createRadialGradient(
                blob.x, blob.y, 0,
                blob.x, blob.y, breathingRadius
            );

            gradient.addColorStop(0, blob.color);
            gradient.addColorStop(0.5, blob.color.replace(/[\d.]+\)$/, '0.05)'));
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            // Dessiner le blob
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(blob.x, blob.y, breathingRadius, 0, Math.PI * 2);
            this.ctx.fill();
        });

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    handleResize() {
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = Math.max(document.body.scrollHeight, window.innerHeight);
        });
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}

// =====================================================
// INTERSECTION OBSERVER - ANIMATION AU SCROLL
// =====================================================

class ScrollAnimations {
    constructor() {
        this.observerOptions = {
            threshold: 0.2,
            rootMargin: '-100px'
        };

        this.initObserver();
    }

    initObserver() {
        const cards = document.querySelectorAll('.neural-node');

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            }, this.observerOptions);

            cards.forEach(card => {
                observer.observe(card);
            });
        } else {
            // Fallback pour navigateurs anciens
            cards.forEach(card => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            });
        }
    }
}

// =====================================================
// SKILL HIGHLIGHTING - LÉGENDE INTERACTIVE
// =====================================================

class SkillHighlighter {
    constructor() {
        this.legendItems = document.querySelectorAll('.legend-item');
        this.cards = document.querySelectorAll('.neural-node');
        this.activeFilter = null;
        
        this.initListeners();
    }

    initListeners() {
        this.legendItems.forEach(item => {
            // Clic uniquement pour le filtrage
            item.addEventListener('click', () => this.toggleFilter(item));
        });
    }

    toggleFilter(item) {
        const skill = item.getAttribute('data-skill');
        
        // Si on clique sur le filtre actif, on le désactive
        if (this.activeFilter === skill) {
            this.activeFilter = null;
            this.legendItems.forEach(i => i.classList.remove('active'));
            this.removeHighlight();
            return;
        }
        
        // Activer le nouveau filtre
        this.activeFilter = skill;
        this.legendItems.forEach(i => {
            if (i.getAttribute('data-skill') === skill) {
                i.classList.add('active');
            } else {
                i.classList.remove('active');
            }
        });
        
        this.applyFilter(item);
    }

    applyFilter(item) {
        const skill = item.getAttribute('data-skill');
        
        // Récupérer la couleur de la compétence
        const skillColors = {
            'cybersecurity': { rgb: '127, 29, 29', color: '#7f1d1d' },
            'automation': { rgb: '153, 27, 27', color: '#991b1b' },
            'incident-response': { rgb: '185, 28, 28', color: '#b91c1c' },
            'devops': { rgb: '220, 38, 38', color: '#dc2626' },
            'infrastructure': { rgb: '239, 68, 68', color: '#ef4444' },
            'networking': { rgb: '252, 165, 165', color: '#fca5a5' },
            'systems': { rgb: '254, 202, 202', color: '#fecaca' }
        };
        
        const skillColor = skillColors[skill] || { rgb: '239, 68, 68', color: '#ef4444' };
        
        this.cards.forEach(card => {
            const cardSkills = card.getAttribute('data-skills');
            
            if (cardSkills && cardSkills.includes(skill)) {
                card.style.display = '';
                card.style.borderColor = `rgba(${skillColor.rgb}, 0.8)`;
                card.style.boxShadow = `
                    0 8px 32px rgba(${skillColor.rgb}, 0.5),
                    0 0 80px rgba(${skillColor.rgb}, 0.3),
                    inset 0 2px 4px rgba(255, 255, 255, 0.1),
                    inset 0 -2px 4px rgba(0, 0, 0, 0.1)
                `;
                card.style.transform = '';
                card.style.opacity = '';
            } else {
                card.style.display = 'none';
            }
        });
    }

    highlightSkill(item) {
        const skill = item.getAttribute('data-skill');
        
        // Récupérer la couleur de la compétence survolée
        const skillColors = {
            'cybersecurity': { rgb: '127, 29, 29', color: '#7f1d1d' },
            'automation': { rgb: '153, 27, 27', color: '#991b1b' },
            'incident-response': { rgb: '185, 28, 28', color: '#b91c1c' },
            'devops': { rgb: '220, 38, 38', color: '#dc2626' },
            'infrastructure': { rgb: '239, 68, 68', color: '#ef4444' },
            'networking': { rgb: '252, 165, 165', color: '#fca5a5' },
            'systems': { rgb: '254, 202, 202', color: '#fecaca' }
        };
        
        const skillColor = skillColors[skill] || { rgb: '239, 68, 68', color: '#ef4444' };
        
        this.cards.forEach(card => {
            const cardSkills = card.getAttribute('data-skills');
            
            if (cardSkills && cardSkills.includes(skill)) {
                card.style.borderColor = `rgba(${skillColor.rgb}, 0.8)`;
                card.style.boxShadow = `
                    0 8px 32px rgba(${skillColor.rgb}, 0.5),
                    0 0 80px rgba(${skillColor.rgb}, 0.3)
                `;
                card.style.transform = 'translateY(-10px) scale(1.03)';
            } else {
                card.style.opacity = '0.4';
            }
        });
    }

    removeHighlight() {
        this.cards.forEach(card => {
            card.style.borderColor = '';
            card.style.boxShadow = '';
            card.style.transform = '';
            card.style.opacity = '';
            card.style.display = '';
        });
    }
}

// =====================================================
// TOGGLE SKILLS LEGEND
// =====================================================

function toggleSkillsLegend() {
    const legend = document.getElementById('skillsLegend');
    const container = document.querySelector('.neural-container');
    
    if (!legend || !container) return;
    
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // Sur mobile : simple toggle entre déployé et réduit
        legend.classList.toggle('collapsed');
        
        if (legend.classList.contains('collapsed')) {
            container.classList.remove('legend-expanded');
            container.classList.add('legend-collapsed');
        } else {
            container.classList.remove('legend-collapsed');
            container.classList.add('legend-expanded');
        }
    } else {
        // Sur desktop : gestion du mode locked
        if (legend.classList.contains('locked') && !legend.classList.contains('collapsed')) {
            legend.classList.remove('locked');
            // Le menu reste déployé, il se réduira au mouseleave
        } else {
            // Sinon, on déploie et on lock
            legend.classList.add('locked');
            legend.classList.remove('collapsed');
            container.classList.remove('legend-collapsed');
            container.classList.add('legend-expanded');
        }
    }
}

// Gestionnaire de survol pour la légende
function initLegendHover() {
    const legend = document.getElementById('skillsLegend');
    const toggleBtn = legend?.querySelector('.toggle-legend');
    const container = document.querySelector('.neural-container');
    
    if (!legend || !toggleBtn) return;
    
    let isHoveringToggle = false;
    let hoverHandlersActive = false;
    
    // Gestionnaires d'événements
    const toggleEnterHandler = () => { isHoveringToggle = true; };
    const toggleLeaveHandler = () => { isHoveringToggle = false; };
    
    const legendEnterHandler = () => {
        if (!legend.classList.contains('locked') && !isHoveringToggle) {
            legend.classList.remove('collapsed');
            if (container) {
                container.classList.remove('legend-collapsed');
                container.classList.add('legend-expanded');
            }
        }
    };
    
    const legendLeaveHandler = () => {
        if (!legend.classList.contains('locked')) {
            legend.classList.add('collapsed');
            if (container) {
                container.classList.remove('legend-expanded');
                container.classList.add('legend-collapsed');
            }
        }
    };
    
    // Fonction pour activer/désactiver les gestionnaires selon la taille d'écran
    function updateHoverBehavior() {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile && hoverHandlersActive) {
            // Retirer les gestionnaires sur mobile
            toggleBtn.removeEventListener('mouseenter', toggleEnterHandler);
            toggleBtn.removeEventListener('mouseleave', toggleLeaveHandler);
            legend.removeEventListener('mouseenter', legendEnterHandler);
            legend.removeEventListener('mouseleave', legendLeaveHandler);
            hoverHandlersActive = false;
            
            // Nettoyer le state locked sur mobile
            legend.classList.remove('locked');
        } else if (!isMobile && !hoverHandlersActive) {
            // Ajouter les gestionnaires sur desktop
            toggleBtn.addEventListener('mouseenter', toggleEnterHandler);
            toggleBtn.addEventListener('mouseleave', toggleLeaveHandler);
            legend.addEventListener('mouseenter', legendEnterHandler);
            legend.addEventListener('mouseleave', legendLeaveHandler);
            hoverHandlersActive = true;
        }
    }
    
    // Initialiser
    updateHoverBehavior();
    
    // Écouter les changements de taille d'écran
    window.addEventListener('resize', updateHoverBehavior);
}

// =====================================================
// CARD EXPANDER - DÉPLOIEMENT AUTO AU SCROLL
// =====================================================

class CardExpander {
    constructor() {
        this.cards = document.querySelectorAll('.neural-node');
        this.currentCardIndex = 0;
        this.lastScrollY = window.scrollY;
        this.isScrolling = false;
        this.scrollHandler = null;
        this.resizeHandler = null;
        this.initExpander();
        this.initResizeListener();
    }

    initExpander() {
        // Comportement différent selon mobile/desktop
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Mobile : déploiement au clic
            this.setupMobileClick();
        } else {
            // Desktop : comportement hover normal (géré par CSS)
            this.cleanupMobileClick();
        }
    }
    
    setupMobileClick() {
        // Sur mobile : déploiement au clic
        this.cards.forEach(card => {
            // Retirer l'ancien listener s'il existe
            if (card._clickHandler) {
                card.removeEventListener('click', card._clickHandler);
            }
            
            // Créer le nouveau handler
            card._clickHandler = () => {
                const isExpanded = card.classList.contains('expanded');
                
                if (isExpanded) {
                    // Replier
                    card.classList.remove('expanded');
                    card.classList.add('collapsed');
                } else {
                    // Déployer
                    card.classList.add('expanded');
                    card.classList.remove('collapsed');
                }
            };
            
            card.addEventListener('click', card._clickHandler);
            
            // Commencer repliées
            card.classList.add('collapsed');
            card.classList.remove('expanded');
        });
    }
    
    cleanupMobileClick() {
        // Retirer les listeners de clic et classes sur desktop
        this.cards.forEach(card => {
            if (card._clickHandler) {
                card.removeEventListener('click', card._clickHandler);
                card._clickHandler = null;
            }
            card.classList.remove('collapsed');
            card.classList.remove('expanded');
        });
    }

    initResizeListener() {
        let resizeTimeout;
        this.resizeHandler = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.initExpander();
            }, 200);
        };
        window.addEventListener('resize', this.resizeHandler);
    }

    expandCard(index) {
        if (this.isScrolling) return;
        this.isScrolling = true;

        // Replier toutes les cartes
        this.cards.forEach(card => {
            card.classList.remove('expanded');
            card.classList.add('collapsed');
        });

        // Déployer la carte ciblée
        const targetCard = this.cards[index];
        if (!targetCard) {
            this.isScrolling = false;
            return;
        }

        this.currentCardIndex = index;
        
        // Déployer la carte
        targetCard.classList.add('expanded');
        targetCard.classList.remove('collapsed');
        
        setTimeout(() => {
            this.isScrolling = false;
        }, 600);
    }
}

// =====================================================
// SCROLL POSITION RESTORATION
// =====================================================

function restoreScrollPosition() {
    const savedPosition = sessionStorage.getItem('scrollPos');
    if (savedPosition) {
        setTimeout(() => {
            window.scrollTo(0, parseInt(savedPosition));
            sessionStorage.removeItem('scrollPos');
        }, 100);
    }
}

// =====================================================
// LEGEND POSITION MANAGER
// =====================================================

class LegendPositionManager {
    constructor() {
        this.legend = document.getElementById('skillsLegend');
        this.contactSection = document.querySelector('.neural-contact');
        this.experienceCards = document.querySelectorAll('.neural-node');
        
        if (!this.legend || !this.contactSection || this.experienceCards.length === 0) return;
        
        this.isFixed = true;
        this.initScrollListener();
    }
    
    initScrollListener() {
        const handleScroll = () => {
            // Récupérer la dernière carte d'expérience
            const lastCard = this.experienceCards[this.experienceCards.length - 1];
            const lastCardRect = lastCard.getBoundingClientRect();
            const lastCardBottom = lastCardRect.bottom + window.scrollY;
            
            // Hauteur et position de la légende
            const legendHeight = this.legend.offsetHeight;
            const legendBottomMargin = 32; // 2rem depuis le bas en fixed
            const cardLegendGap = 32; // Espace entre la dernière carte et la légende (2rem)
            
            // Position où la légende devrait se fixer (juste sous la dernière carte)
            const legendFixedPosition = lastCardBottom + cardLegendGap;
            
            // Position actuelle de la légende en fixed (bas de l'écran - margin)
            const currentFixedBottom = window.scrollY + window.innerHeight - legendBottomMargin - legendHeight;
            
            // Si la position fixed dépasse la position où elle doit se fixer
            if (currentFixedBottom >= legendFixedPosition) {
                if (this.isFixed) {
                    // Passer en absolute et fixer à la position calculée
                    this.legend.classList.add('at-contact');
                    this.legend.style.top = `${legendFixedPosition}px`;
                    this.isFixed = false;
                }
            } else {
                if (!this.isFixed) {
                    // Rester en fixed
                    this.legend.classList.remove('at-contact');
                    this.legend.style.top = '';
                    this.isFixed = true;
                }
            }
        };
        
        // Utiliser scroll event sans debounce pour une fluidité maximale
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // Vérifier au chargement et resize
        setTimeout(handleScroll, 100);
        
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.isFixed = !this.legend.classList.contains('at-contact');
                handleScroll();
            }, 100);
        });
    }
}

// =====================================================
// SMOOTH SCROLL
// =====================================================

class SmoothScroll {
    constructor() {
        this.initSmoothScroll();
    }

    initSmoothScroll() {
        document.documentElement.style.scrollBehavior = 'smooth';
    }
}

// =====================================================
// INITIALISATION
// =====================================================

function initExperiencePage() {
    // Vérifier qu'on est bien sur la page experience
    if (!document.querySelector('.experience-page')) {
        return;
    }

    // Restaurer la position de scroll si changement de langue
    restoreScrollPosition();

    // Initialiser tous les modules
    const animatedGradient = new AnimatedGradient();
    const scrollAnimations = new ScrollAnimations();
    const skillHighlighter = new SkillHighlighter();
    const smoothScroll = new SmoothScroll();
    const cardExpander = new CardExpander();
    const legendPositionManager = new LegendPositionManager();
    
    // Initialiser le système de survol de la légende
    initLegendHover();
    
    // Initialiser le container avec la classe appropriée
    const legend = document.getElementById('skillsLegend');
    const container = document.querySelector('.neural-container');
    if (legend && container) {
        if (legend.classList.contains('collapsed')) {
            container.classList.add('legend-collapsed');
        } else {
            container.classList.add('legend-expanded');
        }
    }

    console.log('✨ Experience page glassmorphism initialized');

    // Cleanup au déchargement de la page
    window.addEventListener('beforeunload', () => {
        if (animatedGradient) {
            animatedGradient.destroy();
        }
    });
}

// Lancer l'initialisation au chargement du DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExperiencePage);
} else {
    initExperiencePage();
}

// Export pour utilisation éventuelle
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AnimatedGradient,
        ScrollAnimations,
        SkillHighlighter,
        SmoothScroll
    };
}
