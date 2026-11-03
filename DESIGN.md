# DESIGN · Khoảnh

Hướng đi: **phòng trưng bày tối của Nikon.** Ảnh là nội dung chính; điều hướng nổi trên một lớp kính (Liquid Glass) tách khỏi nội dung; vàng Nikon dùng ít và đúng chỗ.

## Font (tự lưu trữ trong `assets/fonts`, khai báo ở `assets/css/fonts.css`)
| Vai trò | Font | Ghi chú |
| --- | --- | --- |
| Tiêu đề lớn | Archivo, `font-stretch:125%`, 800, in hoa | Hero, tên section, số liệu |
| Tên tác phẩm | Cormorant Garamond 600, chữ đứng | Nhãn ảnh kiểu bảo tàng |
| Giao diện, nội dung | Be Vietnam Pro 400/500/600 | |
| Thông số | IBM Plex Mono 400/500 | EXIF, số đếm |

Thang cỡ: 12 · 14 · 16 · 20 · 28 · 40 · 64 · 104 px. Không chữ chức năng dưới 12 px.

## Màu (token trong `:root` của `style.css`)
| Token | Tối | Sáng |
| --- | --- | --- |
| `--bg` | #000 | #FFF |
| `--surface` | #0E0E0E | #F3F3F3 |
| `--fg` | #FFF | #000 |
| `--fg-2` | #A3A3A3 | #4A4A4A |
| `--yellow` | #FFE100 | #FFE100 |
| `--accent-text` | #FFE100 | #000 (vàng không đặt làm chữ trên nền trắng) |

Không gradient trang trí, không glow, không viền màu một bên. Chữ trên nền vàng luôn đen.

## Liquid Glass
- `.glass` (regular): header, thanh lọc, tab bar mobile, menu tài khoản, toast.
- `.glass-clear` (lớp tối 35%): nút nổi trên ảnh ở trình xem và hero.
- Không dùng cho thẻ ảnh, form, nội dung. Không kính chồng kính.
- Tự chuyển nền đặc khi trình duyệt không hỗ trợ `backdrop-filter` hoặc khi bật giảm trong suốt; viền đậm khi bật tăng tương phản.

## Hình dạng và khoảng cách
Bo góc: 10 / 16 / 28 px và 999 px cho nút. Tab bar bo 32 px, nút trong bo 26 px (đồng tâm, cách viền 6 px). Section cách nhau 80–144 px. Vùng chạm tối thiểu 44 px.

## Chuyển động
Ease-out-quint `cubic-bezier(.22,1,.36,1)`; 180 / 320 / 640 ms. Khoảnh khắc chính: ảnh hero hiện dần. Tắt toàn bộ khi bật giảm chuyển động.

## Ảnh mẫu
`assets/img/samples/*.jpg` (2000 px) và `*-sm.jpg` (900 px) là ảnh minh hoạ dựng sẵn, luôn gắn nhãn “Mẫu”. Thay bằng ảnh thật của Nikon School trước khi ra mắt.

## Kiểm tra
`npx impeccable detect http://localhost:PORT/index.html` phải trả về 0 lỗi.
