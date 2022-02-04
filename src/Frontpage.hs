{-# LANGUAGE OverloadedStrings, ScopedTypeVariables #-}

module Frontpage where

import Universum
import Shpadoinkle
import Shpadoinkle.Html as H

scripts :: [Html m a]
scripts =
  [
    script' [("src", "yleiset.js")]
  , script' [("src", "spatial.js")]
  , script' [("src", "popup.js")]
  , script' [("src", "haku.js")]
  , script' [("src", "infra.js")]
  , script' [("src", "infraData.js")]
  , script' [("src", "ennakkotiedot.js")]
  , script' [("src", "ratatyot.js")]
  , script' [("src", "junat.js")]
  , script' [("src", "aikataulut.js")]
  , script' [("src", "raide.js")]
  , script' [("src", "chart.js")]
  , script' [("src", "karttaStyles.js")]
  , script' [("src", "karttaLayers.js")]
  , script' [("src", "lista.js")]
  , script' [("src", "KarttaControlRotateLeft.js")]
  , script' [("src", "KarttaControlRotateRight.js")]
  , script' [("src", "kartta.js")]
  , script' [("src", "tilastot.js")]
  , script' [("src", "muutokset.js")]
  ]

styl :: Text -> (Text, Prop m a)
styl = textProperty "style"

jetiAPIIcon :: (Semigroup a, IsString a) => a -> a
jetiAPIIcon name = "https://rata.digitraffic.fi/jeti-api/latest/icons/" <> name <>  ".svg"

jsLink_ :: Text -> [Html m a] -> Html m a
jsLink_ f = a [ href "", textProperty "onclick" (f <> "; return false;") ]

jsLink :: Text -> [(Text, Prop m a)] -> [Html m a] -> Html m a
jsLink f props = a ([ href "", textProperty "onclick" (f <> "; return false;") ] <> props)

jetiTilastot :: [Html m a]
jetiTilastot =
  [
    jsLink "luoTilastoPopupEI()" [ styl ("background-image: url('" <> jetiAPIIcon "ennakkoilmoitus" <> "')") ]
      ["Ennakkoilmoitukset"]
  , jsLink "luoTilastoPopupES()" [ styl ("background-image: url('" <> jetiAPIIcon "ennakkosuunnitelma" <> "')") ]
      ["Ennakkosuunnitelmat"]
  , jsLink "luoTilastoPopupVS()" [ styl ("background-image: url('" <> jetiAPIIcon "vuosisuunnitelma" <> "')") ]
      ["Vuosisuunnitelmat"]
  , jsLink "luoTilastoPopupLO()" [ styl ("background-image: url('" <> jetiAPIIcon "loilmoitus" <> "')") ]
      ["LO-ilmoitukset"]
  ]

data RowType = Plain | Regular

regular :: Text -> Html m a -> Html m a
regular f txt = jsLink (f <> "()") [className "regular"] [txt]

tilastoRowLisu :: RowType -> Text -> Html m a -> Html m a
tilastoRowLisu rowType f txt =
  H.div "row"
  [
    case rowType of
      Plain   -> txt
      Regular -> regular f txt
  , jsLink_ (f <> "(false)")
      ["lisualueittain"]
  ]

tilastoRowKake :: RowType -> Text -> Html m a -> Html m a
tilastoRowKake rowType f txt =
  H.div "row"
  [
    case rowType of
      Plain   -> txt
      Regular -> regular f txt
  , jsLink_ (f <> "(true)")
      ["käyttökeskuksittain"]
  ]

tilastoRowBoth :: RowType -> Text -> Html m a -> Html m a
tilastoRowBoth rowType f txt =
  H.div "row"
  [
    case rowType of
      Plain   -> txt
      Regular -> regular f txt
  , jsLink_ (f <> "(false)")
      ["lisualueittain"]
  , jsLink_ (f <> "(true)")
      ["käyttökeskuksittain"]
  ]

infraTilastot :: [Html m a]
infraTilastot =
  [
    jsLink_ "luoTilastoPopupRatapihapalvelut()"
      ["Ratapihapalvelut"]
  , jsLink_ "luoTilastoPopupToimialueet()"
      ["Toimialueet"]
  , jsLink_ "luoTilastoPopupTilirataosat()"
      ["Tilirataosat"]
  , jsLink_ "luoTilastoPopupLiikennesuunnittelualueet()"
      ["Liikennesuunnittelualueet"]
  , jsLink_ "luoTilastoPopupPaikantamismerkit()"
      ["Paikantamismerkit"]
  , jsLink_ "luoTilastoPopupKilometrimerkit()"
      ["Kilometrimerkit"]
  , jsLink_ "luoTilastoPopupRadat()"
      ["Radat"]
  , jsLink_ "luoTilastoPopupLiikennepaikanOsat()"
      ["Liikennepaikan osat"]
  , tilastoRowLisu Plain "luoTilastoPopupRautatieliikennepaikat" "Rautatieliikennepaikat"
  , jsLink_ "luoTilastoPopupLiikennepaikkavalit()"
      ["Liikennepaikkavälit"]
  , jsLink_ "luoTilastoPopupRaideosuudet()"
      ["Raideosuudet"]

  , tilastoRowBoth Plain "luoTilastoPopupAkselinlaskija" "Akselinlaskijat"
  , tilastoRowBoth Regular "luoTilastoPopupBaliisi" "Baliisit"
  , tilastoRowBoth Plain "luoTilastoPopupKuumakayntiilmaisin" "Kuumakäynti-ilmaisimet"
  , tilastoRowBoth Plain "luoTilastoPopupLiikennepaikanraja" "Liikennepaikan rajat"
  , tilastoRowBoth Regular "luoTilastoPopupOpastin" "Opastimet"
  , tilastoRowBoth Plain "luoTilastoPopupPuskin" "Puskimet"
  , tilastoRowBoth Plain "luoTilastoPopupPyoravoimailmaisin" "Pyörävoimailmaisimet"
  , tilastoRowBoth Plain "luoTilastoPopupRaideeristys" "Raide-eristykset"
  , tilastoRowBoth Plain "luoTilastoPopupPysaytyslaite" "Pysäytyslaitteet"
  , tilastoRowBoth Plain "luoTilastoPopupRfidlukija" "RFID-lukijat"
  , tilastoRowBoth Plain "luoTilastoPopupRyhmityseristin" "Ryhmityseristimet"
  , tilastoRowBoth Plain "luoTilastoPopupSahkoistyspaattyy" "Sähköistys päättyy"
  , tilastoRowBoth Plain "luoTilastoPopupSeislevy" "Seislevyt"
  , tilastoRowBoth Regular "luoTilastoPopupVaihde" "Vaihteet"
  , tilastoRowBoth Plain "luoTilastoPopupVirroitinvalvontakamera" "Virroitinvalvontakamerat"
  , tilastoRowBoth Plain "luoTilastoPopupErotusjakso" "Erotusjaksot"
  , tilastoRowBoth Plain "luoTilastoPopupErotuskentta" "Erotuskentät"
  , tilastoRowBoth Plain "luoTilastoPopupMaadoitin" "Maadoittimet"
  , tilastoRowBoth Plain "luoTilastoPopupTyonaikaineneristin" "Työnaikaiset eristimet"
  , tilastoRowBoth Plain "luoTilastoPopupKaantopoyta" "Kääntöpöydät"
  , tilastoRowBoth Plain "luoTilastoPopupPyoraprofiilimittalaite" "Pyöräprofiilin mittalaitteet"
  , tilastoRowBoth Plain "luoTilastoPopupTelivalvonta" "Telivalvonnat"
  , tilastoRowBoth Plain "luoTilastoPopupErotin" "Erottimet"
  , tilastoRowBoth Plain "luoTilastoPopupTasoristeysvalojenpyoratunnistin" "Tasoristeysvalojen pyörätunnistin"

  , jsLink_ "luoTilastoPopupRaiteensulut"
      ["Raiteensulut"]
  , jsLink_ "luoTilastoPopupRaiteet"
      ["Raiteet"]
  , jsLink_ "luoTilastoPopupLiikenteenohjauksenrajat"
      ["Liikenteenohjauksen rajat"]
  , jsLink_ "luoTilastoPopupTunnelit"
      ["Tunnelit"]
  , jsLink_ "luoTilastoPopupSillat"
      ["Sillat"]
  , jsLink_ "luoTilastoPopupLaiturit"
      ["Laiturit"]
  , tilastoRowKake Regular "luoTilastoPopupTasoristeykset" "Tasoristeykset"
  , jsLink_ "luoTilastoPopupKayttokeskukset"
      ["Käyttökeskukset"]
  , tilastoRowKake Regular "luoTilastoPopupKytkentaryhmat" "Kytkentäryhmät"
  ]

view :: () -> Html m ()
view _ =
  div_ $
  [
    a [ href "https://github.com/jyrimatti/rafiikka/" ]
    [
      img' [ styl "position: absolute; top: 0; right: 0; border: 0;"
           , src "https://camo.githubusercontent.com/365986a132ccd6a44c23a9169022c0b5c890c387/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f7265645f6161303030302e706e67"
           , alt "Fork me on GitHub"
           , ("data-canonical-src","https://s3.amazonaws.com/github/ribbons/forkme_right_red_aa0000.png")
           ]
    ]
  , progress' [ id' "progress", H.max "1" ]
  , h1_
    [
      a [ href "" ]
        ["Rafiikka"]
    , " - Rataverkon reaaliaikagrafiikka, työrakografiikka, karttakäyttöliittymä ja tilastopalvelu"
    ]
  , H.div [ className "palkki", id' "palkki" ]
    [
      nav "menu"
      [
        jsLink "kartta(getMainState('sijainti'), undefined, undefined, true, '4em', '8em', '4em', '4em')" [ styl "font-size: 2em", title "Avaa kartta" ]
          ["🗺"]
      , jsLink "luoJunaPopup()" [ styl "font-size: 1.8em", title "Avaa aikataulu" ]
          ["📅"]
      , span "statistics"
        [
          span [ className "trigger", title "Tilastoja" ]
            ["📊"]
        , span "content" $
          jetiTilastot <> [ span "infra" infraTilastot ]
        ]
      , span "changes"
        [
          span [className "trigger", title "Muutoksia"]
            ["±"]
        , span "content"
          [
            select [id' "delta1"]
            [
              option [value "-"]
                ["Edellisen"]
            , option [value "", selected True]
                ["Seuraavan"]
            ]
          , select [id' "delta2"] $
            option [value "1", selected True]
              ["1"]
            : fmap ((\x -> option [value x] [text x]) . show) [2..20 :: Int]
          , select [id' "delta3"]
            [
              option [value "D"]
                ["päivän"]
            , option [value "W", selected True]
                ["viikon"]
            , option [value "M"]
                ["kuukauden"]
            ]
          , "aikana"
          , select [id' "delta4"]
            [
              option [value "true", selected True]
                ["ilmaantuvia"]
            , option [value "false"]
                ["poistuvia"]
            ]
          , div_
            [
              jsLink_ "luoMuutoksetPopup(document.getElementById('delta4').value === 'true', document.getElementById('delta1').value + 'P' + document.getElementById('delta2').value + document.getElementById('delta3').value, muutoksetInfra)"
                ["ratainfra"]
            , jsLink_ "luoMuutoksetPopup(document.getElementById('delta4').value === 'true', document.getElementById('delta1').value + 'P' + document.getElementById('delta2').value + document.getElementById('delta3').value, muutoksetEtj2)"
                ["ennakkotiedot"]
            ]
          ]
        ]
      ]
    , H.div "hakuohje"
      [
        span "trigger"
          ["?"]
      , span "content"
        [
          h5_
            ["Hakulaatikon ymmärtämä syntaksi ja esimerkkejä:"]
        , dl_ $
            concatMap (\(aa,bbs) -> dt_ [text (aa <> ":")] : ((\bb -> dd_ [text bb]) <$> bbs)) searchExamples
        ]
      ]
    , input' [styl "display:none", id' "search", placeholder "hae..."]
    ]
  , div' [id' "chartdiv"]
  , h2_
      ["Ominaisuuksia:"]
  , ul_
    [
      li_ ["Y-akseliksi voi valita ratanumeron tai aikataulupaikkavälin, joko tasovalikon valintalaatikoista tai hakulaatikon kautta."]
    , li_ ["Objekteja (Ennakkotiedot, ratatyöt, junat, aikataulut, toteumat) voi valita aktiiviseksi klikkaamalla objektia työrakografiikalla."]
    , li_ ["Objekteja voi avata kartalle tuplaklikkaamalla niitä."]
    , li_ ["Kartalla olevia objekteja voi korostaa ja avata lisätietoja klikkaamalla."]
    , li_
      [
        "Klikkaamalla ikonia ℹ️, "
      , img' [className "infoikoni", src "https://rata.digitraffic.fi/infra-api/r/favicon.ico"]
      , img' [className "infoikoni", src "https://rata.digitraffic.fi/jeti-api/r/favicon.ico"]
      , ", 🗺, 📅 tai 📈 voi avata kyseisen objektin lisätietoikkunan, Infra-API-sivun, Jeti-API-sivun, kartan, aikataulu-käyrän tai kohdistaa siihen työrakografiikan, mikäli operaatio on järkevä kyseiselle objetille. Ikoneita näkyy esimerkiksi hakutuloksissa, popup-ikkunoiden yläpalkissa sekä työrakografiikan tasovalikon valituissa objekteissa."
      ]
    , li_ ["Kartalle voi hakea ratainfraa, ennakkotietoja (Jeti), ratatöitä (Ruma), junia sekä WKT-geometrioita."]
    , li_ ["Kartta tukee myös skemaattista kaavioesitystapaa."]
    , li_ ["Kartan aikakontekstiksi voi valita ajanhetken tai aikavälin. Aikavälin ollessa valittu ladataan ratainfra/ennakkotiedot kyseisellä välillä, ja slideria klikkaamalla vaihdettua näkymää lennossa esittämään eri ajanhetkiä."]
    , li_ ["Valitsemalla työrakografiikalta Junat-tason näkyviin, alkavat junien sijainnit päivittyä myös kartalla."]
    , li_ ["Voit hakea karttaikkunaan lisää sisältöä sen omalla hakulaatikolla."]
    , li_ ["Työrakogafiikkaa voi siirrellä ja zoomailla palkeilla ja painonapeilla. Valintatyökalulla voi piirtää työrakovalintoja."]
    , li_ ["Objekteja voi siirtää ikkunasta toiseen raahaamalla haun laatikoita tai otsikkotekstiä."]
    , li_ ["Hakulaatikolla voi tehdä myös muunnoksia koordinaattien, ratakilometrisijaintien ja paikantamismerkkisijaintien välillä."]
    , li_ ["Hakulaatikossa voi avata korostetun tuloksen kartalle oikealle-nuolella, ja sulkea kartan vasemmalle-nuolella."]
    , li_ ["Klikkaamalla yläpalkin 📊 saat auki tilastotietoja ennakkotiedoista ja ratainfrasta."]
    , li_ ["Klikkaamalla yläpalkin ± saat auki tietoa tulevista ja poistuvista ennakkotiedoista ja ratainfra objekteista."]
    , li_
      [
        "Objekteja voi avata suoraan kartalle laittamalle ne osoitteeseen pilkuilla erotettuina:"
      , a [href "https://rafiikka.lahteenmaki.net#ES94113,1.2.246.586.1.24.135846"]
          ["https://rafiikka.lahteenmaki.net#ES94113,1.2.246.586.1.24.135846"]
      ]
    ]
  , h2_
    ["Työkalu on vielä kehityksessä. Muutamia huomioita:"]
  , ul_
    [
      li_
      [
        "Kuulisin mielelläni bugeista, puutteista ja kehitysehdotuksista. Kerro esimerkiksi "
      , a [href "https://github.com/jyrimatti/rafiikka/"]
        ["Githubissa"]
      , " tai "
      , a [href "https://twitter.com/jyrimatti/"]
        ["Twitterissä"]
      , "tai miten haluat."
      ]
    , li_ ["Käytän kehityksessä Chromea, joten muilla selaimilla voi tapahtua outouksia."]
    , li_ ["Aikataulujen ja toteumien piirtäminen on hidasta kun niitä on paljon (lue: pääkaupunkiseutu)."]
    , li_ ["Aikataulupaikkavälin hakeminen on hidasta, koska käyttää raskasta reittihakua. Tähän tulossa myöhemmin nopeutusta."]
    , li_ ["Y-akselin ollessa ratanumero, tehdään junasijainneille jatkuvasti gps->ratakm-muunnosta, mikä aiheuttaa paljon requesteja. Tämä korjaantuu kun digitraffic tarjoaa junille ratakmsijainnit suoraan."]
    , li_ ["Kaavioesitystapaa ei ole junille, joiden sijaintitietona on toistaiseksi vain GPS."]
    , li_ ["Aikataulutietojen ja Rumatietojen lisätieto-popup näyttää toistaiseksi raaka-json-dataa, sillä kyseiset rajapinnat eivät tarjoa muuta valmiina."]
    ]
  ] <> scripts

searchExamples :: [(Text, [Text])]
searchExamples =
  [
    ("OID"                      ,["1.2.246.586.1.39.81466"])
  , ("Lyhyt nimi"               ,["EI123"])
  , ("Koordinaatti"             ,["701829,6954463", "30.940161,62.66599"])
  , ("Ratanumero"               ,["003"])
  , ("Ratakilometrisijainti"    ,["(003) 1+0345"])
  , ("Ratakilometriväli"        ,["(003) 1+0345-2+0012"])
  , ("Paikantamismerkkisijainti",["3+120","3-120"])
  , ("Juna"                     ,["2020-10-31 148"])
  , ("Lähtöpäivän aikataulut"   ,["2020-10-31"])
  , ("Tämän päivän juna"        ,["148"])
  , ("Reitti"                   ,["Tpe => Ov => Jy", "1.2.246.586.1.39.119282 => 1.2.246.586.1.39.82187 => 1.2.246.586.1.39.81523"])
  , ("WKT-geometria"            ,["POINT(701829 6954463)"])
  , ("Vapaasanahaku"            ,["Kangasala"])
  ]