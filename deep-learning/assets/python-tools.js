export function pythonTools(options) {
  let worker, loading, sequence = 0;
  const pending = new Map();
  function call(type, value) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); if(type!=='complete')stop();reject(Error(type==='run'?'اجرا پس از پنج ثانیه متوقف شد؛ حلقه یا اندازهٔ محاسبه را بررسی کن.':'پایتون پاسخ نداد؛ دوباره امتحان کن.')); }, type === 'complete' ? 15000 : type === 'run' ? 5000 : 120000);
      pending.set(id, {resolve,reject,timer}); worker.postMessage({id,type,value});
    });
  }
  async function start() {
    if (!loading) loading = (async () => {
      worker = new Worker(new URL('./python-tools-worker.mjs', import.meta.url), {type:'module'});
      worker.onmessage = ({data}) => {
        const request = pending.get(data.id); if (!request) return;
        clearTimeout(request.timer); pending.delete(data.id);
        data.error ? request.reject(Error(data.error)) : request.resolve(data.value);
      };
      worker.onerror = () => stop();
      // Source files let static analysis follow this notebook's real imports.
      const files = await options.getFiles?.() || {};
      await new Promise((resolve,reject) => {
        const id=++sequence, timer=setTimeout(()=>{pending.delete(id);reject(Error('آماده‌سازی ابزار پایتون طول کشید.'));},65000);
        pending.set(id,{resolve,reject,timer});worker.postMessage({id,type:'load',files});
      });
      if (options.packages?.length) await call('install', options.packages);
    })().catch(error => { stop(); throw error; });
    return loading;
  }
  function stop() {
    worker?.terminate();worker=null;loading=null;
    for (const item of pending.values()) { clearTimeout(item.timer);item.reject(Error('اجرا متوقف شد.')); }
    pending.clear();
  }
  window.addEventListener('pagehide', stop);
  return {
    async complete(value) { await start(); return call('complete',value); },
    async install(packages) { await start(); const result=await call('install',packages);options.packages=result;return result; },
    async execute(value) { await start(); return call('run',value); },
    setPackages(value) { options.packages = [...value]; },
    stop,
  };
}
