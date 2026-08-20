let selectedRating = 0;
let currentPage = 1;

// ===== GLOBAL PAGE NAME (FIXED) =====
function getPageName() {
  return "global"; // 🔥 SAME reviews on all pages
}

// ===== STARS =====
function initStars() {
  const stars = document.querySelectorAll(".review-stars .star");
  if (!stars.length) return;

  stars.forEach((star) => {
    star.addEventListener("click", () => {
      selectedRating = parseInt(star.dataset.star, 10);

      stars.forEach((s) => s.classList.remove("active"));
      for (let i = 0; i < selectedRating; i++) {
        stars[i].classList.add("active");
      }
    });

    star.addEventListener("mouseover", () => {
      stars.forEach((s) => s.classList.remove("hover"));
      for (let i = 0; i < parseInt(star.dataset.star, 10); i++) {
        stars[i].classList.add("hover");
      }
    });

    star.addEventListener("mouseleave", () => {
      stars.forEach((s) => s.classList.remove("hover"));
    });
  });
}

// ===== SUBMIT REVIEW =====
// ===== SUBMIT REVIEW (FULL WORKING CODE) =====
async function submitReview() {
  const textEl = document.getElementById("reviewText");
  const photoEl = document.getElementById("userPhoto");
  // Note: selectedRating must be defined globally in your script to work here

  // 1. DATA VALIDATION: Check if text and rating are present
  const text = textEl ? textEl.value.trim() : "";
  if (!text) {
    alert("Please write a message for your review.");
    return;
  }

  if (selectedRating === 0) {
    alert("Please select a star rating.");
    return;
  }

  // 2. AUTHENTICATION: Retrieve User ID from multiple possible storage keys
  let userId = null;
  let username = "Anonymous";

  // Check 'agriUser' (used in your main agri.js auth logic) 
  // or 'user' (used in your login route response)
  const storedUser = localStorage.getItem("agriUser") || localStorage.getItem("user");

  if (storedUser) {
    try {
      const userObj = JSON.parse(storedUser);
      userId = userObj.id; // Extract DB ID
      username = userObj.name || "Anonymous";
    } catch (e) {
      console.error("Auth Error: Could not parse stored user data.", e);
    }
  }

  // Fallback for direct userId key
  if (!userId) {
    userId = localStorage.getItem("userId");
  }

  // Final check: If no ID, block the post
  if (!userId) {
    alert("You must be logged in to post a review.");
    return;
  }

  // 3. PREPARE FORM DATA
  const formData = new FormData();
  formData.append("userId", userId);
  formData.append("rating", selectedRating);
  formData.append("username", username); 
  formData.append("review_text", text);
  formData.append("page_name", getPageName()); // Uses your global "global" or "home" setting
  
  // Handle file upload
  if (photoEl && photoEl.files[0]) {
    formData.append("photo", photoEl.files[0]);
  }

  // 4. API REQUEST
  try {
    const res = await fetch("/api/reviews/add", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!data.success) {
      alert("Error saving review: " + (data.message || "Unknown error"));
      return;
    }

    // 5. SUCCESS UI RESET
    alert("Review posted successfully!");
    
    // Clear inputs
    if (textEl) textEl.value = "";
    if (photoEl) photoEl.value = "";
    
    // Reset stars
    selectedRating = 0;
    document.querySelectorAll(".review-stars .star")
            .forEach((s) => s.classList.remove("active", "hover"));

    // Refresh display
    currentPage = 1;
    if (typeof loadReviews === "function") loadReviews();
    if (typeof loadAverageRating === "function") loadAverageRating();

  } catch (err) {
    console.error("Network Error:", err);
    alert("Could not connect to the server. Please check if your backend is running on port 3000.");
  }
}

