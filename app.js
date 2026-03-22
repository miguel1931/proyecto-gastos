// ==================== CONFIGURATION ====================
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

// ==================== STATE ====================
let authToken = localStorage.getItem('authToken') || null;
let expenses = [];

// ==================== UTILITIES ====================
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', { 
        style: 'currency', 
        currency: 'EUR' 
    }).format(amount);
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
};

const generateId = () => {
    return crypto.randomUUID ? crypto.randomUUID() : 
        Math.random().toString(36).substring(2, 15) + 
        Math.random().toString(36).substring(2, 15);
};

// Generate consistent color based on string
const getColorForText = (text) => {
    const colors = [
        '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', 
        '#f97316', '#eab308', '#22c55e', '#14b8a6',
        '#06b6d4', '#3b82f6'
    ];
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

// ==================== TOAST NOTIFICATIONS ====================
const showToast = (message, type = 'info') => {
    const container = $('#toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconSvg = type === 'success' 
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
        : type === 'error'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    
    toast.innerHTML = `
        <div class="toast-icon">${iconSvg}</div>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

// ==================== LOADING ====================
const showLoading = () => $('#loading-overlay').classList.remove('hidden');
const hideLoading = () => $('#loading-overlay').classList.add('hidden');

// ==================== API FUNCTIONS ====================
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        ...options.headers
    };
    
    try {
        const response = await fetch(url, { 
            ...options, 
            headers 
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || error.error || 'Error en la petición');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ==================== AUTH ====================
async function login(password) {
    try {
        const data = await apiCall('/auth', {
            method: 'POST',
            body: JSON.stringify({ password })
        });
        
        if (data.success) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    showLoginScreen();
    showToast('Sesión cerrada correctamente', 'success');
}

function checkAuth() {
    return authToken !== null;
}

// ==================== SCREENS ====================
function showLoginScreen() {
    $('#login-screen').classList.remove('hidden');
    $('#dashboard-screen').classList.add('hidden');
    $('#password-input').value = '';
    $('#login-error').classList.add('hidden');
}

function showDashboardScreen() {
    $('#login-screen').classList.add('hidden');
    $('#dashboard-screen').classList.remove('hidden');
    initDashboard();
}

function showSection(sectionName) {
    // Update nav
    $$('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionName);
    });
    
    // Update sections
    $$('.content-section').forEach(section => {
        section.classList.toggle('active', section.id === `section-${sectionName}`);
    });
    
    // Update title
    const titles = {
        dashboard: 'Dashboard',
        add: 'Añadir Gasto',
        history: 'Historial'
    };
    $('#page-title').textContent = titles[sectionName] || 'Dashboard';
    
    // Close mobile sidebar
    $('.sidebar').classList.remove('open');
}

// ==================== EXPENSES ====================
async function loadExpenses() {
    try {
        showLoading();
        expenses = await apiCall('/expenses');
        render();
    } catch (error) {
        // Fallback to localStorage if API fails
        expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
        render();
        showToast('Usando datos locales (sin conexión)', 'info');
    } finally {
        hideLoading();
    }
}

async function addExpense(expenseData) {
    try {
        showLoading();
        const newExpense = await apiCall('/expenses', {
            method: 'POST',
            body: JSON.stringify(expenseData)
        });
        expenses.unshift(newExpense);
        render();
        showToast('Gasto añadido correctamente', 'success');
        return true;
    } catch (error) {
        // Fallback to localStorage
        const newExpense = {
            id: generateId(),
            ...expenseData,
            createdAt: new Date().toISOString()
        };
        expenses.unshift(newExpense);
        localStorage.setItem('expenses', JSON.stringify(expenses));
        render();
        showToast('Gasto guardado localmente', 'success');
        return true;
    } finally {
        hideLoading();
    }
}

async function deleteExpense(id) {
    if (!confirm('¿Seguro que deseas eliminar este gasto?')) return;
    
    try {
        showLoading();
        await apiCall(`/expenses?id=${id}`, {
            method: 'DELETE'
        });
        expenses = expenses.filter(e => e.id !== id);
        render();
        showToast('Gasto eliminado', 'success');
    } catch (error) {
        // Fallback to localStorage
        expenses = expenses.filter(e => e.id !== id);
        localStorage.setItem('expenses', JSON.stringify(expenses));
        render();
        showToast('Gasto eliminado localmente', 'success');
    } finally {
        hideLoading();
    }
}

// Make deleteExpense available globally
window.deleteExpense = deleteExpense;

// ==================== RENDER ====================
function render() {
    // Calculate summary
    const projectsData = {};
    const categories = new Set();
    let totalAmount = 0;

    expenses.forEach(e => {
        categories.add(e.category);
        totalAmount += e.amount;
        
        if (!projectsData[e.project]) {
            projectsData[e.project] = {
                name: e.project,
                total: 0,
                lastDate: e.date
            };
        }
        
        projectsData[e.project].total += e.amount;
        if (e.date > projectsData[e.project].lastDate) {
            projectsData[e.project].lastDate = e.date;
        }
    });

    const projectsList = Object.values(projectsData);

    // Update stats
    $('#total-spent').textContent = formatCurrency(totalAmount);
    $('#active-projects').textContent = projectsList.length;
    $('#total-categories').textContent = categories.size;
    $('#total-entries').textContent = expenses.length;

    // Update datalists for autocomplete
    const projectsDatalist = $('#projects-list');
    const categoriesDatalist = $('#categories-list');
    
    projectsDatalist.innerHTML = projectsList
        .map(p => `<option value="${p.name}">`)
        .join('');
    
    categoriesDatalist.innerHTML = Array.from(categories)
        .map(c => `<option value="${c}">`)
        .join('');

    // Render projects
    const projectsGrid = $('#projects-grid');
    projectsGrid.innerHTML = projectsList
        .sort((a, b) => b.total - a.total)
        .map(p => {
            const initial = p.name ? p.name.charAt(0).toUpperCase() : '?';
            const color = getColorForText(p.name);
            return `
                <div class="project-card" onclick="filterByProject('${p.name}')">
                    <div class="project-avatar" style="background-color: ${color}">${initial}</div>
                    <div class="project-info">
                        <h3>${p.name}</h3>
                        <div class="project-spent">${formatCurrency(p.total)}</div>
                        <div class="project-last">Últ. gasto: ${formatDate(p.lastDate)}</div>
                    </div>
                </div>
            `;
        }).join('') || '<div class="empty-state" style="grid-column: 1/-1;"><p>No hay proyectos aún</p></div>';

    // Update filter dropdowns
    updateFilters(projectsList, categories);
    
    // Render table
    renderTable();
}

function updateFilters(projectsList, categories) {
    const filterProject = $('#filter-project');
    const filterCategory = $('#filter-category');
    
    const currentProject = filterProject.value;
    const currentCategory = filterCategory.value;
    
    filterProject.innerHTML = '<option value="">Todos los Proyectos</option>' +
        projectsList.map(p => p.name).sort()
            .map(p => `<option value="${p}" ${p === currentProject ? 'selected' : ''}>${p}</option>`)
            .join('');
    
    filterCategory.innerHTML = '<option value="">Todas las Categorías</option>' +
        Array.from(categories).sort()
            .map(c => `<option value="${c}" ${c === currentCategory ? 'selected' : ''}>${c}</option>`)
            .join('');
}

function filterByProject(projectName) {
    $('#filter-project').value = projectName;
    showSection('history');
    renderTable();
}

function renderTable() {
    const filterProject = $('#filter-project').value;
    const filterCategory = $('#filter-category').value;
    
    let filtered = expenses.filter(e => {
        if (filterProject && e.project !== filterProject) return false;
        if (filterCategory && e.category !== filterCategory) return false;
        return true;
    });
    
    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const tbody = $('#expenses-body');
    const emptyState = $('#empty-state');
    
    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        tbody.innerHTML = filtered.map(e => `
            <tr>
                <td>${formatDate(e.date)}</td>
                <td>${e.project}</td>
                <td>${e.category}</td>
                <td>${e.description || '-'}</td>
                <td class="amount-cell">${formatCurrency(e.amount)}</td>
                <td>
                    <button class="delete-btn" onclick="deleteExpense('${e.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Eliminar
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

// ==================== INIT DASHBOARD ====================
function initDashboard() {
    // Set default date to today
    $('#date').valueAsDate = new Date();
    
    // Form submit
    $('#expense-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const expenseData = {
            project: $('#project').value.trim(),
            category: $('#category').value.trim(),
            description: $('#description').value.trim(),
            date: $('#date').value,
            amount: parseFloat($('#amount').value)
        };
        
        const success = await addExpense(expenseData);
        
        if (success) {
            e.target.reset();
            $('#date').valueAsDate = new Date();
        }
    });
    
    // Filter changes
    $('#filter-project').addEventListener('change', renderTable);
    $('#filter-category').addEventListener('change', renderTable);
    
    // Load data
    loadExpenses();
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
    // Login form
    $('#login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = $('#password-input').value;
        
        showLoading();
        const success = await login(password);
        hideLoading();
        
        if (success) {
            showDashboardScreen();
            showToast('Bienvenido!', 'success');
        } else {
            $('#login-error').classList.remove('hidden');
            $('#password-input').select();
        }
    });
    
    // Logout
    $('#logout-btn').addEventListener('click', logout);
    
    // Navigation
    $$('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(item.dataset.section);
        });
    });
    
    // Mobile menu toggle
    $('#menu-toggle').addEventListener('click', () => {
        $('.sidebar').classList.toggle('open');
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024) {
            const sidebar = $('.sidebar');
            const menuToggle = $('#menu-toggle');
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });
    
    // Check if already authenticated
    if (checkAuth()) {
        showDashboardScreen();
    } else {
        showLoginScreen();
    }
});
