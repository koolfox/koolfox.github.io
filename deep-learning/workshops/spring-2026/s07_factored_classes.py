# نه برچسبِ خود صفحهٔ11؛ هر برچسب از رنگ و نوع شیء تشکیل شده است.
classes = ["red truck", "red car", "red bird", "green truck", "green car", "green bird",
           "blue truck", "blue car", "blue bird"]
colors = ["red", "green", "blue"]
objects = ["truck", "car", "bird"]
factored = []
for label in classes:
    parts = label.split()
    if len(parts) != 2 or parts[0] not in colors or parts[1] not in objects:
        raise ValueError("برچسب باید از یک رنگ و یک نوع شیء در فهرست‌ها ساخته شود.")
    color, object_type = parts
    # دو ویژگی جدا به‌جای نه نامِ تجزیه‌ناپذیر؛ مدل از این ساختار می‌تواند بهره ببرد.
    color_vector = [int(color == item) for item in colors]
    object_vector = [int(object_type == item) for item in objects]
    factored.append({"label": label, "color": color_vector, "object": object_vector})
# این شمارش بازنمایی است؛ نه اثبات کمینهٔ بیت و نه نتیجهٔ آموزش یک شبکه.
result = {"factored_classes": factored, "flat_one_hot_width": len(classes),
          "factored_two_one_hot_width": len(colors) + len(objects),
          "possible_color_object_pairs": len(colors) * len(objects)}
