/* ========================================
   园企汇 - 陕西厂房出租平台 v4.0
   本地存储版本
   ======================================== */

// currentUser 在 auth.js 中声明

// Supabase 客户端（仅用于数据存储）
let supabaseClient = null;

// 页面加载时初始化
getSupabase();

function getSupabase() {
    console.log('window.supabase exists:', typeof window.supabase);
    if (!supabaseClient) {
        // 检查 Supabase 是否可用
        if (typeof window !== 'undefined' && window.supabase) {
            try {
                supabaseClient = window.supabase.createClient(
                    'https://enxfuiaicradjczhfdeb.supabase.co',
                    'sb_publishable_5iLWKyQVe1pg6tyOsvtwkw_8_pOqI-I'
                );
                console.log('Supabase 初始化成功');
            } catch (e) {
                console.log('Supabase 初始化失败:', e);
                supabaseClient = createMockSupabase();
            }
        } else {
            console.log('window.supabase 不存在，使用本地存储');
            supabaseClient = createMockSupabase();
        }
    }
    return supabaseClient;
}

function createMockSupabase() {
    return { 
        from: () => ({ 
            select: () => Promise.resolve({ data: [], error: 'mock_error' }), 
            insert: () => Promise.resolve({ data: null, error: 'mock_error' }), 
            update: () => ({ eq: () => Promise.resolve({ error: 'mock_error' }) }) 
        }) 
    };
}

// =====================
// 用户认证
// =====================
// 初始化检查
function initAuth() {
    const savedUser = localStorage.getItem('yqh_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateNavForAuth();
    }
}

async function login(email, password) {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .single();
        
        if (error || !data) {
            return await register(email, password);
        }
        
        currentUser = data;
        localStorage.setItem('yqh_user', JSON.stringify(data));
        updateNavForAuth();
        return { success: true, user: data };
    } catch (err) {
        return { success: false, message: '登录失败' };
    }
}

async function register(email, password) {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('users')
            .insert([{ email: email, password: password, role: 'user', created_at: new Date().toISOString() }])
            .select()
            .single();
        
        if (error) return { success: false, message: '注册失败' };
        
        currentUser = data;
        localStorage.setItem('yqh_user', JSON.stringify(data));
        updateNavForAuth();
        return { success: true, user: data };
    } catch (err) {
        return { success: false, message: '注册失败' };
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('yqh_user');
    updateNavForAuth();
    window.location.reload();
}

function isAdmin() {
    return currentUser && currentUser.role === 'admin';
}

function updateNavForAuth() {
    const authBtn = document.getElementById('auth-btn');
    const publishBtn = document.getElementById('publish-btn');
    const adminLink = document.getElementById('admin-link');
    
    if (currentUser) {
        if (authBtn) {
            authBtn.innerHTML = '<i class="fas fa-user"></i> ' + (currentUser.username || currentUser.phone) + ' <i class="fas fa-sign-out-alt"></i>';
            authBtn.onclick = logout;
        }
        if (publishBtn) publishBtn.style.display = 'inline-flex';
        if (adminLink && isAdmin()) adminLink.style.display = 'block';
    } else {
        if (authBtn) {
            authBtn.innerHTML = '<i class="fas fa-user"></i> 登录/注册';
            authBtn.onclick = showLoginModal;
        }
        if (publishBtn) publishBtn.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
    }
}

function showLoginModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function doLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        alert('请填写用户名和密码');
        return;
    }
    
    // 先尝试从本地存储验证
    let users = [];
    try {
        users = JSON.parse(localStorage.getItem('yqh_users') || '[]');
    } catch(e) {
        users = [];
    }
    
    const user = users.find(u => (u.username === username || u.phone === username));
    
    if (!user) {
        // 本地没找到，尝试云端
        doCloudLogin(username, password);
        return;
    }
    
    if (user.password !== password) {
        alert('密码错误');
        return;
    }

    localStorage.setItem('yqh_user', JSON.stringify(user));
    currentUser = user;
    updateNavForAuth();
    closeAuthModal();
    alert('登录成功！');
    window.location.reload();
}

