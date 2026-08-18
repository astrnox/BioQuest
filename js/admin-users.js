/**
 * BioQuest - 管理后台 · 用户管理子模块（Issue #17 自 admin.js 拆分）
 * 由 admin.js 的 loadTabContent 在切换到「用户管理」标签时动态注入加载。
 * 依赖：js/admin.js（核心，必须已加载——提供 API/Toast/ICONS/分页状态等共享定义）。
 */

/* ===== 用户管理标签 ===== */
function renderUsersTab(container, users) {
  const totalUsers = users.length;
  const totalAnswered = users.reduce((sum, u) => sum + (u.total_answered || 0), 0);
  const avgScore = totalUsers > 0 ? Math.round(users.reduce((sum, u) => sum + (u.bio_score || 0), 0) / totalUsers) : 0;

  // 用户组分布统计
  const groupCounts = { admin: 0, premium: 0, member: 0, guest: 0 };
  users.forEach(u => {
    const g = u.user_group || 'member';
    if (groupCounts[g] !== undefined) groupCounts[g]++;
    else groupCounts.member++;
  });
  const groupLabels = { admin: '管理员', premium: '高级会员', member: '普通会员', guest: '访客' };
  const groupDistText = Object.entries(groupCounts).filter(([_, v]) => v > 0).map(([k, v]) => `${groupLabels[k]}${v}`).join(' / ');

  let html = `
    <div class="admin-stats-row">
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--green">${ICONS.users}</div>
        <div>
          <div class="admin-stat-num">${totalUsers}</div>
          <div class="admin-stat-label">注册用户</div>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--amber">${ICONS.book}</div>
        <div>
          <div class="admin-stat-num">${totalAnswered}</div>
          <div class="admin-stat-label">总答题数</div>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--blue">${ICONS.shield}</div>
        <div>
          <div class="admin-stat-num">${avgScore}</div>
          <div class="admin-stat-label">平均 Bio 分</div>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon admin-stat-icon--green">${ICONS.users}</div>
        <div>
          <div class="admin-stat-num" style="font-size:0.9rem;">${groupDistText}</div>
          <div class="admin-stat-label">用户组分布</div>
        </div>
      </div>
    </div>

    <div class="admin-section">
      <div class="admin-section-header">
        <div class="admin-section-title">
          ${ICONS.users}
          用户列表
        </div>
        <span class="admin-section-badge">${totalUsers} 人</span>
      </div>
  `;

  if (users.length === 0) {
    html += `<div class="admin-empty"><div class="admin-empty-icon">${ICONS.inbox}</div><div class="admin-empty-text">暂无注册用户</div></div>`;
  } else {
    html += `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>显示名称</th>
              <th>Bio 分</th>
              <th>答题数</th>
              <th>正确数</th>
              <th>准确率</th>
              <th>信用</th>
              <th>用户组</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(user => {
              var uid = user.id || '';
              var uname = user.username || '未知用户';
              var dname = user.display_name || uname;
              return `
              <tr data-uid="${uid}">
                <td class="admin-table-name">${uname}</td>
                <td>${dname}</td>
                <td class="admin-table-score" id="score-${uid}">${user.bio_score || 0}</td>
                <td>${user.total_answered || 0}</td>
                <td>${user.total_correct || 0}</td>
                <td>${(user.accuracy || 0)}%</td>
                <td id="points-${uid}" style="font-weight:700;color:var(--color-deep,#1a3a2a);">${typeof user.points === 'number' ? user.points : 0}</td>
                <td>
                  <select class="admin-form-select" style="padding:4px 8px;font-size:0.8rem;min-width:80px;" onchange="handleChangeUserGroup('${uid}', this.value)">
                    <option value="admin" ${user.user_group === 'admin' ? 'selected' : ''}>管理员</option>
                    <option value="premium" ${user.user_group === 'premium' ? 'selected' : ''}>高级会员</option>
                    <option value="verified" ${user.user_group === 'verified' ? 'selected' : ''}>认证会员</option>
                    <option value="member" ${user.user_group === 'member' || !user.user_group ? 'selected' : ''}>普通会员</option>
                    <option value="guest" ${user.user_group === 'guest' ? 'selected' : ''}>访客</option>
                  </select>
                </td>
                <td>
                  <div class="admin-table-actions">
                    <button class="admin-btn admin-btn--primary" onclick="handleEditUser('${uid}', '${(uname || '').replace(/'/g, "\\'")}', '${(dname || '').replace(/'/g, "\\'")}', ${user.bio_score || 0}, ${user.total_answered || 0}, ${user.total_correct || 0}, ${user.accuracy || 0}, ${typeof user.points === 'number' ? user.points : 0})">
                      编辑
                    </button>
                    <button class="admin-btn admin-btn--ghost" onclick="handleAdjustUserPoints('${uid}', ${typeof user.points === 'number' ? user.points : 0})">
                      调整信用
                    </button>
                    <button class="admin-btn admin-btn--ghost" onclick="handleResetPassword('${uid}')">
                      重置密码
                    </button>
                    <button class="admin-btn admin-btn--danger" onclick="handleDeleteUser('${uid}')">
                      ${ICONS.trash}
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  html += '</div>';

  // 编辑用户弹窗
  html += `
    <div class="admin-modal-overlay" id="admin-user-modal" style="display:none;">
      <div class="admin-modal">
        <div class="admin-modal-header">
          <div class="admin-modal-title">编辑用户</div>
          <button class="admin-modal-close" onclick="closeUserModal()">&times;</button>
        </div>
        <form id="admin-user-edit-form" class="admin-form-grid">
          <div class="admin-form-group">
            <label class="admin-form-label">用户名</label>
            <input type="text" class="admin-form-input" id="edit-username" placeholder="输入用户名">
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">显示名称</label>
            <input type="text" class="admin-form-input" id="edit-display-name" placeholder="输入显示名称">
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">Bio 分数</label>
            <input type="number" class="admin-form-input" id="edit-bio-score" min="0" max="100">
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">信用</label>
            <input type="number" class="admin-form-input" id="edit-points" min="0">
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">总答题数</label>
            <input type="number" class="admin-form-input" id="edit-total-answered" min="0">
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">总正确数</label>
            <input type="number" class="admin-form-input" id="edit-total-correct" min="0">
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">准确率 (%)</label>
            <input type="number" class="admin-form-input" id="edit-accuracy" min="0" max="100" step="0.1">
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">新密码（留空不修改）</label>
            <input type="text" class="admin-form-input" id="edit-new-password" placeholder="输入新密码">
          </div>
          <div class="admin-form-group full">
            <button type="submit" class="admin-form-submit">保存修改</button>
          </div>
        </form>
      </div>
    </div>
  `;

  container.innerHTML = html;
}


