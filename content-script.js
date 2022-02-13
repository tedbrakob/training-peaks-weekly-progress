if(document.readyState !== 'complete') {
    window.addEventListener('load',afterWindowLoaded);
} else {
    afterWindowLoaded();
}

function afterWindowLoaded(){
    var s = document.createElement('script');
    s.src = chrome.runtime.getURL('weekly-progress.js');
    (document.head || document.documentElement).appendChild(s);
}