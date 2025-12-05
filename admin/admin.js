// Configuration
const API_URL = 'http://localhost:3001/api';

// État global
let currentSection = 'stats';
let currentLang = 'fr';
let data = {
    stats: null,
    formations: null,
    skills: null,
    projects: null,
    recommendations: null,
    documents: null
};

// Vérification de l'authentification au chargement
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    verifyToken(token).then(valid => {
        if (!valid) {
            localStorage.removeItem('adminToken');
            window.location.href = 'login.html';
        } else {
            init();
        }
    });
});

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
        recommendations: { title: 'Recommandations', desc: 'Gérez les recommandations par projet' },
        documents: { title: 'Documents', desc: 'Gérez les documents téléchargeables par projet' }
    };
    
    document.getElementById('section-title').textContent = titles[section].title;
    document.getElementById('section-desc').textContent = titles[section].desc;
    
    currentSection = section;
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
                    <span class="badge">${rec.projectSlug}</span>
                    <button class="btn btn-icon" onclick="editRecommendation(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon btn-danger" onclick="deleteRecommendation(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="item-card-body">
                <p>"${rec.content}"</p>
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
    
    document.getElementById('modal-save-btn').onclick = () => {
        saveCallback();
        closeModal();
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
            <label>Image (chemin relatif)</label>
            <input type="text" class="form-control" id="project-image" placeholder="assets/images/project.png">
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
    
    openModal('Ajouter un projet', content, () => {
        const project = {
            title: document.getElementById('project-title').value,
            slug: document.getElementById('project-slug').value,
            description: document.getElementById('project-description').value,
            image: document.getElementById('project-image').value,
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
            <label>Image (chemin relatif)</label>
            <input type="text" class="form-control" id="project-image" value="${project.image}">
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
    
    openModal('Modifier le projet', content, () => {
        data.projects[currentLang].projects[index] = {
            title: document.getElementById('project-title').value,
            slug: document.getElementById('project-slug').value,
            description: document.getElementById('project-description').value,
            image: document.getElementById('project-image').value,
            link: document.getElementById('project-link').value,
            tags: document.getElementById('project-tags').value.split(',').map(s => s.trim()).filter(s => s)
        };
        renderProjects();
    });
}

function deleteProject(index) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
        data.projects[currentLang].projects.splice(index, 1);
        renderProjects();
    }
}

// Recommendation CRUD
function addRecommendation() {
    const projectOptions = data.projects?.fr?.projects?.map(p => 
        `<option value="${p.slug}">${p.title}</option>`
    ).join('') || '';
    
    const content = `
        <div class="form-group">
            <label>Projet associé</label>
            <select class="form-control" id="rec-project">
                <option value="">-- Sélectionner un projet --</option>
                ${projectOptions}
            </select>
        </div>
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
            <label>Contenu de la recommandation</label>
            <textarea class="form-control" id="rec-content" rows="4" placeholder="Texte de la recommandation..."></textarea>
        </div>
    `;
    
    openModal('Ajouter une recommandation', content, () => {
        const recommendation = {
            projectSlug: document.getElementById('rec-project').value,
            author: document.getElementById('rec-author').value,
            role: document.getElementById('rec-role').value,
            company: document.getElementById('rec-company').value,
            content: document.getElementById('rec-content').value
        };
        
        if (!data.recommendations[currentLang].recommendations) {
            data.recommendations[currentLang].recommendations = [];
        }
        data.recommendations[currentLang].recommendations.push(recommendation);
        renderRecommendations();
    });
}

function editRecommendation(index) {
    const rec = data.recommendations[currentLang].recommendations[index];
    const projectOptions = data.projects?.fr?.projects?.map(p => 
        `<option value="${p.slug}" ${p.slug === rec.projectSlug ? 'selected' : ''}>${p.title}</option>`
    ).join('') || '';
    
    const content = `
        <div class="form-group">
            <label>Projet associé</label>
            <select class="form-control" id="rec-project">
                <option value="">-- Sélectionner un projet --</option>
                ${projectOptions}
            </select>
        </div>
        <div class="form-group">
            <label>Auteur</label>
            <input type="text" class="form-control" id="rec-author" value="${rec.author}">
        </div>
        <div class="form-group">
            <label>Rôle</label>
            <input type="text" class="form-control" id="rec-role" value="${rec.role}">
        </div>
        <div class="form-group">
            <label>Entreprise</label>
            <input type="text" class="form-control" id="rec-company" value="${rec.company}">
        </div>
        <div class="form-group">
            <label>Contenu de la recommandation</label>
            <textarea class="form-control" id="rec-content" rows="4">${rec.content}</textarea>
        </div>
    `;
    
    openModal('Modifier la recommandation', content, () => {
        data.recommendations[currentLang].recommendations[index] = {
            projectSlug: document.getElementById('rec-project').value,
            author: document.getElementById('rec-author').value,
            role: document.getElementById('rec-role').value,
            company: document.getElementById('rec-company').value,
            content: document.getElementById('rec-content').value
        };
        renderRecommendations();
    });
}

function deleteRecommendation(index) {
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
            <select class="form-control" id="doc-project">
                <option value="">-- Sélectionner un projet --</option>
                ${projectOptions}
            </select>
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
            <input type="file" class="form-control" id="doc-file" accept=".pdf">
        </div>
    `;
    
    openModal('Ajouter un document', content, async () => {
        const fileInput = document.getElementById('doc-file');
        let filePath = '';
        
        if (fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            
            try {
                const token = localStorage.getItem('adminToken');
                const response = await fetch(`${API_URL}/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                
                if (response.ok) {
                    const result = await response.json();
                    filePath = result.filePath;
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
            <select class="form-control" id="doc-project">
                <option value="">-- Sélectionner un projet --</option>
                ${projectOptions}
            </select>
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
            <label>Fichier PDF actuel</label>
            <p class="text-muted">${doc.filePath || 'Aucun fichier'}</p>
            <input type="file" class="form-control" id="doc-file" accept=".pdf">
            <small class="text-muted">Laissez vide pour conserver le fichier actuel</small>
        </div>
    `;
    
    openModal('Modifier le document', content, async () => {
        const fileInput = document.getElementById('doc-file');
        let filePath = doc.filePath;
        
        if (fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            
            try {
                const token = localStorage.getItem('adminToken');
                const response = await fetch(`${API_URL}/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                
                if (response.ok) {
                    const result = await response.json();
                    filePath = result.filePath;
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
    });
}

function deleteDocument(index) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
        data.documents[currentLang].documents.splice(index, 1);
        renderDocuments();
    }
}

// Save function
async function saveCurrentSection() {
    const token = localStorage.getItem('adminToken');
    
    try {
        const response = await fetch(`${API_URL}/admin/${currentSection}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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

// Alert function
function showAlert(message, type = 'info') {
    const container = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
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
    localStorage.removeItem('adminToken');
    window.location.href = 'login.html';
}
