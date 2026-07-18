// C-take's resizing iframe method //
document.addEventListener("DOMContentLoaded",function(){
    const main = document.querySelector("main.container");
    let oldHeight = 0;

    createResizeIframe();

    function createResizeIframe(){
        const contentHeight = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.offsetHeight
        );

        if(contentHeight != oldHeight){
            oldHeight = contentHeight;
        }
        window.parent.postMessage({
            fileOrigin: 'createResizeIframe.js',
            height: oldHeight
        }, '*');
        setTimeout(createResizeIframe,50);
   }
});