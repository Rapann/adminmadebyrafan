let API_URL = document.getElementById('api-url').value;
let currentSection = 'profile';
let TOKEN = localStorage.getItem('adminToken');

// --- CONFIG AUTO LOGIN (Ganti di sini) ---
const AUTO_LOGIN = {
    enabled: true, // Ubah ke true jika ingin login otomatis
    username: "Rafan Parsa",
    password: "PutraRustaman190"
};

// Update API URL whenever it changes
function updateApiUrl() {
    const input = document.getElementById('api-url');
    if (input) {
        API_URL = input.value;
        console.log('API URL updated to:', API_URL);
    }
}

// Auto Login Logic
async function attemptAutoLogin() {
    if (!TOKEN && AUTO_LOGIN.enabled) {
        showToast('Mencoba login otomatis...', 'info');
        try {
            updateApiUrl();
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: AUTO_LOGIN.username, 
                    password: AUTO_LOGIN.password 
                })
            });
            const result = await res.json();
            if (res.ok) {
                TOKEN = result.token;
                localStorage.setItem('adminToken', TOKEN);
                hideLoginOverlay();
                showToast('Auto-login berhasil!', 'success');
                switchSection('profile');
            } else {
                showToast('Auto-login gagal. Silakan login manual.', 'info');
                showLoginOverlay();
            }
        } catch (err) {
            console.error('Auto-login gagal:', err);
            showToast('Gagal terhubung ke backend.', 'error');
            showLoginOverlay();
        }
    } else if (!TOKEN) {
        showLoginOverlay();
    }
}

function showLoginOverlay() {
    const overlay = document.getElementById('login-overlay');
    const container = document.querySelector('.admin-container');
    if (overlay) overlay.style.display = 'flex';
    if (container) container.style.display = 'none';
}

function hideLoginOverlay() {
    const overlay = document.getElementById('login-overlay');
    const container = document.querySelector('.admin-container');
    if (overlay) overlay.style.display = 'none';
    if (container) container.style.display = 'flex';
}

// Auth Check
document.addEventListener('DOMContentLoaded', () => {
    updateApiUrl();
    if (TOKEN) {
        hideLoginOverlay();
        switchSection('profile');
    } else {
        attemptAutoLogin();
    }
});

// Login Form
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Login form submitted');
    showToast('Sedang login...', 'info');
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        updateApiUrl();
        console.log('Attempting login at:', `${API_URL}/auth/login`);
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        console.log('Login response status:', res.status);
        const result = await res.json();

        if (res.ok) {
            TOKEN = result.token;
            localStorage.setItem('adminToken', TOKEN);
            hideLoginOverlay();
            showToast('Login berhasil!', 'success');
            switchSection('profile');
        } else {
            showToast(result.message || 'Username atau password salah', 'error');
        }
    } catch (err) {
        console.error('Login error detail:', err);
        showToast('Kesalahan koneksi server. Pastikan backend sudah jalan.', 'error');
    }
});

function logout() {
    localStorage.removeItem('adminToken');
    location.reload();
}

// Navigation
document.querySelectorAll('.sidebar a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.target.getAttribute('href').substring(1);
        switchSection(target);
    });
});

function switchSection(section) {
    console.log('Switching to section:', section);
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(s => {
        s.style.display = 'none';
    });
    
    const targetSection = document.getElementById(`${section}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
    } else {
        console.error(`Section #${section}-section not found`);
    }
    
    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`.sidebar a[href="#${section}"]`);
    if (activeLink) activeLink.classList.add('active');
    
    const titleEl = document.getElementById('section-title');
    if (titleEl) {
        titleEl.innerText = `Edit ${section.charAt(0).toUpperCase() + section.slice(1)}`;
    }
    
    currentSection = section;
    loadData(section);
}

// Update API URL
document.getElementById('api-url').addEventListener('change', (e) => {
    API_URL = e.target.value;
    loadData(currentSection);
});

// Load Data
async function loadData(section) {
    if (section === 'profile') {
        const res = await fetch(`${API_URL}/profile`);
        const data = await res.json();
        if (data) {
            const form = document.getElementById('profile-form');
            form.name.value = data.name || '';
            form.subtitle.value = data.subtitle || '';
            form.description.value = data.description || '';
            form.quote.value = data.quote || '';
            form.profileImg.value = data.profileImg || '';
        }
    } else {
        const res = await fetch(`${API_URL}/${section}`);
        const data = await res.json();
        renderList(section, data);
    }
}

function renderList(section, data) {
    const list = document.getElementById(`${section}-list`);
    list.innerHTML = '';
    
    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'data-item';
        div.innerHTML = `
            <div class="item-info">
                <h3>${item.title || item.name || item.institution || 'Item Tanpa Judul'}</h3>
                <p>${item.description || item.level || item.message || item.date || ''}</p>
            </div>
            <div class="item-actions">
                ${section !== 'comments' ? `<button class="btn-edit" onclick="editItem('${section}', '${item._id}')">Edit</button>` : ''}
                <button class="btn-delete" onclick="deleteItem('${section}', '${item._id}')">Hapus</button>
            </div>
        `;
        list.appendChild(div);
    });
}

