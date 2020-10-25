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
    let onkoRatakm = onkoRatakmSijainti(tunniste);
    let root = onkoInfra(tunniste) || onkoTREX(tunniste) || onkoRatakm ? infraAPIUrl :
               onkoJeti(tunniste)                                      ? etj2APIUrl  : undefined;
               //TODO ruma ja aikataulut jotenkin
    if (root) {
        let container = luoIkkuna(tunniste)[0];
        container.setAttribute("class", "popupContainer infoPopup");
    
        let content = document.createElement("div");
        content.setAttribute("class", "info");
        container.appendChild(content);
    
        dragElement(container);

        content.innerHTML = '<iframe src="' + root + (onkoRatakm ? 'radat/' + onkoRatakm[1] + '/' + onkoRatakm[2] + '+' + onkoRatakm[3] : tunniste) + '.html"></iframe>';
    }
}