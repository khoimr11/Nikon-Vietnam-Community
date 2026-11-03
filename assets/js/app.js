/* Khoảnh — trang cộng đồng */
(function () {
  "use strict";
  const { $, $$, el, cfg, sb, DEMO } = K;
  const CH = cfg.CHALLENGE || {};
  const APERTURE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.6"/><path d="M12 2l3.5 7.5M22 12l-7.5 3.5M12 22l-3.5-7.5M2 12l7.5-3.5M19 5l-5.2 5.2M19 19l-5.2-5.2M5 19l5.2-5.2M5 5l5.2 5.2" stroke="currentColor" stroke-width="1.3"/></svg>';
  const BUBBLE = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';

  const S = { user: null, profile: null, feed: [], urls: {}, myLikes: new Set(), filter: "Tất cả", cam: "", sort: "new", open: null, comments: [], busy: false, demoComments: {}, demoMine: [] };

  /* ---------- static content ---------- */
  K.mountLogo();
  if (DEMO) $("#demoBar").hidden = false;
  $("#heroEyebrow").textContent = "Thử thách tháng " + (K.M + 1) + " · " + K.Y;
  if (CH.title) {
    const words = CH.title.split(" "), tail = words.splice(-2).join(" "), em = el("em");
    em.append(el("span", "", tail)); const h = $("#heroTitle"); h.textContent = "";
    if (words.length) h.append(words.join(" "), el("br")); h.append(em);
  }
  $("#lbEyebrow").textContent = "Bảng vinh danh · tháng " + (K.M + 1);
  $("#chLabel").textContent = "Tham gia thử thách tháng " + (K.M + 1) + ": " + (CH.title || "");
  $("#prizeMain").textContent = CH.prize || ""; $("#prizeCommunity").textContent = CH.communityPrize || "";
  $("#hashtag").textContent = CH.hashtag || "#KhoanhNikon";
  const D = cfg.DISTRIBUTOR || {};
  $("#fDist").textContent = D.name || ""; $("#fHcm").textContent = D.hcm || ""; $("#fHn").textContent = D.hn || "";
  $("#fHot").textContent = D.hotline || ""; $("#fMail").textContent = D.email || "";
  const fb = (cfg.SOCIAL || []).find(s => s.key === "facebook"); if (fb) $("#schoolLink").href = fb.url;
  const PLAT = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", web: "Website", youtube: "YouTube" };
  (cfg.SOCIAL || []).forEach(s => {
    const a = el("a"); a.href = s.url; a.target = "_blank"; a.rel = "noopener";
    const plat = el("div", "plat"); plat.append(el("span", "", PLAT[s.key] || s.key), el("span", "", "↗"));
    const go = el("div", "go"); go.append(el("span", "", s.key === "web" ? "Ghé website" : "Theo dõi"));
    a.append(plat, el("div", "handle", s.handle), el("div", "blurb", s.blurb), go);
    $("#socialGrid").append(a);
  });
  K.GENRES.forEach(g => $("#fGenre").append(new Option(g, g)));
  K.CAMS.forEach(c => { $("#fCam").append(new Option(c, c)); $("#sCam").append(new Option(c, c)); });
  $("#camFilter").append(new Option("Tất cả máy Nikon", "")); K.CAMS.forEach(c => $("#camFilter").append(new Option(c, c)));
  K.REPORT_REASONS.forEach((r, i) => { const l = el("label"); const i2 = el("input"); i2.type = "radio"; i2.name = "rr"; i2.value = r; if (!i) i2.checked = true; l.append(i2, r); $("#vReasons").append(l); });

  function tick() { const d = Math.max(0, K.MONTH_END - Date.now()); $("#countdown").textContent = Math.floor(d / 864e5) + " ngày " + Math.floor(d % 864e5 / 36e5) + " giờ"; }
  tick(); setInterval(tick, 60000);

  /* ---------- helpers ---------- */
  const src = w => w.sample ? K.paint(w) : (w.localUrl || S.urls[w.storage_path] || "");
  const inChallenge = w => w.in_challenge && w.month === K.MONTH;
  const find = id => S.feed.find(w => w.id === id);
  const initial = n => (n || "?").trim().charAt(0).toUpperCase();
  function needLogin() { if (!S.user) { openAuth("login", "Đăng nhập để tiếp tục."); return true; } return false; }

  /* ---------- render ---------- */
  function renderFilters() {
    const f = $("#filters"); f.textContent = "";
    ["Tất cả", "Thử thách tháng"].concat(K.GENRES).forEach(g => {
      const b = el("button", "chip", g); b.type = "button"; b.setAttribute("aria-pressed", String(S.filter === g));
      b.onclick = () => { S.filter = g; renderFilters(); renderGrid(); }; f.append(b);
    });
  }
  function visible() {
    let list = S.feed.slice();
    if (S.filter === "Thử thách tháng") list = list.filter(inChallenge); else if (S.filter !== "Tất cả") list = list.filter(w => w.genre === S.filter);
    if (S.cam) list = list.filter(w => w.camera === S.cam);
    return list.sort(S.sort === "top" ? (a, b) => b.like_count - a.like_count || new Date(b.created_at) - new Date(a.created_at)
      : (a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  function statEl(w) {
    const d = el("div", "stat"); const mine = S.myLikes.has(w.id);
    const a = el("span", mine ? "on" : ""); a.innerHTML = APERTURE; a.append(String(w.like_count));
    const b = el("span"); b.innerHTML = BUBBLE; b.append(String(w.comment_count)); d.append(a, b); return d;
  }
  function renderGrid() {
    const g = $("#grid"); g.textContent = ""; const list = visible();
    if (!list.length) { g.append(el("div", "empty", S.feed.length ? "Chưa có tác phẩm nào trong mục này." : "Phòng trưng bày đang chờ những tác phẩm đầu tiên. Hãy là người đầu tiên gửi ảnh.")); return; }
    list.forEach(w => {
      const b = el("button", "card"); b.type = "button"; b.setAttribute("aria-label", w.title + ", " + w.display_name);
      const pic = el("div", "pic"); const img = new Image(); img.alt = w.title; img.loading = "lazy"; img.src = src(w);
      if (w.width && w.height) { img.width = w.width; img.height = w.height; }
      pic.append(img); if (w.sample) pic.append(el("span", "tag", "Mẫu")); if (inChallenge(w)) pic.append(el("span", "tag ch", "Dự thi"));
      const cap = el("div", "cap"), l = el("div"); l.append(el("div", "t", w.title), el("div", "by", w.display_name), el("div", "x", K.exifLine(w)));
      cap.append(l, statEl(w)); b.append(pic, cap); b.onclick = () => openViewer(w.id); g.append(b);
    });
  }
  const ranked = () => S.feed.filter(inChallenge).sort((a, b) => b.like_count - a.like_count || new Date(a.created_at) - new Date(b.created_at));
  function renderRanks() {
    const r = $("#ranks"); r.textContent = ""; const list = ranked().slice(0, 6);
    if (!list.length) { r.append(el("li", "note", "Chưa có tác phẩm dự thi tháng này.")); return; }
    list.forEach((w, i) => {
      const li = el("li"); li.tabIndex = 0; const img = new Image(); img.alt = ""; img.src = src(w);
      const mid = el("div"); mid.append(el("div", "t", w.title), el("div", "by", w.display_name + (w.sample ? " · mẫu" : "")));
      const v = el("div", "v"); v.innerHTML = APERTURE; v.append(String(w.like_count));
      li.append(el("div", "n", String(i + 1)), img, mid, v); li.onclick = () => openViewer(w.id); li.onkeydown = e => { if (e.key === "Enter") openViewer(w.id); };
      r.append(li);
    });
  }
  function renderHero() {
    const top = ranked()[0] || S.feed[0]; const img = $("#heroImg"), lab = $("#heroLabel"); lab.textContent = "";
    if (top) {
      img.src = src(top); img.alt = top.title; img.onclick = () => openViewer(top.id);
      lab.append(el("div", "t", top.title), el("div", "rank", inChallenge(top) ? "Dẫn đầu tháng" : "Mới treo"),
        el("div", "by", top.display_name + " · " + top.like_count + " lượt thích"), el("div", "x", [K.exifLine(top), top.lens].filter(Boolean).join(" · ")));
    } else { img.removeAttribute("src"); lab.append(el("div", "t", "Chờ tác phẩm đầu tiên"), el("div", "by", "Ảnh dẫn đầu tháng sẽ được treo tại đây.")); }
    $("#statWorks").textContent = ranked().length;
    $("#statLikes").textContent = S.feed.reduce((s, w) => s + (w.like_count || 0), 0);
  }
  function renderAll() { renderGrid(); renderRanks(); renderHero(); if (S.open) renderViewer(); }

  /* ---------- data ---------- */
  async function loadFeed() {
    if (DEMO) { S.feed = K.SAMPLES.map(s => ({ ...s })).concat(S.demoMine.filter(m => m.status === "approved")); renderAll(); return; }
    const { data, error } = await sb.from("photo_feed").select("*").order("created_at", { ascending: false }).limit(400);
    if (error) { K.toast("Chưa tải được phòng trưng bày. Vui lòng tải lại trang.", "err"); return; }
    S.feed = data || []; S.urls = await K.signed(S.feed.map(w => w.storage_path)); renderAll();
  }
  async function loadMyLikes() {
    S.myLikes = new Set(); if (DEMO || !S.user) return;
    const { data } = await sb.from("likes").select("photo_id").eq("user_id", S.user.id);
    (data || []).forEach(r => S.myLikes.add(r.photo_id));
  }

  /* ---------- viewer ---------- */
  async function openViewer(id) {
    S.open = id; S.comments = []; $("#viewer").hidden = false; document.body.style.overflow = "hidden"; $("#vReport").hidden = true;
    renderViewer(); $("#vClose").focus(); await loadComments(); renderViewer();
  }
  function closeViewer() { S.open = null; $("#viewer").hidden = true; document.body.style.overflow = ""; }
  $("#vClose").onclick = closeViewer;
  async function loadComments() {
    const id = S.open; if (!id) return;
    if (DEMO) { S.comments = S.demoComments[id] || []; return; }
    const { data } = await sb.from("comments").select("id,body,status,created_at,user_id,profiles(display_name)").eq("photo_id", id).order("created_at");
    if (S.open === id) S.comments = data || [];
  }
  function renderViewer() {
    const w = find(S.open); if (!w) { closeViewer(); return; }
    const img = $("#vImg"); if (img.dataset.id !== w.id) { img.src = src(w); img.alt = w.title; img.dataset.id = w.id; }
    $("#vEyebrow").textContent = [w.genre, inChallenge(w) ? "Dự thi tháng " + (K.M + 1) : "", w.sample ? "Tác phẩm mẫu" : ""].filter(Boolean).join(" · ");
    $("#vTitle").textContent = w.title; $("#vBy").textContent = w.display_name;
    $("#vStory").textContent = w.story || ""; $("#vStory").hidden = !w.story;
    const ex = $("#vExif"); ex.textContent = "";
    [["Khẩu", w.aperture ? "f/" + w.aperture : "—"], ["Tốc độ", w.shutter || "—"], ["ISO", w.iso || "—"], ["Tiêu cự", w.focal ? w.focal + "mm" : "—"]]
      .forEach(([k, v]) => { const d = el("div"); d.append(el("span", "", k), el("b", "", v)); ex.append(d); });
    $("#vGear").textContent = [w.camera, w.lens].filter(Boolean).join(" · ");
    const liked = S.myLikes.has(w.id), lb = $("#vLike"); lb.setAttribute("aria-pressed", String(liked)); lb.innerHTML = APERTURE; lb.append(liked ? " Đã thích" : " Thích tác phẩm");
    $("#vLikeNote").textContent = w.like_count + " lượt thích" + (S.user ? "" : " · đăng nhập để thích");
    $("#vDelete").hidden = !(S.user && w.user_id && w.user_id === S.user.id);
    const box = $("#vComments"); box.textContent = ""; const shown = S.comments.filter(c => c.status === "visible" || (S.user && c.user_id === S.user.id));
    $("#vCmHead").textContent = "Lời nhắn · " + shown.filter(c => c.status === "visible").length;
    if (!shown.length) box.append(el("div", "note", "Chưa có lời nhắn. Hãy nói điều bạn thích ở bức ảnh này."));
    shown.forEach(c => {
      const name = (c.profiles && c.profiles.display_name) || "Thành viên"; const row = el("div", "cm"), body = el("div"), who = el("div", "who", name);
      const tm = el("time", "", K.fmtAgo(c.created_at)); who.append(tm); body.append(who, el("p", "", c.body));
      if (c.status !== "visible") body.append(el("div", "note", "Đang chờ ban quản trị xem lại"));
      row.append(el("div", "av", initial(name)), body); box.append(row);
    });
    $("#cInput").placeholder = S.user ? "Viết lời nhắn cho tác giả" : "Đăng nhập để để lại lời nhắn";
  }
  $("#vLike").onclick = async () => {
    if (needLogin() || S.busy) return; const w = find(S.open); if (!w) return; S.busy = true;
    const liked = S.myLikes.has(w.id);
    try {
      if (!DEMO) {
        const q = liked ? sb.from("likes").delete().eq("photo_id", w.id).eq("user_id", S.user.id) : sb.from("likes").insert({ photo_id: w.id, user_id: S.user.id });
        const { error } = await q; if (error && error.code !== "23505") throw error;
      }
      if (liked) { S.myLikes.delete(w.id); w.like_count--; } else { S.myLikes.add(w.id); w.like_count++; }
      renderAll();
    } catch (e) { K.toast("Chưa lưu được lượt thích. Thử lại sau.", "err"); } finally { S.busy = false; }
  };
  $("#cform").onsubmit = async e => {
    e.preventDefault(); if (needLogin() || S.busy) return; const body = $("#cInput").value.trim(); if (!body) return; const w = find(S.open); S.busy = true;
    try {
      if (DEMO) { const c = { id: "c" + Date.now(), body, status: "visible", created_at: new Date().toISOString(), user_id: S.user.id, profiles: { display_name: S.profile.display_name } }; (S.demoComments[w.id] = S.demoComments[w.id] || []).push(c); }
      else {
        const { data, error } = await sb.from("comments").insert({ photo_id: w.id, user_id: S.user.id, body }).select("status").single();
        if (error) throw error; if (data && data.status !== "visible") K.toast("Lời nhắn đang chờ ban quản trị xem lại.");
      }
      $("#cInput").value = ""; w.comment_count++; await loadComments(); renderAll();
    } catch (err) { K.toast("Chưa gửi được lời nhắn.", "err"); } finally { S.busy = false; }
  };
  $("#vReportBtn").onclick = () => { if (needLogin()) return; $("#vReport").hidden = false; };
  $("#vReportCancel").onclick = () => { $("#vReport").hidden = true; };
  $("#vReport").onsubmit = async e => {
    e.preventDefault(); const w = find(S.open); const reason = ($("input[name=rr]:checked") || {}).value;
    if (DEMO) { K.toast("Đã ghi nhận báo cáo (demo). Ảnh nhận 3 báo cáo sẽ tự gỡ để duyệt lại."); $("#vReport").hidden = true; return; }
    const { error } = await sb.from("reports").insert({ photo_id: w.id, user_id: S.user.id, reason });
    if (error && error.code === "23505") K.toast("Bạn đã báo cáo tác phẩm này trước đó.");
    else if (error) K.toast("Chưa gửi được báo cáo.", "err");
    else K.toast("Cảm ơn bạn. Ban quản trị sẽ xem xét tác phẩm này.");
    $("#vReport").hidden = true;
  };
  $("#vDelete").onclick = async () => {
    const b = $("#vDelete"), w = find(S.open); if (!w) return;
    if (b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = "Bấm lần nữa để gỡ vĩnh viễn"; return; }
    b.dataset.confirm = ""; b.textContent = "Gỡ tác phẩm của tôi";
    if (!DEMO) { const { error } = await sb.from("photos").delete().eq("id", w.id); if (error) { K.toast("Chưa gỡ được tác phẩm.", "err"); return; } await sb.storage.from("photos").remove([w.storage_path]); }
    else S.demoMine = S.demoMine.filter(m => m.id !== w.id);
    closeViewer(); K.toast("Đã gỡ tác phẩm."); loadFeed();
  };

  /* ---------- auth ---------- */
  function setTab(t) {
    $("#tabLogin").setAttribute("aria-selected", String(t === "login")); $("#tabSignup").setAttribute("aria-selected", String(t === "signup"));
    $("#loginForm").hidden = t !== "login"; $("#signupForm").hidden = t !== "signup"; $("#resetForm").hidden = t !== "reset";
    $(".tabs").hidden = t === "reset";
    $("#authTitle").textContent = t === "signup" ? "Gia nhập Khoảnh" : t === "reset" ? "Đặt lại mật khẩu" : "Chào mừng trở lại";
  }
  function authMsg(t, err) { const m = $("#authMsg"); m.textContent = t || ""; m.className = "msg" + (err ? " err" : ""); }
  function openAuth(tab, msg) { setTab(tab || "login"); authMsg(DEMO ? "Chế độ demo: nhập email bất kỳ để thử luồng đăng nhập. Không có thư nào được gửi." : msg || ""); $("#auth").hidden = false; setTimeout(() => (tab === "signup" ? $("#sName") : $("#lEmail")).focus(), 30); }
  $("#loginBtn").onclick = () => openAuth("login"); $("#gateLogin").onclick = () => openAuth("login"); $("#gateSignup").onclick = () => openAuth("signup");
  $("#tabLogin").onclick = () => setTab("login"); $("#tabSignup").onclick = () => setTab("signup");
  const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  $("#loginForm").onsubmit = async e => {
    e.preventDefault(); const email = $("#lEmail").value.trim(), password = $("#lPass").value;
    if (!validEmail(email)) return authMsg("Email chưa đúng định dạng.", true); if (!password) return authMsg("Hãy nhập mật khẩu.", true);
    if (DEMO) { setUser({ id: "demo-user", email }, { display_name: email.split("@")[0], role: "admin" }); $("#auth").hidden = true; K.toast("Đã đăng nhập (demo)."); return; }
    authMsg("Đang đăng nhập…");
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { authMsg(/confirm/i.test(error.message) ? "Email chưa được xác nhận. Kiểm tra hộp thư (cả mục Spam) và bấm link xác nhận." : "Email hoặc mật khẩu chưa đúng.", true); return; }
    $("#auth").hidden = true; K.toast("Chào mừng trở lại.");
  };
  $("#signupForm").onsubmit = async e => {
    e.preventDefault(); const name = $("#sName").value.trim(), email = $("#sEmail").value.trim(), password = $("#sPass").value, camera = $("#sCam").value;
    if (name.length < 2) return authMsg("Tên hiển thị cần ít nhất 2 ký tự.", true);
    if (!validEmail(email)) return authMsg("Email chưa đúng định dạng.", true);
    if (password.length < 8) return authMsg("Mật khẩu cần tối thiểu 8 ký tự.", true);
    if (!$("#sAgree").checked) return authMsg("Bạn cần đồng ý với quy tắc cộng đồng.", true);
    if (DEMO) { authMsg("Demo: ở bản thật, thư xác nhận được gửi tới " + email + ". Bấm link trong thư để kích hoạt tài khoản."); return; }
    authMsg("Đang tạo tài khoản…");
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name, camera }, emailRedirectTo: location.origin + location.pathname } });
    if (error) return authMsg(/registered/i.test(error.message) ? "Email này đã có tài khoản. Hãy đăng nhập." : "Chưa tạo được tài khoản: " + error.message, true);
    if (data.user && data.user.identities && data.user.identities.length === 0) return authMsg("Email này đã có tài khoản. Hãy đăng nhập.", true);
    authMsg("Đã gửi thư xác nhận tới " + email + ". Bấm link trong thư để kích hoạt tài khoản, rồi quay lại đăng nhập.");
  };
  $("#forgotBtn").onclick = async () => {
    const email = $("#lEmail").value.trim(); if (!validEmail(email)) return authMsg("Nhập email ở trên rồi bấm “Quên mật khẩu?”.", true);
    if (DEMO) return authMsg("Demo: ở bản thật, thư đặt lại mật khẩu được gửi tới " + email + ".");
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    authMsg(error ? "Chưa gửi được thư. Thử lại sau ít phút." : "Đã gửi thư đặt lại mật khẩu tới " + email + ".", !!error);
  };
  $("#resetForm").onsubmit = async e => {
    e.preventDefault(); const password = $("#rPass").value; if (password.length < 8) return authMsg("Mật khẩu cần tối thiểu 8 ký tự.", true);
    const { error } = await sb.auth.updateUser({ password }); if (error) return authMsg("Chưa lưu được mật khẩu mới.", true);
    $("#auth").hidden = true; K.toast("Đã đổi mật khẩu.");
  };

  function setUser(user, profile) {
    S.user = user; S.profile = profile;
    const acct = $("#acct"); const old = $("#avatarBtn"); if (old) old.remove();
    $("#loginBtn").hidden = !!user; $("#gate").hidden = !!user; $("#submitArea").hidden = !user; $("#menu").hidden = true;
    if (user) {
      const a = el("button", "avatar", initial(profile && profile.display_name)); a.type = "button"; a.id = "avatarBtn"; a.setAttribute("aria-label", "Tài khoản");
      a.onclick = () => { $("#menu").hidden = !$("#menu").hidden; }; acct.prepend(a);
      $("#menuName").textContent = (profile && profile.display_name) || "Thành viên"; $("#menuEmail").textContent = user.email || "";
      $("#adminLink").hidden = !(profile && (profile.role === "admin" || profile.role === "moderator"));
      if (profile && profile.camera) $("#fCam").value = profile.camera;
    }
  }
  $("#logoutBtn").onclick = async () => { if (!DEMO) await sb.auth.signOut(); setUser(null, null); S.myLikes = new Set(); renderAll(); K.toast("Đã đăng xuất."); };
  document.addEventListener("click", e => { const m = $("#menu"); if (!m.hidden && !m.contains(e.target) && e.target.id !== "avatarBtn") m.hidden = true; });

  async function onSession(session) {
    if (!session) { setUser(null, null); await loadMyLikes(); renderAll(); return; }
    const { data } = await sb.from("profiles").select("display_name,role,camera").eq("id", session.user.id).single();
    setUser(session.user, data || { display_name: "Thành viên", role: "member" }); await loadMyLikes(); renderAll();
  }

  /* ---------- upload ---------- */
  let picked = null;
  function flash(t, err) { const m = $("#msg"); m.textContent = t; m.className = "msg" + (err ? " err" : ""); }
  function preview(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return flash("Chỉ nhận ảnh JPG, PNG hoặc WebP.", true);
    if (file.size > 30 * 1048576) return flash("Ảnh vượt 30 MB. Hãy xuất lại với dung lượng nhỏ hơn.", true);
    picked = file; const inner = $("#dropInner"); inner.textContent = ""; const im = new Image(); im.src = URL.createObjectURL(file); im.alt = "Ảnh xem trước";
    inner.append(im, el("p", "", file.name + " · bấm để đổi ảnh khác")); flash("");
  }
  $("#file").onchange = e => { if (e.target.files[0]) preview(e.target.files[0]); };
  const drop = $("#drop");
  ["dragenter", "dragover"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", e => { const f = e.dataTransfer.files[0]; if (f) preview(f); });

  $("#form").onsubmit = async e => {
    e.preventDefault(); if (needLogin() || S.busy) return;
    if (!picked) return flash("Hãy chọn một tấm ảnh trước.", true);
    const title = $("#fTitle").value.trim(); if (!title) { $("#fTitle").focus(); return flash("Hãy đặt tên cho tác phẩm.", true); }
    if (!$("#fOwn").checked) return flash("Bạn cần xác nhận là tác giả và đồng ý quy tắc cộng đồng.", true);
    S.busy = true; $("#send").disabled = true; flash("Đang gửi tác phẩm…");
    const row = { title, story: $("#fStory").value.trim() || null, genre: $("#fGenre").value, camera: $("#fCam").value, lens: $("#fLens").value.trim() || null,
      aperture: $("#fF").value.trim() || null, shutter: $("#fS").value.trim() || null, iso: $("#fIso").value.trim() || null, focal: $("#fMm").value.trim() || null,
      in_challenge: $("#fCh").checked, month: K.MONTH, consent: true };
    let path = null;
    try {
      const { blob, w, h } = await K.shrink(picked);
      if (DEMO) {
        S.demoMine.unshift({ ...row, id: "d" + Date.now(), user_id: S.user.id, display_name: S.profile.display_name, status: "pending", localUrl: URL.createObjectURL(blob), created_at: new Date().toISOString(), like_count: 0, comment_count: 0, width: w, height: h });
        try { localStorage.setItem("khoanh-demo-pending", JSON.stringify(S.demoMine.length)); } catch (x) {}
      } else {
        const id = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
        path = S.user.id + "/" + id + ".jpg";
        const up = await sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (up.error) throw up.error;
        const ins = await sb.from("photos").insert({ ...row, user_id: S.user.id, storage_path: path, width: w, height: h });
        if (ins.error) throw ins.error;
      }
      $("#form").reset(); $("#fCh").checked = true; if (S.profile && S.profile.camera) $("#fCam").value = S.profile.camera; picked = null;
      $("#dropInner").textContent = ""; $("#dropInner").append(el("div", "", "Đã gửi “" + title + "”"), el("p", "", "Chọn ảnh khác để gửi tiếp"));
      flash("Tác phẩm đang chờ duyệt. Bạn có thể theo dõi trạng thái trong “Ảnh của tôi”.");
    } catch (err) {
      if (path) sb.storage.from("photos").remove([path]);
      const m = (err && err.message) || "";
      flash(/5 ảnh/.test(m) ? "Bạn đã gửi đủ 5 ảnh hôm nay. Hẹn bạn ngày mai." : /size|large/i.test(m) ? "Ảnh quá lớn sau khi nén. Hãy thử ảnh nhỏ hơn." : "Chưa gửi được ảnh. Vui lòng thử lại.", true);
    } finally { S.busy = false; $("#send").disabled = false; }
  };

  /* ---------- my photos ---------- */
  $("#mineBtn").onclick = async () => {
    $("#menu").hidden = true; $("#mine").hidden = false; const g = $("#mineGrid"); g.textContent = ""; g.append(el("div", "note", "Đang tải…"));
    let list = [], urls = {};
    if (DEMO) list = S.demoMine;
    else { const { data } = await sb.from("photos").select("id,title,status,reject_reason,storage_path,created_at").eq("user_id", S.user.id).order("created_at", { ascending: false }); list = data || []; urls = await K.signed(list.map(p => p.storage_path)); }
    g.textContent = ""; if (!list.length) { g.append(el("div", "note", "Bạn chưa gửi tác phẩm nào.")); return; }
    const LBL = { pending: "Chờ duyệt", approved: "Đã trưng bày", rejected: "Chưa được duyệt" };
    list.forEach(p => {
      const f = el("figure"), img = new Image(); img.alt = p.title; img.src = p.localUrl || urls[p.storage_path] || "";
      const cap = el("figcaption"); cap.append(el("span", "pill " + p.status, LBL[p.status] || p.status), el("b", "", p.title), el("span", "note", K.fmtDate(p.created_at)));
      if (p.status === "rejected" && p.reject_reason) cap.append(el("span", "note", "Lý do: " + p.reject_reason));
      f.append(img, cap); g.append(f);
    });
  };

  /* ---------- overlays & controls ---------- */
  $$("[data-close]").forEach(b => b.onclick = () => { b.closest(".overlay").hidden = true; });
  document.addEventListener("keydown", e => { if (e.key !== "Escape") return; if (S.open) closeViewer(); $$(".overlay").forEach(o => o.hidden = true); });
  $("#sortNew").onclick = () => { S.sort = "new"; $("#sortNew").setAttribute("aria-pressed", "true"); $("#sortTop").setAttribute("aria-pressed", "false"); renderGrid(); };
  $("#sortTop").onclick = () => { S.sort = "top"; $("#sortTop").setAttribute("aria-pressed", "true"); $("#sortNew").setAttribute("aria-pressed", "false"); renderGrid(); };
  $("#camFilter").onchange = e => { S.cam = e.target.value; renderGrid(); };

  /* ---------- boot ---------- */
  renderFilters(); loadFeed();
  if (!DEMO) {
    sb.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") { openAuth("reset"); return; }
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "INITIAL_SESSION" || event === "USER_UPDATED") setTimeout(() => onSession(session), 0);
    });
  }
})();
