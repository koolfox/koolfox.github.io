"""نقطهٔ شروع: یک عامل را عوض کن و با بذر ثابت دوباره آزمایش کن."""

from live_training import TrainingRun  # اجرای واقعی پرسپترون یا شبکهٔ سیگموید

# BEGIN CONFIG
CONFIG = {  # مقدارهای آغازینِ کنترل‌های کنار نمودار
    "gate": "XOR",  # جدول هدف؛ XOR با یک مرز خطی جدا نمی‌شود
    "model": "mlp",  # mlp لایهٔ پنهان دارد؛ linear و perceptron ندارند
    "hidden": 4,  # فقط در mlp: تعداد نورون‌های لایهٔ پنهان
    "learning_rate": 1.0,  # اندازهٔ گام وزن‌ها؛ بزرگ‌تر لزوماً بهتر نیست
    "seed": 7,  # با بذر ثابت، وزن‌های اولیه قابل مقایسه‌اند
    "max_epochs": 6000,  # سقف تعداد گذرهای کامل از چهار نمونه
}
# END CONFIG


def create_run(**config):  # **config تنظیمات کنترل‌ها را به ورودی‌های نام‌دار تبدیل می‌کند
    return TrainingRun(**config)  # return آزمایش تازه را با وزن‌های اولیه برمی‌گرداند


def train_epochs(experiment, count=1):  # experiment مدل فعلی و count تعداد دوره‌هاست
    experiment.step(count)  # یکسان برای «یک گام» و آموزش پیوسته؛ وزن‌ها واقعاً عوض می‌شوند

# برای تغییر فرمول‌ها، از فهرست کد «عبور نورون» یا «گرادیان» را باز کن.
# در logic_gates.py، forward خروجی، gradients مشتق و step به‌روزرسانی را می‌سازد.
# در live_training.py، شاخهٔ else در TrainingRun.step قاعدهٔ پرسپترون است.
