const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const nowStr = () => new Date().toLocaleString();
const uid = () => Date.now().toString() + Math.floor(Math.random() * 1000);

// ---------- Storage Keys ----------
const LS_USERS = "mini_users_v1";
const LS_SESSION = "mini_session_v1";
const LS_POSTS = "mini_posts_v1";

// ---------- App State ----------
let state = {
  user: null,
  posts: [],
  editingId: null,
};

// ---------- DOM Elements ----------
const authView = $("#auth");
const appView = $("#app");
const authForm = $("#auth-form");
const authTitle = $("#auth-title");
const authSubmit = $("#auth-submit");
const toggleAuth = $("#toggle-auth");
const nameInput = $("#name");
const emailInput = $("#email");
const passwordInput = $("#password");
// const rememberMe = $("#rememberMe");

const welcomeEl = $("#welcome");
const logoutBtn = $("#logout");
const themeToggle = $("#theme-toggle");

const postText = $("#post-text");
const postImage = $("#post-image");
const postBtn = $("#post-btn");
const feed = $("#feed");
const searchInput = $("#search");
const sortSelect = $("#sort");
const emojiButtons = $$(".emoji-picker button");

const editModal = $("#edit-modal");
const editText = $("#edit-text");
const editImage = $("#edit-image");
const saveEdit = $("#save-edit");
const cancelEdit = $("#cancel-edit");

// ---------- Init ----------
function loadFromStorage() {
  const users = JSON.parse(localStorage.getItem(LS_USERS) || "[]");
  const posts = JSON.parse(localStorage.getItem(LS_POSTS) || "[]");
  const session = JSON.parse(localStorage.getItem(LS_SESSION) || "null");
  state.posts = posts;
  if (session && session.remember && session.email) {
    const u = users.find((x) => x.email === session.email);
    if (u) {
      state.user = u;
      showApp();
    }
  }
}
function savePosts() {
  localStorage.setItem(LS_POSTS, JSON.stringify(state.posts));
}
function saveSession(obj) {
  localStorage.setItem(LS_SESSION, JSON.stringify(obj));
}

// ---------- Auth UI / Flow ----------
let isLogin = true;
function setAuthMode(login) {
  isLogin = login;
  authTitle.textContent = login ? "Login" : "Signup";
  authSubmit.textContent = login ? "Login" : "Signup";
  toggleAuth.textContent = login ? "Go to Signup" : "Go to Login";
  nameInput.style.display = login ? "none" : "block"; 
}
toggleAuth.addEventListener("click", () => setAuthMode(!isLogin));

authForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const users = JSON.parse(localStorage.getItem(LS_USERS) || "[]");
  const name = nameInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();
  const pwd = passwordInput.value;

  if (isLogin) {
    const u = users.find((x) => x.email === email && x.password === pwd);
    if (u) {
      state.user = u;
      saveSession({ email: u.email, remember: true });
      showApp();
    } else {
      alert("Login failed. Check credentials.");
    }
  } else {
    if (!name) {
      alert("Please enter a name");
      return;
    }
    if (users.some((x) => x.email === email)) {
      alert("Email already used");
      return;
    }
    const newUser = { id: uid(), name, email, password: pwd };
    users.push(newUser);
    localStorage.setItem(LS_USERS, JSON.stringify(users));
    state.user = newUser;
    saveSession({ email: newUser.email });
    showApp();
  }
});

// ---------- Show App / Logout ----------
function showApp() {
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
  welcomeEl.textContent = `Welcome, ${state.user.name}`;
  renderPosts();
}
logoutBtn.addEventListener("click", () => {
  state.user = null;
  saveSession(null);
  authView.classList.remove("hidden");
  appView.classList.add("hidden");
});

// ---------- Theme toggle ----------
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  themeToggle.textContent = document.body.classList.contains("dark")
    ? "☀️"
    : "🌙";
});

// ---------- Create Post ----------
postBtn.addEventListener("click", () => {
  const text = postText.value.trim();
  const img = postImage.value.trim();
  if (!text && !img) {
    alert("Please add text or image");
    return;
  }
  const newPost = {
    id: uid(),
    author: { id: state.user.id, name: state.user.name },
    text,
    image: img || null,
    createdAt: new Date().toISOString(),
    likes: 0,
    likedBy: [],
  };
  state.posts.unshift(newPost); // latest-first
  savePosts();
  postText.value = "";
  postImage.value = "";
  renderPosts();
});

