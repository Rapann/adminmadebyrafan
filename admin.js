const DEFAULT_API_URL = 'https://backend-rapanportofolio.vercel.app/api';
let API_URL = localStorage.getItem('apiUrl') || DEFAULT_API_URL;
let currentSection = 'profile';
let TOKEN = localStorage.getItem('adminToken');

// --- INITIALIZE ---
document.addEventListener('DOMContentLoaded', () => {
    // Set initial API URL in input
    const apiInput = document.getElementById('api-url');
    if (apiInput) {
        apiInput.value = API_URL;
        apiInput.addEventListener('change', (e) => {
            API_URL = e.target.value;
            localStorage.setItem('apiUrl', API_URL);
            showToast('API URL diperbarui!', 'info');
        });
    }

    checkAuth();
    
    // Handle Browser Back/Forward and Hash in URL
    window.addEventListener('hashchange', handleHashNavigation);
});

function checkAuth() {
    const overlay = document.getElementById('login-overlay');
    const container = document.querySelector('.admin-container');
    
    if (TOKEN) {
        overlay.style.display = 'none';
        container.style.display = 'flex';
        
        // Ambil section dari hash URL jika ada, jika tidak ke profile
        const hash = window.location.hash.substring(1);
        const validSections = ['profile', 'projects', 'achievements', 'education', 'skills', 'documentation', 'comments'];
        const target = validSections.includes(hash) ? hash : 'profile';
        
        // Gunakan timeout sedikit agar DOM benar-benar siap
        setTimeout(() => switchSection(target), 100);
    } else {
        overlay.style.display = 'flex';
        container.style.display = 'none';
    }
}

// --- LOGIN LOGIC ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    
    btn.innerText = 'Logging in...';
    btn.disabled = true;
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        let result;
        try {
            result = await res.json();
        } catch (e) {
            result = { message: 'Server error (500). Cek log Vercel.' };
        }

        if (res.ok) {
            TOKEN = result.token;
            localStorage.setItem('adminToken', TOKEN);
            showToast('Selamat datang, Admin!', 'success');
            checkAuth();
        } else {
            if (res.status === 500) {
                showToast('Server Error (500). Pastikan ENV di Vercel sudah benar.', 'error');
            } else {
                showToast(result.message || 'Username atau password salah!', 'error');
            }
        }

    } catch (err) {
        console.error('Login error:', err);
        showToast('Gagal terhubung ke backend! Cek API URL.', 'error');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});

function logout() {
    localStorage.removeItem('adminToken');
    window.location.hash = '';
    location.reload();
}

// --- NAVIGATION ---
function handleHashNavigation() {
    const target = window.location.hash.substring(1);
    if (target && TOKEN) {
        switchSection(target);
    }
}

function switchSection(section) {
    const sectionIds = ['profile', 'projects', 'achievements', 'education', 'skills', 'documentation', 'comments'];
    if (!sectionIds.includes(section)) section = 'profile';

    console.log('Switching to section:', section); // Debugging

    // 1. Hide all sections
    document.querySelectorAll('.admin-section').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active-section');
    });
    
    // 2. Show target section
    const targetEl = document.getElementById(`${section}-section`);
    if (targetEl) {
        targetEl.style.display = 'block';
        targetEl.classList.add('active-section');
    }

    // 3. Update Sidebar UI
    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`.sidebar a[href="#${section}"]`);
    if (activeLink) activeLink.classList.add('active');

    // 4. Update Header Title
    const titleEl = document.getElementById('section-title');
    if (titleEl) {
        const titles = {
            'profile': 'Edit Profil',
            'projects': 'Kelola Proyek',
            'achievements': 'Kelola Pencapaian',
            'education': 'Kelola Pendidikan',
            'skills': 'Kelola Keterampilan',
            'documentation': 'Kelola Dokumentasi',
            'comments': 'Komentar Masuk'
        };
        titleEl.innerText = titles[section] || 'Dashboard';
    }

    currentSection = section;
    loadData(section);
}

// --- DATA MANAGEMENT ---
async function loadData(section) {
    const list = document.getElementById(`${section}-list`);
    if (list && section !== 'profile') {
        list.innerHTML = '<div class="loading">Memuat data...</div>';
    }

    try {
        if (section === 'profile') {
            const res = await fetch(`${API_URL}/profile`);
            if (!res.ok) throw new Error('Failed to fetch profile');
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
            if (!res.ok) throw new Error(`Failed to fetch ${section}`);
            const data = await res.json();
            renderList(section, data);
        }
    } catch (err) {
        console.error(`Gagal memuat ${section}:`, err);
        if (list && section !== 'profile') {
            list.innerHTML = `<div class="error-msg">Gagal memuat data: ${err.message}</div>`;
        }
        showToast(`Gagal memuat data ${section}`, 'error');
    }
}

