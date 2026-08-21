// ======== SCRIPT FOR ALL DYNAMIC PAGE CONTENT ========

document.addEventListener('DOMContentLoaded', () => {

    // ======== MODULE 1: FARMER DIRECTORY ========
   if (document.getElementById('farmerList')) {
        
        let allFarmers = []; // This will hold the data fetched from the DB
        let showAllFarmers = false;
        const farmerListDiv = document.getElementById('farmerList');
        const farmerSearchInput = document.getElementById('farmerSearch');
        const searchButton = document.querySelector('#farmers .search-button');
// In agri.js - Farmer Directory Module
async function fetchFarmers() {
    try {
        const response = await fetch('/api/approved-farmers', {
            method: 'GET',
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        allFarmers = await response.json();
        filterFarmers();
    } catch (error) {
        console.error('Error fetching farmer directory:', error);
        document.getElementById('farmerList').innerHTML = 
            '<p class="no-results-message">Unable to load farmers. Please try again.</p>';
    }
}
        function renderFarmers(farmerArray) {
    farmerListDiv.innerHTML = '';

    if (farmerArray.length === 0) {
        farmerListDiv.innerHTML =
            '<p class="no-results-message">No farmers found matching your search criteria.</p>';
        return;
    }

    // Show only 6 farmers initially
    const farmersToShow = showAllFarmers
        ? farmerArray
        : farmerArray.slice(0, 6);

    farmersToShow.forEach(farmer => {

        const userEmail =
            farmer.contact_email || farmer.email || 'Not Listed';

        const dataAttributes = `
            data-name="${farmer.author_name || farmer.farm_name}"
            data-email="${userEmail}"
            data-contact="${farmer.contact_number || ''}"
            data-experience="${farmer.years_experience || ''}"
            data-location="${farmer.user_location || farmer.farm_location}"
            data-pic="${farmer.profile_picture_url || '/agri-images/default.png'}"
        `;

        farmerListDiv.innerHTML += `
            <div class="card">
                <h3>${farmer.farm_name}</h3>
                <p><strong>Crops:</strong> ${farmer.crop_specialization}</p>
                <p><strong>Location:</strong> ${farmer.farm_location}</p>
                <button class="view-details-button contact-profile-link" ${dataAttributes}>
                    Contact Farmer
                </button>
            </div>
        `;
    });

    // View More button
    let viewMoreBtn = document.getElementById('viewMoreFarmersBtn');

    if (farmerArray.length > 6) {

        if (!viewMoreBtn) {
            viewMoreBtn = document.createElement('button');
            viewMoreBtn.id = 'viewMoreFarmersBtn';
            viewMoreBtn.className = 'hero-button';
            viewMoreBtn.style.display = 'block';
            viewMoreBtn.style.margin = '25px auto';

            farmerListDiv.parentNode.appendChild(viewMoreBtn);

            viewMoreBtn.addEventListener('click', () => {
                showAllFarmers = !showAllFarmers;
                renderFarmers(farmerArray);
            });
        }

        viewMoreBtn.textContent = showAllFarmers
            ? 'Show Less'
            : 'View More Farmers';

    } else if (viewMoreBtn) {
        viewMoreBtn.remove();
    }
}
     window.filterFarmers = function() {
    if (!farmerSearchInput) return;

    const searchTerm = farmerSearchInput.value.toLowerCase();

    const filtered = allFarmers.filter(f =>
        (f.farm_name || '').toLowerCase().includes(searchTerm) ||
        (f.crop_specialization || '').toLowerCase().includes(searchTerm) ||
        (f.farm_location || '').toLowerCase().includes(searchTerm)
    );

    // Search result starts from first 6 again
    showAllFarmers = false;

    renderFarmers(filtered);
}
        // This handles the profile viewer redirection when "Contact Farmer" is clicked
        farmerListDiv.addEventListener('click', (e) => {
            const target = e.target;
            
            if (target.classList.contains('contact-profile-link')) {
                e.preventDefault(); 
                
                const currentUserData = localStorage.getItem('agriUser');
                if (!currentUserData) {
                    console.log('Please login to view user profile information.');
                    return;
                }

                // Collect data attributes directly from the button
                const userProfile = {
                    name: target.dataset.name,
                    email: target.dataset.email,
                    contact: target.dataset.contact,
                    pic: target.dataset.pic,
                    experience: target.dataset.experience,
                    location: target.dataset.location,
                    // Determine expert status based on experience value
                    isExpert: (parseInt(target.dataset.experience) || 0) >= 7
                };

                // Construct URL with parameters and redirect to the viewer page
                const params = new URLSearchParams(userProfile);
                window.location.href = `profile-viewer.html?${params.toString()}`;
            }
        });

        if (searchButton) {
            searchButton.addEventListener('click', filterFarmers);
        }
        if (farmerSearchInput) {
            farmerSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') filterFarmers();
            });
        }

        fetchFarmers(); // Initial data load
    }
// ======== END OF MODULE 1 ========



    //equipment part

    // ======== MODULE 2: EQUIPMENT MARKETPLACE (RESTORED) ========
    if (document.getElementById('productGrid')) {
    // Hardcoded data is removed and replaced by dynamic data fetching.
    
    const productGrid = document.getElementById('productGrid');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    const noResultsMessage = document.getElementById('noResultsMessage');
    
    // Hardcoded initial data is included for the existing products
    const initialEquipmentData = [
        { name: 'Precision Seed Drill', category: 'Planting & Seeding', price: 7800.00, rating: 4.5, condition: 'Good', specs: ['Accurate seed placement', 'Reduces seed wastage'], imageUrl: 'Seed Drill', seller_name: 'Verified', seller_email: 'support@example.com' },
        { name: 'Knapsack Power Sprayer', category: 'Sprayers', price: 150.00, rating: 4, condition: 'Good', specs: ['16-liter capacity', 'High-pressure pump'], imageUrl: 'Sprayer', seller_name: 'Verified', seller_email: 'support@example.com' },
        // Add other hardcoded items if they were part of the original array, or keep them simple.
    ];
    
    let allEquipmentData = []; // Store combined fetched and initial data here



    //display view detail 
 function renderProducts(products) {
    productGrid.innerHTML = '';
    noResultsMessage.style.display = products.length === 0 ? 'block' : 'none';

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const rating = product.rating || 4.0;
        const ratingStars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
        
        const imageUrl = product.imageUrl && product.imageUrl.startsWith('/') ? product.imageUrl : product.imageUrl; 
        const specsList = product.specs ? product.specs.map(spec => `<li>${spec}</li>`).join('') : `<li>Condition: ${product.condition || 'N/A'}</li><li>Seller: ${product.seller_name || 'N/A'}</li>`;
        
        // --- Condition Tag Logic ---
        // for seller or farmer listed 
        const condition = product.condition || 'N/A';
        let conditionColorClass = '';
        if (condition === 'Excellent') {
            conditionColorClass = 'condition-excellent'; // You need to define this class in agri.css
        } else if (condition === 'Good') {
            conditionColorClass = 'condition-good';
        } else if (condition === 'Fair') {
            conditionColorClass = 'condition-fair';
        } else if (condition === 'Poor') {
            conditionColorClass = 'condition-poor';
        }
        
        // --- Seller/Verified Tag Logic ---
        // If the product has a contact_number (meaning it's a dynamic user listing), show the seller's name.
        // Otherwise (for hardcoded items), show a static tag.
        const sellerTagHtml = product.contact_number && product.contact_number.trim() !== '' ? 
            `<span class="seller-tag">Listed by: ${product.seller_name}</span>` :
            `<span class="seller-tag">Seller: ${product.seller_name}</span>`;

        
        // --- Contact Logic (remains the same) ---
        // whatsapp


        let buyLink = '#';
        let buyText = 'Buy Now';
        let isExternalLink = false;
        
        const contactNumber = product.contact_number;

        if (contactNumber && contactNumber.trim() !== '') {
            let cleanedNumber = contactNumber.replace(/[^0-9]/g, '');
            if (cleanedNumber.length === 10) {
                cleanedNumber = '91' + cleanedNumber;
            }
            buyLink = `https://wa.me/${cleanedNumber}`;
            buyText = 'WhatsApp Seller';
            isExternalLink = true;
        } else if (product.seller_email) {
            buyLink = `mailto:${product.seller_email}`;
            buyText = 'Contact Seller (Email)';
            isExternalLink = true;
        }

        const encodedName = encodeURIComponent(product.name);
        const detailLink = `equipment-viewer.html?name=${encodedName}`;

        card.innerHTML = `
            <div class="product-image-container">
                <div class="product-image-placeholder">
                    ${imageUrl && imageUrl.startsWith('/') ? 
                        `<img src="${imageUrl}" alt="${product.name}" style="width: 100%; height: auto; border-radius: 0.5rem; max-height: 150px; object-fit: cover;">` : 
                        `<span>${product.name.toUpperCase()}</span>`}
                </div>
                <span class="category-label ${conditionColorClass}">${condition}</span>
                ${sellerTagHtml} 
            </div>
            <div class="product-card-content">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-rating"><span>${ratingStars}</span> (${rating})</div>
                <ul class="product-specs">${specsList}</ul>
                <p class="product-price">$${Number(product.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <div class="product-buttons">
                    <a href="${detailLink}" class="btn-details">View Details</a> 
                    <a href="${buyLink}" ${isExternalLink ? 'target="_blank"' : ''} class="btn-buy-now">${buyText}</a>
                </div>
            </div>`;
        productGrid.appendChild(card);
    });
}

   async function fetchEquipment() {
        try {
            const response = await fetch('/api/equipment/all');
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            // Map the fetched data to match the structure of hardcoded data
            const dynamicEquipment = data.map(item => ({
                name: item.name,
                category: item.category,
                price: Number(item.price), 
                imageUrl: item.image_url,
                condition: item.condition_status,
                seller_name: item.seller_name,
                seller_email: item.seller_email, // Used for email fallback
                contact_number: item.contact_number, // <--- CRITICAL FIX: Include contact_number
                description: item.description,
                rating: 5.0, // Set default high rating for user listings
                specs: [`Condition: ${item.condition_status}`, `Description: ${item.description.substring(0, 40)}...`],
            }));
            
            // Combine hardcoded data (first) and dynamic data (newest first)
            allEquipmentData = [...initialEquipmentData, ...dynamicEquipment];
            
            updateProductView();
        } catch (error) {
            console.error('Failed to fetch equipment data:', error);
            noResultsMessage.textContent = 'Failed to load equipment data from the server. Showing default items.';
            noResultsMessage.style.display = 'block';
            
            // Fallback to only initial data if API fails
            allEquipmentData = initialEquipmentData;
            updateProductView();
        }
    }

    function updateProductView() {
        let processedProducts = [...allEquipmentData];
        const searchTerm = searchInput.value.toLowerCase();
        
        // Apply Search Filter
        if (searchTerm) {
            processedProducts = processedProducts.filter(p => p.name.toLowerCase().includes(searchTerm) || p.category.toLowerCase().includes(searchTerm));
        }
        
        // Apply Category Filter
        const selectedCategory = categoryFilter.value;
        if (selectedCategory !== 'all') {
            processedProducts = processedProducts.filter(p => p.category === selectedCategory);
        }
        
        // Apply Sort Filter (Default sort: newest items first, then hardcoded items)
        const sortBy = sortFilter.value;
        switch (sortBy) {
            case 'price-asc': processedProducts.sort((a, b) => a.price - b.price); break;
            case 'price-desc': processedProducts.sort((a, b) => b.price - a.price); break;
            case 'rating-desc': processedProducts.sort((a, b) => b.rating - a.rating); break;
            default: /* Keep original combined order (hardcoded first, dynamic second) */ break; 
        }
        
        renderProducts(processedProducts);
    }

    // Attach Event Listeners
    searchInput.addEventListener('input', updateProductView);
    categoryFilter.addEventListener('change', updateProductView);
    sortFilter.addEventListener('change', updateProductView);

    fetchEquipment(); // Initial fetch and render
}





