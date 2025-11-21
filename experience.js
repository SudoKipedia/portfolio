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

        // Adapter la taille des blobs selon la taille de l'écran
        const isMobile = window.innerWidth <= 768;
        const baseRadius = 140; // Taille identique sur tous les écrans
        const radiusVariation = isMobile ? 0.25 : 0.2; // Respiration adaptée

        // Créer 16 blobs de gradient : bordeaux foncé vers rouge pâle
        // Répartis aléatoirement sur toute la page
        const colors = [
            'rgba(127, 29, 29, 0.12)',   // Bordeaux foncé
            'rgba(185, 28, 28, 0.12)',   // Rouge bordeaux
            'rgba(220, 38, 38, 0.1)',    // Rouge medium
            'rgba(239, 68, 68, 0.08)',   // Rouge standard
            'rgba(252, 165, 165, 0.1)',  // Rouge clair
            'rgba(254, 202, 202, 0.1)'   // Rouge pâle
        ];

        this.blobs = [];
        for (let i = 0; i < 16; i++) {
            const randomRadius = baseRadius * (0.5 + Math.random() * 0.8); // Tailles variées: 50% à 130% de la base
            this.blobs.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * this.canvas.height,
                radius: randomRadius,
                baseRadius: randomRadius,
                targetRadius: randomRadius * (0.8 + Math.random() * 0.4), // Taille cible variable
                radiusSpeed: 0.002 + Math.random() * 0.003, // Vitesse de changement de taille
                color: colors[Math.floor(Math.random() * colors.length)],
                speedX: (Math.random() - 0.5) * 2,
                speedY: (Math.random() - 0.5) * 2,
                directionX: (Math.random() - 0.5) * 0.5,
                directionY: (Math.random() - 0.5) * 0.5
            });
        }
        
        this.radiusVariation = radiusVariation;
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.time += 0.005;

        // Animer et dessiner chaque blob
        this.blobs.forEach((blob, index) => {
            // Mouvement aléatoire simple avec rebonds sur les bords
            blob.x += blob.directionX;
            blob.y += blob.directionY;
            
            // Rebondir sur les bords horizontaux
            if (blob.x <= blob.radius || blob.x >= this.canvas.width - blob.radius) {
                blob.directionX *= -1;
            }
            
            // Rebondir sur les bords verticaux
            if (blob.y <= blob.radius || blob.y >= this.canvas.height - blob.radius) {
                blob.directionY *= -1;
            }

            // Variation de taille aléatoire et continue
            blob.radius += (blob.targetRadius - blob.radius) * blob.radiusSpeed;
            
            // Changer la taille cible aléatoirement
            if (Math.abs(blob.radius - blob.targetRadius) < 2) {
                blob.targetRadius = blob.baseRadius * (0.7 + Math.random() * 0.6);
            }

            // Effet de respiration sur le rayon (adapté au mobile)
            const breathingAmplitude = this.radiusVariation * blob.baseRadius;
            const breathingRadius = blob.radius + Math.sin(this.time + index) * breathingAmplitude;

            // Dessiner le blob en forme de cercle (pas d'ellipse)
            this.ctx.save();
            this.ctx.translate(blob.x, blob.y);
            
            // Créer le gradient radial circulaire
            const gradient = this.ctx.createRadialGradient(
                0, 0, 0,
                0, 0, breathingRadius
            );

            gradient.addColorStop(0, blob.color);
            gradient.addColorStop(0.5, blob.color.replace(/[\d.]+\)$/, '0.05)'));
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            // Dessiner un cercle parfait
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, breathingRadius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
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
        
        // Recalculer la position du menu après l'animation
        setTimeout(() => {
            if (window.legendPositionManager) {
                window.legendPositionManager.updatePosition();
            }
        }, 100);
        setTimeout(() => {
            if (window.legendPositionManager) {
                window.legendPositionManager.updatePosition();
            }
        }, 400);
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
        let scrollTimeout;
        let isScrolling = false;
        
        // Référence au LegendPositionManager (sera définie plus tard)
        const getLegendManager = () => window.legendPositionManager;
        
        // Détecter le scroll pour désactiver l'interaction
        const handleScroll = () => {
            isScrolling = true;
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
            }, 150);
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        this._scrollHandler = handleScroll;
        
        this.cards.forEach(card => {
            // Retirer l'ancien listener s'il existe
            if (card._clickHandler) {
                card.removeEventListener('click', card._clickHandler);
            }
            
            // Créer le nouveau handler
            card._clickHandler = (e) => {
                // Ignorer le clic si on est en train de scroller
                if (isScrolling) {
                    e.preventDefault();
                    return;
                }
                
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
                
                // Recalculer la position du menu après l'animation
                setTimeout(() => {
                    const manager = getLegendManager();
                    if (manager) manager.updatePosition();
                }, 100);
                setTimeout(() => {
                    const manager = getLegendManager();
                    if (manager) manager.updatePosition();
                }, 400);
            };
            
            card.addEventListener('click', card._clickHandler);
            
            // Commencer repliées
            card.classList.add('collapsed');
            card.classList.remove('expanded');
        });
    }
    
    cleanupMobileClick() {
        // Retirer le listener de scroll
        if (this._scrollHandler) {
            window.removeEventListener('scroll', this._scrollHandler);
            this._scrollHandler = null;
        }
        
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
        this.observeCardSizes();
    }
    
    observeCardSizes() {
        // Utiliser ResizeObserver pour détecter les changements de taille des cartes
        if ('ResizeObserver' in window) {
            const resizeObserver = new ResizeObserver(() => {
                // Recalculer plusieurs fois après les changements de taille
                this.updatePosition();
                setTimeout(() => this.updatePosition(), 50);
                setTimeout(() => this.updatePosition(), 150);
                setTimeout(() => this.updatePosition(), 300);
                setTimeout(() => this.updatePosition(), 450);
            });
            
            // Observer toutes les cartes d'expérience
            this.experienceCards.forEach(card => {
                resizeObserver.observe(card);
            });
            
            // Observer aussi la légende elle-même
            resizeObserver.observe(this.legend);
        }
    }
    
    updatePosition() {
        // Récupérer la dernière carte d'expérience
        const lastCard = this.experienceCards[this.experienceCards.length - 1];
        const lastCardRect = lastCard.getBoundingClientRect();
        const lastCardBottom = lastCardRect.bottom + window.scrollY;
        
        // Hauteur et position de la légende (toujours recalculer)
        const legendHeight = this.legend.offsetHeight;
        const isMobile = window.innerWidth <= 768;
        const legendBottomMargin = isMobile ? 16 : 32;
        const cardLegendGap = 64; // 4rem d'espace
        
        // Position où la légende devrait se fixer (sous la dernière carte)
        const legendFixedPosition = lastCardBottom + cardLegendGap;
        
        // Position actuelle de la légende en fixed
        const currentFixedBottom = window.scrollY + window.innerHeight - legendBottomMargin - legendHeight;
        
        // Si la position fixed dépasse la position calculée
        if (currentFixedBottom >= legendFixedPosition) {
            // Mode absolute
            this.legend.classList.add('at-contact');
            this.legend.style.top = `${legendFixedPosition}px`;
            this.isFixed = false;
        } else {
            // Mode fixed
            this.legend.classList.remove('at-contact');
            this.legend.style.top = '';
            this.isFixed = true;
        }
    }
    
    initScrollListener() {
        window.addEventListener('scroll', () => this.updatePosition(), { passive: true });
        setTimeout(() => this.updatePosition(), 100);
        
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.isFixed = !this.legend.classList.contains('at-contact');
                this.updatePosition();
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
    
    // Rendre le legendPositionManager accessible globalement
    window.legendPositionManager = legendPositionManager;
    
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
