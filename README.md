# Khoảnh · Cộng đồng nhiếp ảnh Nikon Việt Nam

Website tĩnh (chạy trên GitHub Pages) để người dùng Nikon đăng ảnh, thả tim, bình luận và tham gia thử thách tháng. Tài khoản đăng ký bằng email; mọi ảnh phải được ban quản trị duyệt trước khi hiển thị.

- `index.html`: trang cộng đồng (phòng trưng bày, thử thách tháng, gửi ảnh, Nikon School, kênh mạng xã hội)
- `admin.html`: trang duyệt ảnh cho ban quản trị
- `assets/js/config.js`: **file duy nhất cần sửa** (khoá Supabase, chủ đề thử thách, link mạng xã hội, thông tin VHG)
- `supabase/schema.sql`: cơ sở dữ liệu, phân quyền, kho ảnh
- `PRODUCT.md`, `DESIGN.md`: bối cảnh sản phẩm và hệ thiết kế (đọc bởi Impeccable)
- `assets/fonts`: font tự lưu trữ, đủ dấu tiếng Việt (Archivo, Cormorant Garamond, Be Vietnam Pro, IBM Plex Mono · SIL OFL)
- `assets/img/samples`: ảnh minh hoạ cho chế độ demo, thay bằng ảnh thật trước khi ra mắt

Tính năng chính: phòng trưng bày lọc theo thể loại, máy Nikon và tìm kiếm; trình xem ảnh với phím tắt (← → L C Esc), vuốt và chạm đúp để thích trên điện thoại; link chia sẻ từng ảnh; thử thách tháng và bảng vinh danh; gửi ảnh tự đọc EXIF; đăng ký email; trang duyệt ảnh với phím tắt (J K A R); báo cáo vi phạm; lọc từ khoá lời nhắn.

Khi chưa điền khoá Supabase, website chạy **chế độ demo** với ảnh mẫu để trình bày ý tưởng.

---

## 1. Đưa lên GitHub Pages (5 phút)

1. Đẩy toàn bộ thư mục này lên repo `Nikon-Vietnam-Community` (nhánh `main`, nằm ở thư mục gốc).
2. Vào **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main` / `/ (root)` → **Save**.
3. Sau 1–2 phút website có tại `https://khoimr11.github.io/Nikon-Vietnam-Community/`.

> Repo đang trống nên mục Branch hiện "None". Có file rồi mới chọn được `main`.

## 2. Bật tài khoản email, lưu ảnh và duyệt ảnh (Supabase, miễn phí)

1. Tạo tài khoản tại supabase.com → **New project** (Region: Singapore cho nhanh ở Việt Nam). Lưu lại mật khẩu database.
2. **SQL Editor → New query**, dán toàn bộ `supabase/schema.sql` → **Run**.
3. **Authentication → Sign In / Providers → Email**: bật *Email*, bật *Confirm email* (bắt buộc xác nhận email).
4. **Authentication → URL Configuration**
   - Site URL: `https://khoimr11.github.io/Nikon-Vietnam-Community/`
   - Redirect URLs: thêm `https://khoimr11.github.io/Nikon-Vietnam-Community/**`
