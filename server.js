<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AgriConnect Admin Dashboard</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary: #1e400f;
            --secondary: #38a169;
            --accent: #facc15;
            --light: #f7f7f7;
            --dark: #1e400f;
            --success: #38a169;
            --warning: #f39c12;
            --danger: #ef4444;
            --sidebar-width: 260px;
            --header-height: 70px;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Inter', sans-serif;
        }

        body {
            background-color: #f5f7fa;
            color: #333;
            display: flex;
            min-height: 100vh;
            overflow-x: hidden;
        }

        /* Login Form Styles */
        .login-form-container {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 100vh;
            background-color: #f5f7fa;
        }

        .login-card {
            background: white;
            padding: 40px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            width: 90%;
            max-width: 400px;
            text-align: center;
            border-radius: 8px;
        }

        .login-card h2 {
            color: var(--primary);
            margin-bottom: 25px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .login-card h2 i {
            margin-right: 10px;
            color: var(--accent);
        }

        .login-card input[type="email"],
        .login-card input[type="password"] {
            width: 100%;
            padding: 12px;
            margin-bottom: 20px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
        }

        .login-card button {
            width: 100%;
            padding: 12px;
            background: var(--secondary);
            color: white;
            border: none;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: background 0.3s;
            border-radius: 4px;
        }

        .login-card button:hover {
            background: #2b7850;
        }

        #loginMessage {
            margin-top: 15px;
            font-weight: 600;
        }

        /* Dashboard Wrapper */
        #dashboard-wrapper {
            display: none;
            flex-grow: 1;
            width: 100%;
        }

        /* Sidebar Styles */
        .sidebar {
            width: var(--sidebar-width);
            background: var(--primary);
            color: white;
            height: 100vh;
            position: fixed;
            top: 0;
            left: 0;
            transition: all 0.3s;
            box-shadow: 3px 0 10px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            overflow-y: auto;
        }

        .logo-container {
            padding: 20px 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            height: var(--header-height);
        }

        .logo {
            font-size: 24px;
            font-weight: 700;
            color: white;
            display: flex;
            align-items: center;
        }

        .logo i {
            margin-right: 10px;
            color: var(--accent);
        }

        .logo span {
            color: var(--accent);
        }

        .nav-links {
            padding: 15px 0;
        }

        .nav-links li {
            list-style: none;
            padding: 12px 20px;
            transition: all 0.3s;
            cursor: pointer;
        }

        .nav-links li:hover,
        .nav-links li.active {
            background: rgba(255, 255, 255, 0.1);
            border-left: 4px solid var(--accent);
        }

        .nav-links a {
            color: white;
            text-decoration: none;
            display: flex;
            align-items: center;
        }

        .nav-links i {
            margin-right: 10px;
            font-size: 18px;
            width: 24px;
            text-align: center;
        }

        /* Main Content Styles */
        .main-container-content {
            flex-grow: 1;
            margin-left: var(--sidebar-width);
            transition: margin-left 0.3s;
            width: calc(100% - var(--sidebar-width));
        }

        .main-content {
            flex: 1;
            padding: 20px;
            transition: all 0.3s;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding: 15px 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .header h1 {
            color: var(--dark);
            font-size: 28px;
            display: flex;
            align-items: center;
        }

        .header h1 i {
            margin-right: 10px;
            color: var(--secondary);
        }

        .user-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .notification-icon {
            position: relative;
            font-size: 20px;
            color: var(--dark);
            cursor: pointer;
        }

        .notification-count {
            position: absolute;
            top: -8px;
            right: -8px;
            background: var(--danger);
            color: white;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .user-profile {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 15px;
            background: var(--light);
            border-radius: 50px;
            cursor: pointer;
        }

        .user-profile img {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
        }

        /* Content Sections */
        .content-section {
            display: none;
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .content-section.active {
            display: block;
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }

        .section-header h2 {
            color: var(--dark);
            font-size: 20px;
            display: flex;
            align-items: center;
        }

        .section-header h2 i {
            margin-right: 10px;
            color: var(--secondary);
        }

        .view-all {
            color: var(--secondary);
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            cursor: pointer;
        }

        .view-all i {
            margin-left: 5px;
        }

        /* Stats Cards */
        .stats-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            display: flex;
            align-items: center;
            transition: transform 0.3s, box-shadow 0.3s;
        }

        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
        }

        .stat-icon {
            width: 60px;
            height: 60px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            font-size: 24px;
            color: white;
        }

        .users-icon { background: #10b981; }
        .stories-icon { background: #facc15; }
        .listings-icon { background: #3b82f6; }
        .pending-icon { background: var(--danger); }

        .stat-info h3 {
            font-size: 24px;
            margin-bottom: 5px;
        }

        .stat-info p {
            color: #777;
            font-size: 14px;
        }

        /* Tables */
        .table-container {
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            min-width: 700px;
        }

        table th,
        table td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }

        table th {
            color: #777;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
        }

        .status {
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }

        .status.approved {
            background: #e6f7ee;
            color: var(--success);
        }

        .status.pending {
            background: #fef5e6;
            color: var(--warning);
        }

        .status.rejected {
            background: #fde8e6;
            color: var(--danger);
        }

        .action-buttons {
            display: flex;
            gap: 5px;
            flex-wrap: wrap;
        }

        .action-btn {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s;
        }

        .approve-btn {
            background: var(--success);
            color: white;
        }

        .reject-btn {
            background: var(--danger);
            color: white;
        }

        .delete-btn {
            background: #888;
            color: white;
        }

        .view-btn {
            background: var(--secondary);
            color: white;
        }

        .action-btn:hover {
            opacity: 0.9;
            transform: scale(1.05);
        }

        .text-truncate {
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .loading-message {
            text-align: center;
            padding: 40px;
            color: #555;
            font-style: italic;
        }

        /* Modal */
        .admin-modal-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 2000;
            justify-content: center;
            align-items: center;
            opacity: 0;
            transition: opacity 0.3s;
        }

        .admin-modal-overlay.active {
            display: flex;
            opacity: 1;
        }

        .admin-modal-content {
            background: white;
            padding: 30px;
            border-radius: 8px;
            width: 90%;
            max-width: 600px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            transform: scale(0.9);
            transition: transform 0.3s;
            position: relative;
            max-height: 80vh;
            overflow-y: auto;
        }

        .admin-modal-overlay.active .admin-modal-content {
            transform: scale(1);
        }

        .modal-close-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #aaa;
        }

        .modal-detail-item {
            margin-bottom: 15px;
        }

        .modal-detail-item strong {
            display: block;
            margin-bottom: 5px;
            color: var(--dark);
        }

        /* Form Styles */
        .form-container {
            max-width: 700px;
            margin: 0 auto;
            background: #f8fafc;
            padding: 25px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }

        .form-container label {
            display: block;
            font-weight: 700;
            margin-bottom: 5px;
        }

        .form-container input,
        .form-container textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            font-size: 14px;
        }

        .form-container textarea {
            resize: vertical;
        }

        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        }

        .form-grid .full-width {
            grid-column: 1 / -1;
        }

        /* Toggle Button */
        .toggle-sidebar {
            display: none;
            background: var(--secondary);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 18px;
        }

        /* Responsive Design */
        @media (max-width: 992px) {
            .sidebar {
                width: 70px;
                overflow: hidden;
            }

            .logo span,
            .nav-links li a span {
                display: none;
            }

            .nav-links i {
                margin-right: 0;
                font-size: 20px;
            }

            .main-container-content {
                margin-left: 70px;
                width: calc(100% - 70px);
            }

            .logo i {
                margin-right: 0;
            }
        }

        @media (max-width: 768px) {
            .stats-container {
                grid-template-columns: 1fr;
            }

            .header h1 {
                font-size: 22px;
            }

            .user-profile span {
                display: none;
            }

            .form-grid {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 576px) {
            .toggle-sidebar {
                display: block;
            }

            .sidebar {
                transform: translateX(-100%);
                position: fixed;
            }

            .sidebar.active {
                transform: translateX(0);
            }

            .main-container-content {
                margin-left: 0;
                padding: 15px;
                width: 100%;
            }

            .main-content {
                padding: 0;
            }

            .header {
                flex-direction: column;
                align-items: flex-start;
                gap: 15px;
            }

            .user-info {
                width: 100%;
                justify-content: space-between;
            }
        }
    </style>
</head>
<body>

    <!-- Login Form -->
    <div id="login-form-container" class="login-form-container">
        <div class="login-card">
            <h2><i class="fas fa-user-shield"></i> Admin Login</h2>
            <form id="adminLoginForm">
                <input type="email" id="adminEmail" placeholder="Email (admin@agriconnect.com)" required>
                <input type="password" id="adminPassword" placeholder="Password" required>
                <button type="submit" id="loginButton">Log In</button>
                <p id="loginMessage" style="display: none;"></p>
            </form>
        </div>
    </div>

    <!-- Dashboard -->
    <div id="dashboard-wrapper">
        <div class="sidebar">
            <div class="logo-container">
                <div class="logo"><i class="fas fa-seedling"></i> Agri<span>Admin</span></div>
            </div>
            <ul class="nav-links">
                <li class="active" data-target="dashboard">
                    <a href="#"><i class="fas fa-tachometer-alt"></i> <span>Dashboard</span></a>
                </li>
                <li data-target="pending-stories">
                    <a href="#"><i class="fas fa-scroll"></i> <span>Story Approvals</span></a>
                </li>
                <li data-target="managed-stories">
                    <a href="#"><i class="fas fa-list-alt"></i> <span>Managed Stories</span></a>
                </li>
                <li data-target="pending-farmers">
                    <a href="#"><i class="fas fa-address-book"></i> <span>Farmer Listings</span></a>
                </li>
                <li data-target="managed-farmers">
                    <a href="#"><i class="fas fa-list-alt"></i> <span>Managed Listings</span></a>
                </li>
                <li data-target="equipment-management">
                    <a href="#"><i class="fas fa-tools"></i> <span>Equipment</span></a>
                </li>
                <li data-target="reviews-management">
                    <a href="#"><i class="fas fa-star"></i> <span>Reviews</span></a>
                </li>
                <li data-target="comments-management">
                    <a href="#"><i class="fas fa-comments"></i> <span>Comments</span></a>
                </li>
                <li data-target="scheme-management">
                    <a href="#"><i class="fas fa-file-contract"></i> <span>Schemes</span></a>
                </li>
                <li data-target="articles-management">
                    <a href="#"><i class="fas fa-newspaper"></i> <span>Articles</span></a>
                </li>
                <li data-target="user-management">
                    <a href="#"><i class="fas fa-users"></i> <span>Users</span></a>
                </li>
                <li>
                    <a href="#" id="logoutLink"><i class="fas fa-sign-out-alt"></i> <span>Logout</span></a>
                </li>
            </ul>
        </div>

        <div class="main-container-content">
            <div class="main-content">
                <div class="header">
                    <h1><i class="fas fa-tachometer-alt"></i> AgriConnect Control Panel</h1>
                    <div class="user-info">
                        <button class="toggle-sidebar">
                            <i class="fas fa-bars"></i>
                        </button>
                        <div class="notification-icon">
                            <i class="fas fa-bell"></i>
                            <span class="notification-count" id="pendingApprovalsCount">0</span>
                        </div>
                        <div class="user-profile">
                            <img src="https://placehold.co/40x40/1e400f/ffffff?text=AD" alt="Admin">
                            <span id="adminNameDisplay">Agri Admin</span>
                        </div>
                    </div>
                </div>

                <!-- DASHBOARD -->
                <div id="dashboard" class="content-section active">
                    <div class="stats-container">
                        <div class="stat-card">
                            <div class="stat-icon users-icon">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="stat-info">
                                <h3 id="statTotalUsers">...</h3>
                                <p>Total Users</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon stories-icon">
                                <i class="fas fa-scroll"></i>
                            </div>
                            <div class="stat-info">
                                <h3 id="statPendingStories">...</h3>
                                <p>Pending Stories</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon listings-icon">
                                <i class="fas fa-address-card"></i>
                            </div>
                            <div class="stat-info">
                                <h3 id="statPendingFarmers">...</h3>
                                <p>Pending Farmers</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon pending-icon">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="stat-info">
                                <h3 id="statTotalPending">...</h3>
                                <p>Total Pending</p>
                            </div>
                        </div>
                    </div>

                    <div class="content-section active">
                        <div class="section-header">
                            <h2><i class="fas fa-clock"></i> Latest Pending Approvals</h2>
                            <a class="view-all" onclick="navigateTo('pending-stories')">Manage <i class="fas fa-arrow-right"></i></a>
                        </div>
                        <div class="table-container">
                            <table id="quickApprovalsTable">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Submitted By</th>
                                        <th>Content</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td colspan="5" class="loading-message">Loading...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- PENDING STORIES -->
                <div id="pending-stories" class="content-section">
                    <div class="section-header">
                        <h2><i class="fas fa-scroll"></i> Pending Stories</h2>
                    </div>
                    <div class="table-container">
                        <table id="storiesTable">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Author</th>
                                    <th>Location</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="5" class="loading-message">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- MANAGED STORIES -->
                <div id="managed-stories" class="content-section">
                    <div class="section-header">
                        <h2><i class="fas fa-list-alt"></i> All Stories</h2>
                    </div>
                    <div class="table-container">
                        <table id="allStoriesTable">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Author</th>
                                    <th>Status</th>
                                    <th>Location</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="6" class="loading-message">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- PENDING FARMERS -->
                <div id="pending-farmers" class="content-section">
                    <div class="section-header">
                        <h2><i class="fas fa-address-book"></i> Pending Farmers</h2>
                    </div>
                    <div class="table-container">
                        <table id="farmersTable">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Farm Name</th>
                                    <th>Crop</th>
                                    <th>Location</th>
                                    <th>Email</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="6" class="loading-message">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- MANAGED FARMERS -->
                <div id="managed-farmers" class="content-section">
                    <div class="section-header">
                        <h2><i class="fas fa-list-alt"></i> All Farmers</h2>
                    </div>
                    <div class="table-container">
                        <table id="allFarmersTable">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Farm Name</th>
                                    <th>Status</th>
                                    <th>Location</th>
                                    <th>Email</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="6" class="loading-message">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- EQUIPMENT -->
                <div id="equipment-management" class="content-section">
                    <div class="section-header">
                        <h2><i class="fas fa-tools"></i> Equipment</h2>
                    </div>
                    <div class="table-container">
                        <table id="equipmentTable">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Category</th>
                                    <th>Condition</th>
                                    <th>Price</th>
                                    <th>Seller</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="7" class="loading-message">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- REVIEWS -->
                <div id="reviews-management" class="content-section">
                    <div class="section-header">
                        <h2><i class="fas fa-star"></i> Reviews</h2>
                    </div>
                    <div class="table-container">
                        <table id="reviewsTable">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>User</th>
                                    <th>Rating</th>
                                    <th>Review</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="6" class="loading-message">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- COMMENTS -->
                <div id="comments-management" class="content-section">
                    <div class="section-header">
                        <h2><i class="fas fa-comments"></i> Comments</h2>
                    </div>
                    <div class="table-container">
                        <table id="commentsTable">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Page</th>
                                    <th>User</th>
                                    <th>Comment</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="6" class="loading-message">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- SCHEMES -->
                <div id="scheme-management" class="content-section">
                    <div class="section-header">
                        <h2><i class="fas fa-file-contract"></i> Scheme Management</h2>
                    </div>

                    <div class="form-container" style="margin-bottom: 30px;">
                        <form id="addSchemeForm">
                            <div class="form-grid">
                                <div>
                                    <label>Scheme Name</label>
                                    <input type="text" id="schName" required>
                                </div>
                                <div>
                                    <label>Category</label>
                                    <input type="text" id="schCategory" required>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="full-width">
                                    <label>Description</label>
                                    <textarea id="schDesc" rows="3" required></textarea>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="full-width">
                                    <label>Eligibility</label>
                                    <input type="text" id="schElig" required>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="full-width">
                                    <label>Documents</label>
                                    <textarea id="schDocs" placeholder="Comma-separated"></textarea>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="full-width">
                                    <label>Steps</label>
                                    <textarea id="schSteps" placeholder="Comma-separated"></textarea>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div>
                                    <label>Link (URL)</label>
                                    <input type="url" id="schLink">
                                </div>
                                <div>
                                    <label>State</label>
                                    <input type="text" id="schState" placeholder="Central">
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="full-width">
                                    <label>Help Link</label>
                                    <input type="url" id="schHelpLink" placeholder="https://wa.me/...">
                                </div>
                            </div>
                            <input type="hidden" id="schemeEditId">
                            <button type="submit" class="action-btn approve-btn" style="width:100%; padding:15px;">
                                <i class="fas fa-plus"></i> Save Scheme
                            </button>
                        </form>
                    </div>

                    <div style="margin-top:20px;">
                        <h3 style="margin-bottom:15px;">Active Schemes</h3>
                        <div style="overflow-x:auto; background:white; border-radius:8px; border:1px solid #e2e8f0;">
                            <table style="width:100%; border-collapse:collapse;">
                                <thead>
                                    <tr style="background:#f1f5f9; text-align:left;">
                                        <th style="padding:12px;">Name</th>
                                        <th style="padding:12px;">Category</th>
                                        <th style="padding:12px; text-align:center;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="adminSchemeTableBody">
                                    <tr><td colspan="3" style="text-align:center; padding:20px;">Loading...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- ARTICLES -->
                <div id="articles-management" class="content-section">
                    <div class="section-header">
                        <h2><i class="fas fa-newspaper"></i> Article Management</h2>
                    </div>

                    <div class="form-container" style="margin-bottom:30px;">
                        <form id="articleForm">
                            <div class="form-grid">
                                <div>
                                    <label>Title</label>
                                    <input type="text" id="artTitle" required>
                                </div>
                                <div>
                                    <label>Category</label>
                                    <input type="text" id="artCategory" required>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="full-width">
                                    <label>Content</label>
                                    <textarea id="artContent" rows="8" required></textarea>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div>
                                    <label>Publish Date</label>
                                    <input type="datetime-local" id="artDateTime" required>
                                </div>
                                <div>
                                    <label>Image URL</label>
                                    <input type="url" id="artImage" placeholder="https://example.com/image.jpg">
                                </div>
                            </div>
                            <input type="hidden" id="articleEditId">
                            <button type="submit" class="action-btn approve-btn" style="width:100%; padding:15px;">
                                <i class="fas fa-paper-plane"></i> Publish Article
                            </button>
                        </form>
                    </div>

                    <div style="margin-top:20px;">
                        <h3 style="margin-bottom:15px;">Published Articles</h3>
                        <div style="overflow-x:auto; background:white; border-radius:8px; border:1px solid #e2e8f0;">
                            <table style="width:100%; border-collapse:collapse;">
                                <thead>
                                    <tr style="background:#f1f5f9; text-align:left;">
                                        <th style="padding:12px;">Title</th>
                                        <th style="padding:12px;">Category</th>
                                        <th style="padding:12px; text-align:center;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="adminArticleTableBody">
                                    <tr><td colspan="3" style="text-align:center; padding:20px;">Loading...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- USERS -->
                <div id="user-management" class="content-section">
                    <div class="section-header">
                        <h2><i class="fas fa-users"></i> User Management</h2>
                    </div>
                    <div class="table-container">
                        <table id="usersTable">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Location</th>
                                    <th>Experience</th>
                                    <th>Registered</th>
                                    <th>Contact</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="7" class="loading-message">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- MODAL -->
    <div id="adminModal" class="admin-modal-overlay">
        <div class="admin-modal-content">
            <button id="closeModalBtn" class="modal-close-btn">&times;</button>
            <h2 id="modalTitle" style="margin-bottom:20px; color:var(--dark);"></h2>
            <div id="modalBodyContent"></div>
        </div>
    </div>

    <script>
        // ============================================================
        // CONFIGURATION - PRODUCTION READY
        // ============================================================
        const ADMIN_USER_ID = 99999;
        const ADMIN_STORAGE_KEY = 'agriAdminUser';
        const PENDING_LIMIT_QUICK_VIEW = 5;

        // Using relative URLs - NO localhost hardcoding
        // All API calls will use /api/... relative paths

        // ============================================================
        // STATE
        // ============================================================
        let allPendingStories = [];
        let allPendingFarmers = [];
        let allManagedStories = [];
        let allManagedFarmers = [];
        let allEquipment = [];
        let allReviews = [];
        let allComments = [];

        // ============================================================
        // AUTHENTICATION
        // ============================================================
        function checkAuth() {
            try {
                const userData = localStorage.getItem(ADMIN_STORAGE_KEY);
                if (userData) {
                    const user = JSON.parse(userData);
                    showDashboard(user.name || 'Agri Admin');
                    loadAllAdminData();
                } else {
                    document.getElementById('login-form-container').style.display = 'flex';
                    document.getElementById('dashboard-wrapper').style.display = 'none';
                }
            } catch (e) {
                localStorage.removeItem(ADMIN_STORAGE_KEY);
                document.getElementById('login-form-container').style.display = 'flex';
                document.getElementById('dashboard-wrapper').style.display = 'none';
            }
        }

        function showDashboard(adminName) {
            document.getElementById('login-form-container').style.display = 'none';
            document.getElementById('dashboard-wrapper').style.display = 'flex';
            document.getElementById('adminNameDisplay').textContent = adminName || 'Agri Admin';
        }

        async function handleAdminLogin(e) {
            e.preventDefault();
            const email = document.getElementById('adminEmail').value.trim();
            const password = document.getElementById('adminPassword').value.trim();
            const messageEl = document.getElementById('loginMessage');

            messageEl.style.display = 'block';
            messageEl.style.color = '#38a169';
            messageEl.textContent = 'Logging in...';

            try {
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.success) {
                    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(data.user));
                    messageEl.style.color = '#38a169';
                    messageEl.textContent = 'Login successful!';

                    setTimeout(() => {
                        showDashboard(data.user.name);
                        loadAllAdminData();
                    }, 500);
                } else {
                    messageEl.style.color = '#ef4444';
                    messageEl.textContent = data.message || 'Invalid credentials.';
                }
            } catch (error) {
                console.error('Login error:', error);
                messageEl.style.color = '#ef4444';
                messageEl.textContent = 'Unable to connect to server. Please try again.';
            }
        }

        function handleLogout(e) {
            e.preventDefault();
            localStorage.removeItem(ADMIN_STORAGE_KEY);
            window.location.reload();
        }

        // ============================================================
        // API HELPERS - All using relative URLs
        // ============================================================
        async function apiFetch(endpoint, options = {}) {
            if (!localStorage.getItem(ADMIN_STORAGE_KEY)) {
                checkAuth();
                return null;
            }

            try {
                const url = endpoint.startsWith('/api/') ? endpoint : `/api/admin/${endpoint}`;
                console.log('Fetching:', url);

                const response = await fetch(url, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...(options.headers || {})
                    }
                });

                if (!response.ok) {
                    const text = await response.text();
                    try {
                        const errorData = JSON.parse(text);
                        throw new Error(errorData.message || `HTTP ${response.status}`);
                    } catch {
                        throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
                    }
                }

                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return await response.json();
                }
                return { success: true, data: await response.text() };
            } catch (error) {
                console.error(`API Error (${endpoint}):`, error);
                showMessage('Connection Error', 'Unable to connect to the server. Please try again.');
                return null;
            }
        }

        // ============================================================
        // UTILITY FUNCTIONS
        // ============================================================
        function showMessage(title, message) {
            const modal = document.getElementById('adminModal');
            document.getElementById('modalTitle').textContent = title;
            document.getElementById('modalBodyContent').innerHTML = `<p>${message}</p>`;
            modal.classList.add('active');
        }

        function closeModal() {
            document.getElementById('adminModal').classList.remove('active');
        }

        function formatDate(dateString) {
            if (!dateString) return 'N/A';
            try {
                const date = new Date(dateString);
                return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
            } catch {
                return 'N/A';
            }
        }

        async function updateStatus(type, id, status) {
            if (!confirm(`Are you sure you want to ${status} this ${type}?`)) return false;

            try {
                const result = await apiFetch(`${type}/update-status`, {
                    method: 'POST',
                    body: JSON.stringify({ id, status })
                });

                if (result && result.success) {
                    showMessage('Success', `${type} ${status} successfully!`);
                    await loadAllAdminData();
                    return true;
                } else {
                    showMessage('Error', result?.message || 'Update failed.');
                    return false;
                }
            } catch (error) {
                console.error('Update error:', error);
                showMessage('Error', 'Failed to update status.');
                return false;
            }
        }

        async function deleteItem(type, id) {
            if (!confirm(`Delete this ${type}? This cannot be undone.`)) return false;

            try {
                // Different delete endpoints
                let url;
                if (type === 'review') {
                    url = `/api/reviews/${id}/${ADMIN_USER_ID}`;
                } else if (type === 'comment') {
                    url = `/api/comments/${id}/${ADMIN_USER_ID}`;
                } else {
                    url = `/api/admin/${type}/${id}`;
                }

                const response = await fetch(url, { method: 'DELETE' });
                const result = await response.json();

                if (result && result.success) {
                    showMessage('Success', `${type} deleted successfully!`);
                    await loadAllAdminData();
                    return true;
                } else {
                    showMessage('Error', result?.message || 'Delete failed.');
                    return false;
                }
            } catch (error) {
                console.error('Delete error:', error);
                showMessage('Error', 'Failed to delete item.');
                return false;
            }
        }

        // ============================================================
        // DATA LOADING
        // ============================================================
        async function loadDashboardStats() {
            const stats = await apiFetch('stats');
            if (stats) {
                document.getElementById('statTotalUsers').textContent = (stats.totalUsers || 0).toLocaleString();
                document.getElementById('statPendingStories').textContent = (stats.pendingStories || 0).toLocaleString();
                document.getElementById('statPendingFarmers').textContent = (stats.pendingFarmers || 0).toLocaleString();
                document.getElementById('statTotalPending').textContent = (stats.pendingApprovals || 0).toLocaleString();
                document.getElementById('pendingApprovalsCount').textContent = (stats.pendingApprovals || 0).toLocaleString();
            }
        }

        async function loadAllApprovalItems() {
            const [pendingStories, pendingFarmers, managedStories, managedFarmers, equipment] = await Promise.all([
                apiFetch('stories/pending'),
                apiFetch('farmers/pending'),
                apiFetch('stories/all'),
                apiFetch('farmers/all'),
                apiFetch('equipment/all')
            ]);

            allPendingStories = pendingStories || [];
            allPendingFarmers = pendingFarmers || [];
            allManagedStories = managedStories || [];
            allManagedFarmers = managedFarmers || [];
            allEquipment = equipment || [];

            renderQuickApprovals();
            renderPendingStoriesTable();
            renderManagedStoriesTable();
            renderPendingFarmersTable();
            renderManagedFarmersTable();
            renderEquipmentTable();
        }

        async function loadReviewAndCommentData() {
            try {
                const [reviews, comments] = await Promise.all([
                    fetch('/api/reviews').then(r => r.json()).catch(() => []),
                    apiFetch('comments/all')
                ]);
                allReviews = reviews || [];
                allComments = comments || [];
                renderReviewsTable();
                renderCommentsTable();
            } catch (error) {
                console.error('Error loading reviews/comments:', error);
                allReviews = [];
                allComments = [];
                renderReviewsTable();
                renderCommentsTable();
            }
        }

        // ============================================================
        // RENDER FUNCTIONS
        // ============================================================
        function renderQuickApprovals() {
            const tbody = document.querySelector('#quickApprovalsTable tbody');
            const combined = [
                ...allPendingStories.map(s => ({ ...s, type: 'Story', content: s.story_text, submitter: s.author_name })),
                ...allPendingFarmers.map(f => ({ ...f, type: 'Farmer', content: f.farm_name + ' - ' + f
                        .crop_specialization, submitter: f.farm_name }))
            ].sort((a, b) => new Date(a.submission_date) - new Date(b.submission_date));

            if (combined.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="loading-message">No pending approvals.</td></tr>';
                return;
            }

            tbody.innerHTML = combined.slice(0, PENDING_LIMIT_QUICK_VIEW).map(item => `
                <tr>
                    <td><span class="status pending">${item.type}</span></td>
                    <td>${item.submitter}</td>
                    <td class="text-truncate" title="${item.content}">${item.content.substring(0, 50)}...</td>
                    <td>${formatDate(item.submission_date)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" data-type="${item.type.toLowerCase()}" data-id="${item.id}">View</button>
                            <button class="action-btn approve-btn" data-type="${item.type.toLowerCase()}" data-id="${item.id}">Approve</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        function renderPendingStoriesTable() {
            const tbody = document.querySelector('#storiesTable tbody');
            if (allPendingStories.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="loading-message">No pending stories.</td></tr>';
                return;
            }
            tbody.innerHTML = allPendingStories.map(s => `
                <tr>
                    <td>#${s.id}</td>
                    <td>${s.author_name}</td>
                    <td>${s.location}</td>
                    <td>${formatDate(s.submission_date)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" data-type="story" data-id="${s.id}">View</button>
                            <button class="action-btn approve-btn" data-type="story" data-id="${s.id}">Approve</button>
                            <button class="action-btn reject-btn" data-type="story" data-id="${s.id}">Reject</button>
                            <button class="action-btn delete-btn" data-type="story" data-id="${s.id}">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        function renderManagedStoriesTable() {
            const tbody = document.querySelector('#allStoriesTable tbody');
            if (allManagedStories.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="loading-message">No stories found.</td></tr>';
                return;
            }
            tbody.innerHTML = allManagedStories.map(s => `
                <tr>
                    <td>#${s.id}</td>
                    <td>${s.author_name}</td>
                    <td><span class="status ${s.status.toLowerCase()}">${s.status}</span></td>
                    <td>${s.location}</td>
                    <td>${formatDate(s.submission_date)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" data-type="story" data-id="${s.id}">View</button>
                            <button class="action-btn delete-btn" data-type="story" data-id="${s.id}">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        function renderPendingFarmersTable() {
            const tbody = document.querySelector('#farmersTable tbody');
            if (allPendingFarmers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="loading-message">No pending farmers.</td></tr>';
                return;
            }
            tbody.innerHTML = allPendingFarmers.map(f => `
                <tr>
                    <td>#${f.id}</td>
                    <td>${f.farm_name}</td>
                    <td>${f.crop_specialization}</td>
                    <td>${f.farm_location}</td>
                    <td>${f.contact_email}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" data-type="farmer" data-id="${f.id}">View</button>
                            <button class="action-btn approve-btn" data-type="farmer" data-id="${f.id}">Approve</button>
                            <button class="action-btn reject-btn" data-type="farmer" data-id="${f.id}">Reject</button>
                            <button class="action-btn delete-btn" data-type="farmer" data-id="${f.id}">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        function renderManagedFarmersTable() {
            const tbody = document.querySelector('#allFarmersTable tbody');
            if (allManagedFarmers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="loading-message">No farmers found.</td></tr>';
                return;
            }
            tbody.innerHTML = allManagedFarmers.map(f => `
                <tr>
                    <td>#${f.id}</td>
                    <td>${f.farm_name}</td>
                    <td><span class="status ${f.status.toLowerCase()}">${f.status}</span></td>
                    <td>${f.farm_location}</td>
                    <td>${f.contact_email}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" data-type="farmer" data-id="${f.id}">View</button>
                            <button class="action-btn delete-btn" data-type="farmer" data-id="${f.id}">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        function renderEquipmentTable() {
            const tbody = document.querySelector('#equipmentTable tbody');
            if (allEquipment.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="loading-message">No equipment found.</td></tr>';
                return;
            }
            tbody.innerHTML = allEquipment.map(e => `
                <tr>
                    <td>#${e.id}</td>
                    <td>${e.name}</td>
                    <td>${e.category}</td>
                    <td>${e.condition_status}</td>
                    <td>$${Number(e.price).toFixed(2)}</td>
                    <td>${e.seller_name}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" data-type="equipment" data-id="${e.id}">View</button>
                            <button class="action-btn delete-btn" data-type="equipment" data-id="${e.id}">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        function renderReviewsTable() {
            const tbody = document.querySelector('#reviewsTable tbody');
            if (allReviews.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="loading-message">No reviews found.</td></tr>';
                return;
            }
            tbody.innerHTML = allReviews.map(r => `
                <tr>
                    <td>#${r.id}</td>
                    <td>${r.authorName}</td>
                    <td>${r.rating} <i class="fas fa-star" style="color:gold;"></i></td>
                    <td class="text-truncate" title="${r.text}">${r.text.substring(0, 50)}...</td>
                    <td>${formatDate(r.timestamp)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" data-type="review" data-id="${r.id}">View</button>
                            <button class="action-btn delete-btn" data-type="review" data-id="${r.id}">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        function renderCommentsTable() {
            const tbody = document.querySelector('#commentsTable tbody');
            if (allComments.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="loading-message">No comments found.</td></tr>';
                return;
            }
            tbody.innerHTML = allComments.map(c => `
                <tr>
                    <td>#${c.id}</td>
                    <td>${c.page_identifier}</td>
                    <td>${c.authorName}</td>
                    <td class="text-truncate" title="${c.text}">${c.text.substring(0, 50)}...</td>
                    <td>${formatDate(c.timestamp)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" data-type="comment" data-id="${c.id}">View</button>
                            <button class="action-btn delete-btn" data-type="comment" data-id="${c.id}">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        // ============================================================
        // LOAD USERS
        // ============================================================
        async function loadUsersTable() {
            const users = await apiFetch('users');
            const tbody = document.querySelector('#usersTable tbody');
            if (!users || users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="loading-message">No users found.</td></tr>';
                return;
            }
            tbody.innerHTML = users.map(u => `
                <tr>
                    <td>#${u.id}</td>
                    <td>${u.name}</td>
                    <td>${u.email}</td>
                    <td>${u.location || 'N/A'}</td>
                    <td>${u.years_experience || 0} yrs</td>
                    <td>${formatDate(u.created_at)}</td>
                    <td>${u.contact_number || 'N/A'}</td>
                </tr>
            `).join('');
        }

        // ============================================================
        // SCHEME MANAGEMENT
        // ============================================================
        async function loadSchemesTable() {
            const tbody = document.getElementById('adminSchemeTableBody');
            try {
                const res = await fetch('/api/schemes');
                const schemes = await res.json();
                if (!schemes || schemes.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">No schemes found.</td></tr>';
                    return;
                }
                tbody.innerHTML = schemes.map(s => `
                    <tr>
                        <td style="padding:12px; font-weight:600;">${s.name}</td>
                        <td style="padding:12px;">${s.category}</td>
                        <td style="padding:12px; text-align:center;">
                            <button onclick='fillFormForEdit(${JSON.stringify(s)})' style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; padding:6px 10px; border-radius:4px; cursor:pointer; margin-right:5px;">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button onclick="deleteScheme(${s.id})" style="background:#fee2e2; color:#dc2626; border:1px solid #fecaca; padding:6px 10px; border-radius:4px; cursor:pointer;">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </td>
                    </tr>
                `).join('');
            } catch (err) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red;">Failed to load schemes.</td></tr>';
            }
        }

        function fillFormForEdit(scheme) {
            document.getElementById('schName').value = scheme.name;
            document.getElementById('schCategory').value = scheme.category;
            document.getElementById('schDesc').value = scheme.description;
            document.getElementById('schElig').value = scheme.eligibility;
            document.getElementById('schDocs').value = scheme.documents || '';
            document.getElementById('schSteps').value = scheme.roadmap || '';
            document.getElementById('schLink').value = scheme.link || '';
            document.getElementById('schState').value = scheme.state || '';
            document.getElementById('schHelpLink').value = scheme.help_link || '';
            document.getElementById('schemeEditId').value = scheme.id;

            const btn = document.querySelector('#addSchemeForm button[type="submit"]');
            btn.innerHTML = '<i class="fas fa-sync"></i> Update Scheme';
            btn.style.background = '#3b82f6';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        async function deleteScheme(id) {
            if (!confirm("Delete this scheme permanently?")) return;
            try {
                const res = await fetch(`/api/admin/schemes/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    showMessage('Success', 'Scheme deleted!');
                    loadSchemesTable();
                    loadDashboardStats();
                }
            } catch (err) {
                showMessage('Error', 'Delete failed.');
            }
        }

        document.getElementById('addSchemeForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = document.getElementById('schemeEditId').value;
            const data = {
                id: editId || null,
                name: document.getElementById('schName').value,
                category: document.getElementById('schCategory').value,
                description: document.getElementById('schDesc').value,
                eligibility: document.getElementById('schElig').value,
                documents: document.getElementById('schDocs').value,
                roadmap: document.getElementById('schSteps').value,
                link: document.getElementById('schLink').value,
                state: document.getElementById('schState').value,
                help_link: document.getElementById('schHelpLink').value || '#'
            };

            try {
                const res = await fetch('/api/admin/schemes/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (result.success) {
                    showMessage('Success', editId ? 'Scheme updated!' : 'Scheme added!');
                    document.getElementById('addSchemeForm').reset();
                    document.getElementById('schemeEditId').value = '';
                    const btn = document.querySelector('#addSchemeForm button[type="submit"]');
                    btn.innerHTML = '<i class="fas fa-plus"></i> Save Scheme';
                    btn.style.background = '';
                    loadSchemesTable();
                    loadDashboardStats();
                } else {
                    showMessage('Error', result.message || 'Save failed.');
                }
            } catch (err) {
                showMessage('Error', 'Could not save scheme.');
            }
        });

        // ============================================================
        // ARTICLE MANAGEMENT
        // ============================================================
        async function loadArticlesTable() {
            const tbody = document.getElementById('adminArticleTableBody');
            try {
                const res = await fetch('/api/articles');
                const articles = await res.json();
                if (!articles || articles.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">No articles found.</td></tr>';
                    return;
                }
                tbody.innerHTML = articles.map(a => `
                    <tr>
                        <td style="padding:10px; font-weight:600;">${a.title}</td>
                        <td style="padding:10px;">${a.category}</td>
                        <td style="padding:10px; text-align:center;">
                            <button onclick='fillArticleFormForEdit(${JSON.stringify(a)})' class="action-btn view-btn">Edit</button>
                            <button onclick="deleteArticle(${a.id})" class="action-btn reject-btn">Delete</button>
                        </td>
                    </tr>
                `).join('');
            } catch (err) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red;">Failed to load articles.</td></tr>';
            }
        }

        function fillArticleFormForEdit(article) {
            document.getElementById('artTitle').value = article.title;
            document.getElementById('artCategory').value = article.category;
            document.getElementById('artContent').value = article.content;
            document.getElementById('artImage').value = article.image_url || '';
            document.getElementById('articleEditId').value = article.id;

            if (article.published_at) {
                const d = new Date(article.published_at);
                document.getElementById('artDateTime').value = d.toISOString().slice(0, 16);
            }

            const btn = document.getElementById('saveArtBtn');
            btn.innerHTML = '<i class="fas fa-sync"></i> Update Article';
            btn.style.background = '#3b82f6';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        async function deleteArticle(id) {
            if (!confirm("Delete this article permanently?")) return;
            try {
                const res = await fetch(`/api/admin/articles/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    showMessage('Success', 'Article deleted!');
                    loadArticlesTable();
                }
            } catch (err) {
                showMessage('Error', 'Delete failed.');
            }
        }

        document.getElementById('articleForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = document.getElementById('articleEditId').value;
            const data = {
                id: editId || null,
                title: document.getElementById('artTitle').value,
                category: document.getElementById('artCategory').value,
                content: document.getElementById('artContent').value,
                image_url: document.getElementById('artImage').value,
                date: document.getElementById('artDateTime').value
            };

            try {
                const res = await fetch('/api/admin/articles/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (result.success) {
                    showMessage('Success', editId ? 'Article updated!' : 'Article published!');
                    document.getElementById('articleForm').reset();
                    document.getElementById('articleEditId').value = '';
                    const btn = document.getElementById('saveArtBtn');
                    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish Article';
                    btn.style.background = '';
                    loadArticlesTable();
                } else {
                    showMessage('Error', result.message || 'Save failed.');
                }
            } catch (err) {
                showMessage('Error', 'Could not save article.');
            }
        });

        // ============================================================
        // NAVIGATION
        // ============================================================
        window.navigateTo = function(sectionId) {
            document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
            const navItem = document.querySelector(`[data-target="${sectionId}"]`);
            if (navItem) navItem.classList.add('active');

            document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
            const section = document.getElementById(sectionId);
            if (section) section.classList.add('active');

            // Load data when switching tabs
            switch (sectionId) {
                case 'user-management':
                    loadUsersTable();
                    break;
                case 'reviews-management':
                    renderReviewsTable();
                    break;
                case 'comments-management':
                    renderCommentsTable();
                    break;
                case 'equipment-management':
                    renderEquipmentTable();
                    break;
                case 'scheme-management':
                    loadSchemesTable();
                    break;
                case 'articles-management':
                    loadArticlesTable();
                    break;
            }
        };

        // ============================================================
        // MAIN LOAD FUNCTION
        // ============================================================
        async function loadAllAdminData() {
            try {
                await loadDashboardStats();
                await loadAllApprovalItems();
                await loadReviewAndCommentData();
                await loadSchemesTable();
                await loadArticlesTable();

                if (document.getElementById('user-management').classList.contains('active')) {
                    await loadUsersTable();
                }
            } catch (error) {
                console.error('Error loading admin data:', error);
                showMessage('Error', 'Failed to load some data. Please refresh.');
            }
        }

        // ============================================================
        // EVENT HANDLERS
        // ============================================================
        // Action buttons (delegated)
        document.addEventListener('click', function(e) {
            const target = e.target.closest('button');
            if (!target) return;

            const type = target.dataset.type;
            const id = target.dataset.id;

            if (target.classList.contains('approve-btn')) {
                updateStatus(type, id, 'approved');
            } else if (target.classList.contains('reject-btn') && !target.classList.contains('delete-btn')) {
                updateStatus(type, id, 'rejected');
            } else if (target.classList.contains('delete-btn')) {
                deleteItem(type, id);
            } else if (target.classList.contains('view-btn')) {
                viewDetails(type, id);
            }
        });

        function viewDetails(type, id) {
            let item = null;
            if (type === 'story') {
                item = allPendingStories.find(s => s.id == id) || allManagedStories.find(s => s.id == id);
            } else if (type === 'farmer') {
                item = allPendingFarmers.find(f => f.id == id) || allManagedFarmers.find(f => f.id == id);
            } else if (type === 'review') {
                item = allReviews.find(r => r.id == id);
            } else if (type === 'comment') {
                item = allComments.find(c => c.id == id);
            } else if (type === 'equipment') {
                item = allEquipment.find(e => e.id == id);
            }

            if (!item) {
                showMessage('Error', 'Item not found.');
                return;
            }

            let content = '';
            let title = '';

            if (item.story_text !== undefined) {
                title = `Story #${id}`;
                content = `
                    <div class="modal-detail-item"><strong>Author:</strong> ${item.author_name}</div>
                    <div class="modal-detail-item"><strong>Location:</strong> ${item.location}</div>
                    <div class="modal-detail-item"><strong>Status:</strong> <span class="status ${(item.status || 'pending').toLowerCase()}">${item.status || 'Pending'}</span></div>
                    <div class="modal-detail-item"><strong>Date:</strong> ${formatDate(item.submission_date)}</div>
                    <div class="modal-detail-item"><strong>Story:</strong> <p style="white-space:pre-wrap;">${item.story_text}</p></div>
                `;
            } else if (item.rating !== undefined) {
                title = `Review #${id}`;
                content = `
                    <div class="modal-detail-item"><strong>User:</strong> ${item.authorName}</div>
                    <div class="modal-detail-item"><strong>Rating:</strong> ${item.rating}/5 <i class="fas fa-star" style="color:gold;"></i></div>
                    <div class="modal-detail-item"><strong>Date:</strong> ${formatDate(item.timestamp)}</div>
                    <div class="modal-detail-item"><strong>Review:</strong> <p style="white-space:pre-wrap;">${item.text}</p></div>
                `;
            } else if (item.page_identifier !== undefined) {
                title = `Comment #${id}`;
                content = `
                    <div class="modal-detail-item"><strong>User:</strong> ${item.authorName}</div>
                    <div class="modal-detail-item"><strong>Page:</strong> ${item.page_identifier}</div>
                    <div class="modal-detail-item"><strong>Date:</strong> ${formatDate(item.timestamp)}</div>
                    <div class="modal-detail-item"><strong>Comment:</strong> <p style="white-space:pre-wrap;">${item.text}</p></div>
                `;
            } else if (item.price !== undefined) {
                title = `Equipment #${id}`;
                content = `
                    <div class="modal-detail-item"><strong>Name:</strong> ${item.name}</div>
                    <div class="modal-detail-item"><strong>Seller:</strong> ${item.seller_name}</div>
                    <div class="modal-detail-item"><strong>Category:</strong> ${item.category}</div>
                    <div class="modal-detail-item"><strong>Condition:</strong> ${item.condition_status}</div>
                    <div class="modal-detail-item"><strong>Price:</strong> $${Number(item.price).toFixed(2)}</div>
                    <div class="modal-detail-item"><strong>Description:</strong> <p style="white-space:pre-wrap;">${item.description || 'N/A'}</p></div>
                `;
            } else {
                title = `Farmer #${id}`;
                content = `
                    <div class="modal-detail-item"><strong>Farm:</strong> ${item.farm_name}</div>
                    <div class="modal-detail-item"><strong>Crop:</strong> ${item.crop_specialization}</div>
                    <div class="modal-detail-item"><strong>Location:</strong> ${item.farm_location}</div>
                    <div class="modal-detail-item"><strong>Email:</strong> ${item.contact_email}</div>
                    <div class="modal-detail-item"><strong>Status:</strong> <span class="status ${(item.status || 'pending').toLowerCase()}">${item.status || 'Pending'}</span></div>
                    <div class="modal-detail-item"><strong>Date:</strong> ${formatDate(item.submission_date)}</div>
                `;
            }

            document.getElementById('modalTitle').textContent = title;
            document.getElementById('modalBodyContent').innerHTML = content;
            document.getElementById('adminModal').classList.add('active');
        }

        // Close modal
        document.getElementById('closeModalBtn').addEventListener('click', closeModal);
        document.getElementById('adminModal').addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });

        // Login/Logout
        document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
        document.getElementById('logoutLink').addEventListener('click', handleLogout);

        // Sidebar toggle
        document.querySelector('.toggle-sidebar').addEventListener('click', function() {
            document.querySelector('.sidebar').classList.toggle('active');
        });

        // Navigation clicks
        document.querySelectorAll('.nav-links li[data-target]').forEach(el => {
            el.addEventListener('click', function() {
                navigateTo(this.dataset.target);
            });
        });

        // ============================================================
        // INIT
        // ============================================================
        document.addEventListener('DOMContentLoaded', function() {
            checkAuth();
            // Initial loads
            loadSchemesTable();
            loadArticlesTable();
        });
    </script>
</body>
</html>