// ===== LOAD REVIEWS =====
async function loadReviews() {
  const listEl = document.getElementById("reviewList");
  const indicatorEl = document.getElementById("pageIndicator"); // 🔥 Targeted the span
  
  if (!listEl) return;

  try {
    const res = await fetch(
      `/api/reviews/list?page_name=${getPageName()}&page_no=${currentPage}`
    );

    const data = await res.json();

    // --- UI SYNC: Update the "Page X" text ---
    if (indicatorEl) {
        indicatorEl.textContent = `Page ${currentPage}`;
    }

    if (!Array.isArray(data)) {
      console.error("Invalid response format:", data);
      return;
    }
    
    if (data.length === 0) {
      listEl.innerHTML = `<p class="no-reviews">No reviews found on Page ${currentPage}.</p>`;
      return;
    }

    // Render the list (using the compact UI we discussed)
  listEl.innerHTML = data.map(r => {
    const profilePic = r.profile_picture_url || '/uploads/default.png';
    
    // AUTH CHECK: Is the current user the author or the Admin?
    const storedUser = JSON.parse(localStorage.getItem("agriUser") || "{}");
    const isOwner = storedUser.id === r.user_id;
    const isAdmin = storedUser.id === 99999; // Matches your ADMIN_USER_ID

    return `
      <div class="review-item">
        <img src="${profilePic}" class="review-user-photo" onerror="this.src='/uploads/default.png'">
        <div style="flex-grow: 1;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
              <div class="review-username" onclick="window.openDetailedProfile(this)" 
                   data-name="${r.authorName}" data-pic="${profilePic}">
                   ${r.authorName || r.username}
              </div>
              ${(isOwner || isAdmin) ? `
                <button onclick="deleteReview(${r.id})" class="btn-delete-small">
                    <i class="fas fa-trash"></i>
                </button>` : ''}
          </div>
          <div class="review-stars-display">${"★".repeat(r.rating)}</div>
          <p class="review-text">${r.text}</p>
        </div>
      </div>
    `;
}).join('');

  } catch (err) {
    console.error("Load error:", err);
    listEl.innerHTML = "<p>Server error loading reviews</p>";
  }
}

// ===== PAGINATION =====
function nextPage() {
  currentPage++;
  loadReviews();
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    loadReviews();
  }
}

// ===== AVERAGE RATING =====
async function loadAverageRating() {
  const avgEl = document.getElementById("avgRating");
  if (!avgEl) return;

  try {
    const res = await fetch(
      `/api/reviews/average?page_name=${getPageName()}`
    );

    const data = await res.json();

    const avg = Number(data.avg_rating || 0).toFixed(1);
    const total = data.total || 0;

    avgEl.textContent = `${avg} ★ (${total} reviews)`;

  } catch (err) {
    console.error(err);
    avgEl.textContent = "0.0 ★ (0 reviews)";
  }
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  fetch("reviews-component.html")
    .then((res) => res.text())
    .then((html) => {
      const container = document.getElementById("reviews-container");
      if (!container) return;

      container.innerHTML = html;

      initStars();
      loadReviews();
      loadAverageRating();
    });
});

function openProfile(userId) {
  window.open(`profile-viewer.html?userId=${userId}`, "_blank");
}


window.deleteReview = async function(reviewId) {
    if (!confirm("Are you sure you want to delete this review?")) return;

    // Get the current user ID for the security check on the server
    const storedUser = JSON.parse(localStorage.getItem("agriUser") || localStorage.getItem("user") || "{}");
    
    if (!storedUser.id) {
        alert("You must be logged in to perform this action.");
        return;
    }

    try {
        const res = await fetch(`/api/reviews/${reviewId}/${storedUser.id}`, {
            method: 'DELETE'
        });
        const data = await res.json();

        if (data.success) {
            alert("Review removed successfully.");
            loadReviews(); // Refresh the list
            loadAverageRating(); // Refresh the average stars
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error("Delete Error:", err);
        alert("Network error: Could not delete review.");
    }
};

window.openDetailedProfile = function(element) {
    const userProfile = {
        name: element.dataset.name,
        email: element.dataset.email,
        contact: element.dataset.contact,
        pic: element.dataset.pic,
        experience: element.dataset.experience,
        location: element.dataset.location,
        isExpert: element.dataset.isExpert
    };

    const params = new URLSearchParams(userProfile);
    window.location.href = `profile-viewer.html?${params.toString()}`;
};

// reviews.js
window.nextPage = async function() {
    const listEl = document.getElementById("reviewList");
    
    // Check if the current list has fewer than 3 items
    // If it has 3, there might be another page. If it has 0-2, it's the end.
    if (listEl && listEl.children.length < 3) { 
        alert("You are on the last page.");
        return;
    }

    currentPage++;
    await loadReviews();
    
    // Smooth scroll back to top of reviews
    const container = document.getElementById('reviews-container');
    if(container) {
        window.scrollTo({ top: container.offsetTop - 100, behavior: 'smooth' });
    }
};
window.prevPage = async function() {
    if (currentPage > 1) {
        currentPage--;
        await loadReviews();
        window.scrollTo({ top: document.getElementById('reviews-container').offsetTop - 100, behavior: 'smooth' });
    }
};
// ===== GLOBAL FUNCTIONS =====
window.submitReview = submitReview;
window.nextPage = nextPage;
window.prevPage = prevPage;