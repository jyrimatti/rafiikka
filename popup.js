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
    elemHeader.setAttribute("class", "header draghandle");
    container.appendChild(elemHeader);

    let elemTitle = document.createElement("div");
    elemTitle.setAttribute("class", "title");
    elemTitle.innerText = title || '';
    elemHeader.appendChild(elemTitle);

    let close = document.createElement("div");
    close.setAttribute("class", "close");
    close.setAttribute("title", "Sulje ikkuna");
    close.innerText = "x";
    close.addEventListener('click', () => {
        if (onClose) {
            onClose();
        }
        container.parentElement.removeChild(container);
        container.remove();
    });
    elemHeader.appendChild(close);

    //container.addEventListener('dragstart', () => moveToBottom(container));
    container.addEventListener('dragend', () => moveToTop(container));

    return [container, elemHeader];
};

let moveToBottom = container => {
    if (container.parentNode) {
        let popups = container.parentNode.childNodes;
        popups[0].before(container);
    }
}
let moveToTop = container => {
    if (container.parentNode) {
        let popups = container.parentNode.childNodes;
        popups[popups.length-1].after(container);
    }
}

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