//end of equipment part






    // ======== MODULE 3: GOVERNMENT SCHEMES (with new features) ========
    // ======== MODULE 3: GOVERNMENT SCHEMES (Database-Backed Saved Schemes) ========
    if (document.getElementById('schemesGrid')) {
        
        let allSchemes = []; 
        let savedSchemeIds = new Set(); 
        let currentUser = null;

        const schemesGrid = document.getElementById('schemesGrid');
        const schemeSearchInput = document.getElementById('schemeSearchInput');
        const stateFilter = document.getElementById('stateFilter');
        const categoryFilter = document.getElementById('schemeCategoryFilter');
        const noSchemesMessage = document.getElementById('noSchemesMessage');
        const modal = document.getElementById('schemeModal');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const modalBody = document.getElementById('modalBody');
        const savedSchemesSection = document.getElementById('savedSchemesSection');
        const savedSchemesGrid = document.getElementById('savedSchemesGrid');
        const clearSavedBtn = document.getElementById('clearSavedBtn');

        const userData = localStorage.getItem('agriUser');
        if (userData) {
            currentUser = JSON.parse(userData);
        }

        async function initializeSchemes() {
            try {
                // 1. Fetch all schemes from the server (DB call: /api/schemes)
                const response = await fetch('/api/schemes');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                allSchemes = await response.json();

                // 2. If logged in, fetch the IDs of saved schemes (DB call: /api/my-schemes/ids/:userId)
                if (currentUser) {
                    const savedResponse = await fetch(`/api/my-schemes/ids/${currentUser.id}`);
                    const savedIdsArray = await savedResponse.json();
                    savedSchemeIds = new Set(savedIdsArray.map(item => item.scheme_id));
                }
                
                // 3. Set up the UI
                populateCategoryFilter();
                updateSchemesView(); 
                renderSavedSchemes(); 

            } catch (error) {
                console.error('Error initializing schemes:', error);
                // --- FIX: Ensure the error message is highly visible ---
                noSchemesMessage.textContent = `CRITICAL ERROR: Could not load schemes. Please ensure the Node.js server is running and the database is connected. Details: ${error.message}`;
                noSchemesMessage.style.display = 'block';
                // --- If data fetch fails, render an empty view to keep filters visible ---
                populateCategoryFilter(); // Still populate if possible
                renderSchemes([], schemesGrid);
            }
        }
       function renderSchemes(schemes, gridElement, isSavedSection = false) {
            gridElement.innerHTML = '';
            // Only control the main "No Results" message if rendering the main grid
            if (!isSavedSection) {
                noSchemesMessage.style.display = schemes.length === 0 ? 'block' : 'none';
            }
            
            schemes.forEach(scheme => {
                const isSaved = savedSchemeIds.has(scheme.id);
                const card = document.createElement('div');
                card.className = 'scheme-card';
                card.dataset.schemeId = scheme.id; // <-- Use ID from database
                card.innerHTML = `
                    <button class="btn-save ${isSaved ? 'saved' : ''}" title="Save for Later" ${!currentUser ? 'disabled' : ''}>★</button>
                    <div class="scheme-card-header">
                        <h3 class="scheme-name">${scheme.name}</h3>
                        </div>
                    <p class="scheme-description">${scheme.description}</p>
                    <div class="scheme-card-footer">
                        <button class="btn-details">View Details</button>
                        <a href="${scheme.link}" target="_blank" rel="noopener noreferrer" class="btn-apply">Apply Now</a>
                    </div>`;
                gridElement.appendChild(card);
            });
        }

        function updateSchemesView() {
            let filtered = [...allSchemes];
            const term = schemeSearchInput.value.toLowerCase();
            const state = stateFilter.value;
            const category = categoryFilter.value;
            
            if (term) filtered = filtered.filter(s => s.name.toLowerCase().includes(term));
            if (state !== 'all') filtered = filtered.filter(s => s.state === state); 
            if (category !== 'all' && category !== 'default') filtered = filtered.filter(s => s.category === category);
            
            renderSchemes(filtered, schemesGrid);
        }

        function renderSavedSchemes() {
            if (!currentUser) {
                savedSchemesSection.style.display = 'none';
                return;
            }

            const savedData = allSchemes.filter(s => savedSchemeIds.has(s.id));
            if (savedData.length > 0) {
                savedSchemesSection.style.display = 'block';
                renderSchemes(savedData, savedSchemesGrid, true);
            } else {
                savedSchemesSection.style.display = 'none';
            }
        }

        async function toggleSaveScheme(schemeId) {
            if (!currentUser) return; 

            const isSaved = savedSchemeIds.has(schemeId);
            const endpoint = isSaved ? '/api/unsave-scheme' : '/api/save-scheme'; 
            
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser.id, schemeId: schemeId })
                });
                
                const data = await response.json();
                if (data.success) {
                    if (isSaved) {
                        savedSchemeIds.delete(schemeId);
                    } else {
                        savedSchemeIds.add(schemeId);
                    }
                    updateSchemesView();
                    renderSavedSchemes();
                } else {
                    console.error('Could not save scheme:', data.message);
                }
            } catch (err) {
                console.error('Error toggling save:', err);
            }
        }

        function populateCategoryFilter() {
            const categories = [...new Set(allSchemes.map(s => s.category))];
            if (!categoryFilter) return;
            // Ensure 'All Categories' is the first option
            categoryFilter.innerHTML = '<option value="default">All Categories</option>';
            categories.forEach(cat => {
                if (!cat) return; 
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                categoryFilter.appendChild(option);
            });
        }
        
        function handleGridClick(e) {
            const card = e.target.closest('.scheme-card');
            if (!card) return;
            
            const schemeId = parseInt(card.dataset.schemeId);
            
            if (e.target.classList.contains('btn-details')) {
                e.preventDefault(); 
                window.location.href = `scheme-viewer.html?id=${schemeId}`;
            }
            
            if (e.target.classList.contains('btn-save')) {
                toggleSaveScheme(schemeId);
            }
        }
        
        if (schemeSearchInput) schemeSearchInput.addEventListener('input', updateSchemesView);
        if (stateFilter) stateFilter.addEventListener('change', updateSchemesView);
        if (categoryFilter) categoryFilter.addEventListener('change', updateSchemesView);
        
        if (schemesGrid) schemesGrid.addEventListener('click', handleGridClick);
        if (savedSchemesGrid) savedSchemesGrid.addEventListener('click', handleGridClick);

        if (clearSavedBtn) clearSavedBtn.addEventListener('click', () => {
            if (currentUser && confirm("Are you sure you want to clear ALL your saved schemes?")) {
                savedSchemeIds.clear();
                updateSchemesView();
                renderSavedSchemes();
                // If you implement a server endpoint for bulk clear, call it here.
            }
        });

        // Event listeners for the scheme modal structure, even though details redirects
        if (closeModalBtn) closeModalBtn.addEventListener('click', () => { modal.classList.remove('active'); });
        if (modal) modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });



        

        initializeSchemes();
    }
// ======== END OF MODULE 3 ========

    // ======== MODULE FOR INTERACTIVE FAQ ========
    if (document.querySelector('.faq-section')) {
        const faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                faqItems.forEach(i => i.classList.remove('active'));
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        });
    }
    
    // --- GLOBAL: Smooth scroll for nav links ---
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            // Only prevent default for internal section links (starting with #)
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
            // For 'login.html' and 'signup.html', let the default action happen
        });
    });
});






//login signup with dashboard 

