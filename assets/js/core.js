/* Nikon Atelier — phần dùng chung cho trang cộng đồng và trang duyệt ảnh */
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
  K.fold = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

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
    if (s < 86400) return Math.floor(s / 3600) + " giờ trước"; if (s < 7 * 86400) return Math.floor(s / 86400) + " ngày trước";
    return K.fmtDate(t);
  };

  K.GENRES = ["Phong cảnh", "Thiên nhiên", "Đường phố", "Chân dung", "Đêm", "Đời sống"];
  K.CAMS = ["Nikon Z9", "Nikon Z8", "Nikon Z6III", "Nikon Z5II", "Nikon Zf", "Nikon ZR", "Nikon Z7II", "Nikon Z6II", "Nikon Z50II",
    "Nikon Zfc", "Nikon Z30", "Nikon D850", "Nikon D780", "Nikon D7500", "Nikon Coolpix P1100", "Máy Nikon khác"];
  K.REJECT_REASONS = ["Nội dung nhạy cảm, khiêu dâm", "Nội dung chính trị, phản động hoặc vi phạm pháp luật",
    "Bạo lực, gây sốc, xúc phạm", "Không phải ảnh tự chụp / vi phạm bản quyền", "Quảng cáo, spam",
    "Chất lượng chưa đạt để trưng bày", "Khác"];
  K.REPORT_REASONS = ["Nội dung nhạy cảm", "Chính trị, phản động", "Bạo lực, xúc phạm", "Ảnh của người khác", "Spam, quảng cáo"];

  K.shutterText = s => !s ? "" : (/s$|×/.test(s) ? s : (/^\d+(\.\d+)?$/.test(s) ? s + "s" : s));
  K.exifLine = w => [w.camera, w.aperture ? "f/" + w.aperture : "", K.shutterText(w.shutter), w.iso ? "ISO " + w.iso : "", w.focal ? w.focal + "mm" : ""].filter(Boolean).join(" · ");

  K.toast = (msg, kind) => {
    let t = K.$("#toast");
    if (!t) { t = K.el("div", "toast glass"); t.id = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
    t.textContent = msg; t.dataset.kind = kind || ""; t.classList.add("show");
    clearTimeout(K._tt); K._tt = setTimeout(() => t.classList.remove("show"), 3400);
  };

  /* Logo chính thức: đặt file vào assets/img/nikon-logo.svg (hoặc .png). Không có file thì hiện chữ. */
  K.mountLogo = () => {
    K.$$("[data-logo]").forEach(slot => {
      const img = new Image(); img.alt = "Nikon"; img.className = "logo-img";
      const list = ["assets/img/nikon-logo.svg", "assets/img/nikon-logo.png"]; let i = 0;
      img.onload = () => { slot.classList.add("has-logo"); slot.prepend(img); };
      img.onerror = () => { i++; if (i < list.length) img.src = list[i]; };
      img.src = list[0];
    });
  };

  /* Ảnh tải lên: thu về cạnh dài 2400px, JPEG 90% */
  K.shrink = file => new Promise(res => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const sc = Math.min(1, 2400 / Math.max(img.width, img.height));
      const cv = document.createElement("canvas"); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob(b => { URL.revokeObjectURL(url); res({ blob: b || file, w: cv.width, h: cv.height }); }, "image/jpeg", .9);
    };
    img.onerror = () => res({ blob: file, w: 0, h: 0 });
    img.src = url;
  });

  /* ---------- Đọc EXIF từ JPEG (máy, ống kính, khẩu, tốc, ISO, tiêu cự) ---------- */
  K.readExif = async file => {
    try {
      const buf = await file.slice(0, 256 * 1024).arrayBuffer(); const v = new DataView(buf);
      if (v.getUint16(0) !== 0xFFD8) return null;
      let p = 2;
      while (p + 4 < v.byteLength) {
        const marker = v.getUint16(p), len = v.getUint16(p + 2);
        if (marker === 0xFFE1 && v.getUint32(p + 4) === 0x45786966) return parseTiff(v, p + 10);
        if ((marker & 0xFF00) !== 0xFF00) break; p += 2 + len;
      }
    } catch (e) { }
    return null;
  };
  function parseTiff(v, t) {
    const le = v.getUint16(t) === 0x4949; const u16 = o => v.getUint16(t + o, le), u32 = o => v.getUint32(t + o, le);
    const out = {};
    const str = (off, n) => { let s = ""; for (let i = 0; i < n; i++) { const c = v.getUint8(t + off + i); if (!c) break; s += String.fromCharCode(c); } return s.trim(); };
    const rat = off => { const a = u32(off), b = u32(off + 4); return b ? a / b : 0; };
    function ifd(off, tags) {
      const n = u16(off);
      for (let i = 0; i < n; i++) {
        const e = off + 2 + i * 12, tag = u16(e), type = u16(e + 2), cnt = u32(e + 4), valOff = cnt * ({ 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }[type] || 1) > 4 ? u32(e + 8) : e + 8;
        if (!(tag in tags)) continue; const k = tags[tag];
        if (type === 2) out[k] = str(valOff, cnt); else if (type === 3) out[k] = u16(valOff); else if (type === 4) out[k] = u32(valOff); else if (type === 5) out[k] = rat(valOff);
      }
    }
    ifd(u32(4), { 0x010F: "make", 0x0110: "model", 0x8769: "exifPtr" });
    if (out.exifPtr) ifd(out.exifPtr, { 0x829A: "exposure", 0x829D: "fnumber", 0x8827: "iso", 0x920A: "focal", 0xA434: "lens" });
    return out;
  }
  K.camFromExif = (make, model) => {
    if (!model) return "";
    let m = model.replace(/NIKON( CORPORATION)?/i, "").trim().replace(/\s+/g, "");
    m = m.replace(/_3$/, "III").replace(/_2$/, "II");
    const key = K.fold(m).replace(/[^a-z0-9]/g, "");
    const hit = K.CAMS.find(c => K.fold(c).replace(/^nikon/, "").replace(/[^a-z0-9]/g, "") === key);
    if (hit) return hit;
    return /nikon/i.test(make || "") ? "Nikon " + m : (make ? make.split(" ")[0] + " " + model : model).trim();
  };
  K.fmtExposure = x => !x ? "" : x >= 1 ? String(Math.round(x * 10) / 10) : "1/" + Math.round(1 / x);
  K.fmtNum = x => !x ? "" : String(Math.round(x * 10) / 10).replace(/\.0$/, "");

  /* Link ảnh có chữ ký (bucket riêng tư) */
  K.signed = async paths => {
    const out = {}; if (!paths.length || !K.sb) return out;
    for (let i = 0; i < paths.length; i += 100) {
      const { data } = await K.sb.storage.from("photos").createSignedUrls(paths.slice(i, i + 100), 3600);
      (data || []).forEach(d => { if (d.signedUrl) out[d.path] = d.signedUrl; });
    }
    return out;
  };

  /* ---------- Ảnh mẫu cho chế độ demo (ảnh minh hoạ dựng sẵn, không phải ảnh của thành viên) ---------- */
  const S = (id, file, w, h, o) => Object.assign({ id: "s-" + id, sample: true, file, width: w, height: h, month: K.MONTH }, o);
  K.SAMPLES = [
    S("fog", "dalat-fog", 2000, 1334, { title: "Đồi thông sau mưa", display_name: "Quốc Huy", genre: "Phong cảnh", camera: "Nikon Z6III", lens: "NIKKOR Z 100-400mm f/4.5-5.6 VR S", aperture: "11", shutter: "1/125", iso: "200", focal: "280", in_challenge: true, like_count: 182, comment_count: 2,
      story: "Đà Lạt, năm giờ chiều. Mưa vừa tạnh, sương kéo lên từ thung lũng, từng lớp đồi nhạt dần như tranh thuỷ mặc. Tôi đứng chờ gần một tiếng cho lớp sương mỏng nhất trôi qua hàng thông gần." }),
    S("reeds", "reeds", 1600, 2000, { title: "Lau sậy cuối ngày", display_name: "Hà My", genre: "Thiên nhiên", camera: "Nikon Zf", lens: "NIKKOR Z 70-200mm f/2.8 VR S", aperture: "2.8", shutter: "1/1000", iso: "100", focal: "200", in_challenge: true, like_count: 164, comment_count: 1,
      story: "Ven sông Đồng Nai, mặt trời lặn đúng sau bãi lau. Mở khẩu lớn để lớp lau phía trước tan vào nắng." }),
    S("sea", "seascape", 2000, 1334, { title: "Đường chân trời", display_name: "Bảo Ngọc", genre: "Phong cảnh", camera: "Nikon Z8", lens: "NIKKOR Z 24-120mm f/4 S", aperture: "16", shutter: "120", iso: "64", focal: "70", in_challenge: true, like_count: 141, comment_count: 3,
      story: "Quy Nhơn, mười phút sau khi mặt trời tắt nắng. Phơi sáng hai phút với kính ND để mặt biển phẳng như gương, chuyển đen trắng để chỉ còn trời và nước." }),
    S("dunes", "dunes", 2000, 1600, { title: "Nắng xiên trên đồi cát", display_name: "Minh Trần", genre: "Phong cảnh", camera: "Nikon Z8", lens: "NIKKOR Z 70-200mm f/2.8 VR S", aperture: "8", shutter: "1/320", iso: "64", focal: "135", in_challenge: true, like_count: 128, comment_count: 1,
      story: "Mũi Né, bốn buổi chiều liền mới có gió đủ mạnh để vẽ lại sống cát. Nắng xiên mười phút cuối tách rõ mặt sáng và mặt tối." }),
    S("window", "window-light", 1600, 2000, { title: "Bốn giờ chiều", display_name: "Lan Phạm", genre: "Đời sống", camera: "Nikon Zf", lens: "NIKKOR Z 40mm f/2", aperture: "4", shutter: "1/200", iso: "400", focal: "40", in_challenge: true, like_count: 96, comment_count: 0,
      story: "Nắng xiên qua cửa sổ phòng ngủ, bóng lá in lên bức tường vôi. Khoảnh khắc ấy kéo dài chưa tới năm phút mỗi ngày." }),
    S("stars", "star-trails", 2000, 1334, { title: "Bắc Cực trên Tà Xùa", display_name: "Tuấn Kiệt", genre: "Thiên nhiên", camera: "Nikon Z6III", lens: "NIKKOR Z 20mm f/1.8 S", aperture: "2.8", shutter: "30s × 240", iso: "800", focal: "20", in_challenge: false, like_count: 119, comment_count: 2,
      story: "240 khung hình 30 giây, ghép lại thành hai tiếng quay của bầu trời quanh sao Bắc Cực trên sống lưng khủng long." }),
    S("lantern", "hoian-bokeh", 1600, 2000, { title: "Hội An, mười giờ tối", display_name: "Thảo Vy", genre: "Đêm", camera: "Nikon Z6III", lens: "NIKKOR Z 50mm f/1.2 S", aperture: "1.2", shutter: "1/160", iso: "800", focal: "50", in_challenge: false, like_count: 88, comment_count: 1,
      story: "Mở hết khẩu để đèn lồng tan thành những đốm vàng. Tôi muốn giữ cảm giác ấm của phố cổ khi đã vãn khách." }),
    S("trails", "saigon-trails", 2000, 1334, { title: "Vòng xoay Sài Gòn", display_name: "Đức Anh", genre: "Đêm", camera: "Nikon Z9", lens: "NIKKOR Z 14-24mm f/2.8 S", aperture: "16", shutter: "25", iso: "64", focal: "18", in_challenge: false, like_count: 73, comment_count: 0,
      story: "Phơi sáng 25 giây từ một tầng thượng quen ở Quận 1. Thành phố không ngủ, chỉ đổi màu." }),
    S("icm", "icm-forest", 1600, 2000, { title: "Rừng lia máy", display_name: "Khánh Linh", genre: "Thiên nhiên", camera: "Nikon Z5II", lens: "NIKKOR Z 24-70mm f/4 S", aperture: "16", shutter: "1/4", iso: "50", focal: "50", in_challenge: false, like_count: 54, comment_count: 0,
      story: "Lia máy theo chiều dọc thân cây trong một phần tư giây. Rừng thông Măng Đen thành một tấm lụa vàng." })
  ].map((s, i) => Object.assign(s, { created_at: new Date(Date.now() - (i * 7 + 3) * 36e5).toISOString() }));
  K.SAMPLE_COMMENTS = {
    "s-fog": [{ id: "dc1", body: "Lớp sương thứ hai đẹp quá. Anh dùng tiêu cự 280 nên các lớp đồi nén lại rất đã.", status: "visible", created_at: new Date(Date.now() - 5 * 36e5).toISOString(), user_id: "d1", profiles: { display_name: "Phương Nam" } },
      { id: "dc2", body: "Cho em xin thông tin điểm chụp với ạ.", status: "visible", created_at: new Date(Date.now() - 2 * 36e5).toISOString(), user_id: "d2", profiles: { display_name: "Gia Bảo" } }],
    "s-sea": [{ id: "dc3", body: "Tối giản mà rất có hồn.", status: "visible", created_at: new Date(Date.now() - 9 * 36e5).toISOString(), user_id: "d3", profiles: { display_name: "Thu Hà" } }]
  };
  K.sampleSrc = (w, big) => "assets/img/samples/" + w.file + (big ? "" : "-sm") + ".jpg";
})();
