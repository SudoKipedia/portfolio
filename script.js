document.addEventListener('DOMContentLoaded', () => {
    // ===================================
    // CANVAS PARTICLES BACKGROUND
    // ===================================
    const canvas = document.getElementById('bg-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particlesArray;

        canvas.width = document.documentElement.clientWidth;
        canvas.height = document.documentElement.clientHeight;

        let mouse = {
            x: null,
            y: null,
            radius: (canvas.height / 150) * (canvas.width / 150),
            isMouseDown: false,
            isBlasting: false,
        };

        window.addEventListener('mousemove', event => {
            mouse.x = event.clientX;
            mouse.y = event.clientY;
        });

        window.addEventListener('mousedown', () => {
            mouse.isMouseDown = true;
        });

        window.addEventListener('mouseup', () => {
            mouse.isMouseDown = false;
            mouse.isBlasting = true;
            setTimeout(() => {
                mouse.isBlasting = false;
            }, 300);
        });

        // Événements tactiles pour mobile
        let isScrolling = false;
        let scrollTimeout;
        let lastTouchY = null;
        let touchStartY = null;
        let initialViewportHeight = window.innerHeight;
        let isViewportChanging = false;

        // Détecter les changements de taille du viewport (UI du navigateur)
        window.addEventListener('resize', () => {
            const currentHeight = window.innerHeight;
            if (Math.abs(currentHeight - initialViewportHeight) > 50) {
                // L'UI du navigateur change
                isViewportChanging = true;
                mouse.isMouseDown = false;
                mouse.x = null;
                mouse.y = null;

                setTimeout(() => {
                    isViewportChanging = false;
                    initialViewportHeight = currentHeight;
                }, 400);
            }
        });

        window.addEventListener(
            'touchstart',
            event => {
                if (event.touches.length > 0 && !isViewportChanging) {
                    isScrolling = false;
                    touchStartY = event.touches[0].clientY;
                    lastTouchY = touchStartY;

                    // Activer les interactions tactiles
                    mouse.x = event.touches[0].clientX;
                    mouse.y = event.touches[0].clientY;
                    mouse.isMouseDown = true;
                }
            },
            { passive: true }
        );

        window.addEventListener(
            'touchmove',
            event => {
                if (event.touches.length > 0) {
                    const currentTouchY = event.touches[0].clientY;

                    // Détecte si c'est un scroll vertical (mouvement significatif depuis le départ)
                    if (touchStartY !== null) {
                        const totalDeltaY = Math.abs(currentTouchY - touchStartY);
                        const recentDeltaY =
                            lastTouchY !== null ? Math.abs(currentTouchY - lastTouchY) : 0;

                        // Considérer comme scroll si mouvement total > 15px OU mouvement récent > 5px
                        if (totalDeltaY > 15 || recentDeltaY > 5) {
                            isScrolling = true;
                        }
                    }

                    lastTouchY = currentTouchY;

                    // Si c'est un scroll ou viewport change, désactiver l'interaction
                    if (isScrolling || isViewportChanging) {
                        mouse.isMouseDown = false;
                        mouse.x = null;
                        mouse.y = null;
                    }
                }
            },
            { passive: true }
        );

        window.addEventListener(
            'touchend',
            () => {
                touchStartY = null;
                lastTouchY = null;
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    isScrolling = false;
                }, 200);

                if (!isScrolling && !isViewportChanging) {
                    mouse.isMouseDown = false;
                    mouse.isBlasting = true;
                    setTimeout(() => {
                        mouse.isBlasting = false;
                        mouse.x = null;
                        mouse.y = null;
                    }, 300);
                } else {
                    mouse.isMouseDown = false;
                    mouse.x = null;
                    mouse.y = null;
                }
            },
            { passive: true }
        );

        class Particle {
            constructor(x, y, directionX, directionY, size, color) {
                this.x = x;
                this.y = y;
                this.directionX = directionX;
                this.directionY = directionY;
                this.size = size;
                this.color = color;
                this.density = Math.random() * 5 + 1;
                this.vx = 0;
                this.vy = 0;
                this.friction = 0.96;
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
                ctx.fillStyle = '#ef4444';
                ctx.fill();
            }

            update() {
                if (this.x > canvas.width || this.x < 0) {
                    this.directionX = -this.directionX;
                    this.vx = -this.vx;
                }
                if (this.y > canvas.height || this.y < 0) {
                    this.directionY = -this.directionY;
                    this.vy = -this.vy;
                }

                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (mouse.isMouseDown && distance < 400) {
                    let force = (400 - distance) / 400;
                    let forceDirectionX = dx / distance;
                    let forceDirectionY = dy / distance;
                    this.vx += forceDirectionX * force * 1.5;
                    this.vy += forceDirectionY * force * 1.5;
                } else if (mouse.isBlasting && distance < 90) {
                    let force = (90 - distance) / 90;
                    let forceDirectionX = dx / distance;
                    let forceDirectionY = dy / distance;
                    this.vx -= forceDirectionX * force * 1.5;
                    this.vy -= forceDirectionY * force * 1.5;
                } else if (distance < mouse.radius) {
                    let force = (mouse.radius - distance) / mouse.radius;
                    let forceDirectionX = dx / distance;
                    let forceDirectionY = dy / distance;
                    this.vx -= forceDirectionX * force * 0.5;
                    this.vy -= forceDirectionY * force * 0.5;
                }

                this.vx *= this.friction;
                this.vy *= this.friction;

                this.x += this.directionX + this.vx;
                this.y += this.directionY + this.vy;

                this.draw();
            }
        }

        function init() {
            particlesArray = [];
            let numberOfParticles = (canvas.height * canvas.width) / 9000;
            for (let i = 0; i < numberOfParticles; i++) {
                let size = Math.random() * 2 + 1;
                let x = Math.random() * (innerWidth - size * 2 - size * 2) + size * 2;
                let y = Math.random() * (innerHeight - size * 2 - size * 2) + size * 2;
                let directionX = Math.random() * 0.4 - 0.2;
                let directionY = Math.random() * 0.4 - 0.2;
                let color = '#ef4444';

                particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
            }
        }

        function connect() {
            let opacityValue = 1;
            for (let a = 0; a < particlesArray.length; a++) {
                for (let b = a; b < particlesArray.length; b++) {
                    let distance =
                        (particlesArray[a].x - particlesArray[b].x) *
                            (particlesArray[a].x - particlesArray[b].x) +
                        (particlesArray[a].y - particlesArray[b].y) *
                            (particlesArray[a].y - particlesArray[b].y);
                    if (distance < (canvas.width / 7) * (canvas.height / 7)) {
                        opacityValue = 1 - distance / 20000;
                        ctx.strokeStyle = 'rgba(239, 68, 68,' + opacityValue + ')';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                        ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                        ctx.stroke();
                    }
                }
            }
        }

        function animate() {
            requestAnimationFrame(animate);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
            }
            connect();
        }

        init();
        animate();

        window.addEventListener('resize', () => {
            canvas.width = document.documentElement.clientWidth;
            canvas.height = document.documentElement.clientHeight;
            mouse.radius = (canvas.height / 100) * (canvas.width / 100);
            init();
        });

        window.addEventListener('mouseout', () => {
            mouse.x = undefined;
            mouse.y = undefined;
        });
    }

    // ===================================
    // SMOOTH SCROLL
    // ===================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerOffset = 100;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth',
                });
            }
        });
    });

    // ===================================
    // HEADER SCROLL EFFECT & SCROLL INDICATOR
    // ===================================
    const header = document.querySelector('.header');
    const scrollIndicator = document.querySelector('.scroll-indicator');
    const heroStats = document.querySelector('.hero-stats');
    let lastScroll = 0;

    console.log('heroStats trouvé:', heroStats);

    // Fonction d'initialisation au chargement de la page
    function initHeroStatsPosition() {
        if (!heroStats) return;
        
        const currentScroll = window.scrollY || window.pageYOffset;
        const viewportHeight = window.innerHeight;
        const isMobile = window.innerWidth <= 768;
        
        // Ne rien faire sur mobile
        if (isMobile) return;
        
        // Calculer la position du bas des hero stats
        const heroStatsRect = heroStats.getBoundingClientRect();
        const heroStatsBottom = heroStatsRect.bottom + currentScroll;
        
        // Calculer où l'animation se termine : position des stats + 50vh
        const animationEndScroll = heroStatsBottom + (viewportHeight * 0.5);
        
        // Si on a déjà scrollé au-delà de la fin de l'animation
        if (currentScroll > animationEndScroll) {
            // Appliquer directement le style final sans animation
            heroStats.style.position = 'fixed';
            heroStats.style.top = '10px';
            heroStats.style.left = '30px';
            heroStats.style.transform = 'scale(0.35)';
            heroStats.style.transformOrigin = 'top left';
            heroStats.style.opacity = '0.95';
            heroStats.style.zIndex = '999';
            heroStats.style.width = 'max-content';
            heroStats.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
            
            const statItems = heroStats.querySelectorAll('.stat-item');
            statItems.forEach(item => {
                item.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
            });
            
            // Marquer comme étant en mini mode MAIS avec le bon scrollAtStart
            heroStats.dataset.miniMode = 'true';
            heroStats.dataset.scrollAtStart = heroStatsBottom.toString();
            heroStats.dataset.fixedPositionSet = 'true';
        }
    }
    
    // Initialiser la position au chargement
    initHeroStatsPosition();

    function updateScrollIndicator() {
        const currentScroll = window.scrollY || window.pageYOffset;

        if (scrollIndicator) {
            const firstSection = document.querySelector('section:first-of-type');
            if (firstSection) {
                const firstSectionHeight = firstSection.offsetHeight;

                // L'indicateur est visible uniquement dans la première section
                if (currentScroll < firstSectionHeight - 100) {
                    scrollIndicator.classList.add('visible');
                    scrollIndicator.classList.remove('hidden');
                } else {
                    scrollIndicator.classList.remove('visible');
                    scrollIndicator.classList.add('hidden');
                }
            }
        }

        // Faire disparaître les stats progressivement avec transition fluide
        if (heroStats) {
            const viewportHeight = window.innerHeight;
            const isMobile = window.innerWidth <= 768;

            if (isMobile) {
                // Sur mobile : faire disparaître/réapparaître chaque stat individuellement
                const statItems = heroStats.querySelectorAll('.stat-item');
                const disappearTrigger = viewportHeight * (2 / 3); // Disparition au 1/3 en partant du bas
                const reappearTrigger = viewportHeight * (2 / 3); // Réapparition complète au 1/3 de la page

                // Configuration de la vitesse de disparition (plus c'est petit, plus c'est rapide)
                const fadeSpeed = 0.05; // Ajustable : 0.1 (très rapide) à 0.5 (très lent)
                const fadeRange = viewportHeight * fadeSpeed;

                statItems.forEach((item, index) => {
                    const itemRect = item.getBoundingClientRect();
                    const itemBottom = itemRect.bottom; // Position du bas de l'item

                    // Disparition (scroll vers le bas)
                    if (itemBottom > disappearTrigger + fadeRange) {
                        // Item complètement visible (en dessous du point de disparition)
                        item.style.setProperty('opacity', '1', 'important');
                        item.style.setProperty('transform', 'translateY(0)', 'important');
                    } else if (itemBottom < disappearTrigger - fadeRange) {
                        // Item a disparu, mais peut être en train de réapparaître
                        // Vérifier si on est en train de remonter et réapparaître
                        if (
                            itemBottom < reappearTrigger + fadeRange &&
                            itemBottom > reappearTrigger - fadeRange
                        ) {
                            // En train de réapparaître : le bas approche du 1/3 de la page
                            const reappearProgress =
                                (reappearTrigger - itemBottom + fadeRange) / (fadeRange * 2);
                            const opacity = Math.max(0, Math.min(1, reappearProgress));
                            const translateY =
                                -30 * (1 - Math.max(0, Math.min(1, reappearProgress)));
                            item.style.setProperty('opacity', opacity.toString(), 'important');
                            item.style.setProperty(
                                'transform',
                                `translateY(${translateY}px)`,
                                'important'
                            );
                        } else if (itemBottom >= reappearTrigger + fadeRange) {
                            // Complètement réapparu (le bas est au-dessus du 1/3)
                            item.style.setProperty('opacity', '1', 'important');
                            item.style.setProperty('transform', 'translateY(0)', 'important');
                        } else {
                            // Complètement invisible
                            item.style.setProperty('opacity', '0', 'important');
                            item.style.setProperty('transform', 'translateY(-30px)', 'important');
                        }
                    } else {
                        // Transition de disparition progressive
                        const progress =
                            (disappearTrigger - itemBottom + fadeRange) / (fadeRange * 2);
                        const opacity = 1 - Math.max(0, Math.min(1, progress));
                        const translateY = -30 * Math.max(0, Math.min(1, progress));
                        item.style.setProperty('opacity', opacity.toString(), 'important');
                        item.style.setProperty(
                            'transform',
                            `translateY(${translateY}px)`,
                            'important'
                        );
                    }
                });
            } else {
                // Sur desktop : Réduction avec mouvement vers le coin supérieur gauche
                const heroStatsRect = heroStats.getBoundingClientRect();
                
                // L'animation commence SEULEMENT quand les cartes sont complètement visibles
                // (le bas des cartes doit être à au moins 10px du bas de l'écran)
                const cardsFullyVisible = heroStatsRect.bottom < viewportHeight - 10;
                
                // Sauvegarder UNIQUEMENT le scroll au moment où les cartes deviennent complètement visibles
                if (cardsFullyVisible && !heroStats.dataset.scrollAtStart) {
                    heroStats.dataset.scrollAtStart = currentScroll.toString();
                }
                
                const scrollAtStart = parseFloat(heroStats.dataset.scrollAtStart || 999999);
                
                // L'animation dure 50vh de scroll après que les cartes soient visibles
                const shrinkStart = scrollAtStart;
                const shrinkEnd = scrollAtStart + (viewportHeight * 0.5);

                if (currentScroll < shrinkStart || !cardsFullyVisible) {
                    // État normal : avant l'animation OU si les cartes ne sont plus visibles
                    if (heroStats.dataset.miniMode === 'true' || heroStats.dataset.fixedPositionSet === 'true') {
                        heroStats.dataset.miniMode = 'false';
                        heroStats.style.position = '';
                        heroStats.style.top = '';
                        heroStats.style.left = '';
                        heroStats.style.transform = '';
                        heroStats.style.opacity = '';
                        heroStats.style.zIndex = '';
                        heroStats.style.transition = '';
                        heroStats.style.boxShadow = '';
                        heroStats.style.width = '';
                        delete heroStats.dataset.animStartTop;
                        delete heroStats.dataset.animStartLeft;
                        delete heroStats.dataset.scrollAtStart;
                        delete heroStats.dataset.fixedPositionSet;
                        
                        // Réinitialiser les ombres sur les stat-items
                        const statItems = heroStats.querySelectorAll('.stat-item');
                        statItems.forEach(item => {
                            item.style.boxShadow = '';
                        });
                        
                        // Supprimer le placeholder
                        const placeholder = document.getElementById('hero-stats-placeholder');
                        if (placeholder) {
                            placeholder.remove();
                        }
                    }
                } else if (currentScroll >= shrinkEnd) {
                    // État final : mini-badge au coin supérieur gauche
                    heroStats.dataset.miniMode = 'true';
                    
                    heroStats.style.setProperty('position', 'fixed', 'important');
                    heroStats.style.setProperty('top', '10px', 'important');
                    heroStats.style.setProperty('left', '30px', 'important');
                    heroStats.style.setProperty('transform', 'scale(0.35)', 'important');
                    heroStats.style.setProperty('transform-origin', 'top left', 'important');
                    heroStats.style.setProperty('opacity', '0.95', 'important');
                    heroStats.style.setProperty('z-index', '999', 'important');
                    heroStats.style.setProperty('transition', 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)', 'important');
                    heroStats.style.setProperty('width', 'max-content', 'important');
                    
                    // Appliquer les ombres sur chaque stat-item
                    const statItems = heroStats.querySelectorAll('.stat-item');
                    statItems.forEach(item => {
                        item.style.setProperty('box-shadow', '0 8px 25px rgba(0, 0, 0, 0.3)', 'important');
                    });
                } else {
                    // Transition progressive en ligne droite vers le coin supérieur gauche
                    const progress = (currentScroll - shrinkStart) / (shrinkEnd - shrinkStart);
                    const scale = 1 - (0.65 * progress); // De 1 à 0.35
                    const opacity = 1 - (0.05 * progress); // De 1 à 0.95
                    
                    // Créer le placeholder une seule fois au premier frame
                    if (!heroStats.dataset.fixedPositionSet) {
                        const rect = heroStats.getBoundingClientRect();
                        
                        // Créer le placeholder AVANT de passer en fixed
                        const placeholder = document.createElement('div');
                        placeholder.id = 'hero-stats-placeholder';
                        placeholder.style.width = rect.width + 'px';
                        placeholder.style.height = rect.height + 'px';
                        placeholder.style.margin = window.getComputedStyle(heroStats).margin;
                        placeholder.style.visibility = 'hidden';
                        placeholder.style.pointerEvents = 'none';
                        heroStats.parentNode.insertBefore(placeholder, heroStats);
                        
                        // IMPORTANT : Passer immédiatement en position fixed
                        heroStats.style.setProperty('position', 'fixed', 'important');
                        heroStats.style.setProperty('top', `${rect.top}px`, 'important');
                        heroStats.style.setProperty('left', `${rect.left}px`, 'important');
                        heroStats.style.setProperty('width', 'max-content', 'important');
                        heroStats.style.setProperty('z-index', '999', 'important');
                        heroStats.style.setProperty('transition', 'none', 'important');
                        
                        // Sauvegarder la position de DÉPART de l'animation (celle qu'on vient de fixer)
                        // Ces valeurs NE DOIVENT JAMAIS être modifiées pendant l'animation
                        heroStats.dataset.animStartTop = rect.top.toString();
                        heroStats.dataset.animStartLeft = rect.left.toString();
                        heroStats.dataset.fixedPositionSet = 'true';
                    }
                    
                    // Positions de référence - LECTURE SEULE, jamais modifiées
                    const startTop = parseFloat(heroStats.dataset.animStartTop);
                    const startLeft = parseFloat(heroStats.dataset.animStartLeft);
                    const targetLeft = 30;
                    const targetTop = 10;
                    
                    // Animation linéaire de start vers target
                    const currentLeft = startLeft + (targetLeft - startLeft) * progress;
                    const currentTop = startTop + (targetTop - startTop) * progress;
                    
                    // Appliquer la transformation progressive
                    // Position fixed déjà appliquée au premier frame, on met juste à jour top/left
                    heroStats.style.setProperty('top', `${currentTop}px`, 'important');
                    heroStats.style.setProperty('left', `${currentLeft}px`, 'important');
                    
                    heroStats.style.setProperty('transform', `scale(${scale})`, 'important');
                    heroStats.style.setProperty('transform-origin', 'top left', 'important');
                    heroStats.style.setProperty('opacity', opacity.toString(), 'important');
                    heroStats.style.setProperty('z-index', '999', 'important');
                    heroStats.style.setProperty('transition', 'none', 'important');
                    
                    // Appliquer les ombres progressives sur chaque stat-item
                    const statItems = heroStats.querySelectorAll('.stat-item');
                    statItems.forEach(item => {
                        item.style.setProperty('box-shadow', `0 ${8 * progress}px ${25 * progress}px rgba(0, 0, 0, ${0.3 * progress})`, 'important');
                    });
                }
            }
        }
    }

    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY || window.pageYOffset;

        if (currentScroll > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        updateScrollIndicator();
        lastScroll = currentScroll;
    });

    // Initialisation de l'état au chargement - ne s'exécute qu'une fois
    const initOnce = () => {
        // Attendre que la restauration du scroll soit terminée
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                initializeScrollState();
            });
        });
    };

    initOnce();

    // ===================================
    // ACTIVE NAV LINK
    // ===================================
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.pageYOffset >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    });

    // ===================================
    // ANIMATED COUNTERS
    // ===================================
    const counters = document.querySelectorAll('.stat-number');
    const speed = 200;
    let hasAnimated = false;

    const animateCounters = () => {
        if (hasAnimated) return;

        const heroStats = document.querySelector('.hero-stats');
        if (!heroStats) return;

        const rect = heroStats.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom >= 0;

        if (isVisible) {
            hasAnimated = true;
            counters.forEach(counter => {
                const target = +counter.getAttribute('data-target');
                const increment = target / speed;

                const updateCount = () => {
                    const count = +counter.innerText;
                    if (count < target) {
                        counter.innerText = Math.ceil(count + increment);
                        setTimeout(updateCount, 10);
                    } else {
                        counter.innerText = target;
                    }
                };

                updateCount();
            });
        }
    };

    window.addEventListener('scroll', animateCounters);
    animateCounters();

    // ===================================
    // SCROLL REVEAL ANIMATIONS
    // ===================================
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.skill-card, .project-card, .highlight-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
        observer.observe(el);
    });

    // ===================================
    // NOTIFICATION RATE LIMIT
    // ===================================
    function showRateLimitNotification(remainingMinutes) {
        // Supprimer toute notification existante
        const existingNotif = document.querySelector('.rate-limit-notification');
        if (existingNotif) existingNotif.remove();

        // Détecter la langue de la page
        const isEnglish = document.documentElement.lang === 'en';
        const message = isEnglish
            ? 'Please wait <strong id="countdown">{time}</strong> before sending a new message'
            : 'Veuillez patienter <strong id="countdown">{time}</strong> avant d\'envoyer un nouveau message';

        // Créer la notification
        const notification = document.createElement('div');
        notification.className = 'rate-limit-notification';

        const remainingSeconds = remainingMinutes * 60;
        let secondsLeft = Math.ceil(remainingSeconds);

        const formatTime = seconds => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };

        notification.innerHTML = `
            <div class="rate-limit-content">
                <i class="fas fa-clock"></i>
                <span>${message.replace('{time}', formatTime(secondsLeft))}</span>
                <button class="rate-limit-close"><i class="fas fa-times"></i></button>
            </div>
        `;

        document.body.appendChild(notification);

        // Animer l'apparition
        setTimeout(() => notification.classList.add('show'), 10);

        // Mettre à jour le compte à rebours
        const countdownEl = notification.querySelector('#countdown');
        const interval = setInterval(() => {
            secondsLeft--;
            if (secondsLeft <= 0) {
                clearInterval(interval);
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            } else {
                countdownEl.textContent = formatTime(secondsLeft);
            }
        }, 1000);

        // Bouton de fermeture
        notification.querySelector('.rate-limit-close').addEventListener('click', () => {
            clearInterval(interval);
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });
    }

    // ===================================
    // FORM DATA PERSISTENCE
    // ===================================
    const STORAGE_KEY = 'portfolio_contact_form';
    const FILES_KEY = 'portfolio_contact_files';

    function saveFormData() {
        const formData = {
            name: document.getElementById('name')?.value || '',
            email: document.getElementById('email')?.value || '',
            message: document.getElementById('message')?.value || '',
            timestamp: Date.now(),
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    }

    function saveFiles() {
        // Sauvegarder les métadonnées des fichiers (pas le contenu binaire)
        const filesMetadata = selectedFiles.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type,
        }));
        sessionStorage.setItem(FILES_KEY, JSON.stringify(filesMetadata));
    }

    function loadFormData() {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
            const formData = JSON.parse(saved);
            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');
            const messageInput = document.getElementById('message');
            const charCount = document.getElementById('char-count');

            if (nameInput) nameInput.value = formData.name;
            if (emailInput) emailInput.value = formData.email;
            if (messageInput) {
                messageInput.value = formData.message;
                if (charCount) charCount.textContent = formData.message.length;
            }
        }

        // Note: On ne peut pas restaurer les fichiers car sessionStorage ne peut pas stocker de données binaires
        // L'utilisateur devra re-sélectionner les fichiers après un refresh
    }

    function clearFormData() {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(FILES_KEY);
    }

    // Charger les données au chargement de la page
    loadFormData();

    // Sauvegarder les données à chaque modification
    ['name', 'email', 'message'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', saveFormData);
        }
    });

    // ===================================
    // FILE INPUT HANDLING
    // ===================================
    const fileInput = document.getElementById('attachment');
    const fileListContainer = document.getElementById('file-list');
    let selectedFiles = [];

    if (fileInput && fileListContainer) {
        fileInput.addEventListener('change', e => {
            const files = Array.from(e.target.files);

            // Limiter à 5 fichiers
            if (selectedFiles.length + files.length > 5) {
                alert('Maximum 5 fichiers autorisés');
                return;
            }

            // Vérifier la taille (8MB max)
            const oversizedFiles = files.filter(f => f.size > 8 * 1024 * 1024);
            if (oversizedFiles.length > 0) {
                alert(
                    `Fichier(s) trop volumineux : ${oversizedFiles.map(f => f.name).join(', ')}\nTaille maximale : 8MB`
                );
                return;
            }

            selectedFiles = [...selectedFiles, ...files];
            updateFileList();
            saveFiles(); // Sauvegarder les métadonnées
        });
    }

    function updateFileList() {
        if (!fileListContainer) return;

        fileListContainer.innerHTML = '';

        selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            // Créer la miniature ou l'icône
            const isImage = file.type.startsWith('image/');

            if (isImage) {
                const preview = document.createElement('img');
                preview.className = 'file-item-preview';

                const reader = new FileReader();
                reader.onload = e => {
                    preview.src = e.target.result;
                };
                reader.readAsDataURL(file);

                fileItem.appendChild(preview);
            } else {
                const icon = document.createElement('div');
                icon.className = 'file-item-icon';

                // Icône selon le type de fichier
                if (file.type.includes('pdf')) {
                    icon.textContent = '📄';
                } else if (file.type.includes('word') || file.type.includes('document')) {
                    icon.textContent = '📝';
                } else if (file.type.includes('text')) {
                    icon.textContent = '📃';
                } else {
                    icon.textContent = '📎';
                }

                fileItem.appendChild(icon);
            }

            // Info du fichier
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-item-info';

            const fileName = document.createElement('span');
            fileName.className = 'file-item-name';
            fileName.textContent = file.name;

            const fileSize = document.createElement('span');
            fileSize.className = 'file-item-size';
            fileSize.textContent = `${(file.size / 1024).toFixed(1)} KB`;

            fileInfo.appendChild(fileName);
            fileInfo.appendChild(fileSize);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'file-item-remove';
            removeBtn.innerHTML = '×';
            removeBtn.type = 'button';
            removeBtn.onclick = () => {
                selectedFiles.splice(index, 1);
                updateFileList();
                updateFileInput();
                saveFiles(); // Sauvegarder après suppression
            };

            fileItem.appendChild(fileInfo);
            fileItem.appendChild(removeBtn);
            fileListContainer.appendChild(fileItem);
        });
    }

    function updateFileInput() {
        if (!fileInput) return;

        // Créer un nouveau DataTransfer pour mettre à jour l'input
        const dt = new DataTransfer();
        selectedFiles.forEach(file => dt.items.add(file));
        fileInput.files = dt.files;
    }

    // ===================================
    // FORM SUBMISSION
    // ===================================
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async e => {
            e.preventDefault();

            const btn = contactForm.querySelector('.btn');
            const originalText = btn.innerHTML;

            // Créer un FormData pour gérer les fichiers
            const formData = new FormData();
            formData.append('name', contactForm.querySelector('#name').value);
            formData.append('email', contactForm.querySelector('#email').value);
            formData.append('message', contactForm.querySelector('#message').value);

            // Ajouter les fichiers depuis selectedFiles (et non depuis l'input)
            if (selectedFiles.length > 0) {
                console.log(`Envoi de ${selectedFiles.length} fichier(s)`);
                selectedFiles.forEach((file, index) => {
                    console.log(
                        `  ${index + 1}. ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
                    );
                    formData.append('attachments', file);
                });
            }

            btn.innerHTML = '<span>Envoi en cours...</span>';
            btn.style.opacity = '0.7';
            btn.style.pointerEvents = 'none';

            try {
                // URL du serveur backend sur Oracle Cloud (HTTPS via Nginx + Let's Encrypt)
                const response = await fetch('https://quentinpoisson.duckdns.org/api/contact', {
                    method: 'POST',
                    body: formData,
                });

                const result = await response.json();

                if (result.success) {
                    btn.innerHTML = '<span>Message envoyé !</span><i class="fas fa-check"></i>';
                    btn.style.background = '#10b981';

                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.style.opacity = '1';
                        btn.style.pointerEvents = 'all';
                        btn.style.background = '';
                        contactForm.reset();
                        // Réinitialiser le compteur de caractères
                        const charCount = document.getElementById('char-count');
                        if (charCount) charCount.textContent = '0';
                        // Réinitialiser la liste de fichiers
                        selectedFiles = [];
                        updateFileList();
                        // Effacer les données sauvegardées
                        clearFormData();
                    }, 2000);
                } else {
                    // Vérifier si c'est une erreur de rate limit
                    if (response.status === 429) {
                        // Extraire le nombre de minutes du message d'erreur
                        const match = result.error.match(/(\d+)\s+minute/);
                        const remainingMinutes = match ? parseInt(match[1]) : 10;
                        showRateLimitNotification(remainingMinutes);

                        btn.innerHTML = originalText;
                        btn.style.opacity = '1';
                        btn.style.pointerEvents = 'all';
                    } else {
                        throw new Error(result.error || "Erreur lors de l'envoi");
                    }
                }
            } catch (error) {
                console.error('Erreur:', error);
                btn.innerHTML = '<span>Erreur d\'envoi</span><i class="fas fa-times"></i>';
                btn.style.background = '#dc2626';

                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.opacity = '1';
                    btn.style.pointerEvents = 'all';
                    btn.style.background = '';
                }, 3000);
            }
        });
    }

    // ===================================
    // PARALLAX EFFECT ON HERO
    // ===================================
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.5;
            heroContent.style.transform = `translateY(${rate}px)`;
        });
    }

    // ===================================
    // MOUSE TRAIL EFFECT
    // ===================================
    let mouseTrail = [];
    const trailLength = 20;

    document.addEventListener('mousemove', e => {
        mouseTrail.push({ x: e.clientX, y: e.clientY });
        if (mouseTrail.length > trailLength) {
            mouseTrail.shift();
        }
    });

    // ===================================
    // ACCORDION TOGGLE
    // ===================================
    const accordionToggles = document.querySelectorAll('.accordion-toggle');

    accordionToggles.forEach(toggle => {
        toggle.addEventListener('click', function () {
            const targetId = this.getAttribute('data-accordion');
            const content = document.getElementById(targetId);
            const isActive = this.classList.contains('active');

            if (isActive) {
                // Fermer l'accordéon actuel
                content.style.maxHeight = '0px';
                content.style.opacity = '0';
                this.classList.remove('active');
                content.classList.remove('active');
            } else {
                // Fermer tous les autres accordéons
                accordionToggles.forEach(t => {
                    if (t !== this) {
                        const c = document.getElementById(t.getAttribute('data-accordion'));
                        if (c && t.classList.contains('active')) {
                            c.style.maxHeight = '0px';
                            c.style.opacity = '0';
                            t.classList.remove('active');
                            c.classList.remove('active');
                        }
                    }
                });

                // Ouvrir l'accordéon actuel
                this.classList.add('active');
                content.classList.add('active');
                
                // Forcer le recalcul pour que la transition fonctionne
                requestAnimationFrame(() => {
                    content.style.opacity = '1';
                    content.style.maxHeight = content.scrollHeight + 'px';
                });
            }
        });
    });

    // ===================================
    // MOBILE MENU TOGGLE
    // ===================================
    const navCurrent = document.querySelector('.nav-current');
    const navCurrentText = document.querySelector('.nav-current-text');
    const navMenu = document.querySelector('.nav-menu');
    const mobileNavLinks = document.querySelectorAll('.nav-link');

    if (navCurrent) {
        // Toggle menu
        navCurrent.addEventListener('click', e => {
            e.stopPropagation();
            navCurrent.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Fermer le menu quand on clique sur un lien
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                navCurrent.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });

        // Fermer le menu quand on clique en dehors
        document.addEventListener('click', e => {
            if (!navCurrent.contains(e.target) && !navMenu.contains(e.target)) {
                navCurrent.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });

        // Mettre à jour le texte de la section active au scroll
        const sectionNames = {
            home: { fr: 'Accueil', en: 'Home' },
            about: { fr: 'À propos', en: 'About' },
            skills: { fr: 'Compétences Techniques', en: 'Technical Skills' },
            projects: { fr: 'Projets', en: 'Projects' },
            recommendations: { fr: 'Recommandations', en: 'Recommendations' },
            contact: { fr: 'Contact', en: 'Contact' },
            'other-projects': { fr: 'Autres projets', en: 'Other projects' },
            overview: { fr: "Vue d'ensemble", en: 'Overview' },
            context: { fr: 'Contexte', en: 'Context' },
            technologies: { fr: 'Technologies', en: 'Technologies' },
            results: { fr: 'Résultats', en: 'Results' },
            documents: { fr: 'Documents', en: 'Documents' },
        };

        const isEnglish = document.documentElement.lang === 'en';

        function updateActiveSection() {
            const sections = document.querySelectorAll('section[id]');
            if (sections.length === 0 || !navCurrentText) return;

            let current = sections[0].getAttribute('id');

            // Parcourir les sections dans l'ordre inverse pour trouver celle qui est visible
            for (let i = sections.length - 1; i >= 0; i--) {
                const section = sections[i];
                const sectionTop = section.offsetTop;
                const scrollPosition = window.scrollY + 150; // offset pour le header

                if (scrollPosition >= sectionTop) {
                    current = section.getAttribute('id');
                    break;
                }
            }

            // Mettre à jour le texte
            if (sectionNames[current]) {
                navCurrentText.textContent = isEnglish
                    ? sectionNames[current].en
                    : sectionNames[current].fr;
            }

            // Mettre à jour l'active dans le menu
            mobileNavLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        }

        // Appeler une fois au chargement
        updateActiveSection();

        // Appeler au scroll
        window.addEventListener('scroll', updateActiveSection);
    }

    // Fonction pour le carrousel de projets compact avec effet de rotation 3D
    window.navigateCarousel = function (direction) {
        const items = document.querySelectorAll('.carousel-item-compact');
        if (items.length === 0) return;

        // Boucler les positions pour tous les éléments
        const positions = [];
        items.forEach(item => {
            const pos = parseInt(item.getAttribute('data-position') || '0');
            positions.push({ item, position: pos });
        });

        positions.forEach(({ item, position }) => {
            // Inverser la direction pour que cliquer à droite aille vers la droite
            let newPosition = position - direction;
            // Gérer la boucle circulaire
            if (newPosition < 0) newPosition = items.length - 1;
            if (newPosition >= items.length) newPosition = 0;
            item.setAttribute('data-position', newPosition);
        });
        
        // Forcer le recalcul du style pour éviter les problèmes de rendu
        items.forEach(item => {
            void item.offsetHeight;
        });

        // Sauvegarder la position actuelle dans le sessionStorage (seulement pour la session en cours)
        saveCarouselPosition();
    };

    // Fonction pour sauvegarder la position du carousel
    function saveCarouselPosition() {
        const items = document.querySelectorAll('.carousel-item-compact');
        const positions = {};
        items.forEach(item => {
            const href = item.getAttribute('href');
            const position = item.getAttribute('data-position');
            if (href) {
                positions[href] = position;
            }
        });
        // Sauvegarder dans sessionStorage pour garder entre FR/EN mais pas entre pages
        sessionStorage.setItem('carousel_positions', JSON.stringify(positions));
    }

    // Fonction pour restaurer la position du carousel
    function restoreCarouselPosition() {
        const savedData = sessionStorage.getItem('carousel_positions');
        const items = document.querySelectorAll('.carousel-item-compact');
        
        // Ne rien faire s'il n'y a pas de données sauvegardées
        if (!savedData || items.length === 0) {
            return;
        }
        
        try {
            const positions = JSON.parse(savedData);
            
            // Appliquer les positions sauvegardées uniquement aux items qui ont une correspondance
            items.forEach(item => {
                const href = item.getAttribute('href');
                if (href && positions[href] !== undefined) {
                    const pos = parseInt(positions[href]);
                    item.setAttribute('data-position', pos);
                }
                // Sinon, on garde la position HTML d'origine
            });
            
        } catch (e) {
            console.error('Error restoring carousel position:', e);
        }
    }

    // Initialiser les positions du carrousel au chargement
    const carouselItems = document.querySelectorAll('.carousel-item-compact');

    // Vérifier si on est sur une page index
    const currentPath = window.location.pathname.split('/').pop();
    const isIndexPage = currentPath === 'index.html' || currentPath === 'index_en.html' || currentPath === '';
    
    // Si on est sur une page index, vider le sessionStorage du carousel
    if (isIndexPage) {
        sessionStorage.removeItem('carousel_positions');
        sessionStorage.removeItem('carousel_page');
        console.log('Index page detected, clearing carousel storage');
    }

    // Restaurer la position sauvegardée si elle existe
    if (carouselItems.length > 0) {
        // Récupérer la page actuelle (sans _en.html ou .html)
        const currentPage = window.location.pathname.split('/').pop().replace('_en.html', '').replace('.html', '');
        const savedPage = sessionStorage.getItem('carousel_page');
        const savedData = sessionStorage.getItem('carousel_positions');
        
        console.log('Current page:', currentPage, 'Saved page:', savedPage);
        
        // Vider le sessionStorage si on change de page de projet
        if (savedPage && savedPage !== currentPage) {
            console.log('Different page detected, clearing storage');
            sessionStorage.removeItem('carousel_positions');
            sessionStorage.removeItem('carousel_page');
        }
        // Ne restaurer que s'il y a vraiment des données sauvegardées ET qu'on est sur la même page
        else if (savedData && savedPage === currentPage) {
            console.log('Same page, restoring carousel positions');
            // Désactiver les transitions pour éviter l'animation lors de la restauration
            const carouselTrack = document.querySelector('.carousel-track-compact');
            if (carouselTrack) {
                carouselTrack.style.transition = 'none';
            }
            carouselItems.forEach(item => {
                item.style.transition = 'none';
            });
            
            // Restaurer la position
            restoreCarouselPosition();
            
            // Réactiver les transitions après le prochain frame
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (carouselTrack) {
                        carouselTrack.style.transition = '';
                    }
                    carouselItems.forEach(item => {
                        item.style.transition = '';
                    });
                });
            });
        }
        
        // Sauvegarder la page actuelle
        sessionStorage.setItem('carousel_page', currentPage);
    }

    // Compteur de caractères pour le champ message
    const messageTextarea = document.getElementById('message');
    const charCount = document.getElementById('char-count');

    if (messageTextarea && charCount) {
        messageTextarea.addEventListener('input', function () {
            charCount.textContent = this.value.length;
        });
    }

    console.log('%c🚀 Portfolio IPI', 'font-size: 20px; font-weight: bold; color: #ef4444;');
    console.log('%cSystèmes, Réseaux & Sécurité', 'font-size: 14px; color: #a0a0a0;');
});

// Fonction pour changer de langue en conservant la position de scroll et du carousel
function switchLanguage(url) {
    sessionStorage.setItem('scrollPosition', window.pageYOffset);
    
    // Sauvegarder la position du carousel avant de changer de page
    const items = document.querySelectorAll('.carousel-item-compact');
    if (items.length > 0) {
        const positions = {};
        items.forEach(item => {
            const href = item.getAttribute('href');
            const position = item.getAttribute('data-position');
            if (href) {
                // Convertir le href FR en EN et vice versa pour la correspondance
                const convertedHref = href.includes('_en.html') 
                    ? href.replace('_en.html', '.html')
                    : href.replace('.html', '_en.html');
                positions[href] = position;
                positions[convertedHref] = position;
            }
        });
        sessionStorage.setItem('carousel_positions', JSON.stringify(positions));
        
        // Sauvegarder aussi la page actuelle (sans la langue) pour que la vérification fonctionne
        const currentPage = window.location.pathname.split('/').pop().replace('_en.html', '').replace('.html', '');
        sessionStorage.setItem('carousel_page', currentPage);
        console.log('Switching language, saving page:', currentPage);
    }
    
    window.location.href = url;
}

// Fonction d'initialisation centralisée
function initializeScrollState() {
    const currentScroll = window.pageYOffset;
    const header = document.querySelector('.header');
    const scrollIndicator = document.querySelector('.scroll-indicator');
    const heroStats = document.querySelector('.hero-stats');

    // Initialiser le header
    if (header && currentScroll > 50) {
        header.classList.add('scrolled');
    }

    // Initialiser l'indicateur de scroll
    if (scrollIndicator) {
        const firstSection = document.querySelector('section:first-of-type');
        if (firstSection) {
            const firstSectionHeight = firstSection.offsetHeight;
            if (currentScroll >= firstSectionHeight - 100) {
                scrollIndicator.classList.remove('visible');
                scrollIndicator.classList.add('hidden');
            } else {
                scrollIndicator.classList.add('visible');
                scrollIndicator.classList.remove('hidden');
            }
        }
    }

    // Initialiser les stats avec transition progressive
    if (heroStats) {
        const viewportHeight = window.innerHeight;
        const fadeStart = viewportHeight * 0.55;
        const fadeEnd = viewportHeight * 1;

        if (currentScroll <= fadeStart) {
            heroStats.style.setProperty('opacity', '1', 'important');
            heroStats.style.setProperty('transform', 'translateY(0)', 'important');
        } else if (currentScroll >= fadeEnd) {
            heroStats.style.setProperty('opacity', '0', 'important');
            heroStats.style.setProperty('transform', 'translateY(-30px)', 'important');
        } else {
            const progress = (currentScroll - fadeStart) / (fadeEnd - fadeStart);
            const opacity = 1 - progress;
            const translateY = -30 * progress;
            heroStats.style.setProperty('opacity', opacity.toString(), 'important');
            heroStats.style.setProperty('transform', `translateY(${translateY}px)`, 'important');
        }
    }
}

// Restauration de la position de scroll après changement de langue
window.addEventListener('load', () => {
    const savedPosition = sessionStorage.getItem('scrollPosition');
    if (savedPosition) {
        window.scrollTo(0, parseInt(savedPosition));
        sessionStorage.removeItem('scrollPosition');

        // Réinitialiser l'état après restauration du scroll
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                initializeScrollState();
            });
        });
    }

    // Initialiser les animations de la timeline
    initTimelineAnimations();
});

// Animation de la timeline au scroll
function initTimelineAnimations() {
    const timelineItems = document.querySelectorAll('.timeline-item');

    const observerOptions = {
        threshold: 0.3,
        rootMargin: '0px 0px -100px 0px',
    };

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateX(0)';
            }
        });
    }, observerOptions);

    timelineItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-30px)';
        item.style.transition = `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s`;
        observer.observe(item);
    });
}
