/* Khoảnh — phần dùng chung cho trang cộng đồng và trang duyệt ảnh */
(function () {
  "use strict";
  const cfg = window.KHOANH_CONFIG || {};
  const K = (window.K = {});
  K.cfg = cfg;
  K.DEMO = !(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  K.sb = K.DEMO ? null : window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  K.$ = (s, r) => (r || document).querySelector(s);
  K.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  K.el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  /* Giờ Việt Nam & tháng thử thách */
  const VN = 7 * 3600e3;
  const now = new Date(Date.now() + VN);
  K.Y = now.getUTCFullYear(); K.M = now.getUTCMonth();
  K.MONTH = K.Y + "-" + String(K.M + 1).padStart(2, "0");
  K.MONTH_END = Date.UTC(K.Y, K.M + 1, 1) - VN;
  K.fmtDate = t => { try { return new Date(t).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch (e) { return ""; } };
  K.fmtAgo = t => {
    const s = (Date.now() - new Date(t).getTime()) / 1000;
    if (s < 60) return "vừa xong"; if (s < 3600) return Math.floor(s / 60) + " phút trước";
    if (s < 86400) return Math.floor(s / 3600) + " giờ trước"; return K.fmtDate(t);
  };

  K.GENRES = ["Phong cảnh", "Đường phố", "Chân dung", "Đêm", "Đời sống", "Thiên nhiên"];
  K.CAMS = ["Nikon Z9", "Nikon Z8", "Nikon Z6III", "Nikon Z5II", "Nikon Zf", "Nikon ZR", "Nikon Z7II", "Nikon Z50II", "Nikon Zfc",
    "Nikon Z30", "Nikon D850", "Nikon D780", "Nikon D7500", "Nikon Coolpix P1100", "Máy Nikon khác"];
  K.REJECT_REASONS = ["Nội dung nhạy cảm, khiêu dâm", "Nội dung chính trị, phản động hoặc vi phạm pháp luật",
    "Bạo lực, gây sốc, xúc phạm", "Không phải ảnh tự chụp / vi phạm bản quyền", "Quảng cáo, spam",
    "Chất lượng chưa đạt để trưng bày", "Khác"];
  K.REPORT_REASONS = ["Nội dung nhạy cảm", "Chính trị, phản động", "Bạo lực, xúc phạm", "Ảnh của người khác", "Spam, quảng cáo"];

  K.exifLine = w => [w.camera, w.aperture ? "f/" + w.aperture : "", w.shutter ? (/s$/.test(w.shutter) ? w.shutter : w.shutter + "s") : "",
    w.iso ? "ISO " + w.iso : "", w.focal ? w.focal + "mm" : ""].filter(Boolean).join(" · ");

  /* Thông báo nhanh */
  K.toast = (msg, kind) => {
    let t = K.$("#toast");
    if (!t) { t = K.el("div", "toast"); t.id = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
    t.textContent = msg; t.dataset.kind = kind || ""; t.classList.add("show");
    clearTimeout(K._tt); K._tt = setTimeout(() => t.classList.remove("show"), 3600);
  };

  /* Logo: đặt file logo chính thức vào assets/img/nikon-logo.svg (hoặc .png). Không có file thì hiện chữ. */
  K.mountLogo = () => {
    K.$$("[data-logo]").forEach(slot => {
      const img = new Image(); img.alt = "Nikon"; img.className = "logo-img";
      const tryList = ["assets/img/nikon-logo.svg", "assets/img/nikon-logo.png"];
      let i = 0;
      img.onload = () => { slot.classList.add("has-logo"); slot.prepend(img); };
      img.onerror = () => { i++; if (i < tryList.length) img.src = tryList[i]; };
      img.src = tryList[0];
    });
  };

  /* Ảnh tải lên: thu về cạnh dài 2400px, JPEG 90% */
  K.shrink = file => new Promise(res => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const max = 2400, sc = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement("canvas"); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob(b => { URL.revokeObjectURL(url); res({ blob: b || file, w: cv.width, h: cv.height }); }, "image/jpeg", .9);
    };
    img.onerror = () => res({ blob: file, w: 0, h: 0 });
    img.src = url;
  });

  /* Link ảnh có chữ ký (bucket riêng tư) */
  K.signed = async paths => {
    const out = {}; if (!paths.length || !K.sb) return out;
    for (let i = 0; i < paths.length; i += 100) {
      const { data } = await K.sb.storage.from("photos").createSignedUrls(paths.slice(i, i + 100), 3600);
      (data || []).forEach(d => { if (d.signedUrl) out[d.path] = d.signedUrl; });
    }
    return out;
  };

  /* ---------- Ảnh mẫu cho chế độ demo (vẽ bằng canvas, không phải ảnh thật) ---------- */
  K.SAMPLES = [
    { id: "s-dunes", scene: "dunes", title: "Đồi cát lúc chạng vạng", display_name: "Minh Trần", genre: "Phong cảnh", camera: "Nikon Z8", lens: "NIKKOR Z 70-200mm f/2.8 VR S", aperture: "8", shutter: "1/320", iso: "64", focal: "135", in_challenge: true, r: 1.5, like_count: 128, comment_count: 3,
      story: "Đợi bốn buổi chiều ở Mũi Né mới có gió đủ mạnh để vẽ lại sống cát. Nắng xiên mười phút cuối là đủ cho tất cả các lớp." },
    { id: "s-lantern", scene: "lantern", title: "Hội An, mười giờ tối", display_name: "Lan Phạm", genre: "Đêm", camera: "Nikon Zf", lens: "NIKKOR Z 50mm f/1.2 S", aperture: "1.2", shutter: "1/160", iso: "800", focal: "50", in_challenge: false, r: .8, like_count: 96, comment_count: 1,
      story: "Mở hết khẩu để đèn lồng tan thành những đốm vàng. Tôi muốn giữ cảm giác ấm của phố cổ khi đã vãn khách." },
    { id: "s-fog", scene: "fog", title: "Rừng thông sau mưa", display_name: "Quốc Huy", genre: "Phong cảnh", camera: "Nikon Z6III", lens: "NIKKOR Z 100-400mm f/4.5-5.6 VR S", aperture: "11", shutter: "1/125", iso: "200", focal: "280", in_challenge: true, r: 1.5, like_count: 141, comment_count: 2,
      story: "Đà Lạt, năm giờ chiều. Sương kéo lên từ thung lũng, từng lớp đồi nhạt dần như tranh thuỷ mặc." },
    { id: "s-terrace", scene: "terrace", title: "Mùa nước đổ", display_name: "Thảo Vy", genre: "Phong cảnh", camera: "Nikon D850", lens: "AF-S NIKKOR 24-70mm f/2.8E ED VR", aperture: "9", shutter: "1/200", iso: "100", focal: "62", in_challenge: true, r: 1.25, like_count: 87, comment_count: 0,
      story: "Mù Cang Chải tháng năm, ruộng vừa đổ nước. Hoàng hôn rót vàng lên từng bậc." },
    { id: "s-trails", scene: "trails", title: "Vòng xoay Sài Gòn", display_name: "Đức Anh", genre: "Đêm", camera: "Nikon Z9", lens: "NIKKOR Z 14-24mm f/2.8 S", aperture: "16", shutter: "25s", iso: "64", focal: "18", in_challenge: false, r: 1.5, like_count: 73, comment_count: 4,
      story: "Phơi sáng 25 giây từ một tầng thượng quen. Thành phố không ngủ, chỉ đổi màu." },
    { id: "s-portrait", scene: "portrait", title: "Ngoại", display_name: "Hà My", genre: "Chân dung", camera: "Nikon Zf", lens: "NIKKOR Z 85mm f/1.2 S", aperture: "1.8", shutter: "1/200", iso: "400", focal: "85", in_challenge: true, r: .8, like_count: 164, comment_count: 6,
      story: "Một ô cửa sổ, nắng cuối chiều hắt vào. Ngoại ngồi im rất lâu, tôi chỉ bấm một lần." },
    { id: "s-halong", scene: "halong", title: "Thuyền về vịnh", display_name: "Tuấn Kiệt", genre: "Phong cảnh", camera: "Nikon Z7II", lens: "NIKKOR Z 24-120mm f/4 S", aperture: "8", shutter: "1/500", iso: "100", focal: "105", in_challenge: true, r: 1.5, like_count: 59, comment_count: 1,
      story: "Hạ Long sau cơn mưa chiều, núi đá chìm trong hơi nước, chiếc thuyền nhỏ chở nắng về." },
    { id: "s-rain", scene: "rain", title: "Ô đen, phố cũ", display_name: "Bảo Ngọc", genre: "Đường phố", camera: "Nikon Z6III", lens: "NIKKOR Z 35mm f/1.4", aperture: "4", shutter: "1/250", iso: "1600", focal: "35", in_challenge: false, r: 1.25, like_count: 48, comment_count: 2,
      story: "Hà Nội mưa phùn. Đen trắng để chỉ còn lại hình và nhịp." }
  ].map((s, i) => Object.assign(s, { sample: true, month: K.MONTH, created_at: new Date(Date.UTC(K.Y, K.M, 1) - VN + (i + 1) * 20 * 36e5).toISOString() }));

  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function lin(c, y0, y1, st) { const g = c.createLinearGradient(0, y0, 0, y1); st.forEach(s => g.addColorStop(s[0], s[1])); return g; }
  function ridge(c, w, base, amp, freq, R, step) { c.beginPath(); c.moveTo(0, base); const ph = R() * 10; for (let x = 0; x <= w + step; x += step) { const y = base - Math.abs(Math.sin(x * freq + ph)) * amp * .6 - Math.sin(x * freq * 2.7 + ph * 2) * amp * .25 - R() * amp * .05; c.lineTo(x, y); } c.lineTo(w, 9999); c.lineTo(0, 9999); c.closePath(); }
  function grain(c, w, h, amt, R) { const d = c.getImageData(0, 0, w, h), p = d.data; for (let i = 0; i < p.length; i += 4) { const n = (R() - .5) * amt; p[i] += n; p[i + 1] += n; p[i + 2] += n; } c.putImageData(d, 0, 0); }
  function vig(c, w, h, a) { const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .35, w / 2, h / 2, Math.max(w, h) * .75); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0," + a + ")"); c.fillStyle = g; c.fillRect(0, 0, w, h); }
  const SC = {
    dunes(c, w, h, R) { c.fillStyle = lin(c, 0, h * .7, [[0, "#3b2f4f"], [.45, "#b9676a"], [.8, "#f2a96b"], [1, "#f8d28f"]]); c.fillRect(0, 0, w, h);
      const g = c.createRadialGradient(w * .7, h * .5, 0, w * .7, h * .5, h * .6); g.addColorStop(0, "rgba(255,236,190,.95)"); g.addColorStop(.08, "rgba(255,214,150,.8)"); g.addColorStop(1, "rgba(255,180,120,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h);
      [["#c97b55", "#7e3f35"], ["#d88a5c", "#8a4433"], ["#e39a63", "#90472f"], ["#eba86c", "#7d3a26"], ["#f0b678", "#6b301f"]].forEach((cc, i) => { const base = h * (.56 + i * .1); c.beginPath(); c.moveTo(0, base); const ph = R() * 6; for (let x = 0; x <= w + 8; x += 8) c.lineTo(x, base - Math.sin(x / w * Math.PI * (1.2 + i * .3) + ph) * h * .06); c.lineTo(w, h); c.lineTo(0, h); c.closePath();
        const gg = c.createLinearGradient(w * .9, 0, w * .1, 0); gg.addColorStop(0, cc[0]); gg.addColorStop(1, cc[1]); c.fillStyle = gg; c.fill(); c.strokeStyle = "rgba(255,226,180,.35)"; c.lineWidth = 1.2; c.stroke(); }); vig(c, w, h, .45); },
    lantern(c, w, h, R) { c.fillStyle = lin(c, 0, h, [[0, "#1a0f0a"], [1, "#2b140c"]]); c.fillRect(0, 0, w, h); c.globalCompositeOperation = "lighter"; const hs = ["255,170,60", "255,120,50", "255,205,110", "220,70,50", "255,150,90"];
      for (let i = 0; i < 70; i++) { const x = R() * w, y = R() * h * .85, r = 18 + R() * R() * 110, col = hs[(R() * hs.length) | 0], a = .12 + R() * .35; const b = c.createRadialGradient(x, y, 0, x, y, r); b.addColorStop(0, "rgba(" + col + "," + a + ")"); b.addColorStop(.75, "rgba(" + col + "," + a * .8 + ")"); b.addColorStop(1, "rgba(" + col + ",0)"); c.fillStyle = b; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
      c.globalCompositeOperation = "source-over"; c.fillStyle = "rgba(10,5,3,.85)"; c.beginPath(); c.moveTo(0, h * .86); c.lineTo(w * .18, h * .8); c.lineTo(w * .35, h * .86); c.lineTo(w * .55, h * .79); c.lineTo(w * .78, h * .86); c.lineTo(w, h * .81); c.lineTo(w, h); c.lineTo(0, h); c.fill(); vig(c, w, h, .6); },
    fog(c, w, h, R) { c.fillStyle = lin(c, 0, h, [[0, "#c9cfc6"], [.5, "#dfe0d4"], [1, "#eae6d6"]]); c.fillRect(0, 0, w, h);
      ["#aab3a6", "#8d998b", "#6f7d6e", "#4f5e50", "#2f3c31"].forEach((s, i) => { ridge(c, w, h * (.42 + i * .12), h * (.18 - i * .015), .004 + i * .0015, R, 6); c.fillStyle = s; c.fill();
        if (i >= 2) { for (let k = 0; k < 26 + i * 10; k++) { const x = R() * w, base = h * (.44 + i * .12) - R() * h * .05, ht = h * (.04 + i * .012) * (.6 + R()); c.beginPath(); c.moveTo(x, base - ht); c.lineTo(x - ht * .22, base); c.lineTo(x + ht * .22, base); c.fill(); } }
        c.fillStyle = lin(c, h * (.36 + i * .12), h * (.5 + i * .12), [[0, "rgba(232,230,218,0)"], [1, "rgba(232,230,218," + (.55 - i * .08) + ")"]]); c.fillRect(0, h * (.36 + i * .12), w, h * .14); }); vig(c, w, h, .25); },
    terrace(c, w, h) { c.fillStyle = "#3d4a26"; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 34; i++) { const base = -h * .05 + i * h * .036, amp = h * .07, ph = i * .35; c.beginPath(); c.moveTo(0, base); for (let x = 0; x <= w + 8; x += 8) c.lineTo(x, base + Math.sin(x / w * 3.4 + ph) * amp + Math.sin(x / w * 7 + ph * 1.6) * amp * .25); c.lineTo(w, h + 20); c.lineTo(0, h + 20); c.closePath();
        const warm = Math.sin(i / 34 * Math.PI); c.fillStyle = "rgb(" + Math.round(70 + warm * 150) + "," + Math.round(92 + warm * 100) + "," + Math.round(40 + warm * 20) + ")"; c.fill(); c.strokeStyle = "rgba(255,236,170," + (.25 + warm * .5) + ")"; c.lineWidth = 1.4; c.stroke(); }
      const g = c.createLinearGradient(w, 0, 0, h); g.addColorStop(0, "rgba(255,200,110,.35)"); g.addColorStop(1, "rgba(30,40,20,.35)"); c.fillStyle = g; c.fillRect(0, 0, w, h); vig(c, w, h, .4); },
    trails(c, w, h, R) { c.fillStyle = lin(c, 0, h, [[0, "#070b1c"], [.55, "#16224a"], [1, "#2a1f3a"]]); c.fillRect(0, 0, w, h);
      for (let i = 0; i < 22; i++) { const bw = w * (.03 + R() * .06), bh = h * (.2 + R() * .45), x = R() * w, y = h * .62 - bh; c.fillStyle = "rgba(8,10,22,.95)"; c.fillRect(x, y, bw, bh + h * .1); for (let k = 0; k < bh / 9; k++) if (R() < .35) { c.fillStyle = "rgba(255," + (200 + R() * 50 | 0) + ",140," + (.3 + R() * .5) + ")"; c.fillRect(x + 3 + R() * (bw - 6), y + k * 9 + 3, 2, 3); } }
      c.globalCompositeOperation = "lighter"; for (let i = 0; i < 90; i++) { const red = R() < .55; c.strokeStyle = red ? "rgba(255,60,50," + (.25 + R() * .5) + ")" : "rgba(255,235,200," + (.25 + R() * .5) + ")"; c.lineWidth = .6 + R() * 2.4; c.shadowColor = red ? "#ff3020" : "#fff0c0"; c.shadowBlur = 8;
        const y0 = h * (.72 + R() * .2); c.beginPath(); c.moveTo(-20, y0); c.bezierCurveTo(w * .3, y0 - h * .25 * R(), w * .6, h * (.55 + R() * .1), w + 20, h * (.66 + R() * .25)); c.stroke(); }
      c.shadowBlur = 0; c.globalCompositeOperation = "source-over"; vig(c, w, h, .5); },
    portrait(c, w, h) { const g = c.createRadialGradient(w * .7, h * .3, 0, w * .6, h * .4, h * .9); g.addColorStop(0, "#3a2a1c"); g.addColorStop(1, "#0b0807"); c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = "#140e0a"; c.beginPath(); c.ellipse(w * .48, h * .38, w * .17, h * .15, -.1, 0, 7); c.fill(); c.beginPath(); c.moveTo(w * .18, h); c.quadraticCurveTo(w * .22, h * .6, w * .47, h * .55); c.quadraticCurveTo(w * .76, h * .6, w * .8, h); c.fill();
      c.save(); c.shadowColor = "rgba(255,190,110,.9)"; c.shadowBlur = 26; c.strokeStyle = "rgba(255,205,140,.85)"; c.lineWidth = 3; c.beginPath(); c.ellipse(w * .48, h * .38, w * .17, h * .15, -.1, -1.2, .9); c.stroke(); c.beginPath(); c.moveTo(w * .62, h * .53); c.quadraticCurveTo(w * .78, h * .62, w * .8, h); c.stroke(); c.restore();
      const hg = c.createLinearGradient(w * .66, 0, w * .4, 0); hg.addColorStop(0, "rgba(255,180,110,.35)"); hg.addColorStop(1, "rgba(255,180,110,0)"); c.fillStyle = hg; c.beginPath(); c.ellipse(w * .48, h * .38, w * .17, h * .15, -.1, 0, 7); c.fill(); vig(c, w, h, .55); },
    halong(c, w, h, R) { c.fillStyle = lin(c, 0, h, [[0, "#9fb1b0"], [.45, "#e6d6b8"], [.6, "#d9c6a3"], [1, "#5f7473"]]); c.fillRect(0, 0, w, h);
      const sun = c.createRadialGradient(w * .62, h * .4, 0, w * .62, h * .4, h * .4); sun.addColorStop(0, "rgba(255,240,200,.9)"); sun.addColorStop(1, "rgba(255,240,200,0)"); c.fillStyle = sun; c.fillRect(0, 0, w, h);
      [["#b2bcb4", .5, 7], ["#8a9993", .55, 6], ["#5c6e6a", .6, 5], ["#33433f", .64, 4]].forEach(([col, hz, n], li) => { for (let k = 0; k < n; k++) { const x = R() * w, bw = w * (.05 + R() * .08), bh = h * (.12 + R() * .22 + li * .04), base = h * hz; c.fillStyle = col; c.beginPath(); c.moveTo(x - bw, base); c.quadraticCurveTo(x - bw * .9, base - bh * 1.1, x, base - bh); c.quadraticCurveTo(x + bw * .95, base - bh * 1.05, x + bw, base); c.fill(); c.globalAlpha = .25; c.beginPath(); c.moveTo(x - bw, base); c.quadraticCurveTo(x, base + bh * .5, x + bw, base); c.fill(); c.globalAlpha = 1; } });
      c.fillStyle = "rgba(240,226,196,.18)"; for (let i = 0; i < 40; i++) c.fillRect(R() * w, h * (.66 + R() * .3), 20 + R() * 80, 1);
      c.fillStyle = "#1d2523"; c.beginPath(); c.moveTo(w * .42, h * .74); c.lineTo(w * .5, h * .74); c.lineTo(w * .48, h * .76); c.lineTo(w * .44, h * .76); c.fill(); c.fillRect(w * .455, h * .69, 2, h * .05); vig(c, w, h, .3); },
    rain(c, w, h, R) { c.fillStyle = lin(c, 0, h, [[0, "#9a9a98"], [.5, "#6d6d6b"], [1, "#2a2a29"]]); c.fillRect(0, 0, w, h);
      c.fillStyle = "#3a3a39"; c.fillRect(0, 0, w * .14, h); c.fillRect(w * .86, 0, w * .14, h); c.fillStyle = "#4a4a48"; c.beginPath(); c.moveTo(w * .14, 0); c.lineTo(w * .4, h * .5); c.lineTo(w * .14, h); c.fill(); c.beginPath(); c.moveTo(w * .86, 0); c.lineTo(w * .6, h * .5); c.lineTo(w * .86, h); c.fill();
      c.fillStyle = "rgba(220,220,215,.25)"; c.beginPath(); c.moveTo(w * .14, h); c.lineTo(w * .45, h * .55); c.lineTo(w * .55, h * .55); c.lineTo(w * .86, h); c.fill();
      c.fillStyle = "#0d0d0d"; c.beginPath(); c.ellipse(w * .5, h * .6, w * .13, h * .06, 0, Math.PI, 0); c.fill(); c.fillRect(w * .497, h * .6, 3, h * .05); c.beginPath(); c.moveTo(w * .46, h * .62); c.lineTo(w * .54, h * .62); c.lineTo(w * .535, h * .85); c.lineTo(w * .465, h * .85); c.fill();
      c.strokeStyle = "rgba(235,235,230,.28)"; c.lineWidth = 1; for (let i = 0; i < 500; i++) { const x = R() * w, y = R() * h, l = 8 + R() * 18; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2, y + l); c.stroke(); } vig(c, w, h, .55); }
  };
  const ART = {};
  K.paint = s => {
    if (ART[s.id]) return ART[s.id];
    const W = 1000, H = Math.round(W / (s.r || 1.5)); const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const c = cv.getContext("2d"); const R = rng(s.id.length * 977 + s.title.length * 31);
    try {
      SC[s.scene](c, W, H, R); grain(c, W, H, s.scene === "rain" ? 34 : 20, R);
      if (s.scene === "rain") { const d = c.getImageData(0, 0, W, H), p = d.data; for (let i = 0; i < p.length; i += 4) { const v = p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11; p[i] = p[i + 1] = p[i + 2] = v; } c.putImageData(d, 0, 0); }
    } catch (e) { c.fillStyle = "#555"; c.fillRect(0, 0, W, H); }
    return (ART[s.id] = cv.toDataURL("image/jpeg", .86));
  };
})();
