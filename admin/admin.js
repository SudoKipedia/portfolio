// Configuration
const API_URL = '/api';

// État global
let currentSection = 'stats';
let currentLang = 'fr';
let userRole = 'viewer'; // Par défaut, rôle restreint
let csrfToken = null; // Token CSRF pour les requêtes sécurisées
let inactivityTimer = null;
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes en ms

// Helper pour les requêtes sécurisées avec CSRF
async function securedFetch(url, options = {}) {
    const token = localStorage.getItem('adminToken');
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    
    // Ajouter le token CSRF pour les requêtes de modification
    if (options.method && options.method !== 'GET' && csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
    }
    
    return fetch(url, { ...options, headers });
}

let data = {
    stats: null,
    formations: null,
    skills: null,
    projects: null,
    recommendations: null,
    documents: null
};

// Gestion de l'inactivité
function resetInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        alert('Session expirée pour cause d\'inactivité');
        logout();
    }, INACTIVITY_TIMEOUT);
}

function setupInactivityDetection() {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
        document.addEventListener(event, resetInactivityTimer, { passive: true });
    });
    resetInactivityTimer(); // Démarrer le timer
}

// Vérification de l'authentification au chargement
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    // Récupérer le rôle et le token CSRF stockés
    userRole = localStorage.getItem('adminRole') || 'viewer';
    csrfToken = localStorage.getItem('csrfToken') || null;
    
    verifyToken(token).then(valid => {
        if (!valid) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminRole');
            localStorage.removeItem('csrfToken');
            window.location.href = 'login.html';
        } else {
            // Afficher le layout et cacher le loading
            document.getElementById('auth-loading').style.display = 'none';
            document.getElementById('admin-layout').style.display = 'flex';
            
            // Afficher le badge viewer si ce n'est pas un admin
            if (userRole !== 'admin') {
                showViewerBadge();
            }
            
            // Démarrer la détection d'inactivité
            setupInactivityDetection();
            
            init();
        }
    });
});

// Affiche un badge "Mode lecture seule" pour les viewers
function showViewerBadge() {
    const badge = document.createElement('div');
    badge.id = 'viewer-badge';
    badge.innerHTML = '<i class="fas fa-eye"></i> Mode lecture seule';
    badge.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #f39c12, #e67e22);
        color: white;
        padding: 10px 20px;
        border-radius: 25px;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 4px 15px rgba(243, 156, 18, 0.4);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    document.body.appendChild(badge);
}

async function verifyToken(token) {
    try {
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.ok;
    } catch {
        return false;
    }
}

function init() {
    setupNavigation();
    setupLanguageTabs();
    loadAllData();
    
    // Restaurer la section sauvegardée
    const savedSection = localStorage.getItem('adminCurrentSection');
    if (savedSection && ['stats', 'formations', 'skills', 'projects', 'recommendations', 'documents'].includes(savedSection)) {
        switchSection(savedSection);
    }
}

// ================================
// UI COMPONENTS HELPERS
// ================================

// Génère un select custom stylisé
function createStyledSelect(id, options, selectedValue = '', placeholder = '-- Sélectionner --') {
    // Parser les options pour extraire valeurs et textes
    const optionRegex = /<option\s+value="([^"]*)"[^>]*>([^<]*)<\/option>/gi;
    const parsedOptions = [];
    let match;
    while ((match = optionRegex.exec(options)) !== null) {
        parsedOptions.push({ value: match[1], text: match[2] });
    }
    
    const selectedOption = parsedOptions.find(o => o.value === selectedValue);
    const displayText = selectedOption ? selectedOption.text : placeholder;
    const isPlaceholder = !selectedValue;
    
    return `
        <div class="custom-select" id="${id}-container">
            <input type="hidden" id="${id}" value="${selectedValue}">
            <div class="custom-select-trigger" onclick="toggleCustomSelect('${id}')">
                <span class="custom-select-value${isPlaceholder ? ' placeholder' : ''}">${displayText}</span>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="custom-select-options">
                <div class="custom-select-option ${!selectedValue ? 'selected' : ''}" data-value="" onclick="selectCustomOption('${id}', '', '${placeholder}')">
                    ${placeholder}
                </div>
                ${parsedOptions.map(opt => `
                    <div class="custom-select-option ${opt.value === selectedValue ? 'selected' : ''}" 
                         data-value="${opt.value}" 
                         onclick="selectCustomOption('${id}', '${opt.value}', '${opt.text.replace(/'/g, "\\'")}')">
                        ${opt.text}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Toggle custom select dropdown
function toggleCustomSelect(id) {
    const container = document.getElementById(`${id}-container`);
    const allSelects = document.querySelectorAll('.custom-select.open');
    
    // Fermer les autres
    allSelects.forEach(s => {
        if (s.id !== `${id}-container`) {
            s.classList.remove('open');
        }
    });
    
    container.classList.toggle('open');
}

