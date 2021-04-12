let luoIkkuna = (title, offsetX, offsetY, onClose) => {
    let container = document.createElement("div");
    document.body.appendChild(container);

    if (offsetX) {
        container.style.left = (offsetX + 400 > window.innerWidth ? offsetX - 405 : offsetX + 10) + 'px';
        container.style.top  = (offsetY + 10) + 'px';
    }

    let elemHeader = document.createElement("div");
    elemHeader.setAttribute("class", "header");
    container.appendChild(elemHeader);

    let elemTitle = document.createElement("div");
    elemTitle.setAttribute("class", "title");
    elemTitle.innerText = title || '';
    elemHeader.appendChild(elemTitle);

    let close = document.createElement("div");
    close.setAttribute("class", "close");
    close.innerText = "x";
    close.addEventListener('mousedown', () => {
        container.parentElement.removeChild(container);
        container.remove();
        if (onClose) {
            onClose();
        }
    });
    elemHeader.appendChild(close);

    return [container, elemHeader];
};

let avaaInfo = (tunniste, offsetX, offsetY, time) => {
    let url = onkoInfra(tunniste) || onkoTREX(tunniste) ? luoInfraAPIUrl(tunniste, time) :
              onkoJeti(tunniste)                        ? luoEtj2APIUrl(tunniste, time) :
              onkoJuna(tunniste)                        ? luoAikatauluUrl(tunniste) :
              onkoRuma(tunniste)                        ? luoRumaUrl(tunniste) :
              undefined;
              //TODO aikataulut jotenkin
    if (url) {
        let [container, elemHeader] = luoIkkuna(tunniste, offsetX, offsetY);
        container.setAttribute("class", "popupContainer infoPopup");

        let open = document.createElement("div");
        open.setAttribute("class", "open");

        open.innerHTML = luoLinkit('info', tunniste, tunniste);
        elemHeader.appendChild(open);
    
        let content = document.createElement("div");
        content.setAttribute("class", "info");
        container.appendChild(content);
    
        dragElement(container);

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

let kurkistaInfo = (elem, tunniste, offsetX, offsetY, time) => {
    let container = avaaInfo(tunniste, offsetX, offsetY, time);
    let f = () => {
        if (container.parentElement) {
            container.parentElement.removeChild(container);
            container.remove();
        }
    };
    elem.addEventListener("mouseout", f, { once: true });
    elem.addEventListener("click", f, { once: true });
};