window.handleChangeUserGroup = async function(userId, newGroup) {
  var sb = (typeof window.getSupabase === 'function') ? window.getSupabase() : null;
  if (!sb) { showAdminToast('Supabase 未连接', 'error'); return; }
  try {
    var { error } = await sb.from('profiles').update({ user_group: newGroup }).eq('id', userId);
    if (error) { showAdminToast('更新失败: ' + error.message, 'error'); return; }
    showAdminToast('用户组已设为 ' + {admin:'管理员',premium:'高级会员',verified:'认证会员',member:'普通会员',guest:'访客'}[newGroup], 'success');
  } catch(e) {
    showAdminToast('更新出错: ' + e.message, 'error');
  }
};

window.handleDeleteUser = async function(userId) {
  if (!confirm('确定要删除该用户吗？此操作不可恢复。')) return;
  var sb = (typeof window.getSupabase === 'function') ? window.getSupabase() : null;
  if (!sb) { alert('Supabase 未连接'); return; }
  try {
    var { error } = await sb.from('profiles').delete().eq('id', userId);
    if (error) { alert('删除失败: ' + error.message); return; }
    const users = await getUsers();
    const container = document.getElementById('admin-tab-content');
    if (users && container) renderUsersTab(container, users);
    showAdminToast('用户已删除', 'success');
  } catch(e) {
    alert('删除出错: ' + e.message);
  }
};