// Sélectionner une option
function selectCustomOption(id, value, text) {
    const input = document.getElementById(id);
    const container = document.getElementById(`${id}-container`);
    const valueDisplay = container.querySelector('.custom-select-value');
    
    input.value = value;
    valueDisplay.textContent = text;
    
    // Gérer la classe placeholder
    if (!value) {
        valueDisplay.classList.add('placeholder');
    } else {
        valueDisplay.classList.remove('placeholder');
    }
    
    // Mettre à jour la classe selected
    container.querySelectorAll('.custom-select-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.value === value);
    });
    
    container.classList.remove('open');
}

// Fermer les selects quand on clique ailleurs
document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select')) {
        document.querySelectorAll('.custom-select.open').forEach(s => {
            s.classList.remove('open');
        });
    }
});

// Génère un champ d'upload stylisé
function createFileUpload(id, accept = '.pdf,.doc,.docx,.png,.jpg,.jpeg', hint = 'PDF, Word, Images (max 5MB)') {
    return `
        <div class="file-upload-wrapper" id="${id}-wrapper">
            <input type="file" id="${id}" accept="${accept}" onchange="handleFileSelect(this)">
            <div class="file-upload-box">
                <div class="file-upload-icon">
                    <i class="fas fa-cloud-upload-alt"></i>
                </div>
                <div class="file-upload-text">
                    <span>Cliquez pour choisir</span> ou glissez-déposez
                </div>
                <div class="file-upload-hint">${hint}</div>
            </div>
            <div class="file-upload-preview" id="${id}-preview">
                <div class="file-upload-preview-icon">
                    <i class="fas fa-file"></i>
                </div>
                <div class="file-upload-preview-info">
                    <div class="file-upload-preview-name"></div>
                    <div class="file-upload-preview-size"></div>
                </div>
                <button type="button" class="file-upload-preview-remove" onclick="clearFileUpload('${id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
}

// Génère l'affichage d'une pièce jointe existante
function createCurrentAttachment(url, onRemove) {
    if (!url) return '';
    const filename = url.split('/').pop();
    return `
        <div class="current-attachment-display" id="current-attachment">
            <div class="current-attachment-icon">
                <i class="fas fa-paperclip"></i>
            </div>
            <div class="current-attachment-info">
                <div class="current-attachment-label">Fichier actuel</div>
                <a href="${url}" target="_blank" class="current-attachment-link">${filename}</a>
            </div>
            <button type="button" class="current-attachment-remove" onclick="${onRemove}">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        <input type="hidden" id="remove-attachment" value="false">
    `;
}

// Gestion de la sélection de fichier
function handleFileSelect(input) {
    const wrapper = input.closest('.file-upload-wrapper');
    const preview = wrapper.querySelector('.file-upload-preview');
    const box = wrapper.querySelector('.file-upload-box');
    
    if (input.files.length > 0) {
        const file = input.files[0];
        const nameEl = preview.querySelector('.file-upload-preview-name');
        const sizeEl = preview.querySelector('.file-upload-preview-size');
        const iconEl = preview.querySelector('.file-upload-preview-icon i');
        
        nameEl.textContent = file.name;
        sizeEl.textContent = formatFileSize(file.size);
        
        // Icône selon le type
        if (file.type.includes('pdf')) {
            iconEl.className = 'fas fa-file-pdf';
        } else if (file.type.includes('image')) {
            iconEl.className = 'fas fa-file-image';
        } else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
            iconEl.className = 'fas fa-file-word';
        } else {
            iconEl.className = 'fas fa-file';
        }
        
        box.style.display = 'none';
        preview.classList.add('active');
    }
}

// Effacer le fichier sélectionné
function clearFileUpload(inputId) {
    const input = document.getElementById(inputId);
    const wrapper = input.closest('.file-upload-wrapper');
    const preview = wrapper.querySelector('.file-upload-preview');
    const box = wrapper.querySelector('.file-upload-box');
    
    input.value = '';
    preview.classList.remove('active');
    box.style.display = 'flex';
}

// Formater la taille du fichier
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Supprimer l'affichage de la pièce jointe existante
function removeCurrentAttachment() {
    const el = document.getElementById('current-attachment');
    if (el) el.remove();
    const hidden = document.getElementById('remove-attachment');
    if (hidden) hidden.value = 'true';
}

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            switchSection(section);
        });
    });
}

function switchSection(section) {
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });
    
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(s => {
        s.style.display = 'none';
    });
    
    // Show current section
    document.getElementById(`section-${section}`).style.display = 'block';
    
    // Update header
    const titles = {
        stats: { title: 'Statistiques', desc: 'Gérez les statistiques affichées sur votre page d\'accueil' },
        formations: { title: 'Formations', desc: 'Gérez votre parcours académique et professionnel' },
        skills: { title: 'Compétences', desc: 'Gérez vos cartes de compétences' },
        projects: { title: 'Projets', desc: 'Gérez vos projets et leur affichage' },
        recommendations: { title: 'Recommandations', desc: 'Gérez les lettres de recommandation' },
        documents: { title: 'Documents', desc: 'Gérez les documents téléchargeables par projet' }
    };
    
    document.getElementById('section-title').textContent = titles[section].title;
    document.getElementById('section-desc').textContent = titles[section].desc;
    
    currentSection = section;
    
    // Sauvegarder la section actuelle dans localStorage
    localStorage.setItem('adminCurrentSection', section);
    renderCurrentSection();
}

// Language tabs
function setupLanguageTabs() {
    document.querySelectorAll('.lang-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.lang-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentLang = tab.dataset.lang;
            renderCurrentSection();
        });
    });
}

// Data loading
async function loadAllData() {
    try {
        const [stats, formations, skills, projects, recommendations, documents] = await Promise.all([
            fetchData('stats'),
            fetchData('formations'),
            fetchData('skills'),
            fetchData('projects'),
            fetchData('recommendations'),
            fetchData('documents')
        ]);
        
        data.stats = stats;
        data.formations = formations;
        data.skills = skills;
        data.projects = projects;
        data.recommendations = recommendations;
        data.documents = documents;
        
        renderCurrentSection();
    } catch (error) {
        showAlert('Erreur lors du chargement des données', 'error');
        console.error(error);
    }
}

async function fetchData(endpoint) {
    const response = await fetch(`${API_URL}/${endpoint}`);
    if (!response.ok) throw new Error(`Failed to fetch ${endpoint}`);
    return response.json();
}

// Render functions
function renderCurrentSection() {
    switch (currentSection) {
        case 'stats': renderStats(); break;
        case 'formations': renderFormations(); break;
        case 'skills': renderSkills(); break;
        case 'projects': renderProjects(); break;
        case 'recommendations': renderRecommendations(); break;
        case 'documents': renderDocuments(); break;
    }
}

function renderStats() {
    const container = document.getElementById('stats-container');
    const langData = data.stats?.[currentLang]?.stats || [];
    
    container.innerHTML = langData.map((stat, index) => `
        <div class="form-group">
            <label>Statistique ${index + 1}</label>
            <div class="form-row">
                <input type="text" class="form-control" 
                       data-field="value" data-index="${index}"
                       value="${stat.value}" placeholder="Valeur (ex: 2+)">
                <input type="text" class="form-control" 
                       data-field="label" data-index="${index}"
                       value="${stat.label}" placeholder="Label (ex: Années d'expérience)">
            </div>
        </div>
    `).join('');
    
    // Add event listeners for live editing
    container.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index);
            const field = e.target.dataset.field;
            data.stats[currentLang].stats[index][field] = e.target.value;
        });
    });
}

function renderFormations() {
    const container = document.getElementById('formations-container');
    const langData = data.formations?.[currentLang]?.formations || [];
    
    if (langData.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucune formation ajoutée</p>';
        return;
    }
    
    container.innerHTML = langData.map((formation, index) => `
        <div class="item-card" data-index="${index}">
            <div class="item-card-header">
                <div>
                    <h4>${formation.year || formation.period}</h4>
                    <p>${formation.title}</p>
                </div>
                <div class="item-actions">
                    <button class="btn btn-icon" onclick="editFormation(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon btn-danger" onclick="deleteFormation(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="item-card-body">
                <p class="text-muted">${formation.school || formation.institution}</p>
                <p>${formation.description || ''}</p>
                <div class="tags">
                    ${formation.skills.map(skill => `<span class="tag">${skill}</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

function renderSkills() {
    const container = document.getElementById('skills-container');
    const langData = data.skills?.[currentLang]?.skills || [];
    
    if (langData.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucune compétence ajoutée</p>';
        return;
    }
    
    container.innerHTML = langData.map((skill, index) => `
        <div class="item-card" data-index="${index}">
            <div class="item-card-header">
                <div>
                    <h4><i class="${skill.icon}"></i> ${skill.title}</h4>
                </div>
                <div class="item-actions">
                    <button class="btn btn-icon" onclick="editSkill(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon btn-danger" onclick="deleteSkill(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="item-card-body">
                <p class="text-muted">${skill.description}</p>
                <div class="tags">
                    ${skill.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

function renderProjects() {
    const container = document.getElementById('projects-container');
    const langData = data.projects?.[currentLang]?.projects || [];
    
    if (langData.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucun projet ajouté</p>';
        return;
    }
    
    container.innerHTML = langData.map((project, index) => `
        <div class="item-card" data-index="${index}">
            <div class="item-card-header">
                <div>
                    <h4>${project.title}</h4>
                    <p class="text-muted">${project.slug}</p>
                </div>
                <div class="item-actions">
                    <button class="btn btn-icon" onclick="editProject(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon btn-danger" onclick="deleteProject(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="item-card-body">
                <p>${project.description}</p>
                <div class="tags">
                    ${project.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

function renderRecommendations() {
    const container = document.getElementById('recommendations-container');
    const langData = data.recommendations?.[currentLang]?.recommendations || [];
    
    if (langData.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucune recommandation ajoutée. Cliquez sur "Ajouter" pour commencer.</p>';
        return;
    }
    
    container.innerHTML = langData.map((rec, index) => `
        <div class="item-card" data-index="${index}">
            <div class="item-card-header">
                <div>
                    <h4>${rec.author}</h4>
                    <p class="text-muted">${rec.role} - ${rec.company}</p>
                </div>
                <div class="item-actions">
                    ${rec.attachment ? `<a href="${rec.attachment}" target="_blank" class="btn btn-icon" title="Voir le document"><i class="fas fa-file-alt"></i></a>` : ''}
                    <button class="btn btn-icon" onclick="editRecommendation(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon btn-danger" onclick="deleteRecommendation(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="item-card-body">
                <p>${rec.description || rec.content || ''}</p>
            </div>
        </div>
    `).join('');
}

function renderDocuments() {
    const container = document.getElementById('documents-container');
    const langData = data.documents?.[currentLang]?.documents || [];
    
    if (langData.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucun document ajouté. Cliquez sur "Ajouter" pour commencer.</p>';
        return;
    }
    
    container.innerHTML = langData.map((doc, index) => `
        <div class="item-card" data-index="${index}">
            <div class="item-card-header">
                <div>
                    <h4><i class="fas fa-file-pdf"></i> ${doc.title}</h4>
                    <p class="text-muted">${doc.description}</p>
                </div>
                <div class="item-actions">
                    <span class="badge">${doc.projectSlug}</span>
                    <button class="btn btn-icon" onclick="editDocument(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon btn-danger" onclick="deleteDocument(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Modal functions
function openModal(title, content, saveCallback) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal-overlay').classList.add('active');
    
    const saveBtn = document.getElementById('modal-save-btn');
    
    // Désactiver le bouton de sauvegarde pour les viewers
    if (userRole !== 'admin') {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
        saveBtn.style.cursor = 'not-allowed';
        saveBtn.title = 'Mode lecture seule';
        saveBtn.onclick = () => {
            showAlert('Mode lecture seule - sauvegarde non autorisée', 'error');
        };
    } else {
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
        saveBtn.style.cursor = 'pointer';
        saveBtn.title = '';
        saveBtn.onclick = () => {
            saveCallback();
            closeModal();
        };
    }
    
    // Fermer le modal en cliquant sur l'overlay (en dehors du contenu)
    document.getElementById('modal-overlay').onclick = (e) => {
        if (e.target.id === 'modal-overlay') {
            closeModal();
        }
    };
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

// Formation CRUD
function addFormation() {
    const content = `
        <div class="form-group">
            <label>Période</label>
            <input type="text" class="form-control" id="formation-year" placeholder="2024 - Présent">
        </div>
        <div class="form-group">
            <label>Titre</label>
            <input type="text" class="form-control" id="formation-title" placeholder="Bachelor Informatique">
        </div>
        <div class="form-group">
            <label>Établissement</label>
            <input type="text" class="form-control" id="formation-school" placeholder="IPI Blagnac - Toulouse">
        </div>
        <div class="form-group">
            <label>Description</label>
            <input type="text" class="form-control" id="formation-description" placeholder="Spécialisation en...">
        </div>
        <div class="form-group">
            <label>Compétences acquises (séparées par des virgules)</label>
            <textarea class="form-control" id="formation-skills" rows="3" placeholder="Administration Windows Server, Configuration réseau..."></textarea>
        </div>
    `;
    
    openModal('Ajouter une formation', content, () => {
        const formation = {
            id: 'formation-' + Date.now(),
            year: document.getElementById('formation-year').value,
            title: document.getElementById('formation-title').value,
            school: document.getElementById('formation-school').value,
            description: document.getElementById('formation-description').value,
            skills: document.getElementById('formation-skills').value.split(',').map(s => s.trim()).filter(s => s)
        };
        
        if (!data.formations[currentLang].formations) {
            data.formations[currentLang].formations = [];
        }
        data.formations[currentLang].formations.push(formation);
        renderFormations();
    });
}

function editFormation(index) {
    const formation = data.formations[currentLang].formations[index];
    
    const content = `
        <div class="form-group">
            <label>Période</label>
            <input type="text" class="form-control" id="formation-year" value="${formation.year || formation.period || ''}">
        </div>
        <div class="form-group">
            <label>Titre</label>
            <input type="text" class="form-control" id="formation-title" value="${formation.title || ''}">
        </div>
        <div class="form-group">
            <label>Établissement</label>
            <input type="text" class="form-control" id="formation-school" value="${formation.school || formation.institution || ''}">
        </div>
        <div class="form-group">
            <label>Description</label>
            <input type="text" class="form-control" id="formation-description" value="${formation.description || ''}">
        </div>
        <div class="form-group">
            <label>Compétences acquises (séparées par des virgules)</label>
            <textarea class="form-control" id="formation-skills" rows="3">${formation.skills ? formation.skills.join(', ') : ''}</textarea>
        </div>
    `;
    
    openModal('Modifier la formation', content, () => {
        data.formations[currentLang].formations[index] = {
            ...formation,
            year: document.getElementById('formation-year').value,
            title: document.getElementById('formation-title').value,
            school: document.getElementById('formation-school').value,
            description: document.getElementById('formation-description').value,
            skills: document.getElementById('formation-skills').value.split(',').map(s => s.trim()).filter(s => s)
        };
        renderFormations();
    });
}

function deleteFormation(index) {
    if (userRole !== 'admin') {
        showAlert('Mode lecture seule - suppression non autorisée', 'error');
        return;
    }
    if (confirm('Êtes-vous sûr de vouloir supprimer cette formation ?')) {
        data.formations[currentLang].formations.splice(index, 1);
        renderFormations();
    }
}

// Skill CRUD
function addSkill() {
    const content = `
        <div class="form-group">
            <label>Titre</label>
            <input type="text" class="form-control" id="skill-title" placeholder="Développement Web">
        </div>
        <div class="form-group">
            <label>Icône (classe Font Awesome)</label>
            <input type="text" class="form-control" id="skill-icon" placeholder="fas fa-code">
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea class="form-control" id="skill-description" rows="3" placeholder="Description de la compétence..."></textarea>
        </div>
        <div class="form-group">
            <label>Tags (séparés par des virgules)</label>
            <input type="text" class="form-control" id="skill-tags" placeholder="HTML, CSS, JavaScript">
        </div>
    `;
    
    openModal('Ajouter une compétence', content, () => {
        const skill = {
            title: document.getElementById('skill-title').value,
            icon: document.getElementById('skill-icon').value,
            description: document.getElementById('skill-description').value,
            tags: document.getElementById('skill-tags').value.split(',').map(s => s.trim()).filter(s => s)
        };
        
        if (!data.skills[currentLang].skills) {
            data.skills[currentLang].skills = [];
        }
        data.skills[currentLang].skills.push(skill);
        renderSkills();
    });
}

function editSkill(index) {
    const skill = data.skills[currentLang].skills[index];
    
    const content = `
        <div class="form-group">
            <label>Titre</label>
            <input type="text" class="form-control" id="skill-title" value="${skill.title}">
        </div>
        <div class="form-group">
            <label>Icône (classe Font Awesome)</label>
            <input type="text" class="form-control" id="skill-icon" value="${skill.icon}">
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea class="form-control" id="skill-description" rows="3">${skill.description}</textarea>
        </div>
        <div class="form-group">
            <label>Tags (séparés par des virgules)</label>
            <input type="text" class="form-control" id="skill-tags" value="${skill.tags.join(', ')}">
        </div>
    `;
    
    openModal('Modifier la compétence', content, () => {
        data.skills[currentLang].skills[index] = {
            title: document.getElementById('skill-title').value,
            icon: document.getElementById('skill-icon').value,
            description: document.getElementById('skill-description').value,
            tags: document.getElementById('skill-tags').value.split(',').map(s => s.trim()).filter(s => s)
        };
        renderSkills();
    });
}

function deleteSkill(index) {
    if (userRole !== 'admin') {
        showAlert('Mode lecture seule - suppression non autorisée', 'error');
        return;
    }
    if (confirm('Êtes-vous sûr de vouloir supprimer cette compétence ?')) {
        data.skills[currentLang].skills.splice(index, 1);
        renderSkills();
    }
}

// Project CRUD
function addProject() {
    const content = `
        <div class="form-group">
            <label>Titre</label>
            <input type="text" class="form-control" id="project-title" placeholder="Mon Projet">
        </div>
        <div class="form-group">
            <label>Slug (identifiant unique)</label>
            <input type="text" class="form-control" id="project-slug" placeholder="mon-projet">
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea class="form-control" id="project-description" rows="3" placeholder="Description du projet..."></textarea>
        </div>
        <div class="form-group">
            <label>Image du projet</label>
            ${createFileUpload('project-image', '.png,.jpg,.jpeg,.gif,.webp,.svg', 'Images uniquement (PNG, JPG, WebP, SVG)')}
        </div>
        <div class="form-group">
            <label>Lien</label>
            <input type="text" class="form-control" id="project-link" placeholder="project_mon_projet.html">
        </div>
        <div class="form-group">
            <label>Tags (séparés par des virgules)</label>
            <input type="text" class="form-control" id="project-tags" placeholder="Web, JavaScript, Node.js">
        </div>
    `;
    
    openModal('Ajouter un projet', content, async () => {
        let imageUrl = '';
        const fileInput = document.getElementById('project-image');
        
        // Uploader l'image si un fichier est sélectionné
        if (fileInput && fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            
            try {
                const response = await securedFetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const result = await response.json();
                    imageUrl = result.url;
                } else {
                    showAlert('Erreur lors du téléchargement de l\'image', 'error');
                    return;
                }
            } catch (error) {
                console.error('Erreur upload:', error);
                showAlert('Erreur lors du téléchargement de l\'image', 'error');
                return;
            }
        }
        
        const project = {
            title: document.getElementById('project-title').value,
            slug: document.getElementById('project-slug').value,
            description: document.getElementById('project-description').value,
            image: imageUrl,
            link: document.getElementById('project-link').value,
            tags: document.getElementById('project-tags').value.split(',').map(s => s.trim()).filter(s => s)
        };
        
        if (!data.projects[currentLang].projects) {
            data.projects[currentLang].projects = [];
        }
        data.projects[currentLang].projects.push(project);
        renderProjects();
    });
}

function editProject(index) {
    const project = data.projects[currentLang].projects[index];
    
    // Afficher l'image actuelle si elle existe
    const currentImageDisplay = project.image ? `
        <div class="current-attachment-display" id="current-project-image">
            <div class="current-attachment-icon">
                <i class="fas fa-image"></i>
            </div>
            <div class="current-attachment-info">
                <div class="current-attachment-label">Image actuelle</div>
                <a href="${project.image}" target="_blank" class="current-attachment-link">${project.image.split('/').pop()}</a>
            </div>
            <button type="button" class="current-attachment-remove" onclick="document.getElementById('current-project-image').remove(); document.getElementById('remove-project-image').value='true';">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        <input type="hidden" id="remove-project-image" value="false">
    ` : '';
    
    const content = `
        <div class="form-group">
            <label>Titre</label>
            <input type="text" class="form-control" id="project-title" value="${project.title}">
        </div>
        <div class="form-group">
            <label>Slug (identifiant unique)</label>
            <input type="text" class="form-control" id="project-slug" value="${project.slug}">
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea class="form-control" id="project-description" rows="3">${project.description}</textarea>
        </div>
        <div class="form-group">
            <label>Image du projet</label>
            ${currentImageDisplay}
            ${createFileUpload('project-image', '.png,.jpg,.jpeg,.gif,.webp,.svg', project.image ? 'Nouvelle image (laissez vide pour conserver l\'actuelle)' : 'Images uniquement (PNG, JPG, WebP, SVG)')}
        </div>
        <div class="form-group">
            <label>Lien</label>
            <input type="text" class="form-control" id="project-link" value="${project.link}">
        </div>
        <div class="form-group">
            <label>Tags (séparés par des virgules)</label>
            <input type="text" class="form-control" id="project-tags" value="${project.tags.join(', ')}">
        </div>
    `;
    
    openModal('Modifier le projet', content, async () => {
        let imageUrl = project.image;
        const fileInput = document.getElementById('project-image');
        const removeImage = document.getElementById('remove-project-image');
        
        // Vérifier si on veut supprimer l'image
        if (removeImage && removeImage.value === 'true') {
            imageUrl = '';
        }
        
        // Uploader la nouvelle image si un fichier est sélectionné
        if (fileInput && fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            
            try {
                const response = await securedFetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const result = await response.json();
                    imageUrl = result.url;
                } else {
                    showAlert('Erreur lors du téléchargement de l\'image', 'error');
                    return;
                }
            } catch (error) {
                console.error('Erreur upload:', error);
                showAlert('Erreur lors du téléchargement de l\'image', 'error');
                return;
            }
        }
        
        data.projects[currentLang].projects[index] = {
            title: document.getElementById('project-title').value,
            slug: document.getElementById('project-slug').value,
            description: document.getElementById('project-description').value,
            image: imageUrl,
            link: document.getElementById('project-link').value,
            tags: document.getElementById('project-tags').value.split(',').map(s => s.trim()).filter(s => s)
        };
        renderProjects();
    });
}

function deleteProject(index) {
    if (userRole !== 'admin') {
        showAlert('Mode lecture seule - suppression non autorisée', 'error');
        return;
    }
    if (confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
        data.projects[currentLang].projects.splice(index, 1);
        renderProjects();
    }
}

// Recommendation CRUD
function addRecommendation() {
    const content = `
        <div class="form-group">
            <label>Auteur</label>
            <input type="text" class="form-control" id="rec-author" placeholder="Jean Dupont">
        </div>
        <div class="form-group">
            <label>Rôle</label>
            <input type="text" class="form-control" id="rec-role" placeholder="Manager">
        </div>
        <div class="form-group">
            <label>Entreprise</label>
            <input type="text" class="form-control" id="rec-company" placeholder="Entreprise SA">
        </div>
        <div class="form-group">
            <label>Description</label>
            <input type="text" class="form-control" id="rec-description" placeholder="Brève description de la recommandation">
        </div>
        <div class="form-group">
            <label>Document joint (lettre de recommandation)</label>
            ${createFileUpload('rec-attachment', '.pdf,.doc,.docx,.png,.jpg,.jpeg', 'PDF, Word, Images (max 5MB)')}
        </div>
    `;
    
    openModal('Ajouter une recommandation', content, async () => {
        const fileInput = document.getElementById('rec-attachment');
        let attachmentUrl = null;
        
        // Upload du fichier si présent
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            
            // Vérifier la taille (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showAlert('Le fichier est trop volumineux (max 5MB)', 'error');
                return;
            }
            
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                const uploadResponse = await securedFetch('/api/admin/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (uploadResponse.ok) {
                    const uploadResult = await uploadResponse.json();
                    attachmentUrl = uploadResult.url;
                } else {
                    showAlert('Erreur lors du téléchargement du fichier', 'error');
                    return;
                }
            } catch (error) {
                console.error('Erreur upload:', error);
                showAlert('Erreur lors du téléchargement du fichier', 'error');
                return;
            }
        }
        
        const recommendation = {
            author: document.getElementById('rec-author').value,
            role: document.getElementById('rec-role').value,
            company: document.getElementById('rec-company').value,
            description: document.getElementById('rec-description').value,
            attachment: attachmentUrl
        };
        
        if (!data.recommendations[currentLang].recommendations) {
            data.recommendations[currentLang].recommendations = [];
        }
        data.recommendations[currentLang].recommendations.push(recommendation);
        renderRecommendations();
        closeModal();
    });
}

function editRecommendation(index) {
    const rec = data.recommendations[currentLang].recommendations[index];
    
    const content = `
        <div class="form-group">
            <label>Auteur</label>
            <input type="text" class="form-control" id="rec-author" value="${rec.author || ''}">
        </div>
        <div class="form-group">
            <label>Rôle</label>
            <input type="text" class="form-control" id="rec-role" value="${rec.role || ''}">
        </div>
        <div class="form-group">
            <label>Entreprise</label>
            <input type="text" class="form-control" id="rec-company" value="${rec.company || ''}">
        </div>
        <div class="form-group">
            <label>Description</label>
            <input type="text" class="form-control" id="rec-description" value="${rec.description || rec.content || ''}">
        </div>
        <div class="form-group">
            <label>Document joint (lettre de recommandation)</label>
            ${createCurrentAttachment(rec.attachment, 'removeCurrentAttachment()')}
            ${createFileUpload('rec-attachment', '.pdf,.doc,.docx,.png,.jpg,.jpeg', 'PDF, Word, Images (max 5MB)')}
        </div>
    `;
    
    openModal('Modifier la recommandation', content, async () => {
        const fileInput = document.getElementById('rec-attachment');
        const removeAttachment = document.getElementById('remove-attachment')?.value === 'true';
        let attachmentUrl = removeAttachment ? null : rec.attachment;
        
        // Upload du nouveau fichier si présent
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            
            // Vérifier la taille (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showAlert('Le fichier est trop volumineux (max 5MB)', 'error');
                return;
            }
            
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                const uploadResponse = await securedFetch('/api/admin/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (uploadResponse.ok) {
                    const uploadResult = await uploadResponse.json();
                    attachmentUrl = uploadResult.url;
                } else {
                    showAlert('Erreur lors du téléchargement du fichier', 'error');
                    return;
                }
            } catch (error) {
                console.error('Erreur upload:', error);
                showAlert('Erreur lors du téléchargement du fichier', 'error');
                return;
            }
        }
        
        data.recommendations[currentLang].recommendations[index] = {
            author: document.getElementById('rec-author').value,
            role: document.getElementById('rec-role').value,
            company: document.getElementById('rec-company').value,
            description: document.getElementById('rec-description').value,
            attachment: attachmentUrl
        };
        renderRecommendations();
        closeModal();
    });
}

