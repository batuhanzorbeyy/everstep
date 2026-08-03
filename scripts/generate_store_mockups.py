from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'store' / 'screenshots'
OUT.mkdir(parents=True, exist_ok=True)
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

BG=(8,12,23); PANEL=(19,27,46); PANEL2=(24,34,57); BORDER=(47,57,80); TEXT=(245,247,255); MUTED=(145,156,184); SUB=(91,103,132); ACC=(124,140,255); GREEN=(84,214,161); RED=(255,113,133); YELLOW=(255,189,102)

def font(size,bold=False): return ImageFont.truetype(BOLD if bold else FONT,size)
def rr(d, box, radius=20, fill=PANEL, outline=BORDER, width=1): d.rounded_rectangle(box,radius,fill=fill,outline=outline,width=width)
def txt(d,xy,s,size=20,color=TEXT,bold=False,anchor=None): d.text(xy,s,font=font(size,bold),fill=color,anchor=anchor)

def sidebar(img, active):
    d=ImageDraw.Draw(img); d.rectangle((0,0,260,1080),fill=(7,11,21)); d.line((260,0,260,1080),fill=BORDER)
    icon=Image.open(ROOT/'assets/icon.png').resize((58,58)); img.alpha_composite(icon,(32,28))
    txt(d,(105,33),'Everstep',23,bold=True); txt(d,(105,63),'Deep work, made simple.',11,color=SUB)
    items=[('Bugün','⌂'),('Görevler','✓'),('İstatistik','▥'),('Rozetler','◇'),('Odak Sesleri','♫'),('Ayarlar','⚙')]
    y=135
    for name,ic in items:
        if name==active: rr(d,(18,y-8,242,y+45),14,fill=(34,40,73),outline=(62,70,117))
        txt(d,(38,y+3),ic,22,color=ACC if name==active else MUTED); txt(d,(76,y+5),name,16,color=TEXT if name==active else MUTED,bold=name==active)
        y+=65
    rr(d,(22,850,238,968),18,fill=(15,21,37)); txt(d,(40,872),'Seviye 6',14,bold=True); txt(d,(215,874),'112 sa',12,color=MUTED,anchor='ra')
    d.rounded_rectangle((40,910,220,918),4,fill=(35,42,62)); d.rounded_rectangle((40,910,155,918),4,fill=ACC)
    txt(d,(40,935),'Sonraki seviye için 7 sa 20 dk',10,color=SUB)
    txt(d,(31,1016),'Çevrimdışı ve gizli',11,color=MUTED); txt(d,(31,1037),'Veriler yalnızca bu cihazda',9,color=SUB)

def top(d,eyebrow,title):
    txt(d,(310,37),eyebrow,14,color=MUTED); txt(d,(310,67),title,34,bold=True)
    rr(d,(1665,47,1717,99),14,fill=PANEL2); txt(d,(1691,71),'⛶',21,color=MUTED,anchor='mm')
    rr(d,(1732,47,1882,99),14,fill=ACC,outline=ACC); txt(d,(1807,73),'+ Yeni görev',14,bold=True,anchor='mm')

def summary(d,x,label,value,detail,progress=None):
    rr(d,(x,135,x+365,265),20); txt(d,(x+24,157),label,13,color=MUTED); txt(d,(x+24,195),value,27,bold=True); txt(d,(x+190,208),detail,11,color=SUB)
    if progress is not None:
        d.rounded_rectangle((x+24,239,x+341,246),4,fill=(40,47,68)); d.rounded_rectangle((x+24,239,x+24+int(317*progress),246),4,fill=ACC)

def base(active,eyebrow,title):
    img=Image.new('RGBA',(1920,1080),BG+(255,)); sidebar(img,active); top(ImageDraw.Draw(img),eyebrow,title); return img