window.handleAdjustUserPoints = async function(userId, currentPoints) {
  const amountStr = prompt('调整该用户的信用\n\n当前信用：' + currentPoints + '\n输入正数增加，输入负数扣除，例如：+10 或 -5');
  if (!amountStr) return;
  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount === 0) {
    showAdminToast('请输入有效的调整数值', 'error');
    return;
  }
  const reason = prompt('调整原因（必填）：') || '管理员手动调整';
  try {
    var result;
    if (typeof window.adjustUserPoints === 'function') {
      result = await window.adjustUserPoints(amount, reason, { userId: userId, source: 'admin' });
    } else if (typeof adjustUserPoints === 'function') {
      result = await adjustUserPoints(amount, reason, { userId: userId, source: 'admin' });
    } else {
      showAdminToast('信用调整功能未加载', 'error');
      return;
    }
    if (result && result.ok) {
      const crCell = document.getElementById('points-' + userId);
      if (crCell) crCell.textContent = result.points;
      showAdminToast('已调整用户信用为 ' + result.points, 'success');
    } else {
      showAdminToast('调整失败：' + (result && result.error ? result.error : '未知错误'), 'error');
    }
  } catch (e) {
    showAdminToast('调整出错：' + e.message, 'error');
  }
};


window.handleEditUser = function(userId, username, displayName, bioScore, totalAnswered, totalCorrect, accuracy, points) {
  const modal = document.getElementById('admin-user-modal');
  if (!modal) return;
  document.getElementById('edit-username').value = username || '';
  document.getElementById('edit-display-name').value = displayName || '';
  document.getElementById('edit-bio-score').value = bioScore;
  document.getElementById('edit-points').value = (typeof points === 'number') ? points : 0;
  document.getElementById('edit-total-answered').value = totalAnswered;
  document.getElementById('edit-total-correct').value = totalCorrect;
  document.getElementById('edit-accuracy').value = accuracy;
  document.getElementById('edit-new-password').value = '';
  modal.style.display = 'flex';

  // 绑定表单提交
  const form = document.getElementById('admin-user-edit-form');
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);
  newForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    var sb = (typeof window.getSupabase === 'function') ? window.getSupabase() : null;
    if (!sb) { showAdminToast('Supabase 未连接', 'error'); return; }
    const newUsername = document.getElementById('edit-username').value.trim();
    const newDisplayName = document.getElementById('edit-display-name').value.trim();
    const updates = {
      username: newUsername || undefined,
      display_name: newDisplayName || undefined,
      bio_score: parseInt(document.getElementById('edit-bio-score').value),
      points: parseInt(document.getElementById('edit-points').value),
      total_answered: parseInt(document.getElementById('edit-total-answered').value),
      total_correct: parseInt(document.getElementById('edit-total-correct').value),
      accuracy: parseFloat(document.getElementById('edit-accuracy').value)
    };
    // 移除空字符串字段，避免覆盖为空
    if (!newUsername) delete updates.username;
    if (!newDisplayName) delete updates.display_name;
    if (isNaN(updates.points)) delete updates.points;
    try {
      var { error } = await sb.from('profiles').update(updates).eq('id', userId);
      if (error) { showAdminToast('更新失败: ' + parseSupabaseError(error), 'error'); return; }
      closeUserModal();
      const users = await getUsers();
      const container = document.getElementById('admin-tab-content');
      if (users && container) renderUsersTab(container, users);
      showAdminToast('用户信息已更新', 'success');
    } catch(e) {
      showAdminToast('更新出错: ' + e.message, 'error');
    }
  });
};

window.closeUserModal = function() {
  const modal = document.getElementById('admin-user-modal');
  if (modal) modal.style.display = 'none';
};

window.handleResetPassword = async function(userId) {
  const newPwd = prompt('重置该用户的密码：', '123456');
  if (newPwd) {
    showAdminToast('密码重置功能需要 Supabase Admin API，暂不可用', 'error');
  }
};
