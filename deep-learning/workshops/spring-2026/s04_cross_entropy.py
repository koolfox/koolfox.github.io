import math

# احتمال ها از شکل صفحه 46 و به ترتیب h، e، l و o هستند.
classes = ["h", "e", "l", "o"]
probabilities = [0.05, 0.1, 0.2, 0.65]
# کلاس درست در شکل تعیین نشده؛ این انتخاب برای تمرین است.
target = "e"
if len(classes) != len(probabilities) or target not in classes:
    raise ValueError("برای هر کلاس یک احتمال و یک هدف معتبر لازم است.")
if any(p < 0 or p > 1 for p in probabilities) or abs(sum(probabilities) - 1) > 1e-9:
    raise ValueError("احتمال ها باید بین صفر و یک و مجموع آنها برابر یک باشد.")
probability = probabilities[classes.index(target)]
# برای هدف one-hot، مجموع آنتروپی متقاطع به منفی لگاریتم احتمال هدف میرسد.
# در احتمال صفر، زیان به بینهایت میل میکند و عدد متناهی ندارد.
loss = -math.log(probability) if probability > 0 else None
loss_base10 = -math.log10(probability) if probability > 0 else None
print("هدف انتخابی آموزشی است؛ خود شکل کلاس درست را مشخص نمیکند.")
print("زیان با لگاریتم طبیعی محاسبه میشود؛ مبنای 10 فقط مقیاس را عوض میکند.")
print("احتمال هدف:", probability, "زیان:", loss if loss is not None else "بینهایت")
# نقاط آموزشی نمودار صفحه 48؛ این نقاط داده آزمایش مدل نیستند.
curve_probabilities = [0.01, 0.05, 0.1, 0.2, 0.5, 1.0]
curve_loss = [-math.log(p) for p in curve_probabilities]
result = {"target": target, "probability": probability, "loss_ln": loss,
          "loss_log10": loss_base10, "curve_probabilities": curve_probabilities,
          "curve_loss": curve_loss}