// ======== MODULE 4: USER AUTH / PROFILE HANDLER ========
// ======== MODULE 4: USER AUTH / PROFILE HANDLER / SETTINGS (FIXED) ========
// ======== MODULE 4: USER AUTH / PROFILE HANDLER ========
(function() {
    const user = JSON.parse(localStorage.getItem('agriUser'));
    const headerContainer = document.querySelector('header .container');
    
    if (!headerContainer) return; // Safety check

    // --- 1. DARK MODE LOGIC ---
    function initializeTheme() {
        const storedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (storedTheme === 'dark' || (!storedTheme && prefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }
    initializeTheme(); 

    window.toggleAgriTheme = function() {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        const iconBtn = document.getElementById('themeIcon');
        if(iconBtn) iconBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    };

    // --- Cleanup ---
    const removeOldAuthElements = () => {
        const existingAuthSlot = headerContainer.querySelector('.auth-slot');
        if (existingAuthSlot) existingAuthSlot.remove();
        const oldTrans = document.getElementById('google_translate_element');
        if (oldTrans) oldTrans.remove();
    };
    removeOldAuthElements();
    
    const authSlot = document.createElement('div');
    authSlot.className = 'auth-slot';
    
    // --- Update Header Navigation ---
    if (user && user.email) {
        // LOGGED IN
        const userName = user.name ? user.name.split(' ')[0] : "User";
        const profilePicUrl = user.profile_picture_url || '/agri-images/default.png';
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        
        authSlot.innerHTML = `
            <div class="profile-dashboard">
                <img src="${profilePicUrl}" alt="Profile" class="profile-pic" id="headerProfilePic">
                <span class="welcome-text">Hi, ${userName}</span>
                
                <div class="settings-wrapper">
                    <button id="settingsBtn" class="btn-settings" title="Settings">
                        <i class="fas fa-cog"></i>
                    </button>
                    
                    <div id="settingsDropdown" class="hidden-navbar-menu">
                        <a href="dashboard.html" class="menu-item">
                            <i class="fas fa-user-circle"></i> My Profile
                        </a>
                        <div class="menu-row-spread">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <i class="fas fa-adjust" style="color:#9ca3af; width:20px; text-align:center;"></i> 
                                <span>Appearance</span>
                            </div>
                            <button class="theme-toggle-btn" onclick="toggleAgriTheme()" id="themeIcon">
                                ${isDark ? '☀️' : '🌙'}
                            </button>
                        </div>
                        <div class="menu-translate-container">
                            <div id="google_translate_element"></div>
                        </div>
                        <button id="logoutButton" class="menu-item logout-item">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            </div>`;
        
        headerContainer.appendChild(authSlot);

        setTimeout(() => {
            if (typeof google !== 'undefined' && google.translate) {
                new google.translate.TranslateElement({
                    pageLanguage: 'en',
                    includedLanguages: 'en,hi,mr,gu,pa,ta,te', 
                    layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
                    autoDisplay: false
                }, 'google_translate_element');
            }
        }, 800);

    } else {
        // LOGGED OUT
        authSlot.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <div id="google_translate_element_guest"></div> 
                <a href="login.html" class="login-signup-button">LOGIN</a>
            </div>`;
        headerContainer.appendChild(authSlot);
        
        setTimeout(() => {
             if (typeof google !== 'undefined' && google.translate) {
                new google.translate.TranslateElement({
                    pageLanguage: 'en', includedLanguages: 'en,hi,mr',
                    layout: google.translate.TranslateElement.InlineLayout.SIMPLE
                }, 'google_translate_element_guest');
            }
        }, 800);
    }

    // --- Global Click Listeners ---
    document.addEventListener('click', (e) => {
        const settingsBtn = e.target.closest('#settingsBtn');
        const dropdown = document.getElementById('settingsDropdown');
        const logoutBtn = e.target.closest('#logoutButton');

        if (settingsBtn && dropdown) {
            e.preventDefault();
            dropdown.classList.toggle('active');
            e.stopPropagation(); 
        } 
        else if (dropdown && dropdown.classList.contains('active') && !e.target.closest('.settings-wrapper')) {
            dropdown.classList.remove('active');
        }

        if (logoutBtn) {
            e.preventDefault();
            localStorage.removeItem('agriUser');
            localStorage.removeItem('savedAgriSchemes'); 
            window.location.href = 'agri2.html'; 
        }
    });
})();
//end of login signup page with dashboard after login 

/**
 * Toggles the expanded state of a dashboard card
 * @param {string} cardId - The ID of the card to expand/collapse
 */
window.toggleCard = function(cardId) {
    const card = document.getElementById(cardId);
    const btn = card.querySelector('.btn-view-more');
    
    if (card.classList.contains('expanded')) {
        card.classList.remove('expanded');
        btn.innerHTML = 'View More';
        // Scroll back to card top if it's long
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        card.classList.add('expanded');
        btn.innerHTML = 'View Less';
    }
};




//equipment part








// ===============================================
// ======== NEW MODULE 8: SUCCESS STORIES ========
// ===============================================

async function fetchAndRenderSuccessStories() {
    const testimonialGrid = document.querySelector('.testimonial-grid');
    if (!testimonialGrid) return; 

    const userData = localStorage.getItem('agriUser');
    const currentUser = userData ? JSON.parse(userData) : null;
    
    try {
        const response = await fetch('/api/success-stories');
        let stories = await response.json();
        
        testimonialGrid.innerHTML = ''; 

        if (stories.length === 0) {
            testimonialGrid.innerHTML = `
                <div class="testimonial-card active">
                    <p>No success stories yet. Be the first to share!</p>
                </div>`;
            return;
        }

        // 1. Create Slides
        stories.forEach((story, index) => {
            const card = document.createElement('div');
            // CRITICAL: First item must have 'active' class to be visible immediately
            card.className = `testimonial-card ${index === 0 ? 'active' : ''}`;
            
            const profilePicUrl = story.profile_picture_url || '/uploads/default.png'; 
            const isExpert = (story.years_experience || 0) >= 7;

            const dataAttributes = `
                data-name="${story.author_name || 'Anonymous'}" 
                data-email="${story.email || 'Not Listed'}" 
                data-contact="${story.contact_number || ''}" 
                data-pic="${profilePicUrl}"
                data-experience="${story.years_experience || ''}"
                data-location="${story.location || 'Not Listed'}"
                data-is-expert="${isExpert}"
            `;

            // STRUCTURE: 
            // 1. Quote Text
            // 2. Container for (Img -> Name -> Stars)
            card.innerHTML = `
                <p>"${story.story_text}"</p>
                
                <div class="testimonial-author">
                    <img src="${profilePicUrl}" alt="Profile" class="comment-profile-pic">
                    
                    <button class="story-author-link" ${dataAttributes}>
                        ${story.author_name || 'Anonymous'}
                    </button>
                    
                    </div>
            `;
            testimonialGrid.appendChild(card);
        });

        // 2. Start Auto-Slide Timer (Only if more than 1 story)
        if (stories.length > 1) {
            let currentIndex = 0;
            const slides = document.querySelectorAll('.testimonial-card');
            
            // Clear old timer prevents speeding up on reload
            if (window.storiesInterval) clearInterval(window.storiesInterval);

            window.storiesInterval = setInterval(() => {
                // Hide current
                slides[currentIndex].classList.remove('active');
                
                // Calculate next index
                currentIndex = (currentIndex + 1) % slides.length;
                
                // Show next
                slides[currentIndex].classList.add('active');
            }, 4000); // 4 Seconds
        }

        // 3. Click Handler for Profile View
        testimonialGrid.addEventListener('click', (e) => {
            const target = e.target.closest('.story-author-link');
            if (target) {
                if (!currentUser) {
                    alert('Please login to view user profile information.');
                    return;
                }
                
                const userProfile = {
                    name: target.dataset.name,
                    email: target.dataset.email,
                    contact: target.dataset.contact,
                    pic: target.dataset.pic,
                    experience: target.dataset.experience,
                    location: target.dataset.location,
                    isExpert: target.dataset.isExpert === 'true'
                };
                
                const params = new URLSearchParams(userProfile);
                window.location.href = `profile-viewer.html?${params.toString()}`;
            }
        });

    } catch (error) {
        console.error("Error fetching success stories:", error);
    }
}

// Initialize
fetchAndRenderSuccessStories();

// Ensure this function is called when the DOM is ready
fetchAndRenderSuccessStories();

//end of success stories 








//commment section begin here


// ======== MODULE 4: COMMUNITY COMMENTS (DATABASE INTEGRATION) ========
   if (document.getElementById('comments-section')) {
        const INITIAL_COMMENT_LIMIT = 2;
        let comments = []; // Now holds data fetched from the server
        let currentUser = null;
        const PAGE_IDENTIFIER = 'agri2_general_discussion'; // Constant to identify this page's comments in the DB
        const ADMIN_USER_ID = 99999; // ID for admin checks (needs to match server.js)
        
        const userData = localStorage.getItem('agriUser');
        if (userData) {
            currentUser = JSON.parse(userData);
        }
        
        const commentsList = document.getElementById('commentsList');
        const commentInputArea = document.getElementById('commentInputArea');
        const loginPrompt = document.getElementById('loginPrompt');
        const postCommentBtn = document.getElementById('postCommentBtn');
        const mainCommentTextarea = document.getElementById('mainCommentTextarea');
        const commentError = document.getElementById('commentError');

        // --- Show More Button Setup ---
        const showMoreButton = document.createElement('button');
        showMoreButton.id = 'showMoreCommentsBtn';
        showMoreButton.className = 'hero-button';
        showMoreButton.style.marginTop = '2rem';
        showMoreButton.textContent = 'Show All Comments';
        showMoreButton.style.display = 'none';
        
        // Find a suitable parent element to insert the button after commentsList
        const section = document.getElementById('comments-section');
        if (section) {
             section.appendChild(showMoreButton);
        }

        // --- Input Visibility ---
        if (currentUser) {
            if (commentInputArea) commentInputArea.style.display = 'flex';
            if (loginPrompt) loginPrompt.style.display = 'none';
        } else {
            if (commentInputArea) commentInputArea.style.display = 'none';
            if (loginPrompt) loginPrompt.style.display = 'block';
        }

        // --- DATA FETCHING ---
        async function fetchComments() {
            try {
                // This route requires server.js to return user data via JOIN
                const response = await fetch(`/api/comments/${PAGE_IDENTIFIER}`);
                const rawComments = await response.json();
                
                // Convert flat list into a nested structure (comments and replies)
                const nestedComments = [];
                const commentMap = new Map();

                rawComments.forEach(comment => {
                    comment.replies = [];
                    commentMap.set(comment.id, comment);
                    
                    if (comment.parent_id === null) {
                        nestedComments.push(comment);
                    } else {
                        const parent = commentMap.get(comment.parent_id);
                        if (parent) {
                            parent.replies.push(comment);
                        }
                    }
                });

                comments = nestedComments; 
                renderComments(INITIAL_COMMENT_LIMIT);

            } catch (error) {
                console.error("Failed to fetch comments:", error);
                if (commentsList) commentsList.innerHTML = `<p class="no-results-message" style="color: red;">Failed to load discussions. Check server connection.</p>`;
            }
        }
        
        // --- RENDER FUNCTIONS ---
        function renderComments(limit) {
            if (!commentsList) return;
            commentsList.innerHTML = '';
            
            const commentsToRender = limit ? comments.slice(0, limit) : comments;
            
            if (comments.length === 0) {
                 commentsList.innerHTML = '<p class="no-results-message">No comments yet. Be the first to start the discussion!</p>';
            }
            
            commentsToRender.forEach(comment => {
                commentsList.appendChild(createCommentElement(comment));
            });
            
            if (comments.length > INITIAL_COMMENT_LIMIT && limit !== null && showMoreButton) {
                showMoreButton.style.display = 'block';
                showMoreButton.textContent = 'Show All Comments';
            } else if (showMoreButton) {
                showMoreButton.style.display = 'none';
            }
        }
        
       function createCommentElement(comment, isReply = false) {
            const commentWrapper = document.createElement('div');
            commentWrapper.className = isReply ? 'reply-wrapper' : 'comment-wrapper';
            commentWrapper.dataset.commentId = comment.id;
            
            const isAdmin = currentUser && currentUser.id === ADMIN_USER_ID;
            const isOwnerOrAdmin = currentUser && (comment.user_id === currentUser.id || isAdmin);
            
            // NOTE: Assumes years_experience is returned from the server JOIN
            const isExpert = (parseInt(comment.years_experience) || 0) >= 7; 

            const deleteButton = isOwnerOrAdmin ? `<button class="btn-delete" data-id="${comment.id}" data-type="${isReply ? 'reply' : 'comment'}" style="color: #dc2626; margin-left: 1rem; background: none; border: none; cursor: pointer;">Delete</button>` : '';
            const replyButton = !isReply && currentUser ? `<button class="btn-reply" data-id="${comment.id}" style="margin-left: 1rem; background: none; border: none; cursor: pointer; color: var(--primary-green);">Reply</button>` : '';

            const authorName = comment.authorName || 'Guest';
            const profilePicUrl = comment.profile_picture_url || '/agri-images/default.png'; 

            const dataAttributes = `
                data-name="${authorName}" 
                data-email="${comment.email || 'Not Listed'}" 
                data-contact="${comment.contact_number || ''}" 
                data-pic="${profilePicUrl}"
                data-experience="${comment.years_experience || ''}"
                data-location="${comment.location || 'Not Listed'}"
            `;
            
            const authorDisplayHtml = `
                <button class="comment-author-link ${isExpert ? 'comment-author-expert' : ''}" 
                        ${dataAttributes}
                        style="background: none; border: none; padding: 0; cursor: pointer;">
                    <span class="comment-author-info" style="display: flex; align-items: center; gap: 0.5rem;">
                        <img src="${profilePicUrl}" alt="Profile" class="comment-profile-pic" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">
                        <strong style="color: var(--text-dark);">${authorName}</strong>
                    </span>
                    ${isExpert ? '<span class="expert-tag" style="font-size: 0.75rem; color: #ff9800;">★ Expert</span>' : ''}
                </button>`;
            
            commentWrapper.innerHTML = `
                <div class="comment-header" style="display: flex; justify-content: space-between; align-items: center;">
                    ${authorDisplayHtml}
                    <span class="comment-date" style="font-size: 0.8rem; color: var(--text-light);">${new Date(comment.timestamp).toLocaleDateString()}</span>
                </div>
                <p class="comment-text" style="margin: 0.5rem 0 0.8rem 0; padding-left: 35px;">${comment.text}</p>
                <div class="comment-actions" style="display: flex; justify-content: flex-end;">
                    ${replyButton}
                    ${deleteButton}
                </div>
                <div class="replies-list" style="padding-left: 1.5rem; margin-top: 1rem;">
                    ${comment.replies ? comment.replies.map(reply => createCommentElement(reply, true).outerHTML).join('') : ''}
                </div>
            `;
            return commentWrapper;
        }

        // --- EVENT HANDLERS ---
        
        commentsList.addEventListener('click', async (e) => {
            const target = e.target;
            const profileButton = target.closest('.comment-author-link'); 

            if (profileButton) {
                if (!currentUser) {
                     console.log('Please login to view user profile information.');
                     return;
                }
                
                const userProfile = {
                    name: profileButton.dataset.name,
                    email: profileButton.dataset.email,
                    contact: profileButton.dataset.contact,
                    pic: profileButton.dataset.pic,
                    experience: profileButton.dataset.experience,
                    location: profileButton.dataset.location,
                    isExpert: profileButton.classList.contains('comment-author-expert') 
                };

                const params = new URLSearchParams(userProfile);
                window.location.href = `profile-viewer.html?${params.toString()}`;
                return; 
            }
            
            // 2. DELETE LOGIC
            if (target.classList.contains('btn-delete')) {
                const commentId = parseInt(target.dataset.id);
                const type = target.dataset.type;
                
                if (!currentUser) return;

                if (confirm(`Are you sure you want to delete this ${type}?`)) {
                    try {
                        // NOTE: You must implement this server route: /api/comments/:commentId/:userId (DELETE)
                        const response = await fetch(`/api/comments/${commentId}/${currentUser.id}`, {
                            method: 'DELETE'
                        });
                        const data = await response.json();
                        
                        if (data.success) {
                            fetchComments(); 
                        } else {
                            console.error('Deletion failed: ' + data.message);
                        }
                    } catch (error) {
                         console.error('Connection error: Failed to delete comment.');
                    }
                }
            }
            
            // 3. REPLY INPUT TOGGLE
            if (target.classList.contains('btn-reply')) {
                const commentWrapper = target.closest('.comment-wrapper');
                
                const allExistingReplyAreas = document.querySelectorAll('.reply-input-area');
                const currentCommentHasForm = commentWrapper.querySelector('.reply-input-area');

                allExistingReplyAreas.forEach(area => {
                    area.remove();
                });
                
                if (!currentCommentHasForm) {
                    const replyFormHtml = `
                        <div class="reply-input-area" data-parent-id="${commentWrapper.dataset.commentId}" style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color);">
                            <textarea class="reply-textarea" placeholder="Write your reply..." rows="2" required style="padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;"></textarea>
                            <button class="post-reply-btn hero-button" style="padding: 0.5rem 1rem; font-size: 0.9rem; align-self: flex-end;">Reply</button>
                        </div>
                    `;
                    commentWrapper.insertAdjacentHTML('beforeend', replyFormHtml);
                }
            }
            
            // 4. POST REPLY LOGIC
          if (target.classList.contains('post-reply-btn')) {
                const replyInputArea = target.closest('.reply-input-area');
                const parentId = parseInt(replyInputArea.dataset.parentId);
                
                const replyTextarea = replyInputArea ? replyInputArea.querySelector('.reply-textarea') : null;
                const text = replyTextarea ? replyTextarea.value.trim() : '';
                
                if (text) {
                    const newReply = {
                        userId: currentUser.id,
                        parentId: parentId,
                        pageIdentifier: PAGE_IDENTIFIER,
                        text: text
                    };

                    try {
                        // NOTE: You must implement this server route: /api/comments (POST)
                        const response = await fetch('/api/comments', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(newReply)
                        });
                        const data = await response.json();
                        
                        if (data.success) {
                            fetchComments(); 
                            replyInputArea.remove();
                        } else {
                            console.error('Failed to post reply: ' + data.message);
                        }
                    } catch (error) {
                        console.error('Connection error: Failed to post reply.');
                    }
                } else {
                    if (replyTextarea) {
                        replyTextarea.style.border = '2px solid #dc2626';
                        setTimeout(() => {
                             replyTextarea.style.border = '1px solid var(--border-color)'; 
                        }, 1500);
                    }
                }
            }
        });

        // --- POST MAIN COMMENT LOGIC ---
        if (postCommentBtn) postCommentBtn.addEventListener('click', async () => {
            if (!mainCommentTextarea) return;
            const text = mainCommentTextarea.value.trim();
            
            if (!currentUser) {
                console.log('Please login to post a comment.');
                return;
            }

            if (text) {
                if(commentError) commentError.style.display = 'none';
                
                const newComment = {
                    userId: currentUser.id,
                    parentId: null, // Top-level comment
                    pageIdentifier: PAGE_IDENTIFIER,
                    text: text
                };

                try {
                    const response = await fetch('/api/comments', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newComment)
                    });
                    const data = await response.json();
                    
                    if (data.success) {
                        mainCommentTextarea.value = ''; // Clear the input
                        fetchComments(); // Re-fetch and render the updated list
                    } else {
                        console.error('Failed to post comment: ' + data.message);
                    }
                } catch (error) {
                    console.error('Connection error:', error);
                }
            } else {
                if (commentError) {
                    commentError.textContent = 'Comment cannot be empty.';
                    commentError.style.display = 'block';
                }
            }
        });

        if (showMoreButton) showMoreButton.addEventListener('click', () => {
            if (showMoreButton.textContent === 'Show All Comments') {
                renderComments(null); // Pass null to render ALL comments
                showMoreButton.textContent = 'Show Fewer Comments';
            } else {
                renderComments(INITIAL_COMMENT_LIMIT); // Restore limited view
                showMoreButton.textContent = 'Show All Comments';
            }
        });
        

        // Initial load: Fetch all comments from the DB
        fetchComments();
    }
// ======== END OF MODULE 4 ========
// end of comment 









// review part


// ======== MODULE 7: USER REVIEWS & RATINGS (DATABASE INTEGRATION) ========
if (document.getElementById('reviews')) {
    const ADMIN_USER_ID = 99999;
    const INITIAL_REVIEW_LIMIT = 2; // Only show the first 2 reviews initially
    
    const reviewInputArea = document.getElementById('reviewInputArea');
    const reviewLoginPrompt = document.getElementById('reviewLoginPrompt');
    const reviewForm = document.getElementById('reviewForm');
    const reviewTextarea = document.getElementById('reviewTextarea');
    const reviewMessageEl = document.getElementById('reviewMessage');
    const reviewsList = document.getElementById('reviewsList');

    let currentUser = null;
    let reviews = []; // Holds all reviews fetched from the server
    let currentReviewLimit = INITIAL_REVIEW_LIMIT; // Tracks how many are currently visible

    const userData = localStorage.getItem('agriUser');
    if (userData) {
        currentUser = JSON.parse(userData);
        if (reviewInputArea) reviewInputArea.style.display = 'block';
        
        const loginPromptEl = document.getElementById('reviewLoginPrompt');
        if (loginPromptEl) loginPromptEl.style.display = 'none';

    } else {
        if (reviewInputArea) reviewInputArea.style.display = 'none';
        const loginPromptEl = document.getElementById('reviewLoginPrompt');
        if (loginPromptEl) loginPromptEl.style.display = 'block';
    }
    
    // --- Show More Button Setup ---
    const showMoreButton = document.createElement('button');
    showMoreButton.id = 'showMoreReviewsBtn';
    showMoreButton.className = 'hero-button';
    showMoreButton.style.marginTop = '2rem';
    showMoreButton.style.display = 'none'; // Hidden by default
    showMoreButton.textContent = 'Show All Reviews';

    // Insert the button just after the reviews list (assuming it is on the page)
    if (reviewsList) {
        reviewsList.parentNode.insertBefore(showMoreButton, reviewsList.nextSibling);
    }
    
    // --- DATA FETCHING ---
    async function fetchReviews() {
        try {
            // NOTE: This route requires server.js to fetch user profile data via JOIN
            const response = await fetch('/api/reviews');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            reviews = await response.json();
            renderReviews(); 

        } catch (error) {
            console.error("M7: Failed to fetch reviews:", error);
            if (reviewsList) reviewsList.innerHTML = `<p class="no-results-message" style="color: red;">Failed to load reviews. Check server connection.</p>`;
        }
    }
    
    // --- RENDER FUNCTION ---
    function renderReviews() {
        if (!reviewsList) return;
        reviewsList.innerHTML = '';
        
        const getStars = (rating) => '★'.repeat(rating) + '☆'.repeat(5 - rating);
        const isAdmin = currentUser && currentUser.id === ADMIN_USER_ID; 

        if (reviews.length === 0) {
             reviewsList.innerHTML = '<p class="no-results-message">No user reviews yet. Be the first to submit one!</p>';
             if (showMoreButton) showMoreButton.style.display = 'none';
             return;
        }

        // Determine the limit based on 'currentReviewLimit'
        const limit = currentReviewLimit === null ? reviews.length : currentReviewLimit;
        const reviewsToRender = reviews.slice(0, limit);

        reviewsToRender.forEach(review => {
            const card = document.createElement('div');
            card.className = 'review-card';
            card.dataset.reviewId = review.id; 
            
            const deleteButton = isAdmin 
                ? `<button class="btn-delete-review" data-id="${review.id}" 
                   style="color: #dc2626; background: none; border: none; cursor: pointer; font-size: 0.9rem; margin-left: 1rem;">Delete</button>` 
                : '';
            
            const profilePicUrl = review.profile_picture_url || '/agri-images/default.png';
            
            // Create a clickable button for the author's name and store all details in data attributes
            const authorHtml = `
                <button class="review-author-link" data-id="${review.user_id}" 
                        data-name="${review.authorName}" 
                        data-email="${review.email || 'Not Listed'}" 
                        data-contact="${review.contact_number || ''}" 
                        data-pic="${profilePicUrl}"
                        data-experience="${review.years_experience || ''}"
                        data-location="${review.location || 'Not Listed'}"
                        style="background: none; border: none; cursor: pointer; color: var(--text-dark); font-weight: 700; padding: 0; display: flex; align-items: center; gap: 0.5rem;">
                    <img src="${profilePicUrl}" alt="Profile" class="comment-profile-pic" style="width: 25px; height: 25px; border-radius: 50%; object-fit: cover;">
                    ${review.authorName}
                </button>
            `;

            card.innerHTML = `
                <div class="review-header">
                    <span class="review-rating" style="color: var(--dark-gold);">${getStars(parseInt(review.rating))}</span>
                    
                    <div style="display: flex; align-items: center; justify-content: flex-end;">
                        ${authorHtml}
                        ${deleteButton}
                    </div>
                </div>
                <p class="review-text">${review.text}</p>
            `;
            reviewsList.appendChild(card); 
        });

        // Update button visibility
        if (reviews.length > INITIAL_REVIEW_LIMIT && limit < reviews.length) {
            if (showMoreButton) {
                showMoreButton.style.display = 'block';
                showMoreButton.textContent = `Show All Reviews (${reviews.length - limit} more)`;
            }
        } else {
            if (showMoreButton) showMoreButton.style.display = 'none';
        }
    }

    // --- HANDLERS ---
    
    // Show More Handler
    if (showMoreButton) showMoreButton.addEventListener('click', () => {
        currentReviewLimit = null; // Set limit to null to render all
        renderReviews();
        if (showMoreButton.textContent !== 'Show All Reviews') {
            showMoreButton.textContent = 'Show Fewer Reviews';
        }
    });

    // SUBMIT HANDLER 
    if (reviewForm) reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        
        const rating = document.getElementById('rating') ? document.getElementById('rating').value : 5;
        const text = reviewTextarea ? reviewTextarea.value.trim() : '';
        
        if (!text) {
            if (reviewMessageEl) {
                reviewMessageEl.textContent = 'Please write your review.';
                reviewMessageEl.style.display = 'block';
            }
            return;
        }
        
        if (reviewMessageEl) reviewMessageEl.textContent = 'Submitting review...';
        
        const newReview = {
            userId: currentUser.id,
            rating: parseInt(rating),
            text: text
        };
        
        try {
            // NOTE: Must implement server route: /api/reviews (POST)
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newReview)
            });
            const data = await response.json();

            if (data.success) {
                reviewForm.reset();
                if (reviewMessageEl) {
                    reviewMessageEl.style.color = 'var(--dark-green)';
                    reviewMessageEl.textContent = 'Thank you for your review! It will appear shortly.';
                }
                
                currentReviewLimit = INITIAL_REVIEW_LIMIT; 
                fetchReviews(); 
            } else {
                if (reviewMessageEl) {
                    reviewMessageEl.style.color = 'red';
                    reviewMessageEl.textContent = 'Failed to submit review: ' + data.message;
                }
            }
        } catch (error) {
            if (reviewMessageEl) {
                reviewMessageEl.style.color = 'red';
                reviewMessageEl.textContent = 'Connection error: Failed to post review.';
            }
        }

        setTimeout(() => {
             if (reviewMessageEl) reviewMessageEl.style.display = 'none';
        }, 3000);
    });
    
    // DELETION HANDLER
    if (reviewsList) reviewsList.addEventListener('click', async (e) => {
        const target = e.target;

        if (target.classList.contains('btn-delete-review')) {
            const reviewId = parseInt(target.dataset.id);
            
            if (!currentUser || currentUser.id !== ADMIN_USER_ID) return;

            if (confirm("Are you sure you want to delete this review?")) {
                try {
                    // NOTE: Must implement server route: /api/reviews/:reviewId/:userId (DELETE)
                    const response = await fetch(`/api/reviews/${reviewId}/${currentUser.id}`, {
                        method: 'DELETE'
                    });
                    const data = await response.json();
                    
                    if (data.success) {
                        fetchReviews(); 
                    } else {
                        console.error('Deletion failed: ' + data.message);
                    }
                } catch (error) {
                     console.error('Connection error: Failed to delete review.');
                }
            }
        }
    });
    
    // PROFILE PAGE REDIRECT HANDLER
    if (reviewsList) reviewsList.addEventListener('click', (e) => {
         const target = e.target.closest('.review-author-link');
         if (target) {
             if (!currentUser) {
                 console.log('Please login to view user profile information.');
                 return;
             }
             
             const userProfile = {
                 name: target.dataset.name,
                 email: target.dataset.email,
                 contact: target.dataset.contact,
                 pic: target.dataset.pic,
                 experience: target.dataset.experience,
                 location: target.dataset.location,
                 isExpert: target.dataset.experience >= 7 
             };
             
             const params = new URLSearchParams(userProfile);
             window.location.href = `profile-viewer.html?${params.toString()}`;
         }
    });
    
    // Initial load
    fetchReviews();

}

    

// ======== END OF MODULE 7 ========


//end of review






const listEquipmentBtn = document.getElementById('listEquipmentBtn');
if (listEquipmentBtn) {
    listEquipmentBtn.style.display = 'inline-block';
    listEquipmentBtn.textContent = 'LIST YOUR EQUIPMENT FOR SALE'; // Ensure correct text
}


// article



// --- ADD THIS TO agri.js ---
async function loadArticlesToMainPage() {
    // This targets the container in agri2.html
    const articleGrid = document.querySelector('#articles .grid-container');
    if (!articleGrid) return;

    try {
        const res = await fetch('http://localhost:3000/api/articles');
        const articles = await res.json();
        
        if (articles.length === 0) {
            articleGrid.innerHTML = '<p style="text-align:center; width:100%;">No articles published yet.</p>';
            return;
        }

        // Generate dynamic cards
       articleGrid.innerHTML = articles.map(a => `
    <div class="card">
        <img src="${a.image_url || 'https://via.placeholder.com/300x150?text=AgriConnect'}" 
             style="width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:10px;">
        
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3>${a.title}</h3>
            <button class="btn-listen" onclick="speakText('${a.content.substring(0, 200)}')">
                <i class="fas fa-volume-up"></i>
            </button>
        </div>
        <p>${a.content.substring(0, 100)}...</p>
        <a href="article.html?id=${a.id}" class="article-link">Read More &rarr;</a>
    </div>
`).join('');
    } catch (err) {
        console.error("Fetch Error:", err);
        articleGrid.innerHTML = '<p style="color:red;">Failed to load articles. Ensure server is running.</p>';
    }
}

// Call the function when the page loads
document.addEventListener('DOMContentLoaded', loadArticlesToMainPage);


//weather part begin here
// ======== MODULE 0: CIRCULAR WEATHER WIDGET ========
if (document.getElementById('weather-dashboard')) {

    const API_KEY = '831278baa7f0423d67c09c1715434eb2'; 

    // 1. Date
    const dateElem = document.getElementById('currentDate');
    if (dateElem) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElem.innerText = new Date().toLocaleDateString('en-IN', options);
    }

    // 2. Fetch
    async function fetchWeather(lat, lon) {
        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Weather data not found');
            const data = await response.json();
            renderWeather(data);
        } catch (error) {
            console.error("Error:", error);
        }
    }

    // 3. Render
    function renderWeather(data) {
        // Update Circle Badge
        document.getElementById('currentTemp').innerText = Math.round(data.main.temp);
        
        // Update Modal Header
        const locName = `${data.name}, ${data.sys.country}`;
        document.getElementById('locationName').innerText = locName; // Hidden span
        if(document.getElementById('modalLocationName')) {
            document.getElementById('modalLocationName').innerText = locName;
        }

        // Update Modal Grid
        document.getElementById('humidityVal').innerText = data.main.humidity + "%";
        document.getElementById('windVal').innerText = Math.round(data.wind.speed * 3.6) + " km/h";
        document.getElementById('rainVal').innerText = data.clouds.all + "%"; 
        document.getElementById('cloudVal').innerText = data.clouds.all + "%"; 
        
        // Icon Logic
        const iconElem = document.getElementById('weatherIcon');
        const iconCode = data.weather[0].icon;
        let faIcon = 'fa-cloud-sun';
        
        if (iconCode.includes('01')) faIcon = 'fa-sun';
        else if (iconCode.includes('02')) faIcon = 'fa-cloud-sun';
        else if (iconCode.includes('03') || iconCode.includes('04')) faIcon = 'fa-cloud';
        else if (iconCode.includes('09') || iconCode.includes('10')) faIcon = 'fa-cloud-showers-heavy';
        else if (iconCode.includes('11')) faIcon = 'fa-bolt';
        
        iconElem.className = `fas ${faIcon}`;

        // Dynamic Background (Apply to Circle & Modal)
        const circleBadge = document.querySelector('.weather-circle-badge');
        const modalContent = document.querySelector('.weather-modal-content');
        
        let bgGradient = 'linear-gradient(135deg, #134E5E 0%, #71B280 100%)'; 
        
        if (iconCode.includes('n')) {
            bgGradient = 'linear-gradient(135deg, #2c3e50, #4ca1af)';
        } else if (data.weather[0].main === 'Rain') {
            bgGradient = 'linear-gradient(135deg, #4b6cb7, #182848)';
        } else if (data.weather[0].main === 'Clear') {
            bgGradient = 'linear-gradient(135deg, #2980b9, #6dd5fa)';
        }
        
        if(circleBadge) circleBadge.style.background = bgGradient;
        if(modalContent) modalContent.style.background = bgGradient;
    }

    // 4. Modal Triggers
    const modal = document.getElementById('weatherModal');
    const openBtn = document.getElementById('openWeatherModalBtn'); // This is now the circle
    const closeBtn = document.getElementById('closeWeatherModal');

    if (modal && openBtn && closeBtn) {
        openBtn.addEventListener('click', () => {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent bubbling issues
            modal.classList.remove('active');
            document.body.style.overflow = '';
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    // 5. Geolocation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => fetchWeather(position.coords.latitude, position.coords.longitude),
            () => fetchWeather(28.6139, 77.2090)
        );
    } else {
        fetchWeather(28.6139, 77.2090);
    }
}

//end of weather 














 //===============================================
 //======== MODULE 9: SMART VOICE ASSISTANT (Flexible) ============
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    const voiceBtn = document.getElementById('voice-assistant-btn');
    const synthesis = window.speechSynthesis;
    let recognition = null;
    let availableVoices = [];

    // --- 1. DEFINE COMMAND KEYWORDS (Add new words here!) ---
    const COMMAND_LISTS = {
        // Farmers
        FARMERS: [
            'farmer', 'farmers', 'kisan', 'kisaan', 'shetkari', 'directory', 
            'किसान', 'शेतकरी', 'krishi', 'kheti'
        ],
        // Equipment
        EQUIPMENT: [
            'equipment', 'machine', 'machinery', 'tool', 'tools', 'aujar', 'yantra', 
            'upkaran', 'market', 'marketplace', 'buy', 'sell', 'tractor', 
            'उपकरण', 'यंत्र', 'औजार', 'मशीन'
        ],
        // Schemes
        SCHEMES: [
            'scheme', 'schemes', 'yojana', 'gov', 'government', 'sarkar', 'sarkari', 
            'policy', 'policies', 'benefits', 'subsidy', 
            'योजना', 'सरकारी', 'सरकार'
        ],
        // Articles
        ARTICLES: [
            'article', 'articles', 'news', 'blog', 'read', 'resource', 'info', 
            'information', 'lekh', 'samachar', 'jankari', 'padhai', 
            'लेख', 'समाचार', 'जानकारी'
        ],
        // Contact
        CONTACT: [
            'contact', 'support', 'help', 'call', 'phone', 'number', 'address', 
            'sampark', 'madat', 'sahayata', 
            'संपर्क', 'सहायता'
        ],
        // Weather
        WEATHER: [
            'weather', 'forecast', 'rain', 'temperature', 'climate', 'mausam', 
            'tapman', 'barish', 
            'मौसम', 'तापमान', 'बारिश'
        ],
        // Home
        HOME: [
            'home', 'main', 'start', 'top', 'website', 'ghar', 'mukhya', 'wapas', 
            'घर', 'मुख्य', 'वापस'
        ],
        // Mandi / Market
        MANDI: [
            'mandi', 'market', 'rate', 'prices', 'mandi rate', 'mandi price', 'बाजार', 'मंडी'
        ],
        // Read Page
        READ_PAGE: [
            'read page', 'read this', 'speak page', 'padho', 'sunao', 'bol', 
            'पढ़ो', 'सुनाओ', 'बोलिए', 'vacha'
        ],
        // Stop
        STOP: [
            'stop', 'quiet', 'silence', 'shut up', 'ruko', 'bas', 'chup', 'thamba', 
            'रुको', 'चुप', 'बस'
        ]
    };

    // --- 2. LOAD VOICES ---
    function loadVoices() {
        availableVoices = synthesis.getVoices();
        console.log(`System loaded ${availableVoices.length} voices.`);
    }
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
    loadVoices(); 

    // --- 3. HELPER: CHECK IF COMMAND MATCHES INTENT ---
    function matchesIntent(transcript, keywordArray) {
        // Returns true if ANY keyword in the array is found in the spoken text
        return keywordArray.some(keyword => transcript.includes(keyword.toLowerCase()));
    }

    // --- 4. LANGUAGE DETECTION ---
    function getCurrentLanguage() {
        let htmlLang = document.documentElement.lang; 
        const dropdown = document.querySelector('.goog-te-combo');
        let dropdownLang = dropdown ? dropdown.value : null;

        let detectedLang = 'en';
        if (htmlLang && htmlLang !== 'en' && htmlLang.length === 2) {
            detectedLang = htmlLang;
        } else if (dropdownLang) {
            detectedLang = dropdownLang;
        }

        const langMap = {
            'en': 'en-US', 'hi': 'hi-IN', 'mr': 'mr-IN', 
            'gu': 'gu-IN', 'pa': 'pa-IN', 'ta': 'ta-IN', 
            'te': 'te-IN', 'bn': 'bn-IN', 'kn': 'kn-IN'
        };

        return langMap[detectedLang] || 'en-US';
    }

    // --- 5. SPEECH RECOGNITION SETUP ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        let isVoiceRecognitionActive = false;

        recognition.onstart = () => {
            isVoiceRecognitionActive = true;
            if (voiceBtn) voiceBtn.classList.add('listening');
            const lang = getCurrentLanguage();
            recognition.lang = lang;
            console.log("Microphone listening in:", lang);
            speak("Listening now. Please speak your command.");
        };

        recognition.onend = () => {
            isVoiceRecognitionActive = false;
            if (voiceBtn) voiceBtn.classList.remove('listening');
            console.log("Recognition ended.");
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            console.log("Voice Heard:", transcript);
            handleCommand(transcript);
        };

        recognition.onnomatch = () => {
            speak("I didn't catch that. Please try speaking clearly.");
        };

        recognition.onerror = (event) => {
            console.error("Speech Error:", event.error);
            if (voiceBtn) voiceBtn.classList.remove('listening');
            isVoiceRecognitionActive = false;

            if (event.error === 'no-speech') {
                speak("I did not hear any speech. Please try again.");
                setTimeout(() => {
                    if (!isVoiceRecognitionActive) {
                        recognition.start();
                    }
                }, 700);
            } else if (event.error === 'audio-capture') {
                speak("Microphone not found. Check your microphone settings.");
            } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                speak("Microphone permission is denied. Enable microphone access in browser settings.");
            } else {
                speak(`Speech recognition error: ${event.error}`);
            }
        };
    } else {
        console.warn("SpeechRecognition API not supported in this browser.");
        if (voiceBtn) {
            voiceBtn.classList.add('voice-not-supported');
            voiceBtn.title = 'Voice assistant not supported in this browser';
        }
    }

    // --- 6. TEXT-TO-SPEECH ---
    function speak(text) {
        synthesis.cancel(); 

        const currentLang = getCurrentLanguage();
        const utterance = new SpeechSynthesisUtterance(text);
        
        utterance.lang = currentLang;
        utterance.rate = 0.9;
        utterance.volume = 1;

        if (availableVoices.length > 0) {
            let targetVoice = availableVoices.find(v => v.lang === currentLang);
            if (!targetVoice) {
                targetVoice = availableVoices.find(v => v.lang.startsWith(currentLang.split('-')[0]));
            }
            if (targetVoice) utterance.voice = targetVoice;
        }

        synthesis.speak(utterance);
    }

    // --- 7. COMMAND LOGIC (Using Flexible Keyword Lists) ---
    function scrollToSection(id, label) {
        const section = document.getElementById(id);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
            speak(`Navigating to ${label}.`);
            return true;
        }
        console.warn(`Section '${id}' not found.`);
        return false;
    }

    function handleCommand(command) {
        const cmd = command.trim().toLowerCase();
        console.log("handleCommand received:", cmd);

        const navigationMapping = [
            {phrases: COMMAND_LISTS.ARTICLES, ids: ['articles'], label: 'Articles', href: 'agri2.html#articles'},
            {phrases: COMMAND_LISTS.CONTACT, ids: ['contact'], label: 'Contact', href: 'agri2.html#contact'},
            {phrases: COMMAND_LISTS.WEATHER, ids: ['weather-dashboard'], label: 'Weather', href: 'agri2.html#weather-dashboard'},
            {phrases: COMMAND_LISTS.FARMERS, ids: ['farmers', 'farmerList', 'farmer-list'], label: 'Farmer Directory', href: 'agri2.html#farmers'},
            {phrases: COMMAND_LISTS.EQUIPMENT, ids: ['equipment', 'productGrid'], label: 'Equipment Marketplace', href: 'agri2.html#equipment'},
            {phrases: COMMAND_LISTS.SCHEMES, ids: ['schemes', 'schemesGrid'], label: 'Government Schemes', href: 'agri2.html#schemes'},
            {phrases: COMMAND_LISTS.HOME, ids: ['home', 'header', 'top'], label: 'Home', href: 'agri2.html#home'}
        ];

        const allNavigationKeywords = navigationMapping.reduce((acc, item) => {
            item.phrases.forEach(p => acc.push({keyword: p.toLowerCase(), item}));
            return acc;
        }, []);


        // Explicit phrase matching for variations like "go to", "open", "show"
        const directNavPattern = /(go|open|show|take me to)\s+(.*)/i;
        const directNavMatch = cmd.match(directNavPattern);

        if (directNavMatch) {
            const target = directNavMatch[2].replace(/\.$/, '').trim();
            console.log("directNav target:", target);

            const matchedByKeyword = allNavigationKeywords.find(k => target.includes(k.keyword) || k.keyword.includes(target));
            if (matchedByKeyword) {
                const item = matchedByKeyword.item;
                for (const id of item.ids) {
                    if (scrollToSection(id, item.label)) return;
                }
                if (item.href) {
                    speak(`Redirecting to ${item.label}.`);
                    window.location.href = item.href;
                    return;
                }
            }

            for (const item of navigationMapping) {
                if (item.label.toLowerCase().includes(target) || target.includes(item.label.toLowerCase())) {
                    for (const id of item.ids) {
                        if (scrollToSection(id, item.label)) return;
                    }
                    if (item.href) {
                        speak(`Redirecting to ${item.label}.`);
                        window.location.href = item.href;
                        return;
                    }
                }
            }
        }

        if (matchesIntent(cmd, COMMAND_LISTS.MANDI)) {
            speak("Opening Mandi Market view.");
            window.location.href = 'mandi/public/index.html';
            return;
        }

        for (const item of navigationMapping) {
            if (matchesIntent(cmd, item.phrases)) {
                console.log("matches intent for", item.label);
                for (const id of item.ids) {
                    if (scrollToSection(id, item.label)) return;
                }
                if (item.href) {
                    speak(`Redirecting to ${item.label}.`);
                    window.location.href = item.href;
                    return;
                }
                speak(`${item.label} is not on this page right now.`);
                return;
            }
        }

        if (matchesIntent(cmd, COMMAND_LISTS.READ_PAGE)) {
            let text = document.body.innerText;
            if (text.includes("AgriConnect Hub")) {
                text = text.substring(text.indexOf("AgriConnect Hub") + 15);
            }
            speak(text.substring(0, 500));
            return;
        }

        if (matchesIntent(cmd, COMMAND_LISTS.STOP)) {
            synthesis.cancel();
            speak("Stopped listening.");
            return;
        }

        if (cmd.includes('not ') || cmd.includes('don\'t') || cmd.includes('do not')) {
            speak("Understood, no action taken.");
            return;
        }

        if (getCurrentLanguage() === 'hi-IN') {
            speak("माफ़ कीजिये, मैं समझ नहीं पाया।");
        } else {
            speak("I didn't understand. Please try again.");
        }
    }

    // --- 8. CLICK HANDLERS ---
    if (voiceBtn && recognition) {
        voiceBtn.addEventListener('click', () => {
            if (voiceBtn.classList.contains('listening')) {
                recognition.stop();
            } else {
                recognition.lang = getCurrentLanguage();
                recognition.start();
            }
        });
    } else if (voiceBtn) {
        voiceBtn.addEventListener('click', () => {
            speak("Voice commands are not supported in this browser, please use Chrome/Edge and enable microphone access.");
            console.warn("Voice button clicked but SpeechRecognition is unavailable.");
        });
    }

    document.body.addEventListener('click', (e) => {
        const listenBtn = e.target.closest('.btn-listen');
        if (listenBtn) {
            const card = listenBtn.closest('.card') || listenBtn.closest('.scheme-card') || listenBtn.closest('.testimonial-card');
            if (card) {
                let text = card.innerText
                    .replace(/Read More|View Details|Apply Now|Listen/gi, "")
                    .replace(/\n/g, ". ")
                    .trim();
                speak(text);
            }
        }
    });
});











// ======== MODULE 10: ULTIMATE SMART FARMING ADVISOR ========


 // ==============================================
// SMART FARM INTELLIGENCE - SINGLE VERSION
// ==============================================

(function initSmartFarm() {
    // Only run if the elements exist on the page
    const locateBtn = document.getElementById('locateBtn');
    const generateBtn = document.getElementById('generateBtn');
    
    if (!locateBtn || !generateBtn) return; // Exit if not on page with the card
    
    const API_KEY = '831278baa7f0423d67c09c1715434eb2';
    let userLocation = null;
    let weatherData = null;
    let weeklyTasks = [];

    // Weekly task templates
    const taskTemplates = [
        { week: "Week 1-2", title: "Land preparation & sowing", desc: "Ploughing, leveling, and seed treatment", icon: "🌱" },
        { week: "Week 3-4", title: "First irrigation + Nitrogen", desc: "Apply first dose of Urea fertilizer", icon: "💧" },
        { week: "Week 5-6", title: "Pest scouting & spray", desc: "Monitor for pests, apply preventive spray", icon: "🐛" },
        { week: "Week 7-8", title: "Second fertilizer dose", desc: "Apply DAP and Potash for growth", icon: "🧪" },
        { week: "Week 9-10", title: "Weed control", desc: "Remove weeds manually or with herbicide", icon: "🌿" },
        { week: "Week 11-12", title: "Monitor for harvest readiness", desc: "Check maturity signs, prepare storage", icon: "🌾" }
    ];

    function loadSavedTasks() {
        const saved = localStorage.getItem('farmer_weekly_tasks');
        if (saved) {
            const savedTasks = JSON.parse(saved);
            weeklyTasks = taskTemplates.map((task, idx) => ({
                ...task,
                completed: savedTasks[idx]?.completed || false
            }));
        } else {
            weeklyTasks = taskTemplates.map(task => ({ ...task, completed: false }));
        }
        renderWeeklyTasks();
    }

    function renderWeeklyTasks() {
        const container = document.getElementById('weeklyTasksList');
        if (!container) return;
        
        container.innerHTML = weeklyTasks.map((task, idx) => `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-idx="${idx}">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-idx="${idx}">
                <div class="task-content">
                    <div class="task-title">${task.icon} ${task.week}: ${task.title}</div>
                    <div class="task-desc">${task.desc}</div>
                </div>
            </div>
        `).join('');
        
        const completed = weeklyTasks.filter(t => t.completed).length;
        const completedSpan = document.getElementById('completedCount');
        const totalSpan = document.getElementById('totalCount');
        if (completedSpan) completedSpan.innerText = completed;
        if (totalSpan) totalSpan.innerText = weeklyTasks.length;
        
        document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                weeklyTasks[idx].completed = e.target.checked;
                localStorage.setItem('farmer_weekly_tasks', JSON.stringify(weeklyTasks));
                renderWeeklyTasks();
            });
        });
    }

    // Location & Weather
    if (locateBtn) {
        locateBtn.addEventListener('click', () => {
            const locationStatusDiv = document.getElementById('locationStatus');
            if (locationStatusDiv) locationStatusDiv.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Getting location...';
            
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        userLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                        if (locationStatusDiv) locationStatusDiv.innerHTML = `<i class="fas fa-check-circle"></i> Location: ${userLocation.lat.toFixed(2)}, ${userLocation.lon.toFixed(2)}`;
                        fetchWeatherData();
                    },
                    () => {
                        userLocation = { lat: 20.5937, lon: 78.9629 };
                        if (locationStatusDiv) locationStatusDiv.innerHTML = '<i class="fas fa-map-marker-alt"></i> Using demo location (Central India)';
                        fetchWeatherData();
                    }
                );
            } else {
                userLocation = { lat: 20.5937, lon: 78.9629 };
                if (locationStatusDiv) locationStatusDiv.innerHTML = '<i class="fas fa-map-marker-alt"></i> Demo location active';
                fetchWeatherData();
            }
        });
    }

    async function fetchWeatherData() {
        if (!userLocation) return;
        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${userLocation.lat}&lon=${userLocation.lon}&appid=${API_KEY}&units=metric`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error();
            weatherData = await resp.json();
            updateWeatherUI();
        } catch (err) {
            weatherData = { main: { temp: 28, humidity: 65 }, wind: { speed: 2.5 }, weather: [{ main: 'Clear' }] };
            updateWeatherUI();
        }
    }

    function updateWeatherUI() {
        if (!weatherData) return;
        const temp = Math.round(weatherData.main.temp);
        const humidity = weatherData.main.humidity;
        const condition = weatherData.weather[0].main;
        
        const weatherDetail = document.getElementById('weatherDetail');
        const sprayAdvice = document.getElementById('sprayAdvice');
        const forecastText = document.getElementById('forecastText');
        const soilMoist = document.getElementById('soilMoist');
        const moistureBar = document.getElementById('moistureBar');
        const irrigationNext = document.getElementById('irrigationNext');
        const riskMeter = document.getElementById('riskMeter');
        
        if (weatherDetail) weatherDetail.innerHTML = `<strong>${condition}</strong>, ${temp}°C | Humidity ${humidity}%`;
        
        if (sprayAdvice) {
            if (temp < 32 && humidity < 75) {
                sprayAdvice.innerHTML = '✅ Good time for spraying';
                sprayAdvice.className = 'badge-success';
            } else {
                sprayAdvice.innerHTML = '⚠️ Avoid spraying (heat/humidity high)';
                sprayAdvice.className = 'badge-warning';
            }
        }
        
        if (forecastText) forecastText.innerHTML = temp > 35 ? 'Heatwave alert next 2 days' : 'Normal seasonal weather';
        
        let moisture = Math.min(80, Math.max(30, humidity - 5));
        if (soilMoist) soilMoist.innerHTML = `${moisture}% - ${moisture < 45 ? 'Dry, irrigate soon' : 'Adequate'}`;
        if (moistureBar) moistureBar.style.width = `${moisture}%`;
        if (irrigationNext) irrigationNext.innerHTML = temp > 33 ? 'Today evening (heat stress)' : 'Tomorrow morning';
        
        if (riskMeter) {
            riskMeter.innerHTML = `
                <div><div class="risk-header"><span>🌡️ Heat Stress</span><span style="font-size:0.7rem;">${temp > 35 ? 'HIGH' : temp > 30 ? 'MEDIUM' : 'LOW'}</span></div><div class="risk-bar-bg"><div class="risk-bar-fill ${temp > 35 ? 'high' : temp > 30 ? 'medium' : 'low'}" style="width:${temp > 35 ? 80 : temp > 30 ? 50 : 20}%"></div></div></div>
                <div style="margin-top:8px;"><div class="risk-header"><span>🐛 Pest Risk</span><span style="font-size:0.7rem;">${humidity > 80 ? 'HIGH' : humidity > 65 ? 'MEDIUM' : 'LOW'}</span></div><div class="risk-bar-bg"><div class="risk-bar-fill ${humidity > 80 ? 'high' : humidity > 65 ? 'medium' : 'low'}" style="width:${Math.min(100, humidity)}%"></div></div></div>
            `;
        }
    }

    // Generate Dashboard
    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            const cropInput = document.getElementById('cropName');
            const sowingInput = document.getElementById('sowingDate');
            const dashboardArea = document.getElementById('dashboardArea');
            
            const crop = cropInput ? cropInput.value.trim() : 'Wheat';
            const sowDate = sowingInput ? sowingInput.value : new Date().toISOString().split('T')[0];
            
            if (!crop) { alert('Please enter crop name'); return; }
            if (!userLocation) { alert('Click Locate My Farm first'); return; }
            
            if (!weatherData) await fetchWeatherData();
            if (dashboardArea) dashboardArea.style.display = 'block';
            
            const sowing = new Date(sowDate);
            const today = new Date();
            const days = Math.max(0, Math.floor((today - sowing) / 86400000));
            const duration = 120;
            let stage = 'Planning';
            if (days < 0) stage = 'Pre-sowing';
            else if (days < duration*0.2) stage = '🌱 Germination';
            else if (days < duration*0.4) stage = '🌿 Vegetative';
            else if (days < duration*0.7) stage = '🌸 Flowering';
            else if (days < duration) stage = '🌾 Maturity';
            else stage = '✅ Ready to Harvest';
            
            const progressPercent = Math.min(100, (days / duration) * 100);
            const stageText = document.getElementById('stageText');
            const progressFill = document.getElementById('progressFill');
            const daysRemainText = document.getElementById('daysRemainText');
            const harvestText = document.getElementById('harvestText');
            
            if (stageText) stageText.innerHTML = `${stage} (Day ${Math.max(0,days)})`;
            if (progressFill) progressFill.style.width = `${progressPercent}%`;
            if (daysRemainText) daysRemainText.innerHTML = `${Math.max(0, duration-days)} days remaining`;
            
            const harvestDate = new Date(sowing);
            harvestDate.setDate(harvestDate.getDate() + duration);
            if (harvestText) harvestText.innerHTML = `📅 Expected Harvest: ${harvestDate.toDateString()}`;
            
            let emoji = '🌱', readyText = 'Early stage';
            if (progressPercent > 90) { emoji = '🎉'; readyText = 'Ready for harvest!'; }
            else if (progressPercent > 70) { emoji = '🌾'; readyText = 'Almost ready'; }
            else if (progressPercent > 40) { emoji = '🌸'; readyText = 'Growing well'; }
            
            const emojiStatus = document.getElementById('emojiStatus');
            const readyTextEl = document.getElementById('readyText');
            const harvestProgressBar = document.getElementById('harvestProgressBar');
            
            if (emojiStatus) emojiStatus.innerHTML = emoji;
            if (readyTextEl) readyTextEl.innerHTML = readyText;
            if (harvestProgressBar) harvestProgressBar.style.width = `${progressPercent}%`;
            
            const tips = ['Rotate crops for soil health', 'Scout early morning for pests', 'Maintain irrigation schedule', 'Apply fertilizer as per stage'];
            const tipText = document.getElementById('tipText');
            if (tipText) tipText.innerHTML = tips[Math.floor(Math.random() * tips.length)];
            
            updateFertilizer(crop);
            updatePestAlert(crop);
            calculateProfit();
            updateWeatherUI();
            
            if (dashboardArea) dashboardArea.scrollIntoView({ behavior: 'smooth' });
        });
    }

    function updateFertilizer(crop) {
        const area = parseFloat(document.getElementById('farmArea')?.value) || 1;
        const soil = document.getElementById('soilSelect')?.value || 'loamy';
        let urea = 50, dap = 40, potash = 25;
        if (crop.toLowerCase().includes('rice')) { urea = 80; dap = 50; potash = 30; }
        else if (crop.toLowerCase().includes('tomato')) { urea = 40; dap = 60; potash = 50; }
        else if (crop.toLowerCase().includes('cotton')) { urea = 70; dap = 45; potash = 35; }
        if (soil === 'sandy') { urea += 15; dap += 10; }
        else if (soil === 'clay') { urea -= 10; }
        
        const fertResult = document.getElementById('fertResult');
        if (fertResult) fertResult.innerHTML = `🌾 Urea: ${Math.round(urea*area)} kg | 💎 DAP: ${Math.round(dap*area)} kg | 🧂 Potash: ${Math.round(potash*area)} kg<br><small>Apply in split doses</small>`;
    }

    function updatePestAlert(crop) {
        const month = new Date().getMonth();
        const isRainy = (month >= 5 && month <= 9);
        const pestList = document.getElementById('pestList');
        if (pestList) {
            pestList.innerHTML = `
                <div class="task-item"><span>🐛 Armyworm</span><span class="${isRainy ? 'badge-danger' : 'badge-warning'}">${isRainy ? 'High Risk' : 'Moderate'}</span></div>
                <div class="task-item"><span>🍄 Powdery Mildew</span><span class="badge-success">Low Risk</span></div>
                <div class="task-item"><span>🦟 Aphids</span><span class="${crop.toLowerCase().includes('wheat') ? 'badge-danger' : 'badge-warning'}">${crop.toLowerCase().includes('wheat') ? 'High Alert' : 'Moderate'}</span></div>
            `;
        }
        const nextSpray = document.getElementById('nextSpray');
        if (nextSpray) nextSpray.innerHTML = isRainy ? 'Within 2 days' : 'Next week';
    }

    function calculateProfit() {
        const area = parseFloat(document.getElementById('profitArea')?.value) || 1;
        const yieldPerAcre = parseFloat(document.getElementById('profitYield')?.value) || 25;
        const costPerAcre = parseFloat(document.getElementById('profitCost')?.value) || 25000;
        const price = parseFloat(document.getElementById('profitPrice')?.value) || 2800;
        const totalYield = yieldPerAcre * area;
        const revenue = totalYield * price;
        const totalCost = costPerAcre * area;
        const profit = revenue - totalCost;
        
        const revenueSpan = document.getElementById('revenueSpan');
        const costSpan = document.getElementById('costSpan');
        const profitSpan = document.getElementById('profitSpan');
        
        if (revenueSpan) revenueSpan.innerHTML = revenue.toLocaleString('en-IN');
        if (costSpan) costSpan.innerHTML = totalCost.toLocaleString('en-IN');
        if (profitSpan) profitSpan.innerHTML = profit.toLocaleString('en-IN');
    }

    // Event listeners
    document.getElementById('calcProfitBtn')?.addEventListener('click', calculateProfit);
    document.getElementById('saveTasksBtn')?.addEventListener('click', () => {
        localStorage.setItem('farmer_weekly_tasks', JSON.stringify(weeklyTasks));
        alert('✅ Weekly tasks progress saved!');
    });
    document.getElementById('resetTasksBtn')?.addEventListener('click', () => {
        if (confirm('Reset all weekly tasks progress?')) {
            weeklyTasks = taskTemplates.map(task => ({ ...task, completed: false }));
            localStorage.setItem('farmer_weekly_tasks', JSON.stringify(weeklyTasks));
            renderWeeklyTasks();
            alert('All tasks reset to incomplete');
        }
    });
    document.getElementById('saveDashboardBtn')?.addEventListener('click', () => {
        alert('✅ Farm plan saved! You can access your data later.');
    });
    
    // Initialize
    loadSavedTasks();
    calculateProfit();
})();