function deleteRecommendation(index) {
    if (userRole !== 'admin') {
        showAlert('Mode lecture seule - suppression non autorisée', 'error');
        return;
    }
    if (confirm('Êtes-vous sûr de vouloir supprimer cette recommandation ?')) {
        data.recommendations[currentLang].recommendations.splice(index, 1);
        renderRecommendations();
    }
}

// Document CRUD
function addDocument() {
    const projectOptions = data.projects?.fr?.projects?.map(p => 
        `<option value="${p.slug}">${p.title}</option>`
    ).join('') || '';
    
    const content = `
        <div class="form-group">
            <label>Projet associé</label>
            ${createStyledSelect('doc-project', projectOptions, '', '-- Sélectionner un projet --')}
        </div>
        <div class="form-group">
            <label>Titre du document</label>
            <input type="text" class="form-control" id="doc-title" placeholder="Documentation technique">
        </div>
        <div class="form-group">
            <label>Description</label>
            <input type="text" class="form-control" id="doc-description" placeholder="Brève description du document">
        </div>
        <div class="form-group">
            <label>Fichier PDF</label>
            ${createFileUpload('doc-file', '.pdf', 'Fichier PDF uniquement (max 10MB)')}
        </div>
    `;
    
    openModal('Ajouter un document', content, async () => {
        const fileInput = document.getElementById('doc-file');
        let filePath = '';
        
        if (fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            
            try {
                const response = await securedFetch(`${API_URL}/admin/upload`, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const result = await response.json();
                    filePath = result.url;
                } else {
                    showAlert('Erreur lors de l\'upload du fichier', 'error');
                    return;
                }
            } catch (error) {
                showAlert('Erreur lors de l\'upload', 'error');
                return;
            }
        }
        
        const doc = {
            projectSlug: document.getElementById('doc-project').value,
            title: document.getElementById('doc-title').value,
            description: document.getElementById('doc-description').value,
            filePath: filePath
        };
        
        if (!data.documents[currentLang].documents) {
            data.documents[currentLang].documents = [];
        }
        data.documents[currentLang].documents.push(doc);
        renderDocuments();
        closeModal();
    });
}