# dashboard
img=base('Bugün','26 Temmuz 2026, Pazar','Odaklanmaya hazır mısın?'); d=ImageDraw.Draw(img)
for x,a,b,c,p in [(310,'Bugünkü hedef','5 / 8','Pomodoro',.625),(690,'Odak süresi','2 sa 05 dk','Bugün',None),(1070,'Odak skoru','%92','Son 7 gün',None),(1450,'Güncel seri','12 gün','Devam et',None)]: summary(d,x,a,b,c,p)
rr(d,(310,285,1240,1035),28)
# tabs
rr(d,(550,315,1000,365),14,fill=(12,18,32)); rr(d,(555,320,700,360),10,fill=(47,54,91),outline=(70,80,134)); txt(d,(627,340),'Odak',13,bold=True,anchor='mm'); txt(d,(775,340),'Kısa Mola',13,color=SUB,anchor='mm'); txt(d,(925,340),'Uzun Mola',13,color=SUB,anchor='mm')
# timer circle
cx,cy,r=775,620,210; d.ellipse((cx-r,cy-r,cx+r,cy+r),outline=(38,46,67),width=10); d.arc((cx-r,cy-r,cx+r,cy+r),-90,190,fill=ACC,width=12)
txt(d,(cx,530),'ŞU AN',12,color=ACC,bold=True,anchor='mm'); txt(d,(cx,620),'17:42',84,bold=True,anchor='mm'); txt(d,(cx,690),'Odak',17,color=MUTED,anchor='mm')
rr(d,(650,845,900,907),18,fill=ACC,outline=ACC); txt(d,(775,876),'Ⅱ  Duraklat',18,bold=True,anchor='mm'); rr(d,(575,850,625,900),25,fill=PANEL2); txt(d,(600,875),'↺',23,color=MUTED,anchor='mm'); rr(d,(925,850,975,900),25,fill=PANEL2); txt(d,(950,875),'↠',23,color=MUTED,anchor='mm')
rr(d,(350,945,1200,1012),16,fill=(16,23,39)); txt(d,(375,961),'AKTİF GÖREV',10,color=SUB,bold=True); txt(d,(375,982),'React Native navigasyon bölümünü tamamla',15,bold=True); txt(d,(1165,980),'Değiştir',12,color=ACC,anchor='ra')
# tasks side
rr(d,(1260,285,1882,695),24); txt(d,(1290,315),'BUGÜN',10,color=SUB,bold=True); txt(d,(1290,341),'Görevler',22,bold=True)
tasks=[('React Native navigasyon','Yazılım • 2/4 pomodoro',RED),('İngilizce konuşma pratiği','İngilizce • 1/2 pomodoro',YELLOW),('GitHub README güncelle','Yazılım • 0/1 pomodoro',GREEN),('30 dakika kitap oku','Okuma • 0/1 pomodoro',YELLOW)]
y=395
for i,(a,b,c) in enumerate(tasks):
    if i==0: rr(d,(1280,y-10,1860,y+62),13,fill=(31,38,67),outline=(52,61,100))
    d.ellipse((1300,y+8,1320,y+28),outline=MUTED,width=2); txt(d,(1345,y),a,14,bold=True); txt(d,(1345,y+27),b,10,color=SUB); d.ellipse((1830,y+13,1838,y+21),fill=c); y+=78
rr(d,(1260,715,1882,1035),24); txt(d,(1290,745),'SON 7 GÜN',10,color=SUB,bold=True); txt(d,(1290,770),'Odak ritmi',22,bold=True); txt(d,(1850,770),'16 sa 35 dk',13,color=MUTED,anchor='ra')
vals=[.45,.74,.58,.92,.78,.38,.66]; labs=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz']
for i,(v,l) in enumerate(zip(vals,labs)):
    x=1310+i*76; d.rounded_rectangle((x,815,x+30,980),8,fill=(31,39,58)); d.rounded_rectangle((x,980-int(160*v),x+30,980),8,fill=ACC); txt(d,(x+15,1002),l,10,color=SUB,anchor='mm')
img.convert('RGB').save(OUT/'01-dashboard.png')

# tasks
img=base('Görevler','Planını sadeleştir','Görevler'); d=ImageDraw.Draw(img)
rr(d,(310,135,635,187),14,fill=(13,19,33)); rr(d,(316,141,420,181),10,fill=(48,55,93),outline=(67,77,126)); txt(d,(368,161),'Aktif',13,bold=True,anchor='mm'); txt(d,(475,161),'Tamamlanan',12,color=MUTED,anchor='mm'); txt(d,(585,161),'Tümü',12,color=MUTED,anchor='mm')
items=[('React Native navigasyon bölümünü tamamla','Mobil uygulamadaki stack ve tab navigasyon yapısını kur.','Yazılım',RED,2,4),('İngilizce konuşma pratiği','Günlük konularda 30 dakika sesli konuşma yap.','İngilizce',YELLOW,1,2),('Portfolio ana sayfasını güncelle','Projeleri ve yeni sertifikaları ana sayfaya ekle.','Yazılım',RED,3,5),('GitHub README düzenle','Kurulum adımlarını ve ekran görüntülerini ekle.','Yazılım',GREEN,0,1),('30 dakika kitap oku','Atomic Habits kitabında 4. bölümü tamamla.','Okuma',YELLOW,0,1),('Haftalık planı hazırla','Yeni haftanın önceliklerini ve hedeflerini belirle.','İş',GREEN,1,2)]
for i,it in enumerate(items):
    col=i%3; row=i//3; x=310+col*525; y=220+row*390; rr(d,(x,y,x+490,y+350),23,fill=PANEL if i else (25,32,58),outline=(67,76,125) if i==0 else BORDER)
    d.rounded_rectangle((x+25,y+25,x+52,y+52),8,outline=MUTED,width=2); d.ellipse((x+435,y+31,x+447,y+43),fill=it[3]); txt(d,(x+25,y+85),it[0],18,bold=True); txt(d,(x+25,y+125),it[1],12,color=MUTED); txt(d,(x+25,y+200),it[2],11,color=SUB); txt(d,(x+450,y+200),f'{it[4]} / {it[5]} Pomodoro',11,color=SUB,anchor='ra'); d.rounded_rectangle((x+25,y+230,x+465,y+238),4,fill=(37,44,65)); d.rounded_rectangle((x+25,y+230,x+25+int(440*it[4]/it[5]),y+238),4,fill=ACC); rr(d,(x+25,y+275,x+145,y+320),13,fill=ACC if i==0 else PANEL2,outline=ACC if i==0 else BORDER); txt(d,(x+85,y+298),'Aktif görev' if i==0 else 'Odaklan',12,bold=True,anchor='mm')
