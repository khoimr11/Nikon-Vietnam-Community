/* Cấu hình website Nikon Atelier.
 * Để trống SUPABASE_URL thì website chạy ở chế độ DEMO (ảnh mẫu, không lưu dữ liệu).
 * Điền 2 giá trị lấy ở Supabase → Project Settings → API.
 * "anon public key" được phép công khai: quyền truy cập đã khoá bằng Row Level Security trong schema.sql. */
window.KHOANH_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",

  // Chủ đề thử thách tháng hiện tại
  CHALLENGE: {
    title: "Ánh sáng cuối ngày",
    hashtag: "#NikonAtelierVN",
    prize: "Áo Nikon phiên bản giới hạn và bản in Fine Art khổ A2",
    communityPrize: "Giải “Cộng đồng yêu thích” cho tác phẩm nhiều lượt thích nhất"
  },

  // Kênh chính thức (sửa tại đây nếu đổi link)
  SOCIAL: [
    { key: "web",       name: "Nikon Việt Nam · VHG", handle: "vhgvietnam.vn", url: "https://vhgvietnam.vn/",
      blurb: "Sản phẩm chính hãng, bảo hành, sự kiện và khuyến mãi." },
    { key: "facebook",  name: "Nikon School Vietnam", handle: "NikonSchoolVN", url: "https://www.facebook.com/NikonSchoolVN/",
      blurb: "Lịch workshop, khoá học và buổi chụp ngoại cảnh cùng Nikon School." },
    { key: "instagram", name: "Nikon Vietnam", handle: "@nikonvietnam", url: "https://www.instagram.com/nikonvietnam/",
      blurb: "Tác phẩm chọn lọc từ cộng đồng và sản phẩm mới." },
    { key: "tiktok",    name: "Nikon Vietnam", handle: "@nikon.vietnam", url: "https://www.tiktok.com/@nikon.vietnam",
      blurb: "Mẹo chụp nhanh, hậu trường và review máy Z." },
    { key: "shopee",    name: "Nikon Việt Nam Official", handle: "Nikon trên Shopee", url: "https://shopee.vn/nikonecommkp",
      blurb: "Gian hàng chính hãng: máy ảnh, ống kính NIKKOR và phụ kiện, giao toàn quốc." }
  ],

  DISTRIBUTOR: {
    name: "Công ty CP Xuất Nhập Khẩu Việt Hồng (VHG) · Nhà phân phối chính hãng Nikon tại Việt Nam",
    hcm: "Tầng 8, Toà nhà VRG, 177 Hai Bà Trưng, P. Xuân Hoà, TP.HCM",
    hn: "Tầng 12, Toà nhà Century, 458 Minh Khai, P. Vĩnh Tuy, Hà Nội",
    hotline: "028 3914 6361",
    email: "nikonvietnam@vhg.vn"
  }
};