function editDocument(index) {
    const doc = data.documents[currentLang].documents[index];
    const projectOptions = data.projects?.fr?.projects?.map(p => 
        `<option value="${p.slug}" ${p.slug === doc.projectSlug ? 'selected' : ''}>${p.title}</option>`
    ).join('') || '';
    
    const content = `
        <div class="form-group">
            <label>Projet associé</label>
            ${createStyledSelect('doc-project', projectOptions, doc.projectSlug, '-- Sélectionner un projet --')}
        </div>
        <div class="form-group">
            <label>Titre du document</label>
            <input type="text" class="form-control" id="doc-title" value="${doc.title}">
        </div>
        <div class="form-group">
            <label>Description</label>
            <input type="text" class="form-control" id="doc-description" value="${doc.description}">
        </div>
        <div class="form-group">
            <label>Fichier PDF</label>
            ${createCurrentAttachment(doc.filePath, 'removeCurrentAttachment()')}
            ${createFileUpload('doc-file', '.pdf', 'Laissez vide pour conserver le fichier actuel')}
        </div>
    `;
    
    openModal('Modifier le document', content, async () => {
        const fileInput = document.getElementById('doc-file');
        const removeAttachment = document.getElementById('remove-attachment')?.value === 'true';
        let filePath = removeAttachment ? '' : doc.filePath;
        
        if (fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            
            try {
                const response = await securedFetch(`${API_URL}/admin/upload`, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const result = await response.json();
                    filePath = result.url;
                }
            } catch (error) {
                console.error('Upload error:', error);
            }
        }
        
        data.documents[currentLang].documents[index] = {
            projectSlug: document.getElementById('doc-project').value,
            title: document.getElementById('doc-title').value,
            description: document.getElementById('doc-description').value,
            filePath: filePath
        };
        renderDocuments();
        closeModal();
    });
}