function renderList(section, data) {
    const list = document.getElementById(`${section}-list`);
    if (!list) return;
    
    if (!data || data.length === 0) {
        list.innerHTML = '<div class="empty-state">Belum ada data.</div>';
        return;
    }

    list.innerHTML = '';
    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'data-item';
        
        let title = item.title || item.name || item.institution || 'Data Baru';
        let desc = item.description || item.level || item.message || item.date || '';
        
        div.innerHTML = `
            <div class="item-info">
                <h3>${title}</h3>
                <p>${desc}</p>
            </div>
            <div class="item-actions">
                ${section !== 'comments' ? `<button class="btn-edit" onclick="editItem('${section}', '${item._id}')">Edit</button>` : ''}
                <button class="btn-delete" onclick="deleteItem('${section}', '${item._id}')">Hapus</button>
            </div>
        `;
        list.appendChild(div);
    });
}

// Profile Save
document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    
    btn.innerText = 'Menyimpan...';
    btn.disabled = true;

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
        
        if (res.ok) {
            showToast('Profil berhasil diperbarui!', 'success');
        } else if (res.status === 401) {
            showToast('Sesi habis, silakan login kembali.', 'error');
            logout();
        } else {
            showToast('Gagal menyimpan profil!', 'error');
        }
    } catch (err) {
        showToast('Kesalahan jaringan!', 'error');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});

// Modal CRUD Logic
let editingId = null;

function getModalElements() {
    return {
        modal: document.getElementById('modal'),
        modalForm: document.getElementById('modal-form'),
        modalTitle: document.getElementById('modal-title')
    };
}

// Helper for Image Upload (Base64)
async function handleImageUpload(inputElement, targetInputName, formId = 'modal-form') {
    const file = inputElement.files[0];
    if (!file) return;

    // Check size (max 2MB for Base64 to avoid DB bloat)
    if (file.size > 2 * 1024 * 1024) {
        showToast('File terlalu besar! Maksimal 2MB.', 'error');
        inputElement.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const base64String = e.target.result;
        const form = document.getElementById(formId);
        if (form && form[targetInputName]) {
            form[targetInputName].value = base64String;
            showToast('Foto berhasil diproses!', 'success');
        }
    };
    reader.readAsDataURL(file);
}