// ======== MODULE 11: AI CROP DOCTOR ============

// ============================================================
//  AI CROP DOCTOR - FULLY FUNCTIONAL (INTEGRATED IN MAIN PAGE)
// ============================================================
        (function() {
            // DOM elements
            const uploadInput = document.getElementById('leafUpload');
            const previewImg = document.getElementById('leafPreview');
            const uploadIcon = document.getElementById('uploadIcon');
            const uploadText = document.getElementById('uploadText');
            const scanOverlay = document.getElementById('scanOverlay');
            const resultCard = document.getElementById('diagnosisResult');
            const doctorCard = document.querySelector('.doctor-card');

            // Diagnosis fields
            const diseaseNameEl = document.getElementById('diseaseName');
            const confidenceSpan = document.getElementById('confidenceScore');
            const symptomsList = document.getElementById('symptomsList');
            const cureTextP = document.getElementById('cureText');

            // ---------- Enhanced AI Disease Database ----------
            const diseaseLibrary = [
                {
                    name: "🌾 Leaf Rust (Puccinia triticina)",
                    color: "#b91c1c",
                    symptoms: ["Orange-brown powdery pustules on leaves", "Yellowing halo around lesions", "Premature leaf drop", "Reduced grain filling"],
                    cure: "🌿 Apply Azoxystrobin or Tebuconazole fungicide. Remove crop debris. Use resistant varieties next season.",
                    match: "97% Match"
                },
                {
                    name: "🍅 Bacterial Leaf Spot (Xanthomonas)",
                    color: "#d97706",
                    symptoms: ["Dark, water-soaked spots with yellow halos", "Lesions turn brown and crack", "Leaf defoliation in severe cases", "Spreads via splashing water"],
                    cure: "💊 Copper-based bactericide + Mancozeb. Avoid overhead irrigation. Rotate crops for 2 years.",
                    match: "94% Match"
                },
                {
                    name: "🥔 Early Blight (Alternaria solani)",
                    color: "#b45309",
                    symptoms: ["Concentric rings (bullseye pattern)", "Yellow chlorosis surrounding spots", "Lower leaves affected first", "Lesions may coalesce causing blight"],
                    cure: "🧪 Chlorothalonil or Propiconazole. Mulch to prevent soil splash. Remove infected foliage immediately.",
                    match: "93% Match"
                },
                {
                    name: "🌱 Powdery Mildew (Erysiphe)",
                    color: "#9ca3af",
                    symptoms: ["White powdery patches on upper leaves", "Stunted growth and leaf curling", "Premature leaf drop", "High humidity favors development"],
                    cure: "🍃 Sulfur or potassium bicarbonate spray. Neem oil (2ml/L). Improve air circulation.",
                    match: "96% Match"
                },
                {
                    name: "🧪 Nitrogen Deficiency",
                    color: "#f59e0b",
                    symptoms: ["Uniform pale green to yellow leaves", "Slow growth, thin stems", "Older leaves turn yellow first", "Reduced tillering in grains"],
                    cure: "🌾 Apply Urea (46-0-0) or DAP. Incorporate well-rotted manure. Foliar 1% urea solution for quick recovery.",
                    match: "91% Match"
                },
                {
                    name: "💚 Healthy Leaf (Optimal Condition)",
                    color: "#16a34a",
                    symptoms: ["Vibrant green color", "Uniform blade texture", "No spots, curling or lesions", "Strong turgor pressure"],
                    cure: "✅ No treatment required! Continue balanced irrigation, monitor for pests, and maintain soil health.",
                    match: "99% Match"
                },
                {
                    name: "🌽 Gray Leaf Spot (Cercospora)",
                    color: "#6b7280",
                    symptoms: ["Narrow rectangular brown lesions", "Gray centers with dark borders", "Leaf blighting in late stage", "Reduced photosynthetic area"],
                    cure: "🍄 Strobilurin fungicides (Azoxystrobin). Crop rotation, destroy infected residue.",
                    match: "92% Match"
                }
            ];

            // Simulate AI classification (weighted)
            function getAIPrediction() {
                const rand = Math.random();
                if (rand < 0.12) {
                    return diseaseLibrary[5]; // healthy
                } else {
                    const diseaseIndices = [0, 1, 2, 3, 4, 6];
                    const randomIndex = diseaseIndices[Math.floor(Math.random() * diseaseIndices.length)];
                    return diseaseLibrary[randomIndex];
                }
            }

            // Reset diagnosis panel
            function resetDiagnosis() {
                resultCard.style.display = 'none';
            }

            // Display diagnosis with smooth update
            function displayDiagnosis(diagnosis) {
                diseaseNameEl.textContent = diagnosis.name;
                diseaseNameEl.style.color = diagnosis.color;
                resultCard.style.borderLeftColor = diagnosis.color;
                confidenceSpan.textContent = diagnosis.match;
                
                // Update symptoms list
                symptomsList.innerHTML = '';
                diagnosis.symptoms.forEach(symptom => {
                    const li = document.createElement('li');
                    li.innerHTML = `<i class="fas fa-circle" style="font-size: 0.5rem; vertical-align: middle; color: ${diagnosis.color}; margin-right: 8px;"></i> ${symptom}`;
                    symptomsList.appendChild(li);
                });
                
                // Update cure text
                cureTextP.innerHTML = `<i class="fas fa-stethoscope" style="margin-right: 6px;"></i> ${diagnosis.cure}`;
                
                // Show result panel
                resultCard.style.display = 'block';
                
                // Smooth scroll to result
                resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            // Start scanning simulation
            function startAIScan() {
                resetDiagnosis();
                scanOverlay.style.display = 'flex';
                
                setTimeout(() => {
                    scanOverlay.style.display = 'none';
                    const aiResult = getAIPrediction();
                    displayDiagnosis(aiResult);
                }, 2200);
            }

            // Handle image upload
            function handleImageUpload(file) {
                if (!file) return;
                
                if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
                    alert('Please upload a JPG or PNG image file.');
                    return;
                }
                
                if (file.size > 5 * 1024 * 1024) {
                    alert('Image size exceeds 5MB. Please compress or choose a smaller photo.');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImg.src = e.target.result;
                    previewImg.style.display = 'block';
                    if (uploadIcon) uploadIcon.style.display = 'none';
                    if (uploadText) uploadText.style.display = 'none';
                    startAIScan();
                };
                reader.readAsDataURL(file);
            }
            
            // Trigger file input
            if (doctorCard) {
                doctorCard.addEventListener('click', (e) => {
                    if (e.target === uploadInput) return;
                    uploadInput.click();
                });
            }
            
            if (uploadInput) {
                uploadInput.addEventListener('change', (event) => {
                    if (event.target.files && event.target.files.length > 0) {
                        handleImageUpload(event.target.files[0]);
                    }
                });
            }
            
            // Drag and drop support
            if (doctorCard) {
                doctorCard.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    doctorCard.style.borderColor = '#22c55e';
                    doctorCard.style.backgroundColor = '#fefce8';
                });
                
                doctorCard.addEventListener('dragleave', (e) => {
                    e.preventDefault();
                    doctorCard.style.borderColor = '#cbd5e1';
                    doctorCard.style.backgroundColor = '#ffffff';
                });
                
                doctorCard.addEventListener('drop', (e) => {
                    e.preventDefault();
                    doctorCard.style.borderColor = '#cbd5e1';
                    doctorCard.style.backgroundColor = '#ffffff';
                    const droppedFiles = e.dataTransfer.files;
                    if (droppedFiles.length > 0) {
                        handleImageUpload(droppedFiles[0]);
                    }
                });
            }
            
            // Initial state
            resultCard.style.display = 'none';
            console.log("AI Crop Doctor loaded on main page");
        })();


