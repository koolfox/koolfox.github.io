# اندازهٔ ناحیه و برچسب گوشهٔ بالاچپِ تصویر صفحهٔ 50 ، پیش از کوانتیزه‌سازی.
width = 200.0
height = 145.0
# مختصات مقالهٔ همراه شکل: x=296 و y=192 ؛ برچسب 192×296 شکل ترتیب y,x دارد.
origin_xy = [296.0, 192.0]
# نقشهٔ ویژگی نسبت به تصویر در هر بُعد 32 برابر کوچک‌تر است.
downsample = 32.0
# صفحهٔ 60 هر ناحیه را به 3×3 بخش تقسیم می‌کند.
bins = 3
if downsample <= 0 or width <= 0 or height <= 0:
    raise ValueError("اندازه‌ها و ضریب کاهش باید مثبت باشند.")
if type(bins) is not int or bins < 1 or len(origin_xy) != 2:
    raise ValueError("تعداد بخش‌ها باید صحیح مثبت و مختصات شامل دو عدد باشد.")
# مختصات اعشاری را نگه می‌داریم؛ ROIAlign به گردکردن زودهنگام نیاز ندارد.
feature_size = [width / downsample, height / downsample]
feature_origin = [coordinate / downsample for coordinate in origin_xy]
bin_size = [size / bins for size in feature_size]
# همین تقسیم‌های ساده خطاهای عددی چاپ‌شده در صفحهٔ 51 را آشکار می‌کند.
result = {"feature_size": feature_size, "feature_origin_xy": feature_origin,
          "bin_size": bin_size, "area_before": width * height,
          "area_after": feature_size[0] * feature_size[1]}
