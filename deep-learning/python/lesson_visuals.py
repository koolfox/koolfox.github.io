"""Explainable optional visuals from the namespace of the displayed lesson only."""
import json
import numpy as np


def build_visual(number, namespace, code):
    n = namespace

    def visual(kind, title, caption, reference, axes, data, limitations):
        if reference not in code:
            raise ValueError(f'Lesson {number}: visual source reference mismatch')
        result = dict(type=kind, title=title, caption=caption,
                      code_reference=reference, axes=axes, labels=[],
                      data=data, limitations=limitations)
        json.dumps(result, ensure_ascii=False, allow_nan=False)
        return result

    def bars(title, caption, reference, categories, series, unit, limitations):
        return visual('bars', title, caption, reference,
                      dict(x=unit, y='مورد مقایسه'),
                      dict(categories=categories, series=[dict(label=label, values=np.asarray(values, dtype=float).ravel().tolist()) for label, values in series]), limitations)

    def panel(label, values, rows=None, columns=None):
        a = np.asarray(values, dtype=float)
        return dict(label=label, values=a.tolist(),
                    rows=rows or [str(i) for i in range(a.shape[0])],
                    columns=columns or [str(i) for i in range(a.shape[1])])

    def matrix(title, caption, reference, panels, limitations, x='ستون', y='سطر'):
        return visual('matrix', title, caption, reference, dict(x=x, y=y), dict(panels=panels), limitations)

    if number == 3:
        return bars('احتمال خروجی شبکه XOR',
                    'هر ردیف یک ورودی x است. probability با برچسب y مقایسه می شود؛ آستانه تصمیم ۰٫۵ است. تغییر نرخ 0.2 یا تعداد گام ها در حلقه، وزن ها و سپس احتمال را تغییر می دهد.',
                    'probability = 1 / (1 + np.exp(-logits))',
                    [str(row.astype(int).tolist()) for row in n['x']],
                    [('probability', n['probability']), ('y', n['y'])], 'احتمال / برچسب صفر و یک',
                    'این چهار ورودی تمام جدول XOR هستند؛ نمودار شاهد تعمیم به داده تازه نیست.')
    if number == 4:
        return bars('خطا پیش و پس از به روزرسانی وزن',
                    'میله ها مقدار initial و loss(weight) پس از پایان حلقه را نشان می دهند. ضریب 0.05 اندازه گام را تعیین می کند؛ تغییر آن می تواند همگرایی را تغییر دهد.',
                    'weight -= 0.05 * gradient(weight)', ['initial', 'loss(weight)'],
                    [('MSE', [n['initial'], n['loss'](n['weight'])])], 'میانگین مربع خطا',
                    'فقط دو اندازه گیری واقعی نمایش داده شده اند، نه مسیر آموزش. خطای نهایی بسیار کوچک است و ممکن است میله آن دیده نشود.')
    if number == 6:
        return matrix('از تصویر تا پاسخ فیلتر',
                      'عدد هر خانه همان مقدار آرایه است. feature از ضرب patch در kernel و جمع نتیجه به دست می آید؛ تغییر علامت kernel جهت پاسخ لبه را عوض می کند.',
                      'feature[row, col] = np.sum(patch * kernel)',
                      [panel(k, n[k]) for k in ('image', 'kernel', 'feature', 'pooled')],
                      'فیلتر ثابت است و آموزشی انجام نشده؛ مقیاس رنگ هر ماتریس جداست. pooled پس از ReLU محاسبه شده است.')
    if number == 8:
        return bars('اندازه ضرایب با و بدون جریمه L2',
                    'طول میله نرم ضرایب غیرثابت weight[1:] است. مقدار strength در حل دستگاه شدت جریمه را تعیین می کند؛ عرض از مبدا جریمه نمی شود.',
                    'train.T @ train + strength * penalty', ['بدون جریمه', 'با جریمه'],
                    [('norm(weight[1:])', [np.linalg.norm(w[1:]) for w in n['weights']])], 'نرم اقلیدسی ضرایب',
                    'کوچک شدن ضرایب به تنهایی به معنای بهتر شدن خطای آزمون نیست؛ خطای شبکه تمیز را در خروجی کد مقایسه کنید.')
    if number == 10:
        return matrix('ماسک پیکسلی در برابر حقیقت مرجع',
                      'در mask خانه ۱ یعنی شدت از ۰٫۵ بیشتر بوده است؛ پیکسل تاریک داخل جسم حذف می شود. تغییر آستانه در خط زیر ماسک و IoU را عوض می کند. box در خروجی کد محدوده مستطیلی است، نه همین ماسک.',
                      'mask = image > 0.5', [panel(k, n[k]) for k in ('image', 'mask', 'truth')],
                      'این یک قانون دستی برای یک تصویر ساختگی است، نه مدل آموزش دیده. مقیاس رنگ هر ماتریس جداست.')
    if number == 13:
        return matrix('سهم هر توکن در توجه',
                      'هر ستون وزن یک کلید k است و مجموع ردیف weights برابر ۱ می شود. تغییر q یا k امتیازها را تغییر می دهد؛ context از weights @ v ساخته می شود.',
                      'scores = q @ k.T / np.sqrt(k.shape[1])',
                      [panel('weights', n['weights'], ['q[0]'], ['k[0]', 'k[1]', 'k[2]'])],
                      'این محاسبه آموزشی ندارد و توضیح علی یک مدل زبانی آموزش دیده نیست.', 'کلید', 'پرسش')
    if number == 20:
        return bars('فاصله پرسش تا نمونه های نماینده',
                    'هر میله مربع فاصله query تا یک prototype است. کلاس با فاصله کمتر انتخاب می شود؛ تغییر query در کد فاصله ها را عوض می کند.',
                    'distances = np.sum((prototypes - query) ** 2, axis=1)',
                    ['prototype[0]', 'prototype[1]'], [('distances', n['distances'])], 'مربع فاصله',
                    'فقط بخش few-shot نمایش داده شده است؛ ویژگی ها دستی هستند و این نمودار نمایش خروجی CLIP یا بخش zero-shot نیست.')
    if number == 21:
        return bars('دو نرخ برای دو گروه ساختگی',
                    'selection سهم پیش بینی مثبت در کل گروه و TPR سهم پیش بینی مثبت میان نمونه های واقعا مثبت است. تغییر pred شمارنده ها را تغییر می دهد؛ مخرج دو نرخ متفاوت است.',
                    'selection[group] = pred[mask].mean()', ['A', 'B'],
                    [('selection', [n['selection'][g] for g in ('A', 'B')]), ('TPR', [n['tpr'][g] for g in ('A', 'B')])], 'نرخ از صفر تا یک',
                    'هر گروه فقط چهار نمونه ساختگی دارد؛ این دو معیار به تنهایی منصفانه بودن یک مدل را تایید نمی کنند.')
    if number == 22:
        return visual('spectrum', 'طیف موج ساخته شده در کد',
                      'هر نقطه دامنه یک خانه FFT است؛ خط فقط خانه های مجاور را وصل می کند. عدد 440 در ساخت signal فرکانس موج و محل قله را تعیین می کند.',
                      'signal = np.sin(2 * np.pi * 440 * time)',
                      dict(x='فرکانس (Hz)', y='قدر مطلق FFT'),
                      dict(points=np.column_stack((n['frequencies'], n['spectrum'])).tolist()),
                      'دامنه FFT نرمال نشده است و به طول نمونه وابسته است؛ این تحلیل یک موج مصنوعی است، نه تبدیل گفتار به متن.')
    if number == 23:
        return matrix('خطای بازسازی وزن پس از int8',
                      'هر خانه restored - weights است، نه مقدار وزن. علامت نشان می دهد بازسازی بیشتر یا کمتر از مقدار اصلی شده است. scale اندازه گام گرد کردن را تعیین می کند.',
                      'restored = quantized.astype(np.float32) * scale',
                      [panel('restored - weights', n['restored'] - n['weights'])],
                      'این خطای وزن است، نه افت دقت یک مدل روی داده آزمون؛ ذخیره scale هم حافظه می خواهد.')
    if number == 25:
        return matrix('مقدار Q پس از آموزش',
                      'هر ردیف یک حالت و هر ستون یک عمل است. مقدار بزرگ تر همان عمل سیاست حریصانه را تعیین می کند. ضریب 0.9 در target ارزش پاداش آینده را تغییر می دهد.',
                      'target = reward if done else reward + 0.9 * forward(next_state)[2].max()',
                      [panel('Q(s, a)', [n['forward'](s)[2] for s in (0, 1)], ['state 0', 'state 1'], ['left', 'right'])],
                      'فقط دو حالت غیرپایانی نشان داده شده اند؛ حالت پایانی تصمیمی ندارد. این محیط کوچک یک عامل کامل DQN نیست.', 'عمل', 'حالت')
    return None