async function doCloudLogin(username, password) {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .or(`username.eq.${username},phone.eq.${username}`)
            .single();
        
        if (error || !data) {
            alert('用户不存在，请先注册');
            return;
        }
        
        if (data.password !== password) {
            alert('密码错误');
            return;
        }
        
        // 登录成功，保存到本地
        localStorage.setItem('yqh_user', JSON.stringify(data));
        currentUser = data;
        
        // 同时更新本地用户列表
        let users = JSON.parse(localStorage.getItem('yqh_users') || '[]');
        const existingIndex = users.findIndex(u => u.id === data.id);
        if (existingIndex >= 0) {
            users[existingIndex] = data;
        } else {
            users.push(data);
        }
        localStorage.setItem('yqh_users', JSON.stringify(users));
        
        updateNavForAuth();
        closeAuthModal();
        alert('登录成功！');
        window.location.reload();
    } catch (err) {
        alert('登录失败，请重试');
    }
}

function doRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    
    if (!username || username.length < 4) {
        alert('用户名至少需要4个字符');
        return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
        alert('请输入正确的手机号码');
        return;
    }
    if (!password || password.length < 6) {
        alert('密码至少需要6个字符');
        return;
    }
    if (password !== confirmPassword) {
        alert('两次输入的密码不一致');
        return;
    }
    
    let users = [];
    try {
        users = JSON.parse(localStorage.getItem('yqh_users') || '[]');
    } catch(e) {
        users = [];
    }
    
    const existingUser = users.find(u => u.username === username || u.phone === phone);
    if (existingUser) {
        alert('用户名或手机号已被注册');
        return;
    }
    
    const newUser = {
        id: Date.now(),
        username: username,
        phone: phone,
        password: password,
        role: 'user',
        created_at: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('yqh_users', JSON.stringify(users));
    
    // 同时提交到云端（等待完成）
    saveUserToCloud(newUser).then(() => {
        localStorage.setItem('yqh_user', JSON.stringify(newUser));
        currentUser = newUser;
        updateNavForAuth();
        closeAuthModal();
        alert('注册成功！');
        window.location.reload();
    });
}

async function saveUserToCloud(user) {
    try {
        const supabase = getSupabase();
        console.log('=== Saving user to cloud ===');
        console.log('User data:', user);
        
        const userData = {
            username: user.username,
            phone: user.phone,
            password: user.password,
            role: user.role || 'user',
            created_at: user.created_at || new Date().toISOString()
        };
        console.log('User data to insert:', userData);
        
        const { data, error } = await supabase.from('users').insert([userData]).select();
        console.log('User save result:', data, error);
        
        if (error) {
            console.error('保存用户到云端失败:', error);
            alert('保存到云端失败: ' + error.message);
        } else {
            console.log('用户保存成功!');
        }
    } catch (err) {
        console.error('保存用户到云端失败:', err);
        alert('保存到云端失败: ' + err.message);
    }
}

