let luoIkkuna = (title, offsetX1, offsetY1, offsetX2, offsetY2, onClose) => {
    let container = document.createElement("div");
    document.body.appendChild(container);

    if (offsetX1) {
        container.style.left = offsetX1;
    }
    if (offsetY1) {
        container.style.top = offsetY1;
    }
    if (offsetX2) {
        container.style.right = offsetX2;
        container.style.width = 'auto';
    }
    if (offsetY2) {
        container.style.bottom = offsetY2;
        container.style.height = 'auto';
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
        if (onClose) {
            onClose();
        }
        container.parentElement.removeChild(container);
        container.remove();
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

let kurkista = (elem, creator) => {
    setTimeout(() => {
        let container = creator();
        let f = () => {
            if (container.parentElement) {
                container.parentElement.removeChild(container);
                container.remove();
            }
        };
        var siirryttySisaan = false;
        container.addEventListener("mouseover", () => {
            siirryttySisaan = true;
            container.addEventListener("mouseout", f, { once: true });
        }, { once: true });
        elem.addEventListener("mouseout", () => setTimeout( () => siirryttySisaan ? '' : f(), 100), { once: true });
        elem.addEventListener("click", f, { once: true });
    }, 500);
};

let kurkistaInfo = (elem, tunniste, offsetX, offsetY, time) => {
    kurkista(elem, () => avaaInfo(tunniste, offsetX, offsetY, time));
};