def _legacy_self_test():
    """Run with python python/lesson_visuals.py; no output files are modified."""
    import contextlib
    import io
    from pathlib import Path
    import runpy

    namespaces, visuals = {}, {}
    for path in sorted((Path(__file__).parent / 'lessons').glob('lesson_*.py')):
        number = int(path.stem[-2:])
        with contextlib.redirect_stdout(io.StringIO()):
            namespaces[number] = runpy.run_path(str(path))
        result = build_visual(number, namespaces[number], path.read_text())
        if result is None:
            continue
        visuals[number] = result
        assert result['code_reference'] in path.read_text()
        assert all(result[key] for key in ('title', 'caption', 'limitations'))
        json.dumps(result, allow_nan=False)
        if result['type'] == 'bars':
            assert all(len(s['values']) == len(result['data']['categories']) for s in result['data']['series'])
            assert all(v >= 0 for s in result['data']['series'] for v in s['values'])
        if result['type'] == 'matrix':
            for panel in result['data']['panels']:
                assert len(panel['values']) == len(panel['rows'])
                assert all(len(row) == len(panel['columns']) for row in panel['values'])
    assert set(visuals) == {3, 4, 6, 8, 10, 13, 20, 21, 22, 23, 25}
    def series(number, i=0):
        return np.asarray(visuals[number]['data']['series'][i]['values'])
    def matrix(number, i=0):
        return np.asarray(visuals[number]['data']['panels'][i]['values'])
    np.testing.assert_array_equal(series(3), namespaces[3]['probability'].ravel())
    np.testing.assert_array_equal(series(3, 1), namespaces[3]['y'].ravel())
    np.testing.assert_array_equal(series(4), [namespaces[4]['initial'], namespaces[4]['loss'](namespaces[4]['weight'])])
    for i, key in enumerate(('image', 'kernel', 'feature', 'pooled')):
        np.testing.assert_array_equal(matrix(6, i), namespaces[6][key])
    np.testing.assert_allclose(series(8), [np.linalg.norm(w[1:]) for w in namespaces[8]['weights']])
    for i, key in enumerate(('image', 'mask', 'truth')):
        np.testing.assert_array_equal(matrix(10, i), namespaces[10][key])
    np.testing.assert_array_equal(matrix(13), namespaces[13]['weights'])
    np.testing.assert_array_equal(series(20), namespaces[20]['distances'])
    for i, key in enumerate(('selection', 'tpr')):
        np.testing.assert_array_equal(series(21, i), [namespaces[21][key][g] for g in ('A', 'B')])
    np.testing.assert_array_equal(visuals[22]['data']['points'], np.column_stack((namespaces[22]['frequencies'], namespaces[22]['spectrum'])))
    np.testing.assert_array_equal(matrix(23), namespaces[23]['restored'] - namespaces[23]['weights'])
    np.testing.assert_array_equal(matrix(25), [namespaces[25]['forward'](s)[2] for s in (0, 1)])
    print('PASS: 25 lessons executed; 11 finite visuals with exact source references and verified data provenance.')





