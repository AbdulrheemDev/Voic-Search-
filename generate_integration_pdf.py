import os
import arabic_reshaper
from bidi.algorithm import get_display

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

FONT_REGULAR = '/home/user/fonts/Amiri-Regular.ttf'
FONT_BOLD = '/home/user/fonts/Amiri-Bold.ttf'

pdfmetrics.registerFont(TTFont('Amiri', FONT_REGULAR))
pdfmetrics.registerFont(TTFont('Amiri-Bold', FONT_BOLD))

def ar(text):
    if not text: return ''
    return get_display(arabic_reshaper.reshape(str(text)))

class SimpleNumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations()
            super().showPage()
        super().save()

    def draw_decorations(self):
        self.saveState()
        if self._pageNumber > 1:
            self.setFont('Amiri', 9)
            self.setFillColor(colors.HexColor('#475569'))
            header_right = ar('دليل التكامل المؤسسي ونماذج الإطلاق (سلة ومتجر كروم)')
            self.drawRightString(A4[0] - 70.87, A4[1] - 40, header_right)
            header_left = ar('مشروع تخرج: منصة تجارة إلكترونية بالبحث الصوتي')
            self.drawString(56.69, A4[1] - 40, header_left)

            self.setStrokeColor(colors.HexColor('#cbd5e1'))
            self.setLineWidth(0.75)
            self.line(56.69, A4[1] - 46, A4[0] - 70.87, A4[1] - 46)

        self.setFont('Amiri', 10)
        self.setFillColor(colors.HexColor('#1e293b'))
        page_str = ar(f'- {self._pageNumber} -')
        self.drawCentredString(A4[0] / 2.0, 36, page_str)
        self.restoreState()

