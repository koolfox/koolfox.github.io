# نمره‌های همان جدول صفحهٔ 25؛ درصدها و معیارهای متفاوت را با هم مقیاس مشترک جا نمی‌زنیم.
# avg ستون گزارش‌شدهٔ خود جدول است؛ میانگین دوباره از عددهای گرد‌شده محاسبه نمی‌شود.
rows = {
    "transformer_full": {"avg": 74.7, "CoLA": 45.4, "SST2": 91.3, "MRPC": 82.3, "STSB": 82.0, "QQP": 70.3, "MNLI": 81.8, "QNLI": 88.1, "RTE": 56.0},
    "without_pretraining": {"avg": 59.9, "CoLA": 18.9, "SST2": 84.0, "MRPC": 79.4, "STSB": 30.9, "QQP": 65.5, "MNLI": 75.7, "QNLI": 71.2, "RTE": 53.8},
    "without_aux_lm": {"avg": 75.0, "CoLA": 47.9, "SST2": 92.0, "MRPC": 84.9, "STSB": 83.2, "QQP": 69.8, "MNLI": 81.1, "QNLI": 86.9, "RTE": 54.4},
    "lstm_aux_lm": {"avg": 69.1, "CoLA": 30.3, "SST2": 90.5, "MRPC": 83.2, "STSB": 71.8, "QQP": 68.1, "MNLI": 73.7, "QNLI": 81.1, "RTE": 54.6},
}
# یک ستون را انتخاب کن تا همان مقایسه روی آن وظیفه هم دیده شود.
metric = "avg"
if any(metric not in row for row in rows.values()):
    raise ValueError("معیار باید یکی از ستون‌های جدول باشد.")
# اختلاف نمره با تغییر نسبی درصدی فرق دارد؛ اینجا فقط تفاضل همان ستون را می‌سنجیم.
pretraining_difference = rows["transformer_full"][metric] - rows["without_pretraining"][metric]
transformer_lstm_difference = rows["transformer_full"][metric] - rows["lstm_aux_lm"][metric]
auxiliary_lm_difference = rows["transformer_full"][metric] - rows["without_aux_lm"][metric]
result = {"metric": metric, "table": rows,
          "pretraining_score_difference": pretraining_difference,
          "transformer_lstm_score_difference": transformer_lstm_difference,
          "auxiliary_lm_score_difference": auxiliary_lm_difference}