img.convert('RGB').save(OUT/'02-tasks.png')

# stats
img=base('İstatistik','İlerlemeni görünür kıl','İstatistik'); d=ImageDraw.Draw(img)
for x,a,b,c in [(310,'Toplam odak','112 sa 40 dk','Tüm zamanlar'),(690,'Pomodoro','268','Tamamlanan'),(1070,'En uzun seri','18 gün','Güncel: 12'),(1450,'Odak skoru','%92','Son 7 gün')]: summary(d,x,a,b,c)
rr(d,(310,285,1325,760),24); txt(d,(340,315),'HAFTALIK',10,color=SUB,bold=True); txt(d,(340,342),'Odak süresi',22,bold=True); vals=[.45,.74,.58,.92,.78,.38,.66]; labs=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz']
for i,(v,l) in enumerate(zip(vals,labs)):
    x=380+i*125; d.rounded_rectangle((x,410,x+55,690),10,fill=(31,39,58)); d.rounded_rectangle((x,690-int(265*v),x+55,690),10,fill=ACC); txt(d,(x+27,720),l,12,color=SUB,anchor='mm')
rr(d,(1345,285,1882,760),24); txt(d,(1375,315),'İÇGÖRÜLER',10,color=SUB,bold=True); txt(d,(1375,342),'Özet',22,bold=True)
for i,(ic,a,b) in enumerate([('◷','En verimli gün','Perşembe'),('◎','Ortalama oturum','25 dk'),('✓','Tamamlanan görev','34'),('↗','Günlük hedef','%63')]):
    y=405+i*83; rr(d,(1375,y,1420,y+45),13,fill=(35,42,72)); txt(d,(1397,y+23),ic,18,color=ACC,anchor='mm'); txt(d,(1440,y+4),a,11,color=SUB); txt(d,(1440,y+25),b,15,bold=True)
rr(d,(310,780,1882,1035),24); txt(d,(340,810),'SON 12 HAFTA',10,color=SUB,bold=True); txt(d,(340,837),'Odak takvimi',22,bold=True)
for i in range(84):
    col=i//7; row=i%7; level=(i*i+3*i)%5; colors=[(31,38,55),(45,52,88),(67,75,132),(94,105,199),ACC]; x=530+col*68; y=820+row*28; d.rounded_rectangle((x,y,x+18,y+18),4,fill=colors[level])
img.convert('RGB').save(OUT/'03-statistics.png')

# settings
img=base('Ayarlar','Deneyimini kişiselleştir','Ayarlar'); d=ImageDraw.Draw(img)
rr(d,(310,135,1882,560),24); d.line((700,135,700,560),fill=BORDER); txt(d,(345,175),'Görünüm',22,bold=True); txt(d,(345,210),"Everstep'un nasıl görüneceğini belirle.",12,color=MUTED)
themes=[('Midnight Blue',(11,16,32),ACC),('OLED Black',(0,0,0),(111,130,255)),('Nord',(46,52,64),(136,192,208)),('Dracula',(40,42,54),(189,147,249)),('Tokyo Night',(26,27,38),(122,162,247)),('Forest',(16,35,29),(93,190,145))]
for i,(name,c1,c2) in enumerate(themes):
    col=i%3; row=i//3; x=745+col*350; y=170+row*150; rr(d,(x,y,x+320,y+120),17,fill=(23,31,51),outline=ACC if i==0 else BORDER,width=2 if i==0 else 1); d.rounded_rectangle((x+18,y+22,x+78,y+82),14,fill=c1); d.polygon([(x+18,y+82),(x+78,y+22),(x+78,y+82)],fill=c2); txt(d,(x+95,y+31),name,14,bold=True); txt(d,(x+95,y+58),'Tema önizlemesi',10,color=SUB)
rr(d,(310,585,1882,1035),24); d.line((700,585,700,1035),fill=BORDER); txt(d,(345,625),'Zamanlayıcı',22,bold=True); txt(d,(345,660),'Odak ve mola düzenini kişiselleştir.',12,color=MUTED)
settings=[('Odak süresi','25 dakika'),('Kısa mola','5 dakika'),('Uzun mola','15 dakika'),('Günlük hedef','8 Pomodoro')]
for i,(a,b) in enumerate(settings):
    y=620+i*90; d.line((735,y+65,1845,y+65),fill=BORDER); txt(d,(745,y+15),a,14,bold=True); rr(d,(1645,y+5,1835,y+50),12,fill=(17,24,41)); txt(d,(1740,y+28),b,13,color=MUTED,anchor='mm')
img.convert('RGB').save(OUT/'04-themes-settings.png')

print('Generated', len(list(OUT.glob('*.png'))), 'Store mockups')