function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function showLogin() {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

// =====================
// 数据管理
// =====================
// 本地存储key
const DB_KEYS = {
    LISTINGS: 'yqh_listings',
    FAVORITES: 'yqh_favorites',
    MESSAGES: 'yqh_messages',
    RENT_WANTED: 'yqh_rent_wanted'
};

// 兼容旧代码
const STORAGE_KEYS = DB_KEYS;

// 初始化数据
function initSampleData() {
    initAuth();
    loadPropertiesFromDB();
}

async function loadPropertiesFromDB() {
    try {
        // 不再从数据库加载，避免覆盖本地数据
        // 本地数据通过 submitListing 直接保存
        refreshListingsDisplay();
    } catch (err) {
        console.log('加载数据失败');
        refreshListingsDisplay();
    }
}

async function submitPropertyToDB(property) {
    try {
        const supabase = getSupabase();
        console.log('Submitting property to cloud...');
        
        const dbData = {
            title: property.title,
            region: property.region,
            area: property.area,
            height: property.height,
            price: property.price,
            type: property.type,
            location: property.location,
            contact: property.contact,
            description: property.description,
            images: property.images || [],
            tags: property.tags || [],
            fire_rating: property.fireRating,
            eia_available: property.eiaAvailable,
            status: 'approved',
            user_phone: currentUser ? (currentUser.phone || currentUser.username) : null,
            created_at: new Date().toISOString()
        };
        
        console.log('Property data:', dbData);
        const { data, error } = await supabase.from('properties').insert([dbData]).select();
        console.log('Property insert result:', data, error);
        if (error) {
            console.error('Property insert error:', error);
            alert('保存到云端失败: ' + error.message);
            throw error;
        }
        return { success: true };
    } catch (err) {
        console.error('Submit to cloud failed:', err);
        return { success: false, message: err.message };
    }
}

async function submitRequestToDB(request) {
    try {
        const supabase = getSupabase();
        console.log('Submitting request to cloud...');
        
        const dbData = {
            title: request.title,
            region: request.region,
            area: request.area,
            budget: request.budget,
            type: request.type,
            description: request.description,
            name: request.name,
            contact: request.contact,
            status: 'pending',
            user_phone: currentUser ? (currentUser.phone || currentUser.username) : null,
            created_at: new Date().toISOString()
        };
        
        console.log('Request data:', dbData);
        const { data, error } = await supabase.from('requests').insert([dbData]).select();
        console.log('Request insert result:', data, error);
        if (error) {
            console.error('Request insert error:', error);
            alert('保存到云端失败: ' + error.message);
            throw error;
        }
        return { success: true };
    } catch (err) {
        console.error('Submit request to cloud failed:', err);
        return { success: false, message: err.message };
    }
}

async function getPendingProperties() {
    try {
        const supabase = getSupabase();
        const { data } = await supabase.from('properties').select('*').eq('status', 'pending').order('created_at', { ascending: false });
        return data || [];
    } catch (err) { return []; }
}

async function getPendingRequests() {
    try {
        const supabase = getSupabase();
        const { data } = await supabase.from('requests').select('*').eq('status', 'pending').order('created_at', { ascending: false });
        return data || [];
    } catch (err) { return []; }
}

async function approveProperty(id, status) {
    try {
        const supabase = getSupabase();
        await supabase.from('properties').update({ status: status }).eq('id', id);
        return { success: true };
    } catch (err) { return { success: false }; }
}

async function approveRequest(id, status) {
    try {
        const supabase = getSupabase();
        await supabase.from('requests').update({ status: status }).eq('id', id);
        return { success: true };
    } catch (err) { return { success: false }; }
}

async function getApprovedRequests() {
    try {
        const supabase = getSupabase();
        const { data } = await supabase.from('requests').select('*').eq('status', 'approved').order('created_at', { ascending: false });
        return data || [];
    } catch (err) { return []; }
}

// =====================
// 本地数据操作
// =====================
function getListings() {
    const data = localStorage.getItem(STORAGE_KEYS.LISTINGS);
    return data ? JSON.parse(data) : [];
}

// 从云端获取已批准的房源
async function getApprovedListingsFromDB() {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('status', 'approved')
            .order('created_at', { ascending: false });
        if (error) {
            console.log('从云端获取房源失败:', error);
            return [];
        }
        console.log('从云端获取到房源:', data?.length || 0, '条');
        return data || [];
    } catch (err) {
        console.log('从云端获取房源异常:', err);
        return [];
    }
}

// 同步版本：合并云端和本地数据
let cachedListings = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30秒缓存

async function getApprovedListings() {
    const now = Date.now();
    // 如果缓存过期或为空，获取云端数据
    if (!cachedListings || (now - lastFetchTime) > CACHE_DURATION) {
        const dbListings = await getApprovedListingsFromDB();
        const localListings = getListings().filter(item => item.status === 'approved');
        // 合并云端和本地数据，去重
        cachedListings = [...dbListings];
        localListings.forEach(item => {
            if (!cachedListings.find(l => l.id === item.id)) {
                cachedListings.push(item);
            }
        });
        lastFetchTime = now;
        console.log('合并后总房源数:', cachedListings.length);
    }
    return cachedListings;
}

// 强制刷新缓存
async function refreshListingsCache() {
    cachedListings = null;
    lastFetchTime = 0;
    return await getApprovedListings();
}

