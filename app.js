document.addEventListener("DOMContentLoaded", () => {
    // === AUTHENTICATION LOGIC ===
    const loginScreen = document.getElementById("login-screen");
    const dashboardScreen = document.getElementById("dashboard-screen");
    const loginButton = document.getElementById("login-button");
    const passwordInput = document.getElementById("password-input");
    const loginError = document.getElementById("login-error");

    const checkAuth = () => {
        if (sessionStorage.getItem("authenticated") === "true") {
            loginScreen.classList.add("hidden");
            dashboardScreen.classList.remove("hidden");
            initDashboard();
        }
    };

    const attemptLogin = () => {
        if (passwordInput.value === "panza") {
            sessionStorage.setItem("authenticated", "true");
            loginScreen.classList.add("hidden");
            dashboardScreen.classList.remove("hidden");
            initDashboard();
        } else {
            loginError.classList.remove("hidden");
        }
    };

    loginButton.addEventListener("click", attemptLogin);

    passwordInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") attemptLogin();
    });

    // Run auth check on load
    checkAuth();
});

// === DASHBOARD LOGIC ===
function initDashboard() {
    // DOM Elements
    const expenseForm = document.getElementById("expense-form");
    const expensesBody = document.getElementById("expenses-body");
    const projectsGrid = document.getElementById("projects-grid");
    
    const filterProject = document.getElementById("filter-project");
    const filterCategory = document.getElementById("filter-category");
    
    const totalSpentEl = document.getElementById("total-spent");
    const activeProjectsEl = document.getElementById("active-projects");

    // Set default date in form to today
    document.getElementById("date").valueAsDate = new Date();

    // Application state
    let expenses = JSON.parse(localStorage.getItem("expenses")) || [];

    // Helper: Generate UUID or fallback random string
    const generateId = () => {
        return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    };

    // Helper: Save to localStorage and re-render
    const saveAndRender = () => {
        localStorage.setItem("expenses", JSON.stringify(expenses));
        render();
    };

    // Form submit handler
    expenseForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const newExpense = {
            id: generateId(),
            project: document.getElementById("project").value.trim(),
            category: document.getElementById("category").value.trim(),
            description: document.getElementById("description").value.trim(),
            date: document.getElementById("date").value,
            amount: parseFloat(document.getElementById("amount").value)
        };

        // Add to beginning of array
        expenses.unshift(newExpense);
        saveAndRender();
        
        // Reset form but keep today's date
        expenseForm.reset();
        document.getElementById("date").valueAsDate = new Date();
    });

    // Global delete handler
    window.deleteExpense = (id) => {
        if(confirm("¿Seguro que deseas eliminar este gasto?")) {
            expenses = expenses.filter(e => e.id !== id);
            saveAndRender();
        }
    };

    // Formatting utilities
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
    };
    
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split("-");
        return `${day}/${month}/${year}`;
    };

    // Generate consistent color based on string
    const getColorForText = (text) => {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = text.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return "#" + "00000".substring(0, 6 - c.length) + c;
    };

    // Main render function
    const render = () => {
        // 1. Calculate Summary and Project Totals
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
            
            // Track most recent date
            if (e.date > projectsData[e.project].lastDate) {
                projectsData[e.project].lastDate = e.date;
            }
        });

        // 2. Update Header Summary
        totalSpentEl.textContent = formatCurrency(totalAmount);
        const projectsList = Object.values(projectsData);
        activeProjectsEl.textContent = projectsList.length;

        // 3. Render Projects Grid
        projectsGrid.innerHTML = "";
        projectsList.sort((a,b) => b.total - a.total).forEach(p => {
            const initial = p.name ? p.name.charAt(0).toUpperCase() : '?';
            const color = getColorForText(p.name);
            
            const card = document.createElement("div");
            card.className = "project-card";
            card.innerHTML = `
                <div class="project-avatar" style="background-color: ${color}">${initial}</div>
                <div class="project-info">
                    <h3>${p.name}</h3>
                    <div class="project-spent">${formatCurrency(p.total)}</div>
                    <div class="project-last">Últ. gasto: ${formatDate(p.lastDate)}</div>
                </div>
            `;
            projectsGrid.appendChild(card);
        });

        // 4. Update Filter Dropdowns (preserve selection)
        const currentSelectedProject = filterProject.value;
        const currentSelectedCategory = filterCategory.value;
        
        filterProject.innerHTML = '<option value="">Todos los Proyectos</option>';
        projectsList.map(p => p.name).sort().forEach(proj => {
            const opt = document.createElement("option");
            opt.value = proj;
            opt.textContent = proj;
            if(proj === currentSelectedProject) opt.selected = true;
            filterProject.appendChild(opt);
        });

        filterCategory.innerHTML = '<option value="">Todas las Categorías</option>';
        Array.from(categories).sort().forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat;
            opt.textContent = cat;
            if(cat === currentSelectedCategory) opt.selected = true;
            filterCategory.appendChild(opt);
        });

        // 5. Render Table
        renderTable();
    };

    // Render Table function with filtering
    const renderTable = () => {
        const projFilter = filterProject.value;
        const catFilter = filterCategory.value;

        // Apply filters
        let filtered = expenses.filter(e => {
            if (projFilter && e.project !== projFilter) return false;
            if (catFilter && e.category !== catFilter) return false;
            return true;
        });

        // Sort by date descending
        filtered.sort((a,b) => new Date(b.date) - new Date(a.date));

        // Generate rows
        expensesBody.innerHTML = "";
        if (filtered.length === 0) {
            expensesBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No hay gastos registrados</td></tr>`;
        } else {
            filtered.forEach(e => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${formatDate(e.date)}</td>
                    <td>${e.project}</td>
                    <td>${e.category}</td>
                    <td>${e.description}</td>
                    <td class="amount-cell">${formatCurrency(e.amount)}</td>
                    <td><button class="delete-btn" onclick="deleteExpense('${e.id}')">Eliminar</button></td>
                `;
                expensesBody.appendChild(tr);
            });
        }
    };

    // Attach listeners to filters
    filterProject.addEventListener("change", renderTable);
    filterCategory.addEventListener("change", renderTable);

    // Initial render
    render();
}
