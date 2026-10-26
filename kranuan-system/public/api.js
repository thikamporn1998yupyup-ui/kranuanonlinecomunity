
/* การเชื่อมต่อเซิร์ฟเวอร์กลาง: ไม่มี secret ในเบราว์เซอร์ */
window.K={user:null,csrf:'',events:null,listeners:new Set(),poll:null,
 async request(path,options={}){const headers={'Content-Type':'application/json',...(options.headers||{})};if(this.csrf)headers['X-CSRF-Token']=this.csrf;const res=await fetch('/api'+path,{credentials:'same-origin',...options,headers});const data=await res.json().catch(()=>({error:'คำตอบจากเซิร์ฟเวอร์ไม่ถูกต้อง'}));if(!res.ok)throw Object.assign(new Error(data.error||'เชื่อมต่อไม่สำเร็จ'),{status:res.status});return data},
 async boot(){const s=await this.request('/session',{method:'POST',body:'{}'});this.user=s.user;this.csrf=s.csrf;return this.user},
 async login(username,password){const s=await this.request('/login',{method:'POST',body:JSON.stringify({username,password})});this.user=s.user;this.csrf=s.csrf;this.connect();return this.user},
 async logout(){await this.request('/logout',{method:'POST',body:'{}'});this.disconnect();await this.boot();this.connect()},
 disconnect(){this.events?.close();clearInterval(this.poll);this.events=null},
 connect(){this.disconnect();this.events=new EventSource('/api/events');this.events.addEventListener('refresh',()=>this.notify());this.events.onerror=()=>{};this.poll=setInterval(()=>this.notify(),15000)},
 notify(){for(const fn of this.listeners)Promise.resolve().then(fn).catch(console.warn)},
 on(fn){this.listeners.add(fn);return ()=>this.listeners.delete(fn)}
};
window.kEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.kMoney=n=>Number(n||0).toLocaleString('th-TH',{maximumFractionDigits:2})+' บาท';
window.staffLogin=()=>{let d=document.getElementById('staffLogin');if(!d){d=document.createElement('dialog');d.id='staffLogin';d.className='kdialog';document.body.appendChild(d)}d.innerHTML='<form id="staffLoginForm"><h2>บัญชีทีมงาน / ร้านค้า</h2><p class="muted">ลูกค้าสั่งซื้อได้โดยไม่ต้องใช้บัญชีทีมงาน</p><label>ชื่อบัญชี<input name="username" required autocomplete="username"></label><label>รหัสผ่าน<input name="password" type="password" required autocomplete="current-password"></label><p id="staffError" role="alert"></p><div class="krow"><button type="button" onclick="this.closest(\'dialog\').close()">ปิด</button><button class="primary" type="submit">เข้าสู่ระบบ</button></div></form>';d.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{await K.login(e.target.username.value,e.target.password.value);d.close();location.href=K.user.role==='rider'?'/rider/':'/admin.html'}catch(err){d.querySelector('#staffError').textContent=err.message}finally{b.disabled=false}};d.showModal()};
