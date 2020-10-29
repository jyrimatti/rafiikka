let luoIkkuna = title => {
    let container = document.createElement("div");
    document.body.appendChild(container);

    let elemPopup = document.createElement("div");
    elemPopup.setAttribute("class", "popup");
    container.appendChild(elemPopup);

    let elemHeader = document.createElement("div");
    elemHeader.setAttribute("class", "header");
    container.appendChild(elemHeader);

    let elemTitle = document.createElement("div");
    elemTitle.setAttribute("class", "title");
    elemTitle.innerText = title;
    elemHeader.appendChild(elemTitle);

    let close = document.createElement("div");
    close.setAttribute("class", "close");
    close.innerText = "x";
    close.onclick = () => {
        container.parentElement.removeChild(container);
        container.remove();
    };
    elemHeader.appendChild(close);

    return [container, elemHeader];
};

let avaaInfo = tunniste => {
    let url = onkoInfra(tunniste) || onkoTREX(tunniste) ? luoInfraAPIUrl(tunniste) :
              onkoJeti(tunniste)                        ? luoEtj2APIUrl(tunniste) :
              undefined;
              //TODO ruma ja aikataulut jotenkin
    if (url) {
        let container = luoIkkuna(tunniste)[0];
        container.setAttribute("class", "popupContainer infoPopup");
    
        let content = document.createElement("div");
        content.setAttribute("class", "info");
        container.appendChild(content);
    
        dragElement(container);

        content.innerHTML = '<iframe src="' + (url.indexOf('.json') > -1 ? url.replace('.json', '.html')
                                                                         : url + '.html') + '"></iframe>';
    }
}