5. **Project Settings → API**: sao chép *Project URL* và *anon public key* vào `assets/js/config.js`, rồi đẩy lại lên GitHub.
6. Mở website, **tạo tài khoản bằng email của bạn**, bấm link xác nhận trong thư.
7. Cấp quyền quản trị cho chính bạn: SQL Editor chạy
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'email-cua-ban@vhg.vn');
   ```
   Thêm người duyệt khác: làm tương tự với `'moderator'`.
8. Vào `.../admin.html` để duyệt ảnh.

### Thư xác nhận tiếng Việt
**Authentication → Emails → Templates → Confirm signup**, ví dụ:

- Subject: `Xác nhận tài khoản Khoảnh · Cộng đồng Nikon Việt Nam`
- Body:
  ```html
  <h2>Chào mừng bạn đến với Khoảnh</h2>
  <p>Bấm nút dưới đây để xác nhận email và bắt đầu treo ảnh của bạn.</p>
  <p><a href="{{ .ConfirmationURL }}">Xác nhận email</a></p>
  <p>Nikon Việt Nam · VHG</p>
  ```
Làm tương tự cho *Reset password*.

> Gói miễn phí của Supabase giới hạn số thư gửi mỗi giờ. Khi ra mắt chính thức, vào **Authentication → Emails → SMTP Settings** để gửi thư qua máy chủ mail của công ty (ví dụ `no-reply@vhg.vn`) hoặc dịch vụ như Amazon SES, Brevo.

## 3. Quy trình kiểm duyệt đã có sẵn

| Lớp | Cách hoạt động |
|---|---|
| Duyệt trước khi đăng | Ảnh mới luôn ở trạng thái *Chờ duyệt*. Kho ảnh riêng tư: chỉ tác giả và người duyệt xem được tới khi bấm **Duyệt và treo**. |
| Lý do từ chối | Người duyệt chọn lý do (nhạy cảm, chính trị/phản động, bạo lực, bản quyền, spam, chất lượng). Tác giả thấy lý do trong "Ảnh của tôi". |
| Báo cáo từ cộng đồng | Mỗi tài khoản báo cáo một ảnh một lần. **3 báo cáo** → ảnh tự gỡ khỏi tường, chờ duyệt lại. |
| Lọc lời nhắn | Lời nhắn chứa từ khoá trong danh sách sẽ tự ẩn chờ duyệt. Sửa danh sách ở tab **Từ khoá lọc** của trang duyệt. |
| Chống spam | Tối đa 5 ảnh / tài khoản / ngày. Chỉ email đã xác nhận mới đăng nhập được. |
| Phân quyền | Thành viên không tự nâng quyền được; mọi quy tắc nằm trong Row Level Security của database, không phụ thuộc giao diện. |

Gợi ý giai đoạn 2: tự động chấm điểm ảnh nhạy cảm trước khi tới tay người duyệt bằng Supabase Edge Function gọi Google Cloud Vision (SafeSearch) hoặc AWS Rekognition. Ảnh bị chấm cao được đẩy lên đầu hàng chờ.

## 4. Logo và nhận diện Nikon

Theo trang Brand Symbol của Nikon, biểu tượng dùng hai màu: **vàng** (mở rộng, đam mê) và **đen** (tin cậy, chất lượng). Website áp dụng:

| Vai trò | Màu |
|---|---|
| Header, chân trang | Đen `#000000` (cả giao diện sáng và tối) |
| Nút chính, điểm nhấn, nhãn "Dự thi" | Vàng Nikon `#FFE100` với chữ đen |
| Nền | Đen (giao diện tối) / Trắng (giao diện sáng) |
| Chữ phụ | Xám `#4A4A4A` / `#9E9E9E` |

Mã `#FFE100` (Pantone 107 C) là giá trị phổ biến; Nikon không công bố mã hex. Nếu brand guideline nội bộ có mã khác, sửa các biến `--nikon-*` ở đầu `assets/css/style.css`.

**Thêm logo:** lấy file logo chính thức từ brand kit Nikon/VHG Marketing, đặt tên `nikon-logo.svg` (hoặc `.png`), rồi trên GitHub vào thư mục `assets/img` → **Add file → Upload files** → Commit. Website tự hiện logo trên thanh header đen, không cần sửa code. Khi chưa có file, header hiện chữ "NIKON".

## 5. Mỗi tháng đổi thử thách

Sửa `CHALLENGE` trong `assets/js/config.js` (tên chủ đề, hashtag, giải thưởng). Bảng xếp hạng tự tính theo tháng hiện tại (giờ Việt Nam).

## 6. Trước khi ra mắt

- Nhờ Legal duyệt: điều khoản cấp quyền sử dụng ảnh, thể lệ cuộc thi, chính sách dữ liệu cá nhân, và xác nhận chương trình có cần đăng ký khuyến mại với Sở Công Thương hay không.
- Xin phép Nikon Việt Nam/VHG Marketing sử dụng logo và tên "Nikon" trên website.

## 7. Kiểm tra chất lượng giao diện

```
npx impeccable detect http://localhost:8000/index.html
```
Bản hiện tại trả về 0 lỗi trên trang đã render (bản trước: 33 lỗi).