function getPendingListings() {
    return getListings().filter(item => item.status === 'pending');
}

function getFavorites() {
    const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return data ? JSON.parse(data) : [];
}

function addFavorite(id) {
    const favorites = getFavorites();
    if (!favorites.includes(id)) {
        favorites.push(id);
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    }
}

function removeFavorite(id) {
    let favorites = getFavorites();
    favorites = favorites.filter(fid => fid !== id);
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
}

function isFavorite(id) {
    return getFavorites().includes(id);
}

function submitListing(listing) {
    const listings = getListings();
    listing.id = Date.now().toString();
    listing.status = 'approved';
    listing.timestamp = Date.now();
    listings.push(listing);
    localStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(listings));
}

function submitRentWantedRequest(request) {
    console.log('submitRentWantedRequest called');
    const requests = getRentWantedRequests();
    request.id = Date.now().toString();
    request.status = 'approved';
    request.timestamp = Date.now();
    requests.push(request);
    localStorage.setItem(STORAGE_KEYS.RENT_WANTED, JSON.stringify(requests));
    
    // 同时提交到云端
    submitRequestToDB(request);
}

function getRentWantedRequests() {
    const data = localStorage.getItem(STORAGE_KEYS.RENT_WANTED);
    return data ? JSON.parse(data) : [];
}

function deleteListing(id) {
    let listings = getListings();
    listings = listings.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(listings));
    let favorites = getFavorites();
    favorites = favorites.filter(fid => fid !== id);
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
}

function getMessages() {
    const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return data ? JSON.parse(data) : [];
}

function submitMessage(message) {
    const messages = getMessages();
    message.id = Date.now().toString();
    message.timestamp = Date.now();
    message.status = 'unread';
    messages.push(message);
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
}

// =====================
// 工具函数
// =====================
function formatPrice(price) {
    return price ? price.toLocaleString('zh-CN') : '0';
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN');
}

function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');
    if (toast) {
        toastMessage.textContent = message;
        toast.className = 'toast show ' + type;
        toastIcon.innerHTML = type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-times-circle"></i>';
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// =====================
// 房源筛选
// =====================
function filterListings(listings, filters) {
    return listings.filter(item => {
        if (filters.region && filters.region !== '全部' && item.region !== filters.region) return false;
        if (filters.areaMin && item.area < parseInt(filters.areaMin)) return false;
        if (filters.areaMax && item.area > parseInt(filters.areaMax)) return false;
        if (filters.type && filters.type !== '全部' && item.type !== filters.type) return false;
        if (filters.eia === 'true' && !item.eiaAvailable) return false;
        return true;
    });
}

// =====================
// 房源卡片渲染
// =====================
function renderListingCard(listing) {
    const isFav = isFavorite(listing.id);
    const tags = listing.tags || [];
    const img = listing.images && listing.images.length > 0 ? listing.images[0] : 'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=800';
    
    return '<article class="listing-card fade-in">' +
        '<div class="listing-image">' +
            '<a href="detail.html?id=' + listing.id + '">' +
                '<img src="' + img + '" alt="' + listing.title + '" loading="lazy">' +
            '</a>' +
            '<div class="listing-tags">' +
                (tags.includes('急租') ? '<span class="listing-tag urgent">急租</span>' : '') +
                (tags.includes('可分租') ? '<span class="listing-tag divisible">可分租</span>' : '') +
                (tags.includes('丙二类消防') ? '<span class="listing-tag fire-safety">丙二类</span>' : '') +
                (tags.includes('可办环评') ? '<span class="listing-tag eia">可办环评</span>' : '') +
            '</div>' +
            '<span class="listing-region">' + listing.region + '</span>' +
        '</div>' +
        '<div class="listing-content">' +
            '<h3><a href="detail.html?id=' + listing.id + '">' + listing.title + '</a></h3>' +
            '<div class="listing-meta">' +
                '<span><i class="fas fa-vector-square"></i> ' + listing.area + '㎡</span>' +
                '<span><i class="fas fa-ruler-vertical"></i> ' + (listing.height || 6) + '米</span>' +
                '<span><i class="fas fa-building"></i> ' + listing.type + '</span>' +
            '</div>' +
            '<div class="listing-footer">' +
                '<div class="listing-price">¥' + formatPrice(listing.price) + '<span>/月</span></div>' +
                '<div class="listing-actions">' +
                    '<a href="tel:' + (listing.contact || '') + '" class="btn-call"><i class="fas fa-phone-alt"></i> 联系</a>' +
                    '<button class="btn-favorite ' + (isFav ? 'active' : '') + '" onclick="toggleFavorite(\'' + listing.id + '\')" title="收藏">' +
                        '<i class="' + (isFav ? 'fas' : 'far') + ' fa-heart"></i>' +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</div>' +
    '</article>';
}

function renderListingsGrid(listings, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        return;
    }
    
    if (listings.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><h4>暂无符合条件的房源</h4><p>请尝试调整筛选条件或发布您的房源</p></div>';
        return;
    }
    
    container.innerHTML = listings.map(listing => renderListingCard(listing)).join('');
}