// --- UNIFIED WEATHER SYSTEM ---
const weatherApiKey = "831278baa7f0423d67c09c1715434eb2";
let detailedChartInstance = null;
let globalForecastData = null; // Store data globally to avoid multiple re-fetches

/**
 * Main Entry Point: Fetches location and initiates all weather components
 */
async function initUnifiedWeather() {
    if (!navigator.geolocation) {
        console.error("Geolocation not supported. Using defaults.");
        fetchWeatherData(19.2183, 73.0868); // Default Dombivli
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => fetchWeatherData(position.coords.latitude, position.coords.longitude),
        (error) => {
            console.warn("Location denied. Using defaults.");
            fetchWeatherData(19.2183, 73.0868);
        }
    );
}

/**
 * Fetches Current and Forecast data from OpenWeatherMap
 */
async function fetchWeatherData(lat, lon) {
    window.latestCityInfo = { lat, lon }; 
    
    try {
        const [currRes, foreRes] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric`),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric`)
        ]);

        const currData = await currRes.json();
        const foreData = await foreRes.json();
        globalForecastData = foreData;

        // --- 1. UPDATE WEATHER CARD (Matches your image classes) ---
        window.latestTemp = Math.round(currData.main.temp);
        const humidity = currData.main.humidity;

        const locText = document.querySelector('.location-text');
        const tempDisp = document.querySelector('.temp-display');
        const condText = document.querySelector('.condition-text');
        const detText = document.querySelector('.details-text');

        if (locText) locText.innerText = `${currData.name}, ${currData.sys.country}`;
        if (tempDisp) tempDisp.innerText = `${window.latestTemp}°C`;
        if (condText) condText.innerText = currData.weather[0].main;
        if (detText) detText.innerText = `Humidity: ${humidity}% | Wind: ${currData.wind.speed} m/s`;

        // --- 2. TRIGGER DYNAMIC RECOMMENDATIONS & MARKET API ---
        await updateSeasonalRecommendations(window.latestTemp, humidity);

        // --- 3. UPDATE OTHER HUB COMPONENTS ---
        updateHeroCard(currData);
        updateHorizontalScroller(foreData.list);
        updateLocationBadges(currData.name, currData.sys.country);

    } catch (err) {
        console.error("Weather Engine Error:", err);
    }
}
/**
 * Updates the Gray Hero Card (Current Weather)
 */
