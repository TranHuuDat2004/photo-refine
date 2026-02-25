# Chiến lược lưu trữ ảnh kết hợp (Hybrid Storage Strategy)
*Tài liệu ghi chú lại cuộc thảo luận về giải pháp lưu trữ ảnh tối ưu cho Web Bán Hàng (quy mô 100-150 sản phẩm) chạy trên nền tảng Cloud (như Render, Vercel, Heroku).*

---

## 🛑 Bối cảnh & Vấn đề

Khi triển khai ứng dụng web lên các nền tảng đám mây miễn phí hoặc giá rẻ như **Render**, các máy chủ này thường sử dụng **Ephemeral File System** (Hệ thống tệp tạm thời).
Điều này có nghĩa là mọi file bạn lập trình để lưu trực tiếp vào thư mục mã nguồn (ví dụ: upload qua Multer rồi lưu vào `public/img`) sẽ **bị xóa sạch** mỗi khi server khởi động lại hoặc deploy bản mới.

Để giải quyết vấn đề này, chúng ta cần một chiến lược lưu trữ bên ngoài (hoặc cách "lừa" hệ thống) sao cho ảnh không bao giờ bị mất đi.

---

## 🎯 Giải pháp 1: Sử dụng Cloudinary

**Cloudinary** là dịch vụ lưu trữ và phân phối Media (CDN) chuyên dụng.
- **Giới hạn gói Free:** 25 Credits/tháng (1 Credit = 1GB Storage HOẶC 1GB Bandwidth HOẶC 1.000 Transformations).
- **Chú ý quan trọng:** Thông số Storage (Lưu trữ) là dung lượng cố định đang "chiếm chỗ", không reset hàng tháng. Nếu up 10GB thì tháng nào cũng tốn 10 Credits. Bandwidth (Băng thông người xem tải) sẽ reset về 0GB vào đầu tháng.

### Khi nào nên dùng Cloudinary?
Rất phù hợp cho **Dynamic Assets** (Nội dung sinh ra liên tục bởi người dùng).
- Ảnh Đại diện (Avatar) của User.
- Hình ảnh đăng trong Blog, Comment, Review sản phẩm.
- Ảnh kết quả do hệ thống xử lý (như web Edit ảnh PhotoRefine).

### Ưu/Nhược điểm
- ✅ Nhanh, mạnh, tối ưu ảnh (Resize, Compress) On-The-Fly bằng cách thêm tham số vào URL.
- ✅ Chia tách hoàn toàn tài nguyên User sinh ra khỏi Repo Code.
- ❌ Dễ chạm hạn mức Storage nếu nhét toàn bộ ảnh gốc không nén vào.

---

## 🎯 Giải pháp 2: Sử dụng GitHub API (Commit vào Repo)

Lưu ảnh vào thẳng thư mục tĩnh của dự án (`public/img/...`) và dùng **GitHub API** đẩy code lên nhánh `main`.

### Luồng hoạt động (Workflow):
1. Admin chọn ảnh sản phẩm -> Node.js lưu tạm vào `public/img/sanphamA.png`.
2. Server gọi **GitHub API** (axios.put) tạo 1 commit chứa file ảnh đó đẩy lên nhánh `main`.
3. MongoDB chỉ cần lưu đường dẫn tương đối: `/img/sanphamA.png`.
4. Render tự động nhận diện có commit mới -> Kéo file ảnh về thư mục `public` -> Tự cung tự cấp cho web.

### Khi nào nên dùng?
Phù hợp nhất cho **Static/Core Assets** (Tài nguyên cốt lõi, hữu hạn), điển hình là **100-150 Ảnh phần Sản Phẩm do Admin quản lý**.

### Ưu/Nhược điểm
- ✅ **Source of Truth:** Code và ảnh gốc đi liền một khối. Clone code về là chạy được luôn.
- ✅ **Backup Hoàn hảo:** GitHub lưu toàn bộ version, lỡ xóa nhầm vẫn lấy lại được (Git History).
- ✅ **Tốc độ:** Trình duyệt người xem tải ảnh trực tiếp từ server của bạn (hoặc CDN của Cloudflare nếu có cài), cực kì nhanh, không sợ lỗi rate limit của GitHub.
- ❌ Cứ mỗi lần Admin đăng ảnh là Trigger 1 lần Deploy trên Render (Nên cân nhắc gộp upload nhiều ảnh rồi commit 1 lần để tránh nghẽn server chờ deploy).
- ❌ Sẽ làm nặng dung lượng Repo Git nếu tải lên hàng nghìn tấm ảnh lớn (Nhưng 150 tấm đã nén tốt thì hoàn toàn không thành vấn đề).

---

## 🏆 Chốt lại: Mô hình kết hợp (Hybrid Model)

Đây là mũi tên trúng hai đích cực kỳ tối ưu cho một hệ thống Web bán hàng vừa/nhỏ:

1. **Phần Core (Ảnh Layout, Logo, Banner, và 150 Sản Phẩm Admin đăng):**
   👉 Xài **GitHub API** commit thẳng vào thư mục `public/img`. Web sẽ load nhanh, backup trọn bộ, và an toàn 100%.

2. **Phần Rộng (User Avatar, Bài viết Blog, Comment hình ảnh):**
   👉 Xài **Cloudinary**. Các ảnh sinh ra ngẫu nhiên hàng ngày sẽ ném sang nhà hàng xóm gánh. Cloudinary tự động nén làm thumbnail nhẹ hều, giúp Repo GitHub không bị phình to bởi ảnh rác của User.

*Chiến lược thông minh này giúp bạn xài miễn phí tối đa tài nguyên có sẵn mà không lo chạm trần hạn mức của bất kỳ dịch vụ nào!*