def build_integration_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=70.87,
        leftMargin=56.69,
        topMargin=56.69,
        bottomMargin=56.69
    )

    styles = getSampleStyleSheet()

    style_body = ParagraphStyle('IntBody', fontName='Amiri', fontSize=12, leading=19, alignment=TA_JUSTIFY, spaceAfter=8)
    style_h1 = ParagraphStyle('IntH1', fontName='Amiri-Bold', fontSize=16, leading=23, alignment=TA_RIGHT, textColor=colors.HexColor('#1e3a8a'), spaceBefore=14, spaceAfter=10)
    style_h2 = ParagraphStyle('IntH2', fontName='Amiri-Bold', fontSize=14, leading=20, alignment=TA_RIGHT, textColor=colors.HexColor('#0f172a'), spaceBefore=12, spaceAfter=6)
    style_caption_top = ParagraphStyle('IntCapTop', fontName='Amiri-Bold', fontSize=11, leading=15, alignment=TA_RIGHT, spaceBefore=8, spaceAfter=4)

    story = []

    # Title
    story.append(Paragraph(ar('دليل التكامل المؤسسي ونماذج الإطلاق'), ParagraphStyle('DTitle', fontName='Amiri-Bold', fontSize=22, leading=30, alignment=TA_CENTER, textColor=colors.HexColor('#1e40af'))))
    story.append(Spacer(1, 6))
    story.append(Paragraph(ar('التكامل المباشر وتطبيق متجر سلة وإضافة متجر كروم'), ParagraphStyle('DSub', fontName='Amiri-Bold', fontSize=15, leading=22, alignment=TA_CENTER, textColor=colors.HexColor('#0f172a'))))
    story.append(Spacer(1, 4))
    story.append(Paragraph(ar('جامعة العلوم والتكنولوجيا - فرع إب - قسم الحاسبات وتكنولوجيا المعلومات (2026-2027م)'), ParagraphStyle('DUni', fontName='Amiri', fontSize=11, leading=16, alignment=TA_CENTER, textColor=colors.HexColor('#64748b'))))
    story.append(HRFlowable(width="80%", thickness=1, color=colors.HexColor('#2563eb'), spaceBefore=12, spaceAfter=16))

    # Section 1
    story.append(Paragraph(ar('1. دورة حياة التكامل من طلب التاجر حتى التسليم النهائي'), style_h1))
    story.append(Paragraph(
        ar('تعتمد عملية دمج محرك البحث الصوتي الذكي في المتاجر الإلكترونية على مبدأ "التكامل غير الجراحي" (Non-Invasive Architecture)، حيث يُدمج المحرك دون تعديل بنية جداول المتجر القائمة. وتمر العملية بست مراحل:\n'
           '1. فحص الجاهزية والبيئة: التحقق من توفر شهادة الأمان HTTPS (شرط إلزامي لعمل الميكروفون بالمتصفح).\n'
           '2. ربط نقاط التكامل الأربع: مكوّن الواجهة بزر الميكروفون، مسار API الموحد، دالة الفهرسة والتطبيع في نموذج المنتج، وجدول القاموس التجاري المستقل.\n'
           '3. استيراد وتطبيع البيانات: سحب الكتالوج وتوليد مداخل القاموس المخصصة للهجة جمهور المتجر.\n'
           '4. التحقق واختبار التكامل الوظيفي: تشغيل حالات الاختبار العشر TC-01 إلى TC-10.\n'
           '5. الإطلاق التجريبي A/B: تفعيل الميزة لنسبة 20% من المستخدمين ومراقبة الأداء والزمن.\n'
           '6. التسليم النهائي والتدريب: تسليم لوحة إدارة القاموس وتفعيل المراقبة اللحظية.'),
        style_body
    ))

    # Section 2: Salla App
    story.append(Paragraph(ar('2. نموذج محرك البحث كتطبيق في متجر سلة (Salla App Store)'), style_h1))
    story.append(Paragraph(
        ar('منصة سلة هي كبرى منصات التجارة الإلكترونية السحابية في المنطقة العربية. وتحويل المحرك إلى تطبيق في متجر سلة يتيح لأي تاجر تفعيله بنقرة واحدة:\n'
           '• التثبيت الفوري بنقرة واحدة: يثبت التاجر التطبيق ويمنح الصلاحيات عبر OAuth 2.0 دون أي تعامل برمجي.\n'
           '• المعمارية السحابية متعددة المتاجر (Multi-Tenant SaaS): يعزل الخادم السحابي فهرس وقاموس كل متجر بحسب معرف التاجر.\n'
           '• المزامنة الحية عبر Webhooks: عند إضافة أو تعديل منتج في سلة، يُرسل إشعار product.created/updated ليتم تحديث الفهرس فورياً (FR-08, TC-10).\n'
           '• الحقن التلقائي لواجهة البحث: يُحقن زر الميكروفون وسكربت التعرف في قوالب سلة عبر Theme Scripts API.\n'
           '• لوحة تحكم مدمجة: تظهر نافذة إدارة القاموس والإحصاءات مباشرة داخل لوحة تحكم سلة الخاصة بالتاجر.'),
        style_body
    ))

    # Section 3: Chrome Extension
    story.append(Paragraph(ar('3. نموذج محرك البحث كإضافة في متجر كروم (Chrome Web Store)'), style_h1))
    story.append(Paragraph(
        ar('في هذا النموذج يتم تجاوز شرط موافقة التاجر، إذ تثبت الإضافة مباشرة في متصفح المتسوق:\n'
           '• الرصد التلقائي لأشرطة البحث: يرصد سكربت المحتوى (content.js) حقل البحث في أي متجر يزوره المتسوق (أمازون، نون، أي متجر سلة أو شوبيفاي).\n'
           '• حقن زر الميكروفون الصوتي: يظهر الميكروفون بجانب شريط البحث داخل الصفحة تلقائياً.\n'
           '• المعالجة المحلية للاستعلام: يلتقط الصوت عبر Web Speech API، ويطبق التطبيع وحذف عبارات الطلب (أبغى، لو سمحت)، ويستبدل الألفاظ الدارجة (شنطة ➔ حقيبة).\n'
           '• المحاكاة والإرسال التلقائي: يكتب النص المصفى داخل شريط البحث ويحاكي ضغط مفتاح Enter، فتظهر نتائج المتجر فوراً.'),
        style_body
    ))

    # Section 4: Comparison Table
    story.append(Paragraph(ar('4. مصفوفة المقارنة التحليلية بين النماذج الثلاثة'), style_h1))
    story.append(Paragraph(ar('جدول المقارنة المعمارية والتشغيلية بين خيارات النشر والتوزيع'), style_caption_top))

    comp_data = [
        [ar('وجه المقارنة'), ar('1. التكامل المباشر (Native)'), ar('2. تطبيق متجر سلة (Salla)'), ar('3. إضافة كروم (Extension)')],
        [ar('الجمهور المستهدف'), ar('المتاجر الكبرى المستقلة'), ar('تجار منصة سلة (آلاف المتاجر)'), ar('المتسوقون والمستهلكون النهائيون')],
        [ar('طريقة التثبيت'), ar('حزمة Composer في كود المتجر'), ar('تثبيت بنقرة واحدة من متجر سلة'), ar('تثبيت من متجر Chrome Store')],
        [ar('تعديل كود المتجر'), ar('إضافة مسار API ومكون واجهة'), ar('حقن تلقائي عبر Theme Scripts'), ar('صفر تعديل (يعمل بأي موقع)')],
        [ar('موضع محرك البحث'), ar('خادم المتجر الخاص'), ar('سحابة مركزية (Multi-Tenant)'), ar('في متصفح العميل + API القاموس')],
        [ar('تزامن البيانات'), ar('مباشر من قاعدة البيانات'), ar('عبر خطافات الويب (Webhooks)'), ar('يعتمد على نتائج محرك بحث الموقع')],
        [ar('نموذج العمل'), ar('ترخيص مؤسسي ورسوم إعداد'), ar('اشتراك شهري B2B SaaS'), ar('مجاني للمستهلك / عمولات تسويق')]
    ]

    t_comp = Table(comp_data, colWidths=[90, 125, 125, 125])
    t_comp.setStyle(TableStyle([
        ('FONT', (0,0), (-1,-1), 'Amiri'),
        ('FONT', (0,0), (-1,0), 'Amiri-Bold'),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('ALIGN', (0,0), (0,-1), 'CENTER'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4)
    ]))
    story.append(t_comp)
    story.append(Spacer(1, 12))

    # Section 5: Verification Checklist
    story.append(Paragraph(ar('5. بروتوكول التحقق الميداني وضمان الجودة (QA Checklist)'), style_h1))
    story.append(Paragraph(
        ar('يتم اعتماد الجاهزية التشغيلية بفحص:\n'
           '• سلامة الاستجابة الصوتية على متصفحات Chrome و Edge و Safari على الحاسوب والهاتف المحمول.\n'
           '• اجتياز اختبارات التكامل العشر TC-01 إلى TC-10 بنسبة 100%.\n'
           '• التحقق من بقاء زمن الاستجابة الكلي تحت ثانية واحدة (مطابقاً لمعيار نيلسن لقابلية الاستخدام).'),
        style_body
    ))

    doc.build(story, canvasmaker=SimpleNumberedCanvas)
    print(f'Integration PDF built at: {output_path}')

if __name__ == '__main__':
    out = '/home/user/Voic-Search-/docs/Integration_Guide_Salla_and_Chrome.pdf'
    build_integration_pdf(out)
