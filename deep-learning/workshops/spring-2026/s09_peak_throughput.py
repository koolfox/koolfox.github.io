# ستون بدون sparsity از جدول A100 صفحهٔ57؛ ورودی‌ها قابل ویرایش‌اند.
# چهار سطر اول TFLOPS و سطر آخر TOPS صحیح هستند.
fp32 = 19.5
dense_rates = {"FP64": 9.7, "FP64 Tensor": 19.5, "TF32 Tensor": 156.0,
               "BF16 Tensor": 312.0, "FP16 Tensor": 312.0, "INT8 Tensor": 624.0}
if fp32 <= 0 or any(rate < 0 for rate in dense_rates.values()):
    raise ValueError("نرخ مبنا باید مثبت و نرخ‌های جدول نامنفی باشند.")
# نسبت نرخ عملیات بیشینه را حساب می‌کنیم، نه زمان واقعی آموزش یک مدل.
ratios = {name: rate / fp32 for name, rate in dense_rates.items()}
# INT8 عمل صحیح دارد؛ این نسبت هم‌ارزی دقت یا FLOP نیست.
result = {"fp32_tflops": fp32, "dense_rates": dense_rates,
          "peak_operation_rate_ratios": ratios,
          "integer_rate_unit": "TOPS", "floating_rate_unit": "TFLOPS"}
