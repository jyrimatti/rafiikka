let luoMuutoksetPopup = (luotuja, duration, muutokset, title) => {
    try {
        return luoMuutoksetPopup_(luotuja, duration, muutokset, title);
    } catch (e) {
        log(e);
        return e;
    }
};
let luoMuutoksetPopup_ = (luotuja, duration, muutokset, title) => {
    let [container, elemHeader] = luoIkkuna(title || (luotuja ? 'Ilmaantuvat: ' : 'Poistuvat: ') + prettyPrint(duration));
    container.setAttribute("class", "popupContainer muutoksetContainer");

    let content = document.createElement("div");
    
    let id = generateId();
    content.setAttribute("id", id);
    content.setAttribute("class", "muutoksetPopup");
    container.appendChild(content);

    container.hiddenState = {_default: false};

    dragElement(container);

    muutokset.forEach(x => getJson(luotuja ? x.luotuja : x.poistuneita, luoRyhma(container, luotuja, x.nimi)));
};

let luoRyhma = (container, luotuja, title) => {
    let ul = luoCollapsoitavaLista(container, title, container.hiddenState);
    ul.innerHTML = 'ladataan...';

    return data => {
        let d = Object.values(data).flat();

        if (d.length == 0) {
            ul.innerHTML = '<li>-</li>';
        } else {
            ul.innerHTML = '';
        }

        d.forEach(x => {
            let voimassa = (x.objektinVoimassaoloaika || x.voimassa).split('/');

            let li = document.createElement("li");
            ul.appendChild(li);
            
            let links = document.createElement("ul");
            li.appendChild(links);
            links.innerHTML = luoLinkit('muutokset', x.tunniste, x.tunniste, [new Date(voimassa[0]), new Date(voimassa[0])]);
            
            li.appendChild(document.createTextNode(x.tunniste));
            let i = document.createElement('i');
            li.appendChild(i);
            i.innerText = dateFns.dateFns.format(dateFns.dateFnsTz.utcToZonedTime(voimassa[luotuja ? 0 : 1], 'Europe/Helsinki'), "dd.MM.yyyy HH:mm");
        });
    }
};