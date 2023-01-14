let avaaInfo = (tunniste, offsetX, offsetY, time) => {
    let url = onkoInfra(tunniste) || onkoTREX(tunniste) ? luoInfraAPIUrl(tunniste, time) :
              onkoJeti(tunniste)                        ? luoEtj2APIUrl(tunniste, time) :
              onkoJuna(tunniste)                        ? luoAikatauluUrl(tunniste) :
              onkoRuma(tunniste)                        ? luoRumaUrl(tunniste) :
              undefined;
              //TODO aikataulut jotenkin
    if (url) {
        let [container, elemHeader] = luoIkkuna(tunniste, {left: offsetX, top: offsetY, right: undefined, bottom: undefined}, undefined);
        container.setAttribute("class", "popupContainer infoPopup");

        let open = document.createElement("div");
        open.setAttribute("class", "open");

        open.innerHTML = luoLinkit('info', tunniste, tunniste);
        elemHeader.appendChild(open);
    
        let content = document.createElement("div");
        content.setAttribute("class", "info");
        container.appendChild(content);
    
        dragElement(container, tunniste);
        moveElement(container, () => tunniste);

        if (onkoJuna(tunniste) || onkoRuma(tunniste)) {
            getJson(url, data => {
                content.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            });
        } else {
            content.innerHTML = '<iframe src="' + (url.indexOf('.json') > -1 ? url.replace('.json', '.html')
                                                                             : url) + '"></iframe>';
        }
        return container;
    }
};

let kurkista = (elem, creator) => {
    let container = creator();
    let f = () => {
        if (container.parentElement) {
            container.parentElement.removeChild(container);
            container.remove();
        }
    };
    var siirryttySisaan = false;
    container.addEventListener("mouseenter", () => {
        siirryttySisaan = true;
        container.addEventListener("mouseleave", f, { once: true });
    }, { once: true });
    elem.addEventListener("mouseleave", () => setTimeout( () => siirryttySisaan ? '' : f(), 100), { once: true });
    elem.addEventListener("click", f, { once: true });
};

let kurkistaInfo = (elem, tunniste, offsetX, offsetY, time) => {
    kurkista(elem, () => avaaInfo(tunniste, offsetX, offsetY, time));
};