def build_spring_visual(number, namespace, code):
    """Spring 2026 lecture IDs. Never infer topic identity from old numbering."""
    mapping = {3: 3, 5: 6, 10: 10, 12: 13, 15: 20, 20: 23, 21: 21}
    if number in mapping:
        return build_visual(mapping[number], namespace, code)
    n = namespace
    x_label, y_label, series_label = 'مشتق خروجی نسبت به ورودی', 'نوع زنجیره', 'input gradient'
    if number == 7:
        title = 'گرادیان ورودی در انتهای زنجیره'
        caption = f'مقایسه دو مقدار واقعی sigmoid_grad و relu_grad در عمق {n["depth"]}. هر لایه وزن ۱ و بایاس صفر دارد. خط زیر مشتق ها را در هم ضرب می کند؛ تغییر depth یا ورودی chain نتیجه را تغییر می دهد.'
        reference = 'gradient *= value * (1 - value)'
        categories = ['sigmoid', 'positive-path ReLU']
        values = [n['sigmoid_grad'], n['relu_grad']]
        limits = 'مقیاس خطی است؛ گرادیان بسیار کوچک سیگموید در طول میله تقریبا دیده نمی شود ولی عدد آن نوشته شده است. مسیر مثبت ReLU تضمین پایداری برای وزن ها یا ورودی های دیگر نیست. این نمودار تاریخچه آموزش نیست.'
    elif number == 8:
        title = 'مسیر میان بر و اندازه گرادیان'
        caption = f'میله ها plain_gradient و residual_gradient را برای عمق {n["depth"]} و وزن {n["weight"]} نشان می دهند. افزودن ۱ در خط زیر مسیر همانی را وارد مشتق هر لایه می کند.'
        reference = 'factor = weight + (1 if residual else 0)'
        categories = ['plain_gradient', 'residual_gradient']
        values = [n['plain_gradient'], n['residual_gradient']]
        limits = 'این زنجیره خطی اسکالر است، نه یک ResNet آموزش دیده. میله بسیار کوچک به چشم نمی آید ولی مقدار عددی آن نمایش داده شده است. وزن منفی مناسب می تواند حتی مسیر همانی را خنثی کند.'
    elif number == 17:
        title = 'خطای آموزش با آداپتر کم رتبه'
        caption = 'میله ها initial و final را روی همان داده آموزشی نشان می دهند. base ثابت می ماند و فقط a و b به روز می شوند؛ نرخ 0.1 در خط زیر و خط بعدی اندازه گام آموزش آداپتر را تعیین می کند.'
        reference = 'a -= 0.1 * grad_a'
        categories = ['initial', 'final']
        values = [n['initial'], n['final']]
        x_label, y_label, series_label = 'میانگین مربع خطای آموزش', 'زمان اندازه گیری', 'training MSE'
        limits = 'فقط دو اندازه گیری واقعی داریم، نه منحنی آموزش. این رگرسیون خطی ساختگی با تغییر هدف رتبه یک است؛ نه تنظیم دقیق یک مدل زبانی و نه ارزیابی تعمیم. خطای نهایی کوچک ممکن است میله قابل دیدن نداشته باشد.'
    else:
        return None
    if reference not in code:
        raise ValueError(f'Spring lesson {number}: visual reference mismatch')
    result = dict(type='bars', title=title, caption=caption,
                  code_reference=reference, axes=dict(x=x_label, y=y_label), labels=[],
                  data=dict(categories=categories, series=[dict(label=series_label, values=[float(v) for v in values])]), limitations=limits)
    json.dumps(result, ensure_ascii=False, allow_nan=False)
    return result


