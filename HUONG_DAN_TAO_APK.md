# 📱 HƯỚNG DẪN XÂY DỰNG FILE APK TRÊN ĐIỆN THOẠI (KHÔNG CẦN MÁY TÍNH)

> **Dành riêng cho bạn:** Bạn hoàn toàn **KHÔNG CẦN MÁY TÍNH**. Bạn chỉ cần điện thoại Android và tài khoản GitHub miễn phí. GitHub sẽ dùng siêu máy tính đám mây (GitHub Actions) để biên dịch file APK cho bạn trong 3-4 phút!

---

## 🚀 QUY TRÌNH 4 BƯỚC ĐƠN GIẢN

### BƯỚC 1: Tải Mã Nguồn ZIP Về Điện Thoại
1. Trong ứng dụng Pydroid 3 Web, nhấn vào menu (biểu tượng ☰ hoặc nút góc trên) chọn:
   **"📱 Đóng gói APK & Tải mã nguồn"**.
2. Nhấn nút **"📥 Tải toàn bộ mã nguồn (.ZIP)"**.
3. File `pydroid3-source-code.zip` (khoảng ~200 KB) sẽ được tải về thư mục **Download** trên điện thoại của bạn.
4. Mở ứng dụng Quản lý tệp (hoặc cài app **ZArchiver** miễn phí trên CH Play) và bấm **"Giải nén"** file zip này.

---

### BƯỚC 2: Tạo Repository Trên GitHub Bằng Điện Thoại
1. Mở trình duyệt **Google Chrome** trên điện thoại, truy cập: [https://github.com](https://github.com)
2. Đăng nhập (hoặc Đăng ký tài khoản miễn phí nếu chưa có).
3. Nhấn vào biểu tượng **3 dấu chấm ⋮** ở góc trên cùng bên phải trình duyệt Chrome -> Tích chọn **"Trang web cho máy tính"** (Desktop site).
4. Nhấn nút **New** (màu xanh lá) để tạo repository mới:
   - **Repository name:** Điền tên, ví dụ `pydroid3-android`
   - Chọn chế độ: **Public** (để dùng GitHub Actions miễn phí không giới hạn)
   - Tích chọn: **Add a README file**
   - Bấm nút **Create repository**.

---

### BƯỚC 3: Tải Mã Nguồn Lên GitHub
Có 2 cách cực kỳ dễ làm trên điện thoại:

#### Cách A: Tải tệp zip vào GitHub Codespaces (Không gian mã - Khuyên dùng nhất)
1. Trong repository GitHub của bạn trên điện thoại, bấm vào nút **Code** (màu xanh lá) -> Chọn tab **Codespaces** -> Bấm **Create codespace on main**.
2. Khi giao diện Codespaces (VS Code trên web) mở ra:
   - Ở cột danh sách tệp bên trái, chạm giữ hoặc bấm chuột phải chọn **Upload...** rồi chọn file `pydroid3-source-code.zip` vừa tải về từ điện thoại.
3. Mở **Terminal** trong Codespaces (bấm biểu tượng menu ☰ góc trên trái -> **Terminal** -> **New Terminal**) và chạy lần lượt các lệnh sau:
```bash
# 1. Giải nén toàn bộ mã nguồn
python3 -m zipfile -e *.zip .

# 2. Xóa file zip thừa
rm -f *.zip

# 3. Đẩy mã nguồn lên GitHub để kích hoạt build APK
git add .
git commit -m "Upload Pydroid 3 source code"
git push
```

#### Cách B: Tải trực tiếp trên trình duyệt Chrome
1. Trong repository vừa tạo trên GitHub, bấm nút **Add file** -> Chọn **Upload files**.
2. Chọn các thư mục và tệp vừa giải nén (quan trọng nhất là thư mục `.github`, `src`, `public`, `package.json`, `capacitor.config.json`, `index.html`, `server.ts`, `vite.config.ts`).
3. Kéo xuống dưới bấm nút xanh **Commit changes**.

#### Cách C: Sử dụng app Git trên Android (Ví dụ Termux)
- Nếu bạn có cài app **Termux** trên điện thoại:
```bash
cd /sdcard/Download/pydroid3-source-code
git init
git add .
git commit -m "Khoi tao Pydroid 3 Android"
git branch -M main
git remote add origin https://github.com/TÊN_GITHUB_CỦA_BẠN/pydroid3-android.git
git push -u origin main
```

---

### BƯỚC 4: GitHub Tự Động Biên Dịch & Tải File APK Về Điện Thoại
1. Ngay khi mã nguồn được tải lên, tệp cấu hình tự động `.github/workflows/build-apk.yml` đã được cài sẵn sẽ **tự động kích hoạt**!
2. Trên trang GitHub trên điện thoại, bấm vào tab **Actions** (nằm ở thanh ngang phía trên).
3. Bạn sẽ thấy tiến trình: **"Build Android APK for Pydroid 3 Web"** đang chạy với vòng tròn xoay màu vàng.
4. Chờ khoảng **3 - 4 phút** cho đến khi xuất hiện dấu tích xanh lá cây **✓** (Build thành công).
5. Bấm vào dòng tiến trình vừa hoàn tất, cuộn xuống mục **Artifacts** ở dưới cùng.
6. Bấm vào tệp **`Pydroid3-Android-APK`** để tải về điện thoại!
7. Mở tệp vừa tải về (file `app-debug.apk`), bấm **Cài đặt** (Cho phép cài đặt từ nguồn này nếu điện thoại hỏi).
8. 🎉 **Chúc mừng!** Biểu tượng Pydroid 3 Web đã xuất hiện trên màn hình ứng dụng điện thoại Android của bạn và hoạt động như một ứng dụng gốc độc lập!

---

## ⚡ MẸO NHANH: CÀI ĐẶT NGAY TRONG 3 GIÂY (KHÔNG CẦN CHỜ BUILD APK)
Nếu bạn muốn dùng Pydroid 3 như một ứng dụng Android ngay lập tức mà không cần tạo GitHub:
1. Mở trang web Pydroid 3 trên trình duyệt **Chrome** trên điện thoại.
2. Bấm vào nút **3 chấm ⋮** ở góc trên bên phải Chrome.
3. Chọn dòng **"Cài đặt ứng dụng"** (hoặc **"Thêm vào Màn hình chính"** / **Install app**).
4. Biểu tượng ứng dụng Pydroid 3 sẽ xuất hiện ngay trên màn hình chính của bạn, mở ra toàn màn hình (Fullscreen không có thanh địa chỉ) như một app APK thực thụ!
