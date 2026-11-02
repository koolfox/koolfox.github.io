# سطرها و ستون‌های جدول دقتVQAصفحه‌های47تا49؛اعداد درصد هستند.
columns = ["All", "Yes/No", "Number", "Other"]
scores = {"prior_yes": [29.66, 70.81, 0.39, 1.15],
          "image_only": [28.13, 64.01, 0.42, 3.77],
          "question_only": [48.76, 78.20, 35.68, 26.59],
          "lstm_question_image": [53.74, 78.94, 35.24, 36.42],
          "deeper_question_only": [50.39, 78.41, 34.68, 30.03],
          "deeper_question_normalized_image": [57.75, 80.50, 36.77, 43.08]}
if any(len(row) != len(columns) or any(not 0 <= x <= 100 for x in row) for row in scores.values()):
    raise ValueError("هر سطر باید چهار درصد بین صفر و100داشته باشد.")
# اختلاف درصدها «واحد درصد» است؛نسبت خطا یا علت مستقل معماری نیست.
proposed = scores["deeper_question_normalized_image"]
baseline = scores["lstm_question_image"]
gains = {column: proposed[j] - baseline[j] for j, column in enumerate(columns)}
# اینجا مدل کامل‌تر هم عمق و هم نرمال‌سازی را عوض کرده است؛اثر هرکدام جدا نیست.
question_vs_image = scores["question_only"][0] - scores["image_only"][0]
result = {"columns": columns, "scores_percent": scores,
          "proposed_minus_lstm_percentage_points": gains,
          "question_minus_image_all_points": question_vs_image}