def _self_test():
    """Execute the current Spring course and verify every exported numeric value."""
    import contextlib
    import io
    from pathlib import Path
    import runpy
    namespaces, visuals = {}, {}
    for path in sorted((Path(__file__).parent / 'spring2026').glob('lesson_*.py')):
        number = int(path.stem[-2:])
        with contextlib.redirect_stdout(io.StringIO()):
            namespaces[number] = runpy.run_path(str(path))
        result = build_spring_visual(number, namespaces[number], path.read_text())
        if result is None:
            continue
        visuals[number] = result
        assert result['code_reference'] in path.read_text()
        assert all(result[key] for key in ('title', 'caption', 'limitations'))
        json.dumps(result, allow_nan=False)
        if result['type'] == 'bars':
            assert all(len(s['values']) == len(result['data']['categories']) for s in result['data']['series'])
            assert all(v >= 0 for s in result['data']['series'] for v in s['values'])
        if result['type'] == 'matrix':
            for panel in result['data']['panels']:
                assert len(panel['values']) == len(panel['rows'])
                assert all(len(row) == len(panel['columns']) for row in panel['values'])
    expected = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21, 23, 28}
    assert set(namespaces) == expected, f'Missing or unexpected lectures: {set(namespaces) ^ expected}'
    assert set(visuals) == {3, 5, 7, 8, 10, 12, 15, 17, 20, 21}
    def series(number, i=0):
        return np.asarray(visuals[number]['data']['series'][i]['values'])
    def matrix(number, i=0):
        return np.asarray(visuals[number]['data']['panels'][i]['values'])
    np.testing.assert_array_equal(series(3), namespaces[3]['probability'].ravel())
    np.testing.assert_array_equal(series(3, 1), namespaces[3]['y'].ravel())
    for i, key in enumerate(('image', 'kernel', 'feature', 'pooled')):
        np.testing.assert_array_equal(matrix(5, i), namespaces[5][key])
    np.testing.assert_array_equal(series(7), [namespaces[7]['sigmoid_grad'], namespaces[7]['relu_grad']])
    np.testing.assert_array_equal(series(8), [namespaces[8]['plain_gradient'], namespaces[8]['residual_gradient']])
    for i, key in enumerate(('image', 'mask', 'truth')):
        np.testing.assert_array_equal(matrix(10, i), namespaces[10][key])
    np.testing.assert_array_equal(matrix(12), namespaces[12]['weights'])
    np.testing.assert_array_equal(series(15), namespaces[15]['distances'])
    for i, key in enumerate(('selection', 'tpr')):
        np.testing.assert_array_equal(series(21, i), [namespaces[21][key][g] for g in ('A', 'B')])
    np.testing.assert_array_equal(series(17), [namespaces[17]['initial'], namespaces[17]['final']])
    np.testing.assert_array_equal(matrix(20), namespaces[20]['restored'] - namespaces[20]['weights'])
    print('PASS: 21 Spring 2026 lessons executed; 10 finite visuals with exact source references and verified data provenance.')


if __name__ == '__main__':
    _self_test()
