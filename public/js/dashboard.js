// public/js/dashboard.js

// read token & user dynamically (so changes persist per tab)
function getToken() {
  return sessionStorage.getItem('fr_token');
}
function getCurrentUser() {
  try {
    return JSON.parse(sessionStorage.getItem('fr_user'));
  } catch (e) {
    return null;
  }
}

function authHeader() {
  const token = getToken();
  return token ? { 'Authorization': 'Bearer ' + token } : {};
}

/* small toast system that uses your existing #toastRoot if present */
function showToast(text, opts = {}) {
  const root = document.getElementById('toastRoot');
  const div = document.createElement('div');
  div.className = 'card';
  div.style.padding = '10px 12px';
  div.style.borderRadius = '8px';
  div.style.maxWidth = '320px';
  div.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
  div.textContent = text;
  (root || document.body).appendChild(div);
  setTimeout(() => {
    div.style.transition = 'opacity .4s, transform .4s';
    div.style.opacity = '0';
    div.style.transform = 'translateY(-6px)';
    setTimeout(() => div.remove(), 420);
  }, opts.duration || 3000);
}

// safe escape helper
function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[s]));
}

/* ----- socket init ----- */
let socket = null;
function initSocket() {
  try {
    const token = getToken();
    // attach token if available (server may use it)
    socket = (typeof io === 'function') ? io({ auth: token ? { token } : {} }) : null;

    if (!socket) return;
    socket.on('connect', () => console.log('socket connected', socket.id));
    socket.on('new_listing', (payload) => {
      showToast('New listing added: ' + (payload.title || ''));
      loadMyPickups().then(() => loadListings());
    });
    socket.on('claimed', () => {
      showToast('A listing was claimed');
      loadMyPickups().then(() => loadListings());
    });
    socket.on('completed', () => {
      showToast('A pickup was completed');
      loadMyPickups().then(() => loadListings());
    });
    socket.on('disconnect', () => console.log('socket disconnected'));
  } catch (err) {
    console.warn('Socket init failed', err);
  }
}

/* ----- pickups (volunteer) ----- */
let myPickupMap = {};
async function loadMyPickups() {
  myPickupMap = {};
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch('/api/pickup/my', { headers: { ...authHeader(), 'Content-Type': 'application/json' } });
    const data = await res.json();
    if (!res.ok) {
      console.warn('Could not load my pickups:', data);
      return;
    }
    (data.pickups || []).forEach(p => {
      // FoodListing compatibility
      const foodId = p.food_id || (p.FoodListing && p.FoodListing.id);
      if (foodId) myPickupMap[foodId] = p;
    });
  } catch (err) {
    console.error('Error loading my pickups:', err);
  }
}

/* ----- dashboard init ----- */
async function initDashboard() {
  const currentUser = getCurrentUser();
  const token = getToken();
  if (!token || !currentUser) {
    window.location.href = '/login.html';
    return;
  }

  initSocket();

  const userInfo = document.getElementById('userInfo');
  if (userInfo) userInfo.textContent = `${currentUser.name || 'User'} (${currentUser.role || ''})`;

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('fr_token');
    sessionStorage.removeItem('fr_user');
    window.location.href = '/login.html';
  });

  // Show appropriate sections
  if (currentUser.role === 'donor') {
    const ds = document.getElementById('donorSection');
    if (ds) ds.style.display = 'block';
  } else if (currentUser.role === 'volunteer') {
    const vs = document.getElementById('volunteerSection');
    if (vs) vs.style.display = 'block';
  }

  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', async () => { await loadMyPickups(); await loadListings(); });

  const createForm = document.getElementById('createFoodForm');
  if (createForm) createForm.addEventListener('submit', createFood);

  await loadMyPickups();
  await loadListings();
}

/* helpers */
function getInitials(nameOrId) {
  if (!nameOrId) return '';
  if (typeof nameOrId === 'number' || /^\d+$/.test(String(nameOrId))) return 'D' + String(nameOrId);
  const parts = String(nameOrId).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
}

