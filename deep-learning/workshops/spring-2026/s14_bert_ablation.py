# جدول تحلیل BERT در صفحهٔ 30؛ هر ستون،معیار همان وظیفه را دارد.
rows = {"bert_base": {"MNLI_m": 84.4, "QNLI": 88.4, "MRPC": 86.7, "SST2": 92.7, "SQuAD_F1": 88.5},
        "no_nsp": {"MNLI_m": 83.9, "QNLI": 84.9, "MRPC": 86.5, "SST2": 92.6, "SQuAD_F1": 87.9},
        "left_to_right_no_nsp": {"MNLI_m": 82.1, "QNLI": 84.3, "MRPC": 77.5, "SST2": 92.1, "SQuAD_F1": 77.8}}
# تفاوت BERT و NoNSP اثر حذف NSP را در همین تنظیم آزمایشی مقایسه می‌کند.
nsp_differences = {task: rows["bert_base"][task] - rows["no_nsp"][task]
                   for task in rows["bert_base"]}
# با NSP حذف‌شده در هر دو،تفاوت دوطرفه و چپ‌به‌راست را جدا می‌بینیم.
bidirectional_differences = {task: rows["no_nsp"][task] - rows["left_to_right_no_nsp"][task]
                            for task in rows["bert_base"]}
result = {"table": rows, "nsp_score_differences": nsp_differences,
          "bidirectional_score_differences": bidirectional_differences}