function updateHeroCard(data) {
    const degElem = document.getElementById('hero-degree');
    if (!degElem) return;

    degElem.innerText = Math.round(data.main.temp);
    document.getElementById('hero-city').innerText = data.name;
    document.getElementById('hero-description').innerText = data.weather[0].description;
    document.getElementById('hero-wind').innerText = data.wind.speed;
    document.getElementById('hero-humidity').innerText = data.main.humidity;
    document.getElementById('hero-time').innerText = `As of ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} IST`;
    
    // Update main weather icon
    const icon = document.getElementById('hero-icon');
    if(icon) icon.className = `fas fa-cloud-${data.weather[0].main.toLowerCase() === 'clear' ? 'sun' : 'sun-rain'}`;
}

/**
 * Renders the Horizontal Scrollable Cards with Centered Design
 */
function updateHorizontalScroller(list) {
    const container = document.getElementById('hourly-forecast-new');
    if (!container) return;

    container.innerHTML = list.slice(0, 15).map((item, i) => `
        <div class="hourly-card-new" style="animation-delay: ${i * 0.05}s">
            <span>${new Date(item.dt * 1000).getHours()}:00</span>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png" width="55">
            <h3>${Math.round(item.main.temp)}°C</h3>
            <div class="rain-pill">
                <i class="fas fa-tint"></i> ${Math.round(item.pop * 100)}%
            </div>
        </div>
    `).join('');
}

