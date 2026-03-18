var currentUser = null;

function getSupabase() {
    return { from: function() { return { select: function() { return Promise.resolve({data:[]}); }, insert: function() { return Promise.resolve({error:null}); }, update: function() { return {eq: function() { return Promise.resolve({error:null}); }}; } }; } };
}

function initAuth() {
    var savedUser = localStorage.getItem('yqh_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            updateNavForAuth();
        } catch(e) {
            console.log('解析用户数据失败', e);
        }
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('yqh_user');
    updateNavForAuth();
    window.location.reload();
}

function updateNavForAuth() {
    var authBtn = document.getElementById('auth-btn');
    if (!authBtn) return;
    
    if (currentUser) {
        authBtn.innerHTML = '<i class="fas fa-user-circle"></i> ' + (currentUser.username || currentUser.phone);
        authBtn.onclick = function() { logout(); };
    }
}

function showLoginModal() {
    var modal = document.getElementById('auth-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeAuthModal() {
    var modal = document.getElementById('auth-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function doLogin() {
    var username = document.getElementById('login-username').value.trim();
    var password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        alert('请填写用户名和密码');
        return;
    }
    
    var users = JSON.parse(localStorage.getItem('yqh_users') || '[]');
    var user = users.find(function(u) { return u.username === username || u.phone === username; });
    
    if (!user) {
        alert('用户不存在，请先注册');
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
    if (typeof checkUserStatus === 'function') {
        checkUserStatus();
    } else {
        window.location.reload();
    }
}

function doRegister() {
    var username = document.getElementById('reg-username').value.trim();
    var phone = document.getElementById('reg-phone').value.trim();
    var password = document.getElementById('reg-password').value;
    var confirmPassword = document.getElementById('reg-confirm-password').value;
    
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
    
    var users = JSON.parse(localStorage.getItem('yqh_users') || '[]');
    var existingUser = users.find(function(u) { return u.username === username || u.phone === phone; });
    if (existingUser) {
        alert('用户名或手机号已被注册');
        return;
    }
    
    var newUser = {
        id: Date.now(),
        username: username,
        phone: phone,
        password: password,
        role: 'user',
        created_at: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('yqh_users', JSON.stringify(users));
    
    localStorage.setItem('yqh_user', JSON.stringify(newUser));
    currentUser = newUser;
    updateNavForAuth();
    closeAuthModal();
    alert('注册成功！');
    if (typeof checkUserStatus === 'function') {
        checkUserStatus();
    } else {
        window.location.reload();
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

if (window.addEventListener) {
    window.addEventListener('load', initAuth);
} else if (window.attachEvent) {
    window.attachEvent('onload', initAuth);
}