function deleteDocument(index) {
    if (userRole !== 'admin') {
        showAlert('Mode lecture seule - suppression non autorisée', 'error');
        return;
    }
    if (confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
        data.documents[currentLang].documents.splice(index, 1);
        renderDocuments();
    }
}

// Save function
async function saveCurrentSection() {
    // Vérifier si l'utilisateur est admin
    if (userRole !== 'admin') {
        showAlert('Mode lecture seule - modifications non autorisées', 'error');
        return;
    }
    
    try {
        const response = await securedFetch(`${API_URL}/admin/${currentSection}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data[currentSection])
        });
        
        if (response.ok) {
            showAlert('Modifications sauvegardées avec succès !', 'success');
        } else {
            const error = await response.json();
            showAlert(error.error || 'Erreur lors de la sauvegarde', 'error');
        }
    } catch (error) {
        showAlert('Erreur de connexion au serveur', 'error');
        console.error(error);
    }
}

// Publish to GitHub function
async function publishToGitHub() {
    // Vérifier si l'utilisateur est admin
    if (userRole !== 'admin') {
        showAlert('Mode lecture seule - publication non autorisée', 'error');
        return;
    }
    
    if (!confirm('Publier les modifications sur GitHub Pages ?\n\nCela va exporter les données et faire un git push.')) {
        return;
    }
    
    // Afficher un indicateur de chargement
    showAlert('Publication en cours...', 'info');
    
    try {
        const response = await securedFetch(`${API_URL}/publish`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Mise à jour depuis le panel admin - ${new Date().toLocaleString('fr-FR')}`
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showAlert(result.message || 'Publication réussie ! 🚀', 'success');
        } else {
            showAlert(result.message || 'Erreur lors de la publication', 'error');
            if (result.error) {
                console.error('Détails:', result.error);
            }
        }
    } catch (error) {
        showAlert('Erreur de connexion au serveur', 'error');
        console.error(error);
    }
}

// Alert function
function showAlert(message, type = 'info') {
    const container = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    // Choisir l'icône selon le type
    let iconClass = 'fas fa-info-circle';
    if (type === 'success') iconClass = 'fas fa-check-circle';
    else if (type === 'error') iconClass = 'fas fa-exclamation-circle';
    else if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';
    
    alert.innerHTML = `
        <div class="alert-icon"><i class="${iconClass}"></i></div>
        <div class="alert-content">${message}</div>
        <button class="alert-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(alert);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 5000);
}

// Logout function
function logout() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('csrfToken');
    window.location.href = 'login.html';
}