function showModal(type, item = null) {
    const { modal, modalForm, modalTitle } = getModalElements();
    if (!modal || !modalForm) return;

    modal.style.display = 'block';
    modalForm.innerHTML = '';
    editingId = item ? item._id : null;
    modalTitle.innerText = item ? `Edit ${type}` : `Tambah ${type}`;

    let fields = '';
    if (type === 'project') {
        fields = `
            <div class="form-group"><label>Judul Proyek</label><input type="text" name="title" value="${item?.title || ''}" required></div>
            <div class="form-group"><label>Kategori</label>
                <select name="category">
                    <option value="desain-grafis" ${item?.category === 'desain-grafis' ? 'selected' : ''}>Desain Grafis</option>
                    <option value="video" ${item?.category === 'video' ? 'selected' : ''}>Video</option>
                    <option value="fotografi" ${item?.category === 'fotografi' ? 'selected' : ''}>Fotografi</option>
                    <option value="website" ${item?.category === 'website' ? 'selected' : ''}>Website</option>
                </select>
            </div>
            <div class="form-group"><label>Deskripsi Singkat</label><textarea name="description" required>${item?.description || ''}</textarea></div>
            <div class="form-group">
                <label>Media (Path atau Upload)</label>
                <div style="display:flex; gap:10px; margin-bottom:5px;">
                    <input type="text" name="media" value="${item?.media || ''}" placeholder="assets/Website/nama-file.png" required style="flex:1;">
                    <input type="file" accept="image/*" onchange="handleImageUpload(this, 'media')" style="display:none;" id="file-upload-project">
                    <button type="button" onclick="document.getElementById('file-upload-project').click()" class="btn-edit" style="padding:0 15px;">Upload</button>
                </div>
                <small style="color:var(--text-secondary)">Pilih file untuk upload otomatis atau ketik path manual.</small>
            </div>
            <div class="form-group"><label>Tipe Media</label>
                <select name="mediaType">
                    <option value="image" ${item?.mediaType === 'image' ? 'selected' : ''}>Gambar</option>
                    <option value="video" ${item?.mediaType === 'video' ? 'selected' : ''}>Video</option>
                </select>
            </div>
            <div class="form-group"><label>Link Eksternal (Opsional)</label><input type="text" name="link" value="${item?.link || ''}" placeholder="https://..."></div>
        `;
    } else if (type === 'achievement') {
        fields = `
            <div class="form-group"><label>Tahun/Tanggal</label><input type="text" name="date" value="${item?.date || ''}" placeholder="2024" required></div>
            <div class="form-group"><label>Nama Pencapaian</label><input type="text" name="title" value="${item?.title || ''}" required></div>
            <div class="form-group"><label>Deskripsi</label><textarea name="description" required>${item?.description || ''}</textarea></div>
        `;
    } else if (type === 'education') {
        fields = `
            <div class="form-group"><label>Nama Sekolah/Institusi</label><input type="text" name="institution" value="${item?.institution || ''}" required></div>
            <div class="form-group"><label>Tingkat/Jurusan</label><input type="text" name="level" value="${item?.level || ''}" placeholder="SMK - Rekayasa Perangkat Lunak" required></div>
            <div class="form-group">
                <label>Path Logo</label>
                <div style="display:flex; gap:10px;">
                    <input type="text" name="logo" value="${item?.logo || ''}" placeholder="assets/Logo SMANSA.png" style="flex:1;">
                    <input type="file" accept="image/*" onchange="handleImageUpload(this, 'logo')" style="display:none;" id="file-upload-edu">
                    <button type="button" onclick="document.getElementById('file-upload-edu').click()" class="btn-edit" style="padding:0 15px;">Upload</button>
                </div>
            </div>
        `;
    } else if (type === 'skill') {
        fields = `
            <div class="form-group"><label>Nama Keterampilan</label><input type="text" name="name" value="${item?.name || ''}" required></div>
            <div class="form-group">
                <label>Path Ikon/Logo</label>
                <div style="display:flex; gap:10px;">
                    <input type="text" name="icon" value="${item?.icon || ''}" placeholder="assets/Logo VSC.gif" style="flex:1;">
                    <input type="file" accept="image/*" onchange="handleImageUpload(this, 'icon')" style="display:none;" id="file-upload-skill">
                    <button type="button" onclick="document.getElementById('file-upload-skill').click()" class="btn-edit" style="padding:0 15px;">Upload</button>
                </div>
            </div>
        `;
    } else if (type === 'documentation') {
        fields = `
            <div class="form-group"><label>Judul Dokumentasi</label><input type="text" name="title" value="${item?.title || ''}" required></div>
            <div class="form-group"><label>Tanggal/Keterangan</label><input type="text" name="date" value="${item?.date || ''}" required></div>
            <div class="form-group">
                <label>Path Media</label>
                <div style="display:flex; gap:10px;">
                    <input type="text" name="media" value="${item?.media || ''}" required style="flex:1;">
                    <input type="file" accept="image/*" onchange="handleImageUpload(this, 'media')" style="display:none;" id="file-upload-doc">
                    <button type="button" onclick="document.getElementById('file-upload-doc').click()" class="btn-edit" style="padding:0 15px;">Upload</button>
                </div>
            </div>
            <div class="form-group"><label>Link Drive (Opsional)</label><input type="text" name="link" value="${item?.link || ''}"></div>
        `;
    }

    modalForm.innerHTML = fields + '<div class="modal-footer"><button type="submit" class="btn-save">Simpan Data</button></div>';
}

// Ensure the form listener is attached correctly after DOM load
document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'modal-form') {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerText = 'Menyimpan...';

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
                showToast('Data berhasil disimpan!', 'success');
                closeModal();
                loadData(currentSection);
            } else if (res.status === 401) {
                showToast('Sesi habis.', 'error');
                logout();
            } else {
                showToast('Gagal menyimpan data!', 'error');
            }
        } catch (err) {
            showToast('Kesalahan koneksi!', 'error');
        } finally {
            btn.disabled = false;
            btn.innerText = 'Simpan Data';
        }
    }
});


async function editItem(section, id) {
    try {
        const res = await fetch(`${API_URL}/${section}`);
        const data = await res.json();
        const item = data.find(i => i._id === id);
        if (item) {
            showModal(section.slice(0, -1), item);
        }
    } catch (err) {
        showToast('Gagal mengambil data untuk diedit!', 'error');
    }
}

async function deleteItem(section, id) {
    if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
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
                showToast('Gagal menghapus data!', 'error');
            }
        } catch (err) {
            showToast('Gagal menghubungi server!', 'error');
        }
    }
}

function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-triangle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span class="toast-message">${message}</span>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s ease-in forwards';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

function closeModal() { modal.style.display = 'none'; }
window.onclick = (e) => { if (e.target == modal) closeModal(); }