// Emoji pickers
emojiButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    postText.value += btn.dataset.emoji;
    postText.focus();
  });
});

// ---------- Render Posts ----------
function renderPosts() {
  const q = searchInput.value.trim().toLowerCase();
  let list = state.posts.slice();

  // Filter by search text
  if (q) {
    list = list.filter(
      (p) =>
        (p.text || "").toLowerCase().includes(q) ||
        (p.author?.name || "").toLowerCase().includes(q)
    );
  }

  // Sort
  const sortMode = sortSelect.value;
  if (sortMode === "latest") {
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortMode === "oldest") {
    list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (sortMode === "most-liked") {
    list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  }

  // Build HTML
  feed.innerHTML = "";
  if (list.length === 0) {
    feed.innerHTML = `<div class="card small-muted">No posts yet. Be the first! 🎉</div>`;
    return;
  }

  list.forEach((post) => {
    const div = document.createElement("div");
    div.className = "card post";
    div.dataset.id = post.id;
    div.innerHTML = `
      <div class="post-head">
        <div>Posted By:
          <div style="font-weight:700 ">${escapeHtml(
            post.author.name
          )}</div>
          <div class="meta">CreatedAt: ${new Date(post.createdAt).toLocaleString()}</div>
        </div>
         
      </div>
      <div class="post-body">
        <div>${escapeHtml(post.text)}</div>
        ${
          post.image
            ? `<img src="${escapeAttr(
                post.image
              )}" alt="post image" onerror="this.style.display='none'"/>`
            : ""
        }
        <div class="actions">
          <button class="btn like-btn ${
            post.likedBy && post.likedBy.includes(state.user.id) ? "liked" : ""
          }" data-action="like">❤️ <span class="like-count">${
      post.likes || 0
    }</span></button>
          <button class="btn" data-action="edit">Edit</button>
          <button class="btn" data-action="delete">Delete</button>
        </div>
      </div>
    `;
    // Event delegation handlers
    div
      .querySelector('[data-action="like"]')
      .addEventListener("click", () => toggleLike(post.id));
    div
      .querySelector('[data-action="delete"]')
      .addEventListener("click", () => deletePost(post.id));
    div
      .querySelector('[data-action="edit"]')
      .addEventListener("click", () => openEdit(post.id));
    feed.appendChild(div);
  });
}

// ---------- Like / Unlike ----------
function toggleLike(postId) {
  const p = state.posts.find((x) => x.id === postId);
  if (!p) return;
  const liked = p.likedBy && p.likedBy.includes(state.user.id);
  if (liked) {
    p.likedBy = p.likedBy.filter((id) => id !== state.user.id);
  } else {
    p.likedBy = p.likedBy || [];
    p.likedBy.push(state.user.id);
  }
  p.likes = p.likedBy.length;
  savePosts();
  renderPosts();
}

// ---------- Delete ----------
function deletePost(postId) {
  if (!confirm("Are you sure you want to delete this post?")) return;
  state.posts = state.posts.filter((x) => x.id !== postId);
  savePosts();
  renderPosts();
}

// ---------- Edit ----------
function openEdit(postId) {
  const p = state.posts.find((x) => x.id === postId);
  if (!p) return;
  state.editingId = postId;
  editText.value = p.text;
  editImage.value = p.image || "";
  editModal.classList.remove("hidden");
}
cancelEdit.addEventListener("click", () => {
  state.editingId = null;
  editModal.classList.add("hidden");
});
saveEdit.addEventListener("click", () => {
  const p = state.posts.find((x) => x.id === state.editingId);
  if (!p) return;
  p.text = editText.value.trim();
  p.image = editImage.value.trim() || null;
  savePosts();
  state.editingId = null;
  editModal.classList.add("hidden");
  renderPosts();
});

// ---------- Search + Sort Events ----------
searchInput.addEventListener("input", () => renderPosts());
sortSelect.addEventListener("change", () => renderPosts());

// ---------- Utilities ----------
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
function escapeAttr(str) {
  if (!str) return "";
  return str.replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

// ---------- Startup ----------
loadFromStorage();
// If we already set user (from remembered session) show app
if (state.user) {
  showApp();
} else {
  setAuthMode(true);
  authView.classList.remove("hidden");
  appView.classList.add("hidden");
}
