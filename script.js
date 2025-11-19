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
            isBlasting: false
        }

        window.addEventListener('mousemove', (event) => {
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
        window.addEventListener('touchstart', (event) => {
            if (event.touches.length > 0) {
                mouse.x = event.touches[0].clientX;
                mouse.y = event.touches[0].clientY;
                mouse.isMouseDown = true;
            }
        });

        window.addEventListener('touchmove', (event) => {
            if (event.touches.length > 0) {
                mouse.x = event.touches[0].clientX;
                mouse.y = event.touches[0].clientY;
            }
        });

        window.addEventListener('touchend', () => {
            mouse.isMouseDown = false;
            mouse.isBlasting = true;
            setTimeout(() => {
                mouse.isBlasting = false;
            }, 300);
        });

        class Particle {
            constructor(x, y, directionX, directionY, size, color) {
                this.x = x;
                this.y = y;
                this.directionX = directionX;
                this.directionY = directionY;
                this.size = size;
                this.color = color;
                this.density = (Math.random() * 5) + 1;
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
                let size = (Math.random() * 2) + 1;
                let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
                let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
                let directionX = (Math.random() * 0.4) - 0.2;
                let directionY = (Math.random() * 0.4) - 0.2;
                let color = '#ef4444';

                particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
            }
        }

        function connect() {
            let opacityValue = 1;
            for (let a = 0; a < particlesArray.length; a++) {
                for (let b = a; b < particlesArray.length; b++) {
                    let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x))
                        + ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
                    if (distance < (canvas.width / 7) * (canvas.height / 7)) {
                        opacityValue = 1 - (distance / 20000);
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
        })
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
                    behavior: 'smooth'
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
            const fadeStart = viewportHeight * 0.55;
            const fadeEnd = viewportHeight * 1;
            
            if (currentScroll <= fadeStart) {
                heroStats.style.setProperty('opacity', '1', 'important');
                heroStats.style.setProperty('transform', 'translateY(0)', 'important');
            } else if (currentScroll >= fadeEnd) {
                heroStats.style.setProperty('opacity', '0', 'important');
                heroStats.style.setProperty('transform', 'translateY(-30px)', 'important');
            } else {
                // Transition progressive entre fadeStart et fadeEnd
                const progress = (currentScroll - fadeStart) / (fadeEnd - fadeStart);
                const opacity = 1 - progress;
                const translateY = -30 * progress;
                heroStats.style.setProperty('opacity', opacity.toString(), 'important');
                heroStats.style.setProperty('transform', `translateY(${translateY}px)`, 'important');
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
            if (window.pageYOffset >= (sectionTop - 200)) {
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
                        counter.innerText = target + '+';
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
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
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
    // FORM SUBMISSION
    // ===================================
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Simulate form submission
            const btn = contactForm.querySelector('.btn');
            const originalText = btn.innerHTML;
            
            btn.innerHTML = '<span>Envoi en cours...</span>';
            btn.style.opacity = '0.7';
            btn.style.pointerEvents = 'none';

            setTimeout(() => {
                btn.innerHTML = '<span>Message envoyé !</span><i class="fas fa-check"></i>';
                btn.style.background = '#10b981';
                
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.opacity = '1';
                    btn.style.pointerEvents = 'all';
                    btn.style.background = '';
                    contactForm.reset();
                }, 2000);
            }, 1500);
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

    document.addEventListener('mousemove', (e) => {
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
        toggle.addEventListener('click', function() {
            const targetId = this.getAttribute('data-accordion');
            const content = document.getElementById(targetId);
            const isActive = this.classList.contains('active');
            
            // Close all accordions
            accordionToggles.forEach(t => {
                t.classList.remove('active');
                const c = document.getElementById(t.getAttribute('data-accordion'));
                if (c) c.classList.remove('active');
            });
            
            // Toggle current accordion
            if (!isActive) {
                this.classList.add('active');
                content.classList.add('active');
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
        navCurrent.addEventListener('click', (e) => {
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
        document.addEventListener('click', (e) => {
            if (!navCurrent.contains(e.target) && !navMenu.contains(e.target)) {
                navCurrent.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });

        // Mettre à jour le texte de la section active au scroll
        const sectionNames = {
            'home': { fr: 'Accueil', en: 'Home' },
            'about': { fr: 'À propos', en: 'About' },
            'skills': { fr: 'Compétences Techniques', en: 'Technical Skills' },
            'projects': { fr: 'Projets', en: 'Projects' },
            'contact': { fr: 'Contact', en: 'Contact' },
            'other-projects': { fr: 'Autres projets', en: 'Other projects' },
            'overview': { fr: 'Vue d\'ensemble', en: 'Overview' },
            'context': { fr: 'Contexte', en: 'Context' },
            'technologies': { fr: 'Technologies', en: 'Technologies' },
            'results': { fr: 'Résultats', en: 'Results' },
            'documents': { fr: 'Documents', en: 'Documents' }
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
                navCurrentText.textContent = isEnglish ? sectionNames[current].en : sectionNames[current].fr;
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
    window.navigateCarousel = function(direction) {
        const items = document.querySelectorAll('.carousel-item-compact');
        if (items.length === 0) return;
        
        if (items.length === 2) {
            // Pour 2 éléments: alterner simplement entre position 1 et 2
            items.forEach(item => {
                const currentPos = parseInt(item.getAttribute('data-position'));
                if (currentPos === 1) {
                    item.setAttribute('data-position', '2');
                } else if (currentPos === 2) {
                    item.setAttribute('data-position', '1');
                }
            });
        } else {
            // Pour 3+ éléments: boucler les positions (0, 1, 2)
            const positions = [];
            items.forEach(item => {
                const pos = parseInt(item.getAttribute('data-position') || '0');
                positions.push({ item, position: pos });
            });
            
            positions.forEach(({ item, position }) => {
                let newPosition = position + direction;
                if (newPosition < 0) newPosition = items.length - 1;
                if (newPosition >= items.length) newPosition = 0;
                item.setAttribute('data-position', newPosition);
            });
        }
    };
    
    // Initialiser les positions du carrousel au chargement
    const carouselItems = document.querySelectorAll('.carousel-item-compact');
    
    if (carouselItems.length === 2) {
        // Pour 2 éléments: un en position 1 (centre), un en position 2 (droite)
        carouselItems.forEach((item, index) => {
            item.setAttribute('data-position', index === 0 ? 1 : 2);
        });
    } else if (carouselItems.length >= 3) {
        // Pour 3+ éléments: positions 0, 1, 2
        carouselItems.forEach((item, index) => {
            item.setAttribute('data-position', index);
        });
    }

    // Compteur de caractères pour le champ message
    const messageTextarea = document.getElementById('message');
    const charCount = document.getElementById('char-count');
    
    if (messageTextarea && charCount) {
        messageTextarea.addEventListener('input', function() {
            charCount.textContent = this.value.length;
        });
    }

    console.log('%c🚀 Portfolio IPI', 'font-size: 20px; font-weight: bold; color: #ef4444;');
    console.log('%cSystèmes, Réseaux & Sécurité', 'font-size: 14px; color: #a0a0a0;');
});

// Fonction pour changer de langue en conservant la position de scroll
function switchLanguage(url) {
    sessionStorage.setItem('scrollPosition', window.pageYOffset);
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
});
