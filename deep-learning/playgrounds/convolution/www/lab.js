(() => {
  'use strict';
  function setup(){
    if(!window.Shiny){setTimeout(setup,50);return;}
    window.Shiny.addCustomMessageHandler('danna_convolution',state=>{
      if(state)window.dannaConvolution=state;else delete window.dannaConvolution;
    });
    window.Shiny.initializedPromise.then(()=>window.Shiny.setInputValue('plot_ready',Date.now(),{priority:'event'}));
    document.addEventListener('click',event=>{
      const cell=event.target.closest('button[data-output-row]');
      if(cell)window.Shiny.setInputValue('selected_cell',[Number(cell.dataset.outputRow),Number(cell.dataset.outputColumn)],{priority:'event'});
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
