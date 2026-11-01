(() => {
    let state = null;
    function draw() {
        document.querySelectorAll('canvas[data-series-index]').forEach(canvas => {
            const series = state?.series?.[Number(canvas.dataset.seriesIndex)];
            const points = series?.points || series?.x?.map((x, i) => ({ x, y: series.y[i] })) || [];
            const c = canvas.getContext('2d');
            c.clearRect(0, 0, canvas.width, canvas.height);
            if (!points.length) return;
            const W = canvas.width, H = canvas.height, left = 78, right = W - 30, top = 20, bottom = H - 58;
            let xmin = Math.min(...points.map(p => p.x)), xmax = Math.max(...points.map(p => p.x));
            let ymin = Math.min(...points.map(p => p.y)), ymax = Math.max(...points.map(p => p.y));
            if (xmin === xmax) { xmin -= .5; xmax += .5; }
            if (ymin === ymax) { ymin -= .5; ymax += .5; }
            const x = v => left + (v - xmin) / (xmax - xmin) * (right - left);
            const y = v => bottom - (v - ymin) / (ymax - ymin) * (bottom - top);
            c.font = '12px system-ui'; c.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const v = ymin + (ymax - ymin) * i / 4;
                c.strokeStyle = '#dce2eb'; c.beginPath(); c.moveTo(left, y(v)); c.lineTo(right, y(v)); c.stroke();
                c.fillStyle = '#566174'; c.textAlign = 'right'; c.fillText(v.toPrecision(3), left - 8, y(v) + 4);
            }
            c.strokeStyle = '#2563eb'; c.lineWidth = 2; c.beginPath();
            points.forEach((p, i) => i ? c.lineTo(x(p.x), y(p.y)) : c.moveTo(x(p.x), y(p.y))); c.stroke();
            if (points.length < 40) points.forEach(p => { c.beginPath(); c.arc(x(p.x), y(p.y), 2.5, 0, Math.PI * 2); c.fillStyle = '#2563eb'; c.fill(); });
            c.fillStyle = '#566174'; c.textAlign = 'left'; c.fillText(xmin.toPrecision(3), left, bottom + 20);
            c.textAlign = 'right'; c.fillText(xmax.toPrecision(3), right, bottom + 20);
            c.textAlign = 'center'; c.fillText(series.x_label_fa || 'شاخص گام', (left + right) / 2, H - 12);
            c.save(); c.translate(15, (top + bottom) / 2); c.rotate(-Math.PI / 2); c.fillText(series.y_label_fa || 'مقدار', 0, 0); c.restore();
        });
    }
    function setup() {
        if (!window.Shiny) { setTimeout(setup, 50); return; }
        window.Shiny.addCustomMessageHandler('danna_operations', data => {
            state = data;
            if (data) window.dannaOperations = data;
            else delete window.dannaOperations;
            requestAnimationFrame(draw);
        });
        window.Shiny.initializedPromise.then(() => window.Shiny.setInputValue('operations_ready', Date.now(), { priority: 'event' }));
        new MutationObserver(() => requestAnimationFrame(draw)).observe(document.querySelector('main'), { childList: true, subtree: true });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
    else setup();
})();
