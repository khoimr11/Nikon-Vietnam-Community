/* Nikon Atelier — trang cộng đồng */
(function () {
  "use strict";
  const { $, $$, el, cfg, sb, DEMO } = K;
  const CH = cfg.CHALLENGE || {};
  const APERTURE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.6"/><path d="M12 2l3.5 7.5M22 12l-7.5 3.5M12 22l-3.5-7.5M2 12l7.5-3.5M19 5l-5.2 5.2M19 19l-5.2-5.2M5 19l5.2-5.2M5 5l5.2 5.2" stroke="currentColor" stroke-width="1.3"/></svg>';
  const BUBBLE = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const mobile = () => matchMedia("(max-width:760px)").matches;

  const S = { user: null, profile: null, feed: [], urls: {}, myLikes: new Set(), filter: "Tất cả", cam: "", q: "", sort: "new",
    open: null, list: [], comments: [], busy: false, demoComments: JSON.parse(JSON.stringify(K.SAMPLE_COMMENTS || {})), demoMine: [] };

  /* ---------- static content ---------- */
  K.mountLogo();
  if (DEMO) $("#demoBar").hidden = false;
  if (CH.title) $("#heroTitle").textContent = CH.title;
  $("#cTitle").textContent = "Vinh danh tháng " + (K.M + 1);
  $("#chLabel").textContent = "Tham gia thử thách tháng " + (K.M + 1) + ": " + (CH.title || "");
  $("#prizeMain").textContent = CH.prize || ""; $("#prizeCommunity").textContent = CH.communityPrize || "";
  $("#hashtag").textContent = CH.hashtag || "#NikonAtelierVN";
  const D = cfg.DISTRIBUTOR || {};
  $("#fDist").textContent = D.name || ""; $("#fHcm").textContent = D.hcm || ""; $("#fHn").textContent = D.hn || "";
  $("#fHot").textContent = D.hotline || ""; $("#fMail").textContent = D.email || "";
  const fb = (cfg.SOCIAL || []).find(s => s.key === "facebook"); if (fb) $("#schoolLink").href = fb.url;
  const PLAT = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", web: "Website", youtube: "YouTube", shopee: "Shopee" };
  const GO = { web: "Ghé website", shopee: "Mua chính hãng" };
  const COVER = { web: "dalat-fog", facebook: "window-light", instagram: "reeds", tiktok: "saigon-trails", shopee: "dunes", youtube: "star-trails" };
  (cfg.SOCIAL || []).forEach(s => {
    const a = el("a", s.key === "shopee" ? "shop" : ""); a.href = s.url; a.target = "_blank"; a.rel = "noopener";
    a.setAttribute("aria-label", (PLAT[s.key] || s.key) + ": " + s.handle);
    const media = el("div", "ch-media"), cover = new Image(); cover.alt = ""; cover.loading = "lazy";
    cover.src = "assets/img/samples/" + (s.cover || COVER[s.key] || "seascape") + "-sm.jpg"; media.append(cover);
    /* Logo kênh: đặt file chính thức vào assets/img/social/<key>.svg (hoặc .png); chưa có file thì hiện tên kênh */
    const mark = el("span", "ch-mark glass-clear"), name = el("span", "ch-name", PLAT[s.key] || s.key); mark.append(name);
    const logo = new Image(); logo.alt = PLAT[s.key] || s.key; logo.className = "ch-logo"; let tries = ["svg", "png"], ti = 0;
    logo.onload = () => { mark.classList.add("has-logo"); mark.prepend(logo); };
    logo.onerror = () => { ti++; if (ti < tries.length) logo.src = "assets/img/social/" + s.key + "." + tries[ti]; };
    logo.src = "assets/img/social/" + s.key + "." + tries[0];
    media.append(mark, el("span", "ch-arrow glass-clear", "↗"));
    const body = el("div", "ch-body");
    body.append(el("div", "handle", s.handle), el("div", "blurb", s.blurb), el("div", "go", (GO[s.key] || "Theo dõi") + " →"));
    a.append(media, body); $("#socialGrid").append(a);
  });
  K.GENRES.forEach(g => $("#fGenre").append(new Option(g, g)));
  K.CAMS.forEach(c => { $("#fCam").append(new Option(c, c)); $("#sCam").append(new Option(c, c)); });
  $("#camFilter").append(new Option("Mọi máy Nikon", "")); K.CAMS.forEach(c => $("#camFilter").append(new Option(c, c)));
  K.REPORT_REASONS.forEach((r, i) => { const l = el("label"), inp = el("input"); inp.type = "radio"; inp.name = "rr"; inp.value = r; if (!i) inp.checked = true; l.append(inp, r); $("#vReasons").append(l); });

  function tick() { const d = Math.max(0, K.MONTH_END - Date.now()); $("#sLeft").textContent = Math.floor(d / 864e5) + "N " + String(Math.floor(d % 864e5 / 36e5)).padStart(2, "0") + "G"; }
  tick(); setInterval(tick, 60000);

  /* ---------- helpers ---------- */
  const src = (w, big) => w.sample ? K.sampleSrc(w, big) : (w.localUrl || S.urls[w.storage_path] || "");
  const inChallenge = w => w.in_challenge && w.month === K.MONTH;
  const find = id => S.feed.find(w => w.id === id);
  const initial = n => (n || "?").trim().charAt(0).toUpperCase();
  const needLogin = () => { if (!S.user) { openAuth("login", "Đăng nhập để tiếp tục."); return true; } return false; };
  function imgEl(w, big, cls) {
    const img = new Image(); img.alt = w.title; img.decoding = "async"; if (!big) img.loading = "lazy";
    if (w.width && w.height) { img.width = w.width; img.height = w.height; }
    if (cls) img.className = cls;
    img.onload = () => img.classList.add("ok"); img.onerror = () => { img.classList.add("ok"); img.alt = "Không tải được ảnh"; };
    const s = src(w, big); if (s) img.src = s; return img;
  }

  /* ---------- render ---------- */
  function renderFilters() {
    const f = $("#filters"); f.textContent = "";
    ["Tất cả", "Dự thi tháng này"].concat(K.GENRES).forEach(g => {
      const b = el("button", "chip", g); b.type = "button"; b.setAttribute("aria-pressed", String(S.filter === g));
      b.onclick = () => { S.filter = g; renderFilters(); renderGrid(); }; f.append(b);
    });
  }
  function visible() {
    let list = S.feed.slice();
    if (S.filter === "Dự thi tháng này") list = list.filter(inChallenge); else if (S.filter !== "Tất cả") list = list.filter(w => w.genre === S.filter);
    if (S.cam) list = list.filter(w => w.camera === S.cam);
    if (S.q) { const q = K.fold(S.q); list = list.filter(w => K.fold(w.title + " " + w.display_name).includes(q)); }
    return list.sort(S.sort === "top" ? (a, b) => b.like_count - a.like_count : (a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  function counts(w) {
    const d = el("div", "counts"), a = el("span", S.myLikes.has(w.id) ? "on" : ""), b = el("span");
    a.innerHTML = APERTURE; a.append(String(w.like_count)); a.setAttribute("aria-label", w.like_count + " lượt thích");
    b.innerHTML = BUBBLE; b.append(String(w.comment_count)); b.setAttribute("aria-label", w.comment_count + " lời nhắn");
    d.append(a, b); return d;
  }
  function renderGrid() {
    const g = $("#grid"); g.textContent = ""; const list = visible();
    if (!list.length) {
      const e = el("div", "empty");
      if (S.feed.length) { e.append(el("span", "", "Không có ảnh nào khớp bộ lọc.")); const b = el("button", "btn small", "Xoá bộ lọc"); b.type = "button"; b.onclick = resetFilters; e.append(b); }
      else { e.append(el("span", "", "Phòng trưng bày đang chờ những tác phẩm đầu tiên.")); const a = el("a", "btn small primary", "Gửi tác phẩm đầu tiên"); a.href = "#submit"; e.append(a); }
      g.append(e); return;
    }
    list.forEach(w => {
      const b = el("button", "card"); b.type = "button"; b.setAttribute("aria-label", w.title + ", " + w.display_name);
      const fr = el("div", "frame"); fr.append(imgEl(w, false));
      if (w.sample) fr.append(el("span", "badge sample glass-clear", "Mẫu")); if (inChallenge(w)) fr.append(el("span", "badge contest", "Dự thi"));
      const meta = el("div", "meta"), l = el("div"); l.append(el("div", "t", w.title), el("div", "by", w.display_name), el("div", "x", K.exifLine(w)));
      meta.append(l, counts(w)); b.append(fr, meta); b.onclick = () => openViewer(w.id, list.map(x => x.id)); g.append(b);
    });
  }
  function resetFilters() { S.filter = "Tất cả"; S.cam = ""; S.q = ""; $("#q").value = ""; $("#camFilter").value = ""; renderFilters(); renderGrid(); }
  const ranked = () => S.feed.filter(inChallenge).sort((a, b) => b.like_count - a.like_count || new Date(a.created_at) - new Date(b.created_at));
  function renderRanks() {
    const r = $("#ranks"); r.textContent = ""; const list = ranked().slice(0, 5);
    if (!list.length) { const li = el("li"); li.style.cursor = "default"; li.append(el("span", "muted", "Chưa có tác phẩm dự thi tháng này.")); r.append(li); return; }
    list.forEach((w, i) => {
      const li = el("li"); li.tabIndex = 0; li.setAttribute("role", "button"); li.setAttribute("aria-label", "Hạng " + (i + 1) + ": " + w.title);
      const img = imgEl(w, false); img.alt = "";
      const mid = el("div"); mid.append(el("div", "t", w.title), el("div", "by", w.display_name + (w.sample ? " · mẫu" : "")));
      const v = el("div", "v"); v.innerHTML = APERTURE; v.append(String(w.like_count));
      li.append(el("div", "n", String(i + 1).padStart(2, "0")), img, mid, v);
      li.onclick = () => openViewer(w.id, list.map(x => x.id)); li.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); li.click(); } };
      r.append(li);
    });
  }
  function renderHero() {
    const top = ranked()[0] || S.feed[0]; const img = $("#heroImg"), pl = $("#heroPlaque"); pl.textContent = "";
    if (!top) { pl.hidden = true; return; }
    pl.hidden = false;
    const want = src(top, true);
    if (want && img.dataset.src !== want) { img.classList.remove("in"); img.onload = () => img.classList.add("in"); img.dataset.src = want; img.src = want; img.alt = top.title + ", " + top.display_name; }
    pl.append(el("span", "lead", inChallenge(top) ? "Dẫn đầu tháng " + (K.M + 1) : "Mới treo"), el("span", "t", top.title),
      el("span", "by", top.display_name + " · " + top.like_count + " lượt thích"), el("span", "x", K.exifLine(top)));
    pl.onclick = () => openViewer(top.id, ranked().map(x => x.id));
    $("#sWorks").textContent = ranked().length;
    $("#sLikes").textContent = S.feed.reduce((s, w) => s + (w.like_count || 0), 0).toLocaleString("vi-VN");
  }
  function renderAll() { renderGrid(); renderRanks(); renderHero(); if (S.open) renderViewer(); }

  /* ---------- data ---------- */
  async function loadFeed() {
    if (DEMO) { S.feed = K.SAMPLES.map(s => ({ ...s })).concat(S.demoMine.filter(m => m.status === "approved")); renderAll(); return; }
    const { data, error } = await sb.from("photo_feed").select("*").order("created_at", { ascending: false }).limit(400);
    if (error) { K.toast("Chưa tải được phòng trưng bày. Kiểm tra kết nối rồi tải lại trang.", "err"); return; }
    S.feed = data || []; S.urls = await K.signed(S.feed.map(w => w.storage_path)); renderAll();
  }
  async function loadMyLikes() {
    S.myLikes = new Set(); if (DEMO || !S.user) return;
    const { data } = await sb.from("likes").select("photo_id").eq("user_id", S.user.id);
    (data || []).forEach(r => S.myLikes.add(r.photo_id));
  }

  /* ---------- viewer ---------- */
  const viewer = $("#viewer"), panel = $("#vPanel");
  async function openViewer(id, list) {
    S.list = list && list.length ? list : visible().map(w => w.id);
    S.open = id; S.comments = []; viewer.hidden = false; document.body.style.overflow = "hidden"; $("#vReport").hidden = true; panel.classList.remove("open");
    try { history.replaceState(null, "", "#p-" + id); } catch (e) { }
    renderViewer(); viewer.focus({ preventScroll: true }); await loadComments(); renderViewer();
  }
  function closeViewer() { S.open = null; viewer.hidden = true; document.body.style.overflow = ""; try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { } }
  function step(d) {
    if (!S.open || S.list.length < 2) return; const i = S.list.indexOf(S.open); const next = S.list[(i + d + S.list.length) % S.list.length];
    const img = $("#vImg"); img.classList.add("swap"); setTimeout(() => { openViewer(next, S.list); setTimeout(() => img.classList.remove("swap"), 30); }, 160);
  }
  $("#vClose").onclick = closeViewer; $("#vPrev").onclick = () => step(-1); $("#vNext").onclick = () => step(1);
  $("#vGrab").onclick = () => panel.classList.toggle("open");
  async function loadComments() {
    const id = S.open; if (!id) return;
    if (DEMO) { S.comments = S.demoComments[id] || []; return; }
    const { data } = await sb.from("comments").select("id,body,status,created_at,user_id,profiles(display_name)").eq("photo_id", id).order("created_at");
    if (S.open === id) S.comments = data || [];
  }
  function renderViewer() {
    const w = find(S.open); if (!w) { closeViewer(); return; }
    const img = $("#vImg"); if (img.dataset.id !== w.id) { img.src = src(w, true); img.alt = w.title + ", " + w.display_name; img.dataset.id = w.id; }
    const i = S.list.indexOf(w.id); $("#vCount").textContent = S.list.length > 1 ? (i + 1) + " / " + S.list.length : ""; $("#vCount").hidden = S.list.length < 2;
    $("#vPrev").hidden = $("#vNext").hidden = S.list.length < 2;
    $("#vTitle").textContent = w.title; $("#vBy").textContent = w.display_name;
    const tags = $("#vTags"); tags.textContent = ""; tags.append(el("span", "", w.genre));
    if (inChallenge(w)) tags.append(el("span", "contest", "Dự thi tháng " + (K.M + 1))); if (w.sample) tags.append(el("span", "", "Ảnh mẫu"));
    $("#vStory").textContent = w.story || ""; $("#vStory").hidden = !w.story;
    const ex = $("#vExif"); ex.textContent = "";
    [["Khẩu", w.aperture ? "f/" + w.aperture : "—"], ["Tốc độ", K.shutterText(w.shutter) || "—"], ["ISO", w.iso || "—"], ["Tiêu cự", w.focal ? w.focal + "mm" : "—"]]
      .forEach(([k, v]) => { const d = el("div"); d.append(el("span", "", k), el("b", "", v)); ex.append(d); });
    $("#vGear").textContent = [w.camera, w.lens].filter(Boolean).join(" · ");
    const liked = S.myLikes.has(w.id), lb = $("#vLike"); lb.setAttribute("aria-pressed", String(liked)); lb.innerHTML = APERTURE;
    lb.append((liked ? "Đã thích · " : "Thích · ") + w.like_count);
    $("#vDelete").hidden = !(S.user && w.user_id && w.user_id === S.user.id);
    const box = $("#vComments"); box.textContent = "";
    const shown = S.comments.filter(c => c.status === "visible" || (S.user && c.user_id === S.user.id));
    $("#vCmHead").textContent = "Lời nhắn · " + shown.filter(c => c.status === "visible").length;
    if (!shown.length) box.append(el("div", "muted", "Chưa có lời nhắn. Hãy nói điều bạn thích ở bức ảnh này."));
    shown.forEach(c => {
      const name = (c.profiles && c.profiles.display_name) || "Thành viên"; const row = el("div", "cm"), body = el("div"), who = el("div", "who", name);
      who.append(el("time", "", K.fmtAgo(c.created_at))); body.append(who, el("p", "", c.body));
      if (c.status !== "visible") body.append(el("div", "muted", "Đang chờ ban quản trị xem lại"));
      row.append(el("div", "av", initial(name)), body); box.append(row);
    });
    $("#cInput").placeholder = S.user ? "Viết lời nhắn cho tác giả" : "Đăng nhập để để lại lời nhắn";
  }
  async function toggleLike(forceOn) {
    if (needLogin() || S.busy) return; const w = find(S.open); if (!w) return;
    const liked = S.myLikes.has(w.id); if (forceOn && liked) return; S.busy = true;
    try {
      if (!DEMO) {
        const q = liked ? sb.from("likes").delete().eq("photo_id", w.id).eq("user_id", S.user.id) : sb.from("likes").insert({ photo_id: w.id, user_id: S.user.id });
        const { error } = await q; if (error && error.code !== "23505") throw error;
      }
      if (liked) { S.myLikes.delete(w.id); w.like_count--; } else { S.myLikes.add(w.id); w.like_count++; }
      renderAll();
    } catch (e) { K.toast("Chưa lưu được lượt thích. Thử lại sau.", "err"); } finally { S.busy = false; }
  }
  $("#vLike").onclick = () => toggleLike();
  $("#vShare").onclick = async () => {
    const link = location.origin + location.pathname + "#p-" + S.open;
    try { await navigator.clipboard.writeText(link); K.toast("Đã sao chép link ảnh."); } catch (e) { K.toast(link); }
  };
  /* gestures: swipe to navigate, double-tap to like */
  (function () {
    const st = $("#vStage"); let x0 = null, y0 = 0, t0 = 0, lastTap = 0;
    st.addEventListener("pointerdown", e => { if (e.target.closest("button")) return; x0 = e.clientX; y0 = e.clientY; t0 = Date.now(); });
    st.addEventListener("pointerup", e => {
      if (x0 === null) return; const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) { step(dx < 0 ? 1 : -1); return; }
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && Date.now() - t0 < 250) {
        const now = Date.now();
        if (now - lastTap < 320) { lastTap = 0; const b = $("#burst"); b.classList.remove("go"); void b.offsetWidth; b.classList.add("go"); toggleLike(true); }
        else lastTap = now;
      }
    });
  })();
  $("#cform").onsubmit = async e => {
    e.preventDefault(); if (needLogin() || S.busy) return; const body = $("#cInput").value.trim(); if (!body) return; const w = find(S.open); S.busy = true;
    try {
      if (DEMO) (S.demoComments[w.id] = S.demoComments[w.id] || []).push({ id: "c" + Date.now(), body, status: "visible", created_at: new Date().toISOString(), user_id: S.user.id, profiles: { display_name: S.profile.display_name } });
      else {
        const { data, error } = await sb.from("comments").insert({ photo_id: w.id, user_id: S.user.id, body }).select("status").single();
        if (error) throw error; if (data && data.status !== "visible") K.toast("Lời nhắn đang chờ ban quản trị xem lại.");
      }
      $("#cInput").value = ""; w.comment_count++; await loadComments(); renderAll();
    } catch (err) { K.toast("Chưa gửi được lời nhắn.", "err"); } finally { S.busy = false; }
  };
  $("#vReportBtn").onclick = () => { if (needLogin()) return; $("#vReport").hidden = false; panel.classList.add("open"); };
  $("#vReportCancel").onclick = () => { $("#vReport").hidden = true; };
  $("#vReport").onsubmit = async e => {
    e.preventDefault(); const w = find(S.open); const reason = ($("input[name=rr]:checked") || {}).value;
    if (DEMO) { K.toast("Đã ghi nhận báo cáo (demo). Ảnh nhận 3 báo cáo sẽ tự gỡ để duyệt lại."); $("#vReport").hidden = true; return; }
    const { error } = await sb.from("reports").insert({ photo_id: w.id, user_id: S.user.id, reason });
    K.toast(error && error.code === "23505" ? "Bạn đã báo cáo tác phẩm này trước đó." : error ? "Chưa gửi được báo cáo." : "Cảm ơn bạn. Ban quản trị sẽ xem xét tác phẩm này.", error && error.code !== "23505" ? "err" : "");
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
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { if (S.open) closeViewer(); $$(".overlay").forEach(o => o.hidden = true); $("#menu").hidden = true; return; }
    if (!S.open || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.key === "ArrowRight") step(1); else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "l" || e.key === "L") toggleLike();
    else if (e.key === "c" || e.key === "C") { e.preventDefault(); panel.classList.add("open"); $("#cInput").focus(); }
  });

  /* ---------- auth ---------- */
  function setTab(t) {
    $("#tabLogin").setAttribute("aria-selected", String(t === "login")); $("#tabSignup").setAttribute("aria-selected", String(t === "signup"));
    $("#loginForm").hidden = t !== "login"; $("#signupForm").hidden = t !== "signup"; $("#resetForm").hidden = t !== "reset"; $(".tabs").hidden = t === "reset";
    $("#authTitle").textContent = t === "signup" ? "Gia nhập Nikon Atelier" : t === "reset" ? "Mật khẩu mới" : "Chào mừng trở lại";
  }
  function authMsg(t, err) { const m = $("#authMsg"); m.textContent = t || ""; m.className = "msg" + (err ? " err" : ""); }
  function openAuth(tab, msg) {
    setTab(tab || "login"); authMsg(DEMO ? "Bản demo: nhập email bất kỳ để thử. Không có thư nào được gửi." : msg || "");
    $("#auth").hidden = false; setTimeout(() => (tab === "signup" ? $("#sName") : $("#lEmail")).focus(), 40);
  }
  $("#loginBtn").onclick = () => openAuth("login"); $("#gateLogin").onclick = () => openAuth("login"); $("#gateSignup").onclick = () => openAuth("signup");
  $("#tabLogin").onclick = () => setTab("login"); $("#tabSignup").onclick = () => setTab("signup");
  const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  $("#loginForm").onsubmit = async e => {
    e.preventDefault(); const email = $("#lEmail").value.trim(), password = $("#lPass").value;
    if (!validEmail(email)) return authMsg("Email chưa đúng định dạng.", true); if (!password) return authMsg("Hãy nhập mật khẩu.", true);
    if (DEMO) { setUser({ id: "demo-user", email }, { display_name: email.split("@")[0], role: "admin" }); $("#auth").hidden = true; K.toast("Đã đăng nhập (demo)."); renderAll(); return; }
    authMsg("Đang đăng nhập…");
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return authMsg(/confirm/i.test(error.message) ? "Email chưa được xác nhận. Kiểm tra hộp thư, cả mục Spam, rồi bấm link xác nhận." : "Email hoặc mật khẩu chưa đúng.", true);
    $("#auth").hidden = true; K.toast("Chào mừng trở lại.");
  };
  $("#signupForm").onsubmit = async e => {
    e.preventDefault(); const name = $("#sName").value.trim(), email = $("#sEmail").value.trim(), password = $("#sPass").value, camera = $("#sCam").value;
    if (name.length < 2) return authMsg("Tên hiển thị cần ít nhất 2 ký tự.", true);
    if (!validEmail(email)) return authMsg("Email chưa đúng định dạng.", true);
    if (password.length < 8) return authMsg("Mật khẩu cần tối thiểu 8 ký tự.", true);
    if (!$("#sAgree").checked) return authMsg("Bạn cần đồng ý với quy tắc cộng đồng.", true);
    if (DEMO) return authMsg("Bản demo: ở bản thật, thư xác nhận được gửi tới " + email + ".");
    authMsg("Đang tạo tài khoản…");
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name, camera }, emailRedirectTo: location.origin + location.pathname } });
    if (error) return authMsg(/registered/i.test(error.message) ? "Email này đã có tài khoản. Hãy đăng nhập." : "Chưa tạo được tài khoản: " + error.message, true);
    if (data.user && data.user.identities && data.user.identities.length === 0) return authMsg("Email này đã có tài khoản. Hãy đăng nhập.", true);
    authMsg("Đã gửi thư xác nhận tới " + email + ". Bấm link trong thư để kích hoạt tài khoản.");
  };
  $("#forgotBtn").onclick = async () => {
    const email = $("#lEmail").value.trim(); if (!validEmail(email)) return authMsg("Nhập email ở trên rồi bấm “Quên mật khẩu?”.", true);
    if (DEMO) return authMsg("Bản demo: ở bản thật, thư đặt lại mật khẩu được gửi tới " + email + ".");
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    authMsg(error ? "Chưa gửi được thư. Thử lại sau ít phút." : "Đã gửi thư đặt lại mật khẩu tới " + email + ".", !!error);
  };
  $("#resetForm").onsubmit = async e => {
    e.preventDefault(); const password = $("#rPass").value; if (password.length < 8) return authMsg("Mật khẩu cần tối thiểu 8 ký tự.", true);
    const { error } = await sb.auth.updateUser({ password }); if (error) return authMsg("Chưa lưu được mật khẩu mới.", true);
    $("#auth").hidden = true; K.toast("Đã đổi mật khẩu.");
  };
  function setUser(user, profile) {
    S.user = user; S.profile = profile; const old = $("#avatarBtn"); if (old) old.remove();
    $("#loginBtn").hidden = !!user; $("#gate").hidden = !!user; $("#submitArea").hidden = !user; $("#menu").hidden = true;
    $("#tabMeLabel").textContent = user ? "Của tôi" : "Đăng nhập";
    if (user) {
      const a = el("button", "avatar", initial(profile && profile.display_name)); a.type = "button"; a.id = "avatarBtn"; a.setAttribute("aria-label", "Tài khoản");
      a.onclick = e => { e.stopPropagation(); $("#menu").hidden = !$("#menu").hidden; }; $("#acct").prepend(a);
      $("#menuName").textContent = (profile && profile.display_name) || "Thành viên"; $("#menuEmail").textContent = user.email || "";
      $("#adminLink").hidden = !(profile && (profile.role === "admin" || profile.role === "moderator"));
      if (profile && profile.camera) $("#fCam").value = profile.camera;
    }
  }
  $("#logoutBtn").onclick = async () => { if (!DEMO) await sb.auth.signOut(); setUser(null, null); S.myLikes = new Set(); renderAll(); K.toast("Đã đăng xuất."); };
  document.addEventListener("click", e => { const m = $("#menu"); if (!m.hidden && !m.contains(e.target) && !e.target.closest("#avatarBtn,#tabMe")) m.hidden = true; });
  async function onSession(session) {
    if (!session) { setUser(null, null); await loadMyLikes(); renderAll(); return; }
    const { data } = await sb.from("profiles").select("display_name,role,camera").eq("id", session.user.id).single();
    setUser(session.user, data || { display_name: "Thành viên", role: "member" }); await loadMyLikes(); renderAll();
  }

  /* ---------- upload + EXIF ---------- */
  let picked = null;
  function flash(t, err) { const m = $("#msg"); m.textContent = t; m.className = "msg" + (err ? " err" : ""); }
  async function preview(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return flash("Chỉ nhận ảnh JPEG, PNG hoặc WebP.", true);
    if (file.size > 40 * 1048576) return flash("Ảnh vượt 40 MB. Hãy xuất lại với dung lượng nhỏ hơn.", true);
    picked = file; const inner = $("#dropInner"); inner.textContent = ""; const im = new Image(); im.src = URL.createObjectURL(file); im.alt = "Ảnh xem trước";
    inner.append(im, el("p", "", file.name + " · bấm để đổi ảnh")); flash("");
    const x = await K.readExif(file); const note = $("#exifNote");
    if (!x || !x.model) { note.hidden = false; $("#exifText").textContent = "Không đọc được EXIF. Bạn điền thông số bằng tay nhé."; return; }
    const cam = K.camFromExif(x.make, x.model);
    if (cam) { if (![...$("#fCam").options].some(o => o.value === cam)) $("#fCam").add(new Option(cam, cam), $("#fCam").options.length - 1); $("#fCam").value = cam; }
    if (x.lens) $("#fLens").value = x.lens.replace(/^NIKKOR/i, "NIKKOR");
    if (x.fnumber) $("#fF").value = K.fmtNum(x.fnumber);
    if (x.exposure) $("#fS").value = K.fmtExposure(x.exposure);
    if (x.iso) $("#fIso").value = String(x.iso);
    if (x.focal) $("#fMm").value = K.fmtNum(x.focal);
    note.hidden = false;
    $("#exifText").textContent = (/nikon/i.test(x.make || "") ? "Chụp bằng " : "Đọc từ EXIF: ") + K.exifLine({ camera: cam, aperture: $("#fF").value, shutter: $("#fS").value, iso: $("#fIso").value, focal: $("#fMm").value })
      + (/nikon/i.test(x.make || "") ? "" : ". Ảnh không chụp bằng máy Nikon vẫn gửi được, ban quản trị sẽ xem xét.");
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
      if (DEMO) S.demoMine.unshift({ ...row, id: "d" + Date.now(), user_id: S.user.id, display_name: S.profile.display_name, status: "pending", localUrl: URL.createObjectURL(blob), created_at: new Date().toISOString(), like_count: 0, comment_count: 0, width: w, height: h });
      else {
        const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
        path = S.user.id + "/" + id + ".jpg";
        const up = await sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg", upsert: false }); if (up.error) throw up.error;
        const ins = await sb.from("photos").insert({ ...row, user_id: S.user.id, storage_path: path, width: w, height: h }); if (ins.error) throw ins.error;
      }
      $("#form").reset(); $("#fCh").checked = true; if (S.profile && S.profile.camera) $("#fCam").value = S.profile.camera; picked = null; $("#exifNote").hidden = true;
      const inner = $("#dropInner"); inner.textContent = ""; inner.append(el("span", "", "Đã gửi “" + title + "”"), el("p", "", "Chọn ảnh khác để gửi tiếp"));
      flash("Tác phẩm đang chờ duyệt. Theo dõi trạng thái trong “Ảnh của tôi”.");
    } catch (err) {
      if (path) sb.storage.from("photos").remove([path]);
      const m = (err && err.message) || "";
      flash(/5 ảnh/.test(m) ? "Bạn đã gửi đủ 5 ảnh hôm nay. Hẹn bạn ngày mai." : /size|large/i.test(m) ? "Ảnh quá lớn sau khi nén. Hãy thử ảnh nhỏ hơn." : "Chưa gửi được ảnh. Kiểm tra kết nối rồi thử lại.", true);
    } finally { S.busy = false; $("#send").disabled = false; }
  };

  /* ---------- my photos ---------- */
  $("#mineBtn").onclick = async () => {
    $("#menu").hidden = true; $("#mine").hidden = false; const g = $("#mineGrid"); g.textContent = ""; g.append(el("div", "muted", "Đang tải…"));
    let list = [], urls = {};
    if (DEMO) list = S.demoMine;
    else { const { data } = await sb.from("photos").select("id,title,status,reject_reason,storage_path,created_at").eq("user_id", S.user.id).order("created_at", { ascending: false }); list = data || []; urls = await K.signed(list.map(p => p.storage_path)); }
    g.textContent = "";
    if (!list.length) { const e = el("div", "empty"); e.append(el("span", "", "Bạn chưa gửi tác phẩm nào.")); const a = el("a", "btn small primary", "Gửi tác phẩm đầu tiên"); a.href = "#submit"; a.onclick = () => { $("#mine").hidden = true; }; e.append(a); g.append(e); return; }
    const LBL = { pending: "Chờ duyệt", approved: "Đang trưng bày", rejected: "Chưa được duyệt" };
    list.forEach(p => {
      const f = el("figure"), img = new Image(); img.alt = p.title; img.src = p.localUrl || urls[p.storage_path] || "";
      const cap = el("figcaption"); cap.append(el("span", "pill " + p.status, LBL[p.status] || p.status), el("b", "", p.title), el("span", "muted", K.fmtDate(p.created_at)));
      if (p.status === "rejected" && p.reject_reason) cap.append(el("span", "muted", "Lý do: " + p.reject_reason));
      f.append(img, cap); g.append(f);
    });
  };

  /* ---------- controls, tab bar ---------- */
  $$("[data-close]").forEach(b => b.onclick = () => { b.closest(".overlay").hidden = true; });
  $$(".overlay").forEach(o => o.addEventListener("click", e => { if (e.target === o) o.hidden = true; }));
  $("#sortNew").onclick = () => { S.sort = "new"; $("#sortNew").setAttribute("aria-pressed", "true"); $("#sortTop").setAttribute("aria-pressed", "false"); renderGrid(); };
  $("#sortTop").onclick = () => { S.sort = "top"; $("#sortTop").setAttribute("aria-pressed", "true"); $("#sortNew").setAttribute("aria-pressed", "false"); renderGrid(); };
  $("#camFilter").onchange = e => { S.cam = e.target.value; renderGrid(); };
  let qt; $("#q").oninput = e => { clearTimeout(qt); qt = setTimeout(() => { S.q = e.target.value.trim(); renderGrid(); }, 120); };
  $("#tabMe").onclick = e => { e.stopPropagation(); if (!S.user) openAuth("login"); else { const m = $("#menu"); m.hidden = !m.hidden; if (!m.hidden && mobile()) { m.style.top = "auto"; m.style.bottom = "calc(88px + env(safe-area-inset-bottom,0px))"; m.style.position = "fixed"; } } };
  (function () {
    const bar = $("#tabbar"); let lastY = scrollY;
    addEventListener("scroll", () => { const y = scrollY; if (Math.abs(y - lastY) < 6) return; bar.classList.toggle("mini", y > lastY && y > 400); lastY = y; }, { passive: true });
    const links = $$("#tabbar a[data-tab]"); const map = {}; links.forEach(a => map[a.dataset.tab] = a);
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting && map[en.target.id]) { links.forEach(a => a.classList.remove("cur")); map[en.target.id].classList.add("cur"); } }), { rootMargin: "-45% 0px -50% 0px" });
      ["gallery", "challenge", "submit", "channels"].forEach(id => io.observe(document.getElementById(id)));
    }
  })();

  /* ---------- boot ---------- */
  renderFilters();
  loadFeed().then(() => { const m = location.hash.match(/^#p-(.+)$/); if (m && find(m[1])) openViewer(m[1]); });
  if (!DEMO) {
    sb.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") { openAuth("reset"); return; }
      if (["SIGNED_IN", "SIGNED_OUT", "INITIAL_SESSION", "USER_UPDATED"].includes(event)) setTimeout(() => onSession(session), 0);
    });
  }
})();
