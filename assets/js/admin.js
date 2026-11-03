/* Nikon Atelier — trang duyệt ảnh cho ban quản trị */
(function () {
  "use strict";
  const { $, $$, el, sb, DEMO } = K;
  const A = { me: null, sel: 0, tab: "pending", pending: [], reports: [], comments: [], approved: [], terms: [], urls: {} };
  K.mountLogo();
  if (DEMO) $("#demoBar").hidden = false;

  /* ---------- demo data ---------- */
  function demoLoad() {
    const s = K.SAMPLES.map(x => ({ ...x, user_id: "demo", profiles: { display_name: x.display_name }, status: "pending", created_at: new Date(Date.now() - Math.random() * 864e5).toISOString() }));
    A.pending = s.slice(0, 4); A.approved = s.slice(4).map(x => ({ ...x, status: "approved" }));
    A.reports = [{ photo: A.approved[0], reasons: ["Ảnh của người khác"], ids: ["r1"] }];
    A.comments = [{ id: "c1", body: "Ảnh đẹp quá, inbox giá bộ máy này nhé zalo 09xx", status: "flagged", created_at: new Date().toISOString(), profiles: { display_name: "Khách 1024" }, photos: { title: A.approved[1].title } }];
    A.terms = ["http://", "https://", "zalo", "inbox giá"];
  }

  /* ---------- load ---------- */
  async function loadAll() {
    if (DEMO) { if (!A.pending.length && !A.approved.length) demoLoad(); render(); return; }
    const [p, r, c, a, t] = await Promise.all([
      sb.from("photos").select("*, profiles(display_name)").eq("status", "pending").order("created_at", { ascending: true }).limit(100),
      sb.from("reports").select("id, reason, created_at, photo_id, photos(id,title,storage_path,status,user_id, profiles(display_name))").eq("resolved", false).order("created_at", { ascending: false }).limit(300),
      sb.from("comments").select("id, body, status, created_at, profiles(display_name), photos(title)").eq("status", "flagged").order("created_at", { ascending: false }).limit(200),
      sb.from("photos").select("*, profiles(display_name)").eq("status", "approved").order("created_at", { ascending: false }).limit(60),
      sb.from("banned_terms").select("term").order("term")
    ]);
    A.pending = p.data || []; A.comments = c.data || []; A.approved = a.data || []; A.terms = (t.data || []).map(x => x.term);
    const byPhoto = {}; (r.data || []).forEach(x => { if (!x.photos) return; const k = x.photo_id; (byPhoto[k] = byPhoto[k] || { photo: x.photos, reasons: [], ids: [] }); byPhoto[k].reasons.push(x.reason); byPhoto[k].ids.push(x.id); });
    A.reports = Object.values(byPhoto).sort((x, y) => y.ids.length - x.ids.length);
    const paths = A.pending.concat(A.approved).map(x => x.storage_path).concat(A.reports.map(x => x.photo.storage_path));
    A.urls = await K.signed([...new Set(paths)]);
    render();
  }
  const src = w => w.sample ? K.sampleSrc(w, true) : (A.urls[w.storage_path] || "");

  /* ---------- render ---------- */
  function counts() {
    $("#cPending").textContent = A.pending.length; $("#cReports").textContent = A.reports.length; if (A.sel >= A.pending.length) A.sel = Math.max(0, A.pending.length - 1);
    $("#cFlagged").textContent = A.comments.length; $("#cApproved").textContent = A.approved.length + (A.approved.length >= 60 ? "+" : "");
  }
  function render() {
    counts(); $$("#tabs button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === A.tab)));
    $("#hint").hidden = A.tab !== "pending";
    const v = $("#view"); v.textContent = "";
    ({ pending: renderPending, reports: renderReports, comments: renderComments, approved: renderApproved, terms: renderTerms })[A.tab](v);
  }
  function photoCard(w, extra) {
    const item = el("article", "qitem"); const img = new Image(); img.alt = w.title; img.src = src(w);
    const meta = el("div", "meta");
    const tags = el("div", "muted"); tags.style.fontSize = "13px"; tags.textContent = (w.genre || "") + (w.in_challenge ? " · Dự thi " + (w.month || "") : "");
    meta.append(tags, el("h2", "", w.title));
    const dl = el("dl");
    [["Tác giả", (w.profiles && w.profiles.display_name) || w.display_name || "—"], ["Gửi lúc", K.fmtAgo(w.created_at)], ["Thiết bị", [w.camera, w.lens].filter(Boolean).join(" · ") || "—"],
      ["Thông số", K.exifLine({ ...w, camera: "" }) || "—"], ["Câu chuyện", w.story || "—"]].forEach(([k, val]) => dl.append(el("dt", "", k), el("dd", "", val)));
    meta.append(dl); if (extra) meta.append(extra); item.append(img, meta); return item;
  }
  function reasonSelect() { const s = el("select"); s.setAttribute("aria-label", "Lý do từ chối"); K.REJECT_REASONS.forEach(r => s.append(new Option(r, r))); return s; }

  function renderPending(v) {
    if (!A.pending.length) { v.append(el("div", "empty", "Không còn ảnh nào chờ duyệt. Hàng chờ sạch.")); return; }
    A.pending.forEach((w, i) => {
      const d = el("div", "decide"); const cl = el("div", "checklist");
      cl.append(el("b", "", "Trước khi duyệt, kiểm tra")); const ul = el("ul");
      ["Không khiêu dâm, bạo lực, gây sốc", "Không biểu tượng, khẩu hiệu chính trị, phản động", "Không chứa số điện thoại, logo bán hàng", "Có vẻ là ảnh tự chụp, không lấy từ nơi khác"].forEach(t => ul.append(el("li", "", t)));
      cl.append(ul);
      const sel = reasonSelect(); const btns = el("div", "btns");
      const ok = el("button", "btn ok small", "Duyệt và treo"); ok.type = "button"; ok.onclick = () => decide(w, "approved");
      const no = el("button", "btn bad small", "Từ chối"); no.type = "button"; no.onclick = () => decide(w, "rejected", sel.value);
      btns.append(ok, no); d.append(cl, sel, btns);
      const card = photoCard(w, d); card._sel = sel; card.dataset.i = i; if (i === A.sel) card.classList.add("focus"); v.append(card);
    });
  }
  async function decide(w, status, reason) {
    if (!DEMO) {
      const { error } = await sb.from("photos").update({ status, reject_reason: status === "rejected" ? reason : null, reviewed_by: A.me.id, reviewed_at: new Date().toISOString() }).eq("id", w.id);
      if (error) { K.toast("Chưa lưu được quyết định.", "err"); return; }
    }
    A.pending = A.pending.filter(x => x.id !== w.id);
    if (status === "approved") A.approved.unshift({ ...w, status });
    K.toast(status === "approved" ? "Đã treo “" + w.title + "”." : "Đã từ chối “" + w.title + "”."); render();
  }

  function renderReports(v) {
    if (!A.reports.length) { v.append(el("div", "empty", "Không có báo cáo mới.")); return; }
    A.reports.forEach(g => {
      const d = el("div", "decide"); const cnt = {}; g.reasons.forEach(r => cnt[r] = (cnt[r] || 0) + 1);
      d.append(el("b", "", g.ids.length + " báo cáo · trạng thái: " + (g.photo.status === "approved" ? "đang trưng bày" : "đã tự gỡ, chờ duyệt lại")));
      const ul = el("ul"); Object.keys(cnt).forEach(r => ul.append(el("li", "", r + " (" + cnt[r] + ")"))); d.append(ul);
      const btns = el("div", "btns"); const keep = el("button", "btn ok small", "Giữ ảnh, đóng báo cáo"); keep.type = "button";
      const drop = el("button", "btn bad small", "Gỡ ảnh"); drop.type = "button"; btns.append(keep, drop); d.append(btns);
      keep.onclick = () => resolve(g, "approved"); drop.onclick = () => resolve(g, "rejected");
      v.append(photoCard(g.photo, d));
    });
  }
  async function resolve(g, status) {
    if (!DEMO) {
      const a = await sb.from("photos").update({ status, reject_reason: status === "rejected" ? "Gỡ sau báo cáo: " + g.reasons[0] : null, reviewed_by: A.me.id, reviewed_at: new Date().toISOString() }).eq("id", g.photo.id);
      const b = await sb.from("reports").update({ resolved: true }).in("id", g.ids);
      if (a.error || b.error) { K.toast("Chưa lưu được.", "err"); return; }
    }
    A.reports = A.reports.filter(x => x !== g); A.pending = A.pending.filter(x => x.id !== g.photo.id);
    if (status === "rejected") A.approved = A.approved.filter(x => x.id !== g.photo.id);
    K.toast(status === "approved" ? "Đã giữ ảnh và đóng báo cáo." : "Đã gỡ ảnh khỏi phòng trưng bày."); render();
  }

  function renderComments(v) {
    if (!A.comments.length) { v.append(el("div", "empty", "Không có lời nhắn nào bị gắn cờ.")); return; }
    const wrap = el("div", "tablewrap"), t = el("table", "ctable"); t.innerHTML = "<thead><tr><th>Lời nhắn</th><th>Người viết</th><th>Ở ảnh</th><th>Xử lý</th></tr></thead>";
    const tb = el("tbody");
    A.comments.forEach(c => {
      const tr = el("tr"); const act = el("td"); const show = el("button", "btn small ok", "Hiện"); const hide = el("button", "btn small bad", "Ẩn");
      show.type = hide.type = "button"; show.onclick = () => setComment(c, "visible"); hide.onclick = () => setComment(c, "hidden");
      act.append(show, " ", hide);
      tr.append(el("td", "", c.body), el("td", "", (c.profiles && c.profiles.display_name) || "—"), el("td", "", (c.photos && c.photos.title) || "—"), act); tb.append(tr);
    });
    t.append(tb); wrap.append(t); v.append(wrap);
  }
  async function setComment(c, status) {
    if (!DEMO) { const { error } = await sb.from("comments").update({ status }).eq("id", c.id); if (error) { K.toast("Chưa lưu được.", "err"); return; } }
    A.comments = A.comments.filter(x => x !== c); K.toast(status === "visible" ? "Đã hiện lời nhắn." : "Đã ẩn lời nhắn."); render();
  }

  function renderApproved(v) {
    if (!A.approved.length) { v.append(el("div", "empty", "Chưa có ảnh nào được trưng bày.")); return; }
    A.approved.forEach(w => {
      const d = el("div", "decide"); const sel = reasonSelect(); const b = el("button", "btn bad small", "Gỡ khỏi phòng trưng bày"); b.type = "button";
      b.onclick = async () => {
        if (!DEMO) { const { error } = await sb.from("photos").update({ status: "rejected", reject_reason: sel.value, reviewed_by: A.me.id, reviewed_at: new Date().toISOString() }).eq("id", w.id); if (error) { K.toast("Chưa lưu được.", "err"); return; } }
        A.approved = A.approved.filter(x => x.id !== w.id); K.toast("Đã gỡ “" + w.title + "”."); render();
      };
      d.append(sel, b); v.append(photoCard(w, d));
    });
  }

  function renderTerms(v) {
    const box = el("div"); box.style.maxWidth = "640px";
    box.append(el("p", "note", "Lời nhắn chứa một trong các cụm từ dưới đây sẽ tự ẩn và chờ duyệt. Viết thường, không dấu cách thừa. Bổ sung từ khoá nhạy cảm, chính trị, tục tĩu theo kinh nghiệm thực tế."));
    const form = el("form", "cform"); const inp = el("input"); inp.placeholder = "Thêm cụm từ"; inp.maxLength = 60; inp.setAttribute("aria-label", "Cụm từ mới");
    const add = el("button", "", "Thêm"); add.type = "submit"; form.append(inp, add);
    form.onsubmit = async e => {
      e.preventDefault(); const term = inp.value.trim().toLowerCase(); if (!term || A.terms.includes(term)) return;
      if (!DEMO) { const { error } = await sb.from("banned_terms").insert({ term }); if (error) { K.toast("Chưa thêm được.", "err"); return; } }
      A.terms.push(term); A.terms.sort(); render(); setTimeout(() => { const i = $("#view input"); if (i) i.focus(); }, 0);
    };
    const chips = el("div", "chips"); chips.style.marginTop = "18px";
    A.terms.forEach(t => {
      const c = el("button", "chip", t + "  ✕"); c.type = "button"; c.setAttribute("aria-label", "Xoá " + t);
      c.onclick = async () => { if (!DEMO) { const { error } = await sb.from("banned_terms").delete().eq("term", t); if (error) return K.toast("Chưa xoá được.", "err"); } A.terms = A.terms.filter(x => x !== t); render(); };
      chips.append(c);
    });
    box.append(form, chips); v.append(box);
  }

  $$("#tabs button").forEach(b => b.onclick = () => { A.tab = b.dataset.tab; render(); });
  document.addEventListener("keydown", e => {
    if (A.tab !== "pending" || /INPUT|SELECT|TEXTAREA/.test((e.target.tagName || "")) || !A.pending.length) return;
    const k = e.key.toLowerCase(); const cards = $$("#view .qitem");
    if (k === "j" || k === "k") { A.sel = Math.min(A.pending.length - 1, Math.max(0, A.sel + (k === "j" ? 1 : -1))); cards.forEach((c, i) => c.classList.toggle("focus", i === A.sel)); if (cards[A.sel]) cards[A.sel].scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth" }); return; }
    const w = A.pending[A.sel], card = cards[A.sel]; if (!w) return;
    if (k === "a") decide(w, "approved");
    if (k === "r") decide(w, "rejected", card && card._sel ? card._sel.value : K.REJECT_REASONS[0]);
  });

  /* ---------- auth gate ---------- */
  function show(id) { ["login", "denied", "panel"].forEach(x => $("#" + x).hidden = x !== id); }
  async function gate(session) {
    if (DEMO) { A.me = { id: "demo" }; $("#whoami").textContent = "Demo · quản trị viên"; show("panel"); loadAll(); return; }
    if (!session) { $("#logout").hidden = true; $("#whoami").textContent = ""; show("login"); return; }
    $("#logout").hidden = false; $("#whoami").textContent = session.user.email;
    const { data } = await sb.from("profiles").select("role,display_name").eq("id", session.user.id).single();
    if (!data || !["admin", "moderator"].includes(data.role)) { show("denied"); return; }
    A.me = { id: session.user.id }; show("panel"); loadAll();
  }
  $("#loginForm").onsubmit = async e => {
    e.preventDefault(); const m = $("#loginMsg"); m.className = "msg"; m.textContent = "Đang đăng nhập…";
    const { error } = await sb.auth.signInWithPassword({ email: $("#aEmail").value.trim(), password: $("#aPass").value });
    if (error) { m.className = "msg err"; m.textContent = "Email hoặc mật khẩu chưa đúng, hoặc email chưa xác nhận."; }
  };
  $("#logout").onclick = () => sb.auth.signOut();
  if (DEMO) gate(null);
  else sb.auth.onAuthStateChange((ev, session) => setTimeout(() => gate(session), 0));
})();
