# Pydroid 3 Web - Python IDE & AI Debugger cho Android 📱🐍

Môi trường phát triển tích hợp (IDE) Python Pydroid 3 tối ưu cho màn hình cảm ứng điện thoại Android. Hỗ trợ song song cả **CPython Native** (máy chủ) và **Pyodide WASM** (chạy ngoại tuyến trên trình duyệt), tích hợp Terminal tương tác `input()`, trợ lý gỡ lỗi thông minh Gemini AI, và tự động đóng gói ứng dụng Android APK thông qua GitHub Actions.

---

## 🌟 Các Tính Năng Nổi Bật

- 🚀 **Động Cơ Kép (Dual Engine):**
  - **Pyodide WASM:** Thực thi Python trực tiếp trong trình duyệt trên điện thoại mà không cần mạng.
  - **CPython Native:** Thực thi mã nguồn Python trên Linux server với đầy đủ thư viện chuẩn và hệ sinh thái pip.
- ⌨️ **Bàn phím ký hiệu lập trình di động:** Thanh công cụ phím tắt đặc biệt hỗ trợ soạn thảo nhanh `Tab`, `:`, `(`, `)`, `"`, `'`, `=`, `def`, `class`,...
- 📦 **Quản lý thư viện Pip tích hợp:** Cài đặt nhanh `pyfiglet`, `colorama`, `requests`, `numpy`, `matplotlib`...
- 🧠 **Trợ lý gỡ lỗi AI (Gemini):** Phân tích lỗi cú pháp, tự động sửa lỗi và giải thích chi tiết bằng tiếng Việt.
- 📱 **Hỗ trợ đóng gói Android APK:** Tự động tạo tệp `app-debug.apk` thông qua GitHub Actions hoàn toàn miễn phí trên đám mây, không cần máy tính.

---

## 📦 Cách Đóng Gói Thành File APK Trên Điện Thoại

Xem hướng dẫn chi tiết từng bước tại: 👉 **[HUONG_DAN_TAO_APK.md](./HUONG_DAN_TAO_APK.md)**

Quy trình tóm tắt:
1. Tải toàn bộ mã nguồn (.ZIP) về điện thoại thông qua nút **"Đóng gói APK & Tải mã nguồn"** trong ứng dụng.
2. Tạo repository trên GitHub và tải mã nguồn lên.
3. GitHub Actions sẽ tự động biên dịch file `.apk` trong vòng 3 phút qua workflow `.github/workflows/build-apk.yml`.
4. Tải file `app-debug.apk` về điện thoại và cài đặt!

---

## 🛠️ Cài Đặt & Phát Triển Cục Bộ (Nếu Có Máy Tính)

```bash
# Cài đặt thư viện
npm install

# Khởi chạy môi trường phát triển (Dev Server)
npm run dev

# Xây dựng bản dựng web (Production Build)
npm run build

# Khởi động máy chủ Production
npm start
```

---

## 📄 Bản Quyền
Dự án được phân phối dưới giấy phép mã nguồn mở MIT.
