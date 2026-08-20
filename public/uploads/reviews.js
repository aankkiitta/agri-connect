let selectedRating = 0;
let currentPage = 1;

// -------- Page Name ----------
function getPageName() {
  if (window.customPageName) return window.customPageName;
  let file = window.location.pathname.split("/").pop();
  return file.replace(".html", "") || "home";
}

// -------- Stars ----------
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

// -------- Submit ----------
async function submitReview() {
  const textEl = document.getElementById("reviewText");
  const userEl = document.getElementById("reviewUser");
  const photoEl = document.getElementById("userPhoto");

  if (!textEl || !userEl || !photoEl) {
    alert("Review form not found on page");
    return;
  }

  const text = textEl.value.trim();
  const username = userEl.value.trim();
  const photo = photoEl.files[0];

  if (!selectedRating) return alert("Please select a rating");
  if (!text) return alert("Please write a review");

  const formData = new FormData();
  formData.append("rating", selectedRating);
  formData.append("review_text", text);
  formData.append("page_name", getPageName());
  formData.append("username", username);
  if (photo) formData.append("photo", photo);

  try {
    const res = await fetch("/api/reviews/add", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!data.success) {
      console.error("Review not saved:", data);
      alert("Error saving review");
      return;
    }

    // reset
    textEl.value = "";
    photoEl.value = "";
    selectedRating = 0;
    document
      .querySelectorAll(".review-stars .star")
      .forEach((s) => s.classList.remove("active"));

    currentPage = 1;
    loadReviews();
    loadAverageRating();
  } catch (err) {
    console.error("Submit review error:", err);
    alert("Network error submitting review");
  }
}

// -------- Load Reviews ----------
async function loadReviews() {
  const listEl = document.getElementById("reviewList");
  const pageLabel = document.getElementById("pageNumber");
  if (!listEl || !pageLabel) return;

  try {
    const res = await fetch(
      `/api/reviews/list?page_name=${getPageName()}&page_no=${currentPage}`
    );
    const data = await res.json();

    if (!data.length) {
      listEl.innerHTML =
        "<p style='padding:10px;color:#6b7280'>No reviews yet.</p>";
      return;
    }

    let html = "";
    data.forEach((r) => {
      const imgPath = r.user_photo
        ? "/" + r.user_photo.replace(/\\/g, "/")
        : "/default-avatar.png";

      html += `
        <div class="review-item">
          <img src="${imgPath}" class="review-user-photo">
          <div>
            <div class="review-username">${r.username}</div>
            <div class="review-stars-display">${"★".repeat(r.rating)}</div>
            <div class="review-text">${r.review_text}</div>
          </div>
        </div>`;
    });

    listEl.innerHTML = html;
    pageLabel.textContent = "Page " + currentPage;
  } catch (err) {
    console.error("Load reviews error:", err);
    listEl.innerHTML =
      "<p style='padding:10px;color:red'>Error loading reviews</p>";
  }
}

// -------- Pagination ----------
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

// -------- Average ----------
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
    console.error("Average rating error:", err);
    avgEl.textContent = "0.0 ★ (0 reviews)";
  }
}

// -------- Init ----------
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

window.submitReview = submitReview;
window.nextPage = nextPage;
window.prevPage = prevPage;