function updateLocationBadges(city, country) {
    const display = document.getElementById('location-display');
    if (display) display.innerText = `📍 ${city}, ${country}`;
}

/**
 * Handles the "See More" Full-Screen Toggle
 */

async function toggleAdvancedForecast() {
    const overlay = document.getElementById('weather-full-overlay');
    if (!overlay) return;

    const isOpening = overlay.style.display === 'none' || overlay.style.display === '';
    overlay.style.display = isOpening ? 'block' : 'none';
    
    // Lock background scrolling when open
    document.body.style.overflow = isOpening ? 'hidden' : 'auto';

    // Populate data only when opening
    if (isOpening && globalForecastData) {
        // DYNAMIC: Fetches real city name from API
        document.getElementById('full-city-name').innerText = globalForecastData.city.name;
        
        // DYNAMIC: Updates to today's date
        document.getElementById('full-date-display').innerText = new Date().toLocaleDateString('en-US', { 
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
        });
        
        const listCont = document.getElementById('full-weather-list');
        listCont.innerHTML = ''; 

        let lastDate = "";

        globalForecastData.list.forEach((item) => {
            const dateObj = new Date(item.dt * 1000);
            const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

            // Create Date Group Header (e.g., Sat Feb 14 2026)
            if (dateStr !== lastDate) {
                lastDate = dateStr;
                const dateLabel = document.createElement('div');
                dateLabel.className = 'date-group-label';
                dateLabel.innerText = dateStr;
                listCont.appendChild(dateLabel);
            }

            // Create Row Element with horizontal alignment
            const row = document.createElement('div');
            row.className = 'forecast-row-item';
            row.innerHTML = `
                <span class="row-time">${dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                <span class="row-temp">${Math.round(item.main.temp)}.00°C</span>
                <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" width="40" alt="weather">
                <span class="row-desc">${item.weather[0].description}</span>
                <span class="row-rain">${Math.round(item.pop * 100)}%</span>
                <span class="row-wind">${item.wind.speed} km/h</span>
            `;
            listCont.appendChild(row);
        });
    }
}




