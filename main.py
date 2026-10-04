from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.label import Label
from kivy.uix.textinput import TextInput
from kivy.uix.button import Button
from kivy.uix.scrollview import ScrollView
from kivy.core.text import LabelBase
LabelBase.register(
    name='Roboto',
    fn_regular='fonts/NotoSans-Regular.ttf',
    fn_bold='fonts/NotoSans-Bold.ttf',
)


Window.clearcolor = (0.95, 0.95, 0.98, 1)  # nền sáng

class SoXoApp(App):
    def build(self):
        self.danh_sach_mua = []

        root = BoxLayout(orientation='vertical', padding=20, spacing=15)

        # Tiêu đề
        title = Label(
            text='SỔ SỐ 2 CHỮ SỐ',
            font_size='28sp',
            bold=True,
            size_hint_y=None,
            height=50,
            color=(0.1, 0.2, 0.5, 1)
        )
        root.add_widget(title)

        # Ô nhập số
        self.input_so = TextInput(
            hint_text='Nhập số 2 chữ số (ví dụ: 07)',
            multiline=False,
            font_size='22sp',
            size_hint_y=None,
            height=50,
            input_filter='int',
            halign='center'
        )
        root.add_widget(self.input_so)

        # Nút thêm số
        btn_them = Button(
            text='Thêm số',
            size_hint_y=None,
            height=50,
            background_color=(0.2, 0.6, 0.9, 1),
            font_size='18sp'
        )
        btn_them.bind(on_press=self.them_so)
        root.add_widget(btn_them)

        # Hiển thị danh sách số đã chọn
        self.label_ds = Label(
            text='Bạn chưa chọn số nào',
            size_hint_y=None,
            height=80,
            font_size='18sp',
            color=(0.2, 0.2, 0.2, 1)
        )
        root.add_widget(self.label_ds)

        # Nút quay số
        btn_quay = Button(
            text='QUAY SỐ',
            size_hint_y=None,
            height=60,
            background_color=(0.9, 0.3, 0.2, 1),
            font_size='22sp',
            bold=True
        )
        btn_quay.bind(on_press=self.quay_so)
        root.add_widget(btn_quay)

        # Kết quả
        self.label_ketqua = Label(
            text='',
            font_size='24sp',
            bold=True,
            size_hint_y=None,
            height=100,
            color=(0.1, 0.5, 0.1, 1)
        )
        root.add_widget(self.label_ketqua)

        # Nút xóa hết
        btn_xoa = Button(
            text='Xóa hết số đã chọn',
            size_hint_y=None,
            height=45,
            background_color=(0.5, 0.5, 0.5, 1),
            font_size='16sp'
        )
        btn_xoa.bind(on_press=self.xoa_het)
        root.add_widget(btn_xoa)

        return root

    def them_so(self, instance):
        so = self.input_so.text.strip()
        if len(so) == 2 and so.isdigit():
            if so not in self.danh_sach_mua:
                self.danh_sach_mua.append(so)
                self.cap_nhat_ds()
                self.input_so.text = ''
            else:
                self.label_ketqua.text = 'Số này đã có rồi!'
                self.label_ketqua.color = (0.8, 0.4, 0, 1)
        else:
            self.label_ketqua.text = 'Vui lòng nhập đúng 2 chữ số'
            self.label_ketqua.color = (0.8, 0.2, 0.2, 1)

    def cap_nhat_ds(self):
        if self.danh_sach_mua:
            self.label_ds.text = 'Các số đã chọn:\n' + '  '.join(self.danh_sach_mua)
        else:
            self.label_ds = Label(
    text='Bạn chưa chọn số nào',
    size_hint_y=None,
    height=80,
    font_size='18sp',
    color=(0.2, 0.2, 0.2, 1)
)
self.label_ds.bind(width=lambda i, w: setattr(i, 'text_size', (w, None)))  # thêm
self.label_ds.halign = 'center'                                           # thêm
root.add_widget(self.label_ds)

    def quay_so(self, instance):
        if not self.danh_sach_mua:
            self.label_ketqua.text = 'Bạn chưa chọn số nào!'
            self.label_ketqua.color = (0.8, 0.2, 0.2, 1)
            return

        ket_qua = str(random.randint(0, 99)).zfill(2)
        ket_qua_dep = ' '.join(ket_qua)

        if ket_qua in self.danh_sach_mua:
            self.label_ketqua.text = f'Kết quả: {ket_qua_dep}\nChúc mừng bạn đã trúng!'
            self.label_ketqua.color = (0.1, 0.6, 0.1, 1)
        else:
            self.label_ketqua.text = f'Kết quả: {ket_qua_dep}\nRất tiếc, không trúng'
            self.label_ketqua.color = (0.7, 0.2, 0.2, 1)

    def xoa_het(self, instance):
        self.danh_sach_mua = []
        self.cap_nhat_ds()
        self.label_ketqua.text = ''
        self.input_so.text = ''

if __name__ == '__main__':
    SoXoApp().run()