/* ----- load listings ----- */
async function loadListings() {
  const listingsEl = document.getElementById('listings');
  if (!listingsEl) return;
  listingsEl.innerHTML = '<div class="card text-muted">Loading listings...</div>';

  try {
    // send auth header so backend can return donor-specific listings when appropriate
    const res = await fetch('/api/food', {
      headers: { ...authHeader() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load listings');

    if (!Array.isArray(data) || data.length === 0) {
      listingsEl.innerHTML = '<div class="card text-muted">No listings yet.</div>';
      return;
    }

    listingsEl.innerHTML = '';

    const currentUser = getCurrentUser();

    data.forEach(item => {
      const card = document.createElement('article');
      card.className = 'listing-card card';
      // media
      const media = document.createElement('div');
      media.className = 'media';
      if (item.image_url) {
        const img = document.createElement('img');
        img.src = item.image_url;
        img.alt = item.title || 'Listing image';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        media.appendChild(img);
      } else {
        media.textContent = '🍱';
      }
      card.appendChild(media);

      // content container
      const content = document.createElement('div');
      content.className = 'content';

      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.title = item.donor_name ? item.donor_name : ('Donor #' + (item.donor_id || ''));
      avatar.textContent = getInitials(item.donor_name || item.donor_id);
      content.appendChild(avatar);

      const meta = document.createElement('div');
      meta.className = 'meta';
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = item.title || 'Untitled';
      meta.appendChild(title);

      // show donor name (if available) so volunteers can see who posted it
      if (item.donor_name) {
        const donorLine = document.createElement('div');
        donorLine.className = 'donor-name small text-muted';
        donorLine.textContent = `Posted by ${item.donor_name}`;
        meta.appendChild(donorLine);
      }

      const desc = document.createElement('div');
      desc.className = 'desc';
      desc.textContent = item.description || '';
      meta.appendChild(desc);

      const metaRow = document.createElement('div');
      metaRow.className = 'meta-row small';
      const exp = item.expiry_date ? (new Date(item.expiry_date)).toLocaleDateString() : '—';
      metaRow.textContent = `Qty: ${item.quantity || 0} • ${item.location || ''} • Expires: ${exp}`;
      meta.appendChild(metaRow);

      content.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'actions';
      // badge
      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.textContent = item.status || 'available';
      actions.appendChild(badge);

      // conditional action buttons for volunteers
      if ((item.status === 'available') && currentUser && currentUser.role === 'volunteer') {
        const claimBtn = document.createElement('button');
        claimBtn.className = 'action-btn primary';
        claimBtn.textContent = 'Claim';
        claimBtn.addEventListener('click', async () => {
          claimBtn.disabled = true;
          try { await claimFood(item.id); } finally { claimBtn.disabled = false; }
        });
        actions.appendChild(claimBtn);
      }

      if (item.status === 'claimed') {
        const pickup = myPickupMap[item.id];
        if (pickup && currentUser && pickup.volunteer_id === currentUser.id) {
          const completeBtn = document.createElement('button');
          completeBtn.className = 'action-btn primary';
          completeBtn.textContent = 'Complete';
          completeBtn.addEventListener('click', async () => {
            completeBtn.disabled = true;
            try { await completePickupById(pickup.id); } finally { completeBtn.disabled = false; }
          });
          actions.appendChild(completeBtn);
        } else {
          const small = document.createElement('div');
          small.className = 'small text-muted';
          small.textContent = 'Claimed by someone else';
          actions.appendChild(small);
        }
      }

      // Donor controls (Edit / Delete) - only show if the current user is the donor who created this listing
      if (currentUser && currentUser.role === 'donor' && String(item.donor_id) === String(currentUser.id)) {
        // Edit button (placeholder - implement update UI if desired)
       const editBtn = document.createElement('button');
editBtn.className = 'edit-btn noselect';
editBtn.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
    <path d="M3 17.25V21h3.75l11.06-11.06-3.75-3.75L3 17.25zm17.71-10.04a1.004 1.004 0 000-1.42l-2.5-2.5a1.004 1.004 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path>
  </svg>
  <span>Edit</span>
`;
editBtn.addEventListener('click', async () => {
  alert('Edit functionality coming soon!');
});
actions.appendChild(editBtn);


        // Delete button
       const deleteBtn = document.createElement('button');
deleteBtn.className = 'delete-btn noselect';
deleteBtn.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
    <path d="M18.3 5.71L12 12l6.3 6.29-1.42 1.42L10.59 13.4l-6.29 6.31-1.42-1.42L9.17 12 2.88 5.71 4.3 4.29l6.29 6.29 6.3-6.29z"></path>
  </svg>
  <span>Delete</span>
`;
deleteBtn.addEventListener('click', async () => {
  deleteBtn.disabled = true;
  try { await deleteListing(item.id); } finally { deleteBtn.disabled = false; }
});
actions.appendChild(deleteBtn);


      }

      content.appendChild(actions);
      card.appendChild(content);
      listingsEl.appendChild(card);
    });
  } catch (err) {
    listingsEl.innerHTML = `<div class="card text-muted">Error: ${escapeHtml(err.message || 'Failed')}</div>`;
  }
}

/* ----- create listing (donor) ----- */
async function createFood(e) {
  e.preventDefault();
  const out = document.getElementById('createOutput');
  if (out) out.textContent = 'Creating...';

  const payload = {
    title: document.getElementById('title').value.trim(),
    description: document.getElementById('description').value.trim(),
    quantity: Number(document.getElementById('quantity').value),
    expiry_date: document.getElementById('expiry_date').value,
    location: document.getElementById('location').value.trim()
  };

  try {
    const res = await fetch('/api/food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || JSON.stringify(data));
    if (out) {
      out.style.color = '#047857';
      out.textContent = 'Created ✓';
    }
    e.target.reset();
    await loadMyPickups();
    await loadListings();
  } catch (err) {
    if (out) {
      out.style.color = '#dc2626';
      out.textContent = 'Error: ' + (err.message || 'Failed');
    }
  }
}

/* ----- claim / complete ----- */
async function claimFood(foodId) {
  if (!confirm('Claim this food?')) return;
  try {
    const res = await fetch('/api/pickup/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ food_id: foodId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || JSON.stringify(data));
    showToast('Claimed successfully!');
    await loadMyPickups();
    await loadListings();
  } catch (err) {
    showToast('Error claiming: ' + (err.message || 'Failed'));
  }
}

async function completePickupById(pickupId) {
  if (!confirm('Mark this pickup as completed?')) return;
  try {
    const res = await fetch(`/api/pickup/complete/${pickupId}`, {
      method: 'PUT',
      headers: { ...authHeader(), 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || JSON.stringify(data));
    showToast('Pickup completed!');
    await loadMyPickups();
    await loadListings();
  } catch (err) {
    showToast('Error completing pickup: ' + (err.message || 'Failed'));
  }
}

/* ----- delete listing (donor) ----- */
async function deleteListing(listingId) {
  if (!confirm('Are you sure you want to delete this listing? This cannot be undone.')) return;

  try {
    const res = await fetch(`/api/food/${listingId}`, {
      method: 'DELETE',
      headers: { ...authHeader(), 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || JSON.stringify(data));

    showToast('Listing deleted');
    // Refresh front-end state
    await loadMyPickups();
    await loadListings();
  } catch (err) {
    console.error('Error deleting listing:', err);
    showToast('Error deleting listing: ' + (err.message || 'Failed'));
  }
}

/* Expose init so dashboard.html can call if desired; otherwise auto-init */
window.initDashboard = initDashboard;

// auto init when loaded
document.addEventListener('DOMContentLoaded', initDashboard);