function toggleFavorite(id) {
    if (isFavorite(id)) {
        removeFavorite(id);
        showToast('已取消收藏');
    } else {
        addFavorite(id);
        showToast('收藏成功');
    }
    if (typeof renderCurrentPage === 'function') renderCurrentPage();
}

// =====================
// 详情页渲染
// =====================
function renderDetailPage(listingId) {
    const listings = getListings();
    const listing = listings.find(item => item.id === listingId);
    
    if (!listing) {
        document.getElementById('detail-content').innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h4>房源不存在或已下架</h4><a href="listings.html" class="btn-call" style="display:inline-flex;margin-top:20px;">返回房源列表</a></div>';
        return;
    }
    
    const isFav = isFavorite(listing.id);
    const tags = listing.tags || [];
    const img = listing.images && listing.images.length > 0 ? listing.images[0] : 'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=800';
    
    document.getElementById('detail-image').innerHTML = '<img src="' + img + '" alt="' + listing.title + '" id="main-image">';
    
    document.getElementById('detail-title').textContent = listing.title;
    document.getElementById('detail-info').innerHTML = 
        '<div class="info-item"><label>面积</label><span>' + listing.area + '㎡</span></div>' +
        '<div class="info-item"><label>层高</label><span>' + (listing.height || '6') + '米</span></div>' +
        '<div class="info-item"><label>类型</label><span>' + listing.type + '</span></div>' +
        '<div class="info-item"><label>地址</label><span>' + listing.location + '</span></div>' +
        '<div class="info-item"><label>价格</label><span class="price">¥' + formatPrice(listing.price) + '/月</span></div>' +
        '<div class="info-item"><label>联系电话</label><span>' + (listing.contact || '暂无') + '</span></div>' +
        (listing.fireRating ? '<div class="info-item"><label>消防</label><span>' + listing.fireRating + '</span></div>': '');
    
    document.getElementById('detail-description').innerHTML = '<h3>详细描述</h3><p>' + (listing.description || '暂无详细描述') + '</p>';
    
    // 更新右侧联系电话
    const contactPhoneEl = document.getElementById('contact-phone');
    if (contactPhoneEl) {
        contactPhoneEl.textContent = listing.contact || '暂无';
    }
    const btnCall = document.getElementById('btn-call');
    if (btnCall && listing.contact) {
        btnCall.href = 'tel:' + listing.contact;
    }
    
    // 相似推荐
    const similar = getApprovedListings().filter(item => item.id !== listingId && item.region === listing.region).slice(0, 3);
    document.getElementById('nearby-listings').innerHTML = similar.length > 0 ? similar.map(item => renderListingCard(item)).join('') : '<p style="text-align:center;color:var(--gray-400);">暂无相似房源</p>';
}

// =====================
// 图片上传
// =====================
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function compressImage(base64Image) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxSize = 800;
            if (width > maxSize || height > maxSize) {
                if (width > height) { height = Math.round((height / width) * maxSize); width = maxSize; }
                else { width = Math.round((width / height) * maxSize); height = maxSize; }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => resolve(base64Image);
        img.src = base64Image;
    });
}

