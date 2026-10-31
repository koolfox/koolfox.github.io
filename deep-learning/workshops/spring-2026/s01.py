"""Independent toy for the train/test split on source pages 39–43.

The numbers are invented features, not the photographs or labels in the PDF.
Edit threshold, then compare errors on the two disjoint groups.
"""

# آستانه را به 0.7 تغییر بده؛ ممکن است دقت آموزش و آزمون در دو جهت متفاوت تغییر کنند.
threshold = 0.5
# چهار نمونهٔ ساختگی برای انتخاب قاعده؛ از برچسب‌های آزمون برای انتخاب آستانه استفاده نکن.
training = [(0.1, 0), (0.3, 0), (0.8, 1), (0.9, 1)]
# این دو نمونه را کنار گذاشته‌ایم تا رفتار روی دادهٔ تازه سنجیده شود.
test = [(0.4, 1), (0.6, 0)]


def classify(value):
    # اگر ویژگی از آستانه کمتر نباشد، برچسب 1 پیش‌بینی می‌شود؛ وگرنه 0.
    return int(value >= threshold)


def accuracy(samples):
    # تعداد پیش‌بینی‌های برابر با برچسب را بشمار.
    correct = sum(classify(value) == label for value, label in samples)
    # دقت برابر سهم پیش‌بینی‌های درست از کل نمونه‌هاست.
    return correct / len(samples)


# این خروجی‌ها را پیش و پس از تغییر آستانه مقایسه کن.
result = {
    "training_accuracy": accuracy(training),
    "test_accuracy": accuracy(test),
    "test_prediction": [classify(value) for value, _ in test],
}