/**
 * Handles manual city search from the main dashboard
 */
async function handleManualSearch() {
    const cityName = document.getElementById('citySearchInput').value.trim();
    if (!cityName) return;

    try {
        // Fetch data by city name instead of lat/lon
        const [currRes, foreRes] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${weatherApiKey}&units=metric`),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&appid=${weatherApiKey}&units=metric`)
        ]);

        if (!currRes.ok || !foreRes.ok) throw new Error("City not found");

        const currData = await currRes.json();
        const foreData = await foreRes.json();
        
        // Store globally so the "See More" page stays synced
        globalForecastData = foreData;
        window.latestCityInfo = { lat: currData.coord.lat, lon: currData.coord.lon };

        // Update Hub Visuals
        updateHeroCard(currData);
        updateHorizontalScroller(foreData.list);
        updateLocationBadges(currData.name, currData.sys.country);

        // Clear input after search
        document.getElementById('citySearchInput').value = "";

    } catch (err) {
        alert("City not found. Please check the spelling.");
        console.error("Search Error:", err);
    }
}

// Add 'Enter' key support for the search input
document.getElementById('citySearchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleManualSearch();
});














function initOverlayGraph(list) {
    const ctx = document.getElementById('detailedWeatherChart').getContext('2d');
    if (detailedChartInstance) detailedChartInstance.destroy();

    detailedChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: list.slice(0, 24).map(i => `${new Date(i.dt*1000).getHours()}:00`),
            datasets: [{
                label: 'Temp (°C)',
                data: list.slice(0, 24).map(i => i.main.temp),
                borderColor: '#16a34a',
                backgroundColor: 'rgba(22, 163, 74, 0.1)',
                fill: true, tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// Start Unified System
document.addEventListener('DOMContentLoaded', initUnifiedWeather);






/**
 * Updates the Seasonal Farming Recommendations box dynamically.
 * @param {number} temp - The current temperature from the weather API.
 * @param {string} targetId - The ID of the HTML element to update.
 */
function updateDynamicSuggestions(temp, targetId) {
    const container = document.getElementById(targetId);
    if (!container) return;

    // Default configuration for Warm Season
    let config = {
        title: "Warm Season",
        range: "20°C - 30°C",
        color: "#166534",
        tips: [
            "Ideal for a wide range of crops including Tomatoes, Brinjal, Chillies, Beans, Gourds.",
            "Good time for general sowing and transplanting.",
            "Monitor for pests and diseases as warm conditions can encourage their growth.",
            "Ensure balanced fertilization for optimal growth."
        ]
    };

    // Logic for Cool Season
    if (temp <= 20) {
        config = {
            title: "Cool Season",
            range: "Below 20°C",
            color: "#1e40af",
            tips: [
                "Best for leafy greens like Spinach, Lettuce, and Fenugreek.",
                "Ideal for root vegetables such as Carrots, Radishes, and Beetroot.",
                "Reduce irrigation frequency as evaporation is significantly lower.",
                "Check for fungal infections due to increased morning moisture."
            ]
        };
    } 
    // Logic for Hot Season
    else if (temp > 32) {
        config = {
            title: "Hot Season",
            range: "Above 32°C",
            color: "#9a3412",
            tips: [
                "Focus on heat-tolerant crops like Okra (Bhindi) and Cluster Beans.",
                "Increase mulching to protect soil moisture from high evaporation.",
                "Irrigate during early morning or late evening to prevent sun scorch.",
                "Use shade nets for delicate nurseries and young saplings."
            ]
        };
    }

    // Injecting the styled HTML
    container.innerHTML = `
        <div class="insight-card rec-card" style="border-top: 5px solid ${config.color}">
            <h3>Seasonal Farming Recommendations</h3>
            <p class="season-header" style="color: ${config.color}">${config.title} (${config.range}):</p>
            <ul class="rec-list">
                ${config.tips.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
        </div>
    `;
}


document.getElementById("locateFarmBtn").addEventListener("click", () => {
    if (!navigator.geolocation) {
        alert("Location not supported");
        return;
    }

    navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        document.getElementById("weatherSummary").innerText = "Loading...";
        getWeatherForDashboard(lat, lon);
    });
});


function loadCropDropdown() {
    const select = document.getElementById("cropSelect");

    if (!select) return;

    cropDatabase.forEach(crop => {
        const option = document.createElement("option");
        option.value = crop.name;
        option.textContent = crop.name;
        select.appendChild(option);
    });
}

document.addEventListener("DOMContentLoaded", loadCropDropdown);

document.getElementById("cropSelect").addEventListener("change", function () {
    const selectedCrop = this.value;

    if (!selectedCrop) return;

    const crop = cropDatabase.find(c => c.name === selectedCrop);

    if (crop) {
        
    }
});

async function getWeatherForDashboard(lat, lon) {
    const API_KEY = "e5c665dd13f6023d284cb2cb4c643e0a";

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        const temp = data.main.temp;
        const humidity = data.main.humidity;
        const wind = Math.round(data.wind.speed * 3.6);
        const condition = data.weather[0].main;

        updateWeatherSummary(temp, humidity, wind, condition);

    } catch (err) {
        document.getElementById("weatherSummary").innerText = "❌ Failed to load weather";
    }
}


/**
 * Updates the Seasonal Farming Recommendations box dynamically with Pest & Market Alerts.
 * @param {number} temp - The current temperature.
 * @param {number} humidity - The current humidity percentage.
/**
 * Updates the Seasonal Farming Recommendations box with LIVE Market Insights.
 */
/**
 * Core Market Function: Syncs Crop Advice with Live Market Trends
 */
async function updateSeasonalRecommendations(temp, humidity) {
    const header = document.querySelector('.season-header');
    const list = document.querySelector('.rec-list');
    
    if (!header || !list) return;

    // 1. Map Temperature to a specific Commodity for the API
    let commodity = "Tomato"; 
    let config = {
        title: "Warm Season",
        range: "20°C - 32°C",
        color: "#166534",
        tips: [
            "Ideal Crops: Tomatoes, Brinjal, and Chillies.",
            "Action: Good time for general sowing in well-drained soil.",
            "Care: Monitor for aphids as warm conditions accelerate growth."
        ]
    };

    if (temp <= 20) {
        commodity = "Spinach";
        config = {
            title: "Cool Season", range: "Below 20°C", color: "#1e40af",
            tips: ["Ideal Crops: Spinach, Peas, and Carrots.", "Action: Reduce irrigation frequency."]
        };
    } else if (temp > 32) {
        commodity = "Okra";
        config = {
            title: "Hot Season", range: "Above 32°C", color: "#9a3412",
            tips: ["Ideal Crops: Okra and Cluster Beans.", "Action: Irrigate in early morning."]
        };
    }

    // 2. Fetch Live Market Data
    let marketText = "Fetching live market rates...";
    try {
        // This URL is a placeholder; replace with your Agmarknet or APIFarmer endpoint
        const res = await fetch(`https://api.marketdata.gov/prices?item=${commodity}`);
        if (res.ok) {
            const data = await res.json();
            const trendIcon = data.monthly_change > 0.10 ? "🔥 High Demand" : "📈 Stable";
            marketText = `${trendIcon}: ${commodity} is seeing a ${Math.round(data.monthly_change * 100)}% price increase this month.`;
        } else {
            throw new Error();
        }
    } catch (err) {
        marketText = `📊 Market Trend: Demand for ${commodity} is currently stable in regional mandis.`;
    }

    // 3. Inject Combined Data into HTML
    header.innerText = `${config.title} (${config.range}):`;
    header.style.color = config.color;

    const finalTips = [
        `<span style="color: #047857; font-weight: 700;">💎 Market Insight: ${marketText}</span>`,
        ...config.tips
    ];

    // Add high-humidity pest alert if necessary
    if (humidity > 80) {
        finalTips.unshift(`<strong style="color: #dc2626;">⚠️ PEST ALERT: High humidity (${humidity}%) detected. Check for fungal issues.</strong>`);
    }

    list.innerHTML = finalTips.map(tip => `<li>${tip}</li>`).join('');
}




// ===== GENERATE DASHBOARD BUTTON FIX =====
// ======== FIXED DASHBOARD GENERATOR ========
document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateDashboardBtn') || document.getElementById('getAdviceBtn');
    const cropInput = document.getElementById('cropSelect') || document.getElementById('cropInput');
    const dateInput = document.getElementById('sowingDate');

    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            // 1. Validate Location
            if (!farmLocation && typeof farmLocation !== 'undefined') {
                alert("Please click 'Locate My Farm' first.");
                return;
            }

            const selectedCrop = cropInput.value;
            const selectedDate = dateInput.value;

            // 2. Validate Inputs
            if (!selectedCrop || selectedCrop === "") {
                alert("Please select a crop first 🌾");
                return;
            }
            
            // Check for the "0003" year issue seen in your screenshot
            if (!selectedDate || selectedDate.startsWith('0003')) {
                alert("Please enter a valid sowing year (e.g., 2026).");
                return;
            }

            // 3. Determine Action: Redirect or Local Render
            // If you want to go to the new page (heheh.html):
            const url = `heheh.html?crop=${encodeURIComponent(selectedCrop)}&date=${selectedDate}`;
            window.location.href = url;
            
            // If you wanted to stay on the same page, you would call:
            // updateAssistantDashboard(currentWeather, foundCrop, selectedCrop, new Date(selectedDate));
        });
    }
});
// Inside your weather fetch success block
//const currentTemp = Math.round(data.main.temp); 

// Update the weather card text
//document.getElementById('currentTempDisplay').innerText = `${currentTemp}°C`;

// Trigger the dynamic suggestions in the container
// updateDynamicSuggestions(currentTemp, 'dynamic-rec-container');


// weather refresh butn

// FIND THIS AT THE BOTTOM OF agri.js AND REPLACE IT
document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refreshWeatherBtn');

    if (refreshBtn) {
        refreshBtn.onclick = async function() {
            refreshBtn.innerText = "Updating...";
            refreshBtn.disabled = true;

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(async (position) => {
                    await fetchWeatherData(position.coords.latitude, position.coords.longitude);
                    
                    refreshBtn.innerText = "Refresh Weather";
                    refreshBtn.disabled = false;
                }, () => {
                    alert("Location access denied.");
                    refreshBtn.disabled = false;
                });
            }
        };
    }
});


document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('listingGrid');
    const listingForm = document.getElementById('listingForm');
    const user = JSON.parse(localStorage.getItem('agriUser'));

    // --- FETCH & RENDER ---
    async function fetchHubListings() {
        if (!grid) return;
        try {
            const response = await fetch('/api/hub-listings');
            const data = await response.json();
            renderHubItems(data);
        } catch (error) {
            console.error("Error loading hub:", error);
        }
    }

    function renderHubItems(items) {
        grid.innerHTML = items.map(item => {
            const isGroup = item.exchange_type === 'group';
            const isOwner = user && item.user_id === user.id;

            return `
                <div class="item-card">
                    <img src="${item.image_url || 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=400'}" class="item-img">
                    <div class="item-body">
                        <span class="badge ${item.category === 'seed' ? 'badge-seed' : 'badge-tool'}">${item.category}</span>
                        <span class="badge" style="background:${isGroup ? '#ede9fe' : '#f1f5f9'}; color:${isGroup ? '#6d28d9' : '#475569'}">
                            ${isGroup ? '👥 Group' : '👤 Normal'}
                        </span>
                        <h3 class="item-title">${item.title}</h3>
                        <div class="item-meta">
                            <i class="fas fa-user"></i> ${item.author_name} ${isOwner ? '<strong>(You)</strong>' : ''} | 
                            <i class="fas fa-map-marker-alt"></i> ${item.location}
                        </div>
                        <p style="font-size: 0.9rem; color: #475569; margin-bottom: 20px;">${item.description}</p>
                        <button class="request-btn" onclick="window.open('https://wa.me/91${item.contact_number}')">
                            ${isGroup ? 'Join Group Swap' : 'Connect to Swap'}
                        </button>
                    </div>
                </div>`;
        }).join('');
    }

    // --- FORM SUBMISSION ---
    if (listingForm) {
        listingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!user) return alert("Please Login First!");

            const payload = {
                userId: user.id,
                authorName: user.name,
                title: document.getElementById('formTitle').value,
                category: document.getElementById('formType').value,
                exchangeType: document.getElementById('formExchangeType').value,
                location: document.getElementById('formLocation').value,
                description: document.getElementById('formDesc').value,
                contactNumber: user.contact_number
            };

            const response = await fetch('/api/hub-listings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert("Listing Published Successfully!");
                location.reload(); 
            }
        });
    }

    fetchHubListings();
});




let lastScroll = 0;
const header = document.querySelector("header");

window.addEventListener("scroll", () => {

    if(window.innerWidth > 768) return;

    const current = window.scrollY;

    if(current > lastScroll && current > 100){
        header.classList.add("hide");
    }else{
        header.classList.remove("hide");
    }

    lastScroll = current;
});