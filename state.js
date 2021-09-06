let parseInterval = str => {
    let instant = dateFns.dateFns.parse(str, "yyyy-MM-dd'T'HH:mm:ssX", new Date(0));
    if (!isNaN(instant.getTime())) {
        return [instant, instant, undefined, undefined];
    }
    let parts = str.split('/');
    if (parts.length == 1) {
        let instant = dateFns.dateFns.parse(parts[0], "yyyy-MM-dd'T'HH:mm:ssX", new Date(0));
        if (!isNaN(instant.getTime())) {
            return [instant, instant, undefined, undefined];
        }
    } else if (parts.length == 2) {
        let beginInstant  = dateFns.dateFns.parse(parts[0], "yyyy-MM-dd'T'HH:mm:ssX", new Date(0));
        let endInstant    = dateFns.dateFns.parse(parts[1], "yyyy-MM-dd'T'HH:mm:ssX", new Date(0));
        let beginDuration;
        try {
            beginDuration = dateFns.durationFns.parse(parts[0]);
        } catch (_) {}
        let endDuration;
        try {
            endDuration = dateFns.durationFns.parse(parts[1]);
        } catch (_) {}
        if (!isNaN(beginInstant.getTime()) && !isNaN(endInstant.getTime())) {
            return [beginInstant, endInstant, undefined, undefined];
        } else if (!isNaN(beginInstant.getTime()) && endDuration) {
            let k = dateFns.durationFns.normalize({milliseconds: Math.floor(dateFns.durationFns.toMilliseconds(endDuration))});
            return [beginInstant, dateFns.dateFns.add(beginInstant, endDuration), undefined, endDuration];
        } else if (!isNaN(endInstant.getTime()) && beginDuration) {
            let k = dateFns.durationFns.normalize({milliseconds: Math.floor(dateFns.durationFns.toMilliseconds(beginDuration))});
            return [dateFns.dateFns.sub(endInstant, beginDuration), endInstant, beginDuration, undefined];
        }
    }
    return undefined;
}

let parseStatePart = str => {
    if (str == hashPlaceholder.substring(1)) {
        return {};
    } else if (str == 'kartta' || str == 'map') {
        return {moodi: 'kartta'};
    } else if (str == 'kaavio' || str == 'diagram') {
        return {moodi: 'kaavio'};
    } else {
        let interval = parseInterval(str);
        if (interval) {
            return {aika: interval};
        } else {
            return {sijainti: str};
        }
    }
};

let pyoristaAjanhetki = x => {
    let y = new Date(x.getTime());
    y.setMinutes(0);
    y.setSeconds(0);
    y.setMilliseconds(0);
    return y;
};

let startOfDayUTC = x => {
    let y = new Date(x.getTime());
    y.setUTCHours(0);
    y.setUTCMinutes(0);
    y.setUTCSeconds(0);
    y.setUTCMilliseconds(0);
    return y;
};

let startOfMonthUTC = x => {
    let y = new Date(x.getTime());
    y.setUTCDate(1);
    y.setUTCHours(0);
    y.setUTCMinutes(0);
    y.setUTCSeconds(0);
    y.setUTCMilliseconds(0);
    return y;
};

let defaultAika = () => {
    let now = pyoristaAjanhetki(dateFns.dateFns.sub(new Date(), {hours: 1}));
    return [now, dateFns.dateFns.add(now, {hours: 4}), undefined, {hours: 4}];
};

let defaultState = () => ({moodi:'kartta', aika: defaultAika(), sijainti: '(009)'});

let parseState = state => {
    let st = {};
    state.forEach((_,key) => Object.entries(parseStatePart(key)).forEach(kv => st[kv[0]] = kv[1]));
    return st;
}

let getStates = () => window.location.hash.substring(1).split('#').map(x => new URLSearchParams('?' + x)).map(parseState);

let getState = index => key => {
    let state = getStates()[index];
    if (!state) {
        return undefined;
    }
    return state[key];
};

let printDuration = dur => {
    let rounded = {minutes: Math.floor(dateFns.durationFns.toMinutes(dur))};
    return dur === undefined ? undefined : dateFns.durationFns.toString(dateFns.durationFns.normalize(rounded));
};

let printState = state => ((state.moodi ? '&' + state.moodi : '') +
                           (state.aika ? '&' + (state.aika[0].getTime() == state.aika[1].getTime() ? toISOStringNoMillis(state.aika[0]) : (printDuration(state.aika[2]) || toISOStringNoMillis(state.aika[0])) + '/' + (printDuration(state.aika[3]) || toISOStringNoMillis(state.aika[1]))) : '') +
                           (state.sijainti ? '&' + (state.sijainti instanceof Array ? state.sijainti.join("-") : state.sijainti) : '')
                          ).substring(1);

let hashPlaceholder = '&loading...';

let setState = index => (key, val) => {
    log('Setting state', key, 'for', index, 'to', val);
    let states = getStates();
    if (!key) {
        states.splice(index, 1);
    } else {
        if (states.length <= index) {
            states.push({});
        }
        if (key == 'aika') {
            if (states[index][key] && states[index][key][2]) {
                val[2] = dateFns.durationFns.between(val[0], val[1]);
            }
            if (states[index][key] && states[index][key][3]) {
                val[3] = dateFns.durationFns.between(val[0], val[1]);
            }
        }
        states[index][key] = val;
    }
    window.location.hash = '#' + states.map(s => printState(s)).join('#') + hashPlaceholder;
};

window.addEventListener('hashchange', e => {
    if (e.newURL.indexOf(hashPlaceholder) > -1 || e.oldURL === e.newURL + hashPlaceholder) {
        window.location.hash = window.location.hash.replace(hashPlaceholder, '');
        e.stopImmediatePropagation();
    }
  }, false);


let getMainState = key => getState(0)(key) || defaultState()[key];
let setMainState = setState(0);

let getSubState = index => {
    let state = getState(index);
    if (state) {
        return key => state(key) || (key == 'aika' ? getMainState(key).map((x,i) => i <= 1 ? startOfDayUTC(x) : x) : getMainState(key));
    }
    return undefined;
};
let setSubState = index => (key, val) => {
    if (val instanceof Array && getMainState(key).every( (x,i) => x === val[i] ) ||
       !(val instanceof Array) && getMainState(key) === val) {
        setState(index)(key, undefined);
    } else {
        setState(index)(key, val);
    }
};
let clearSubState = index => setState(index)(undefined, undefined);