// =====================
// 表单提交
// =====================
function initPublishForm(formId) {
    window.submitListingForm = async function() {
        if (!currentUser) {
            alert('请先登录');
            showLoginModal();
            return;
        }
        
        const listing = {
            title: document.getElementById('listing-title').value,
            region: document.getElementById('listing-region').value,
            area: parseInt(document.getElementById('listing-area').value),
            height: parseFloat(document.getElementById('listing-height').value) || 6,
            price: parseInt(document.getElementById('listing-price').value),
            type: document.getElementById('listing-type').value,
            location: document.getElementById('listing-location').value,
            contact: document.getElementById('listing-contact').value,
            description: document.getElementById('listing-description').value,
            fireRating: document.getElementById('listing-fire').value,
            eiaAvailable: document.getElementById('listing-eia').checked,
            images: []
        };
        
        listing.tags = [];
        if (document.getElementById('tag-urgent').checked) listing.tags.push('急租');
        if (document.getElementById('tag-divisible').checked) listing.tags.push('可分租');
        if (document.getElementById('tag-fire').checked) listing.tags.push('丙二类消防');
        if (listing.eiaAvailable) listing.tags.push('可办环评');
        
        const fileInput = document.getElementById('listing-image');
        if (fileInput && fileInput.files && fileInput.files[0]) {
            const base64 = await fileToBase64(fileInput.files[0]);
            listing.images = [await compressImage(base64)];
        } else {
            listing.images = ['https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=800'];
        }
        
        const result = await submitPropertyToDB(listing);
        if (result.success) {
            alert('发布成功');
            showModal('success-modal');
            document.getElementById('publish-form-container').reset();
        } else {
            submitListing(listing);
            alert('发布成功');
            showModal('success-modal');
            document.getElementById('publish-form-container').reset();
        }
    };
}

function initRentWantedForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const request = {
            title: document.getElementById('rw-title').value,
            region: document.getElementById('rw-region').value,
            area: parseInt(document.getElementById('rw-area').value),
            budget: parseInt(document.getElementById('rw-budget').value) || 0,
            type: document.getElementById('rw-type').value,
            description: document.getElementById('rw-description').value,
            name: document.getElementById('rw-name').value,
            contact: document.getElementById('rw-contact').value
        };
        
        const result = await submitRequestToDB(request);
        if (result.success) {
            showToast('提交成功，等待审核');
            form.reset();
        } else {
            submitRentWantedRequest(request);
            showToast('提交成功！');
            form.reset();
        }
    });
}

function initMessageForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const message = {
            name: document.getElementById('message-name').value,
            phone: document.getElementById('message-phone').value,
            content: document.getElementById('message-content').value
        };
        if (!message.name || !message.content) {
            showToast('请填写姓名和留言内容', 'error');
            return;
        }
        submitMessage(message);
        showToast('留言提交成功！');
        form.reset();
    });
}

// =====================
// 页面刷新
// =====================
async function refreshListingsDisplay() {
    window.dispatchEvent(new CustomEvent('listingsUpdated'));
    
    // 先获取云端数据
    const allListings = await getApprovedListings();
    
    const listingsGrid = document.getElementById('listings-grid');
    if (listingsGrid) {
        renderListingsGrid(allListings, 'listings-grid');
    }
    const listingsContainer = document.getElementById('listings-container');
    if (listingsContainer) {
        renderListingsGrid(allListings, 'listings-container');
    }
    const homeListings = document.getElementById('home-listings');
    if (homeListings) {
        renderListingsGrid(allListings.slice(0, 6), 'home-listings');
    }
    const featuredListings = document.getElementById('featured-listings');
    if (featuredListings) {
        renderListingsGrid(allListings.slice(0, 6), 'featured-listings');
    }
}

// =====================
// 初始化
// =====================
document.addEventListener('DOMContentLoaded', function() {
    initSampleData();
    
    // 关闭Modal
    document.querySelectorAll('.modal-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal-overlay, .modal');
            if (modal) modal.classList.remove('active');
        });
    });
    
    // 点击遮罩关闭
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function() {
            this.classList.remove('active');
        });
    });
});