// Profile Form Submit
document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const res = await fetch(`${API_URL}/profile`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify(data)
        });
        
        if (res.ok) showToast('Profil berhasil diperbarui!', 'success');
        else if (res.status === 401) logout();
        else showToast('Gagal memperbarui profil.', 'error');
    } catch (err) {
        showToast('Terjadi kesalahan koneksi.', 'error');
    }
});

// Modern Toast Notification
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-message">${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Modal Logic
const modal = document.getElementById('modal');
const modalForm = document.getElementById('modal-form');
let editingId = null;

function showModal(type, item = null) {
    modal.style.display = 'block';
    modalForm.innerHTML = '';
    editingId = item ? item._id : null;
    document.getElementById('modal-title').innerText = item ? `Edit ${type}` : `Tambah ${type}`;

    let fields = '';
    if (type === 'project') {
        fields = `
            <div class="form-group"><label>Judul</label><input type="text" name="title" value="${item?.title || ''}" required></div>
            <div class="form-group"><label>Kategori</label><select name="category">
                <option value="desain-grafis" ${item?.category === 'desain-grafis' ? 'selected' : ''}>Desain Grafis</option>
                <option value="video" ${item?.category === 'video' ? 'selected' : ''}>Video</option>
                <option value="fotografi" ${item?.category === 'fotografi' ? 'selected' : ''}>Fotografi</option>
                <option value="website" ${item?.category === 'website' ? 'selected' : ''}>Website</option>
            </select></div>
            <div class="form-group"><label>Deskripsi</label><textarea name="description" required>${item?.description || ''}</textarea></div>
            <div class="form-group"><label>Media (Path/URL)</label><input type="text" name="media" value="${item?.media || ''}" required></div>
            <div class="form-group"><label>Tipe Media</label><select name="mediaType">
                <option value="image" ${item?.mediaType === 'image' ? 'selected' : ''}>Gambar</option>
                <option value="video" ${item?.mediaType === 'video' ? 'selected' : ''}>Video</option>
            </select></div>
            <div class="form-group"><label>Link (Opsional)</label><input type="text" name="link" value="${item?.link || ''}"></div>
        `;
    } else if (type === 'achievement') {
        fields = `
            <div class="form-group"><label>Tanggal</label><input type="text" name="date" value="${item?.date || ''}" required></div>
            <div class="form-group"><label>Judul</label><input type="text" name="title" value="${item?.title || ''}" required></div>
            <div class="form-group"><label>Deskripsi</label><textarea name="description" required>${item?.description || ''}</textarea></div>
        `;
    } else if (type === 'education') {
        fields = `
            <div class="form-group"><label>Institusi</label><input type="text" name="institution" value="${item?.institution || ''}" required></div>
            <div class="form-group"><label>Tingkat</label><input type="text" name="level" value="${item?.level || ''}" required></div>
            <div class="form-group"><label>Logo (Path/URL)</label><input type="text" name="logo" value="${item?.logo || ''}"></div>
        `;
    } else if (type === 'skill') {
        fields = `
            <div class="form-group"><label>Nama Keterampilan</label><input type="text" name="name" value="${item?.name || ''}" required></div>
            <div class="form-group"><label>Ikon (Path/URL)</label><input type="text" name="icon" value="${item?.icon || ''}"></div>
        `;
    } else if (type === 'documentation') {
        fields = `
            <div class="form-group"><label>Judul</label><input type="text" name="title" value="${item?.title || ''}" required></div>
            <div class="form-group"><label>Tanggal</label><input type="text" name="date" value="${item?.date || ''}" required></div>
            <div class="form-group"><label>Media (Path/URL)</label><input type="text" name="media" value="${item?.media || ''}" required></div>
            <div class="form-group"><label>Link (Drive/Lainnya)</label><input type="text" name="link" value="${item?.link || ''}"></div>
        `;
    }

    modalForm.innerHTML = fields + '<button type="submit" class="btn-save">Simpan</button>';
}

modalForm.onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    const url = editingId ? `${API_URL}/${currentSection}/${editingId}` : `${API_URL}/${currentSection}`;
    const method = editingId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            showToast(`Data berhasil ${editingId ? 'diperbarui' : 'ditambahkan'}!`, 'success');
            closeModal();
            loadData(currentSection);
        } else if (res.status === 401) {
            logout();
        } else {
            showToast('Gagal menyimpan data.', 'error');
        }
    } catch (err) {
        showToast('Terjadi kesalahan koneksi.', 'error');
    }
};

async function editItem(section, id) {
    try {
        const res = await fetch(`${API_URL}/${section}`);
        const data = await res.json();
        const item = data.find(i => i._id === id);
        showModal(section.slice(0, -1), item); // slice to get singular name
    } catch (err) {
        showToast('Gagal memuat data.', 'error');
    }
}

async function deleteItem(section, id) {
    if (confirm('Apakah Anda yakin ingin menghapus item ini?')) {
        try {
            const res = await fetch(`${API_URL}/${section}/${id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                showToast('Data berhasil dihapus!', 'success');
                loadData(section);
            } else if (res.status === 401) {
                logout();
            } else {
                showToast('Gagal menghapus data.', 'error');
            }
        } catch (err) {
            showToast('Terjadi kesalahan koneksi.', 'error');
        }
    }
}

function closeModal() { modal.style.display = 'none'; }
window.onclick = (e) => { if (e.target == modal) closeModal(); }

// Initial load
if (TOKEN) {
    switchSection('profile');
}
