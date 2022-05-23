{-# LANGUAGE OverloadedStrings, ScopedTypeVariables, TypeApplications #-}
{-# OPTIONS_GHC -Wno-unused-imports #-}

module Main where

import Universum
import FFI ( registerGlobalFunction1, registerGlobalFunction, registerGlobalFunctionPure1, registerGlobalFunction2, function1, procedure1, registerGlobalFunction3, registerGlobalFunctionPure, registerGlobalFunctionPure2 )
import Tooltips ( initTooltips )
import Shpadoinkle ( JSM )
import Shpadoinkle.Backend.Snabbdom (runSnabbdom, stage)
import Shpadoinkle.Html ( addMeta, addScriptSrc, addStyle, setTitle )
import Shpadoinkle.Run              (runJSorWarp, simple, liveWithStaticAndIndex)
import qualified Data.ByteString.Lazy as B
import Language.Javascript.JSaddle.Run (enableLogging)
import Data.Maybe (fromJust)
import Data.Time.Clock (secondsToNominalDiffTime)
import Browser (setTimeout, getElementById, withDebug, isSeed)
import Frontpage (view)
import Shpadoinkle.Console (debug, warn, info)
import Yleiset (laajennaAikavali_, DataType (Infra, Other), errorHandler)
import StateAccessor (getStates, getState, getMainState, setState, setMainState, removeSubState)
import State (defaultState, TimeSetting)
import Fetch (getJson, headJson)
import JSDOM.Types (Callback(Callback), JSVal, Function, FromJSVal (fromJSVal))
import Text.URI (URI)
import Data.Aeson
import Language.Javascript.JSaddle ((#), call, global, ToJSVal (toJSVal), jsg, liftJSM, (!), (<#))
import Amcharts.DataSource (monitor)
import URI (infraAPIUrl, etj2APIUrl, aikatauluAPIUrl, graphQLUrl, mqttPort, mqttHost, mqttTopic, infraAPIrevisionsUrl, etj2APIrevisionsUrl, withTime, baseInfraAPIUrl, baseEtj2APIUrl, ratanumeroUrl, ratanumerotUrl, ratakmSijaintiUrl, pmSijaintiUrl, ratakmValiUrl, liikennepaikkavalitUrl, reittiUrl, reittihakuUrl, vaihdeTyypitUrl, opastinTyypitUrl, ratapihapalveluTyypitUrl, rautatieliikennepaikatUrl, liikennepaikanOsatUrl, raideosuudetUrl, laituritUrl, elementitUrl, lorajatUrl, raiteenKorkeudetUrl, eiUrlRatanumero, esUrlRatanumero, vsUrlRatanumero, loUrlRatanumero, eiUrlAikataulupaikka, esUrlAikataulupaikka, vsUrlAikataulupaikka, loUrlAikataulupaikka, kunnossapitoalueetMetaUrl, liikenteenohjausalueetMetaUrl, kayttokeskuksetMetaUrl, liikennesuunnittelualueetMetaUrl, ratapihapalvelutUrlTilasto, toimialueetUrlTilasto, tilirataosatUrlTilasto, liikennesuunnittelualueetUrlTilasto, paikantamismerkitUrlTilasto, kilometrimerkitUrlTilasto, radatUrlTilasto, liikennepaikanOsatUrlTilasto, rautatieliikennepaikatUrlTilasto, liikennepaikkavalitUrlTilasto, raideosuudetUrlTilasto, elementitUrlTilasto, raiteensulutUrlTilasto, raiteetUrlTilasto, liikenteenohjauksenrajatUrlTilasto, tunnelitUrlTilasto, sillatUrlTilasto, laituritUrlTilasto, tasoristeyksetUrlTilasto, kayttokeskuksetUrlTilasto, kytkentaryhmatUrlTilasto, asiatUrl, esTyypitUrl, loUrlTilasto, eiUrlTilasto, esUrlTilasto, vsUrlTilasto, muutoksetInfra, muutoksetEtj2)
import JSDOM (currentWindow)
import Types
import Time (startOfTime, endOfTime, roundToPreviousDay, roundToPreviousMonth, intervalsIntersect, limitInterval, toISOStringNoMillis)
import URISerialization (fromURIFragment)

main :: IO ()
main = do
  putTextLn "\nRafiikka"
  putTextLn "http://localhost:8080\n"
  runJSorWarp 8080 app

dev :: IO ()
dev = do
  bs <- B.readFile "./index-debug.html"
  liveWithStaticAndIndex bs 8080 app "./"

getJson_ :: URI -> JSVal -> Maybe JSVal -> JSM ()
getJson_ uri fa signal = withDebug "getJson_" $ do
  let cb :: Value -> JSM ()
      cb aa = void $ call fa global aa
  getJson Other uri signal (debug @Show) cb

headJson_ :: URI -> JSVal -> Maybe JSVal -> JSM ()
headJson_ uri fa signal = do
  let cb :: Value -> JSM ()
      cb aa = void $ call fa global aa
  headJson Other uri signal (debug @Show) cb

app :: JSM ()
app = do
  enableLogging True

  --registerGlobalFunction "onkoSeed" isSeed

  registerGlobalFunctionPure1 "parseInterval" (fromURIFragment @TimeSetting)
  registerGlobalFunctionPure1 "startOfDayUTC" roundToPreviousDay
  registerGlobalFunctionPure1 "startOfMonthUTC" roundToPreviousMonth
  registerGlobalFunctionPure1 "laajennaAikavali" laajennaAikavali_
  registerGlobalFunctionPure "ikuisuusAlku" startOfTime
  registerGlobalFunctionPure "ikuisuusLoppu" endOfTime
  registerGlobalFunctionPure2 "intervalsIntersect" intervalsIntersect
  registerGlobalFunctionPure1 "limitInterval" limitInterval
  --registerGlobalFunctionPure1 "toISOStringNoMillis" toISOStringNoMillis

  registerGlobalFunction "getStates" getStates
  registerGlobalFunction "defaultState" defaultState
  registerGlobalFunction1 "initTooltips" initTooltips
  registerGlobalFunction1 "getState" getState
  registerGlobalFunction2 "setState" setState
  registerGlobalFunction "getMainState" getMainState
  registerGlobalFunction1 "setMainState" setMainState
  registerGlobalFunction1 "removeSubState" removeSubState
  registerGlobalFunction2 "monitor" monitor
  registerGlobalFunction3 "getJson" getJson_
  registerGlobalFunction3 "headJson" headJson_
  registerGlobalFunction1 "errorHandler" errorHandler

  registerGlobalFunction1 "baseInfraAPIUrl" baseInfraAPIUrl
  registerGlobalFunction1 "baseEtj2APIUrl" baseEtj2APIUrl
  registerGlobalFunction "infraAPIUrl" infraAPIUrl
  registerGlobalFunction "etj2APIUrl" etj2APIUrl
  registerGlobalFunctionPure2 "withTime" withTime
  registerGlobalFunctionPure "aikatauluAPIUrl" aikatauluAPIUrl
  registerGlobalFunctionPure "graphQLUrl" graphQLUrl
  registerGlobalFunctionPure "mqttHost" mqttHost
  registerGlobalFunctionPure "mqttPort" mqttPort
  --registerGlobalFunctionPure1 "mqttTopic" mqttTopic

  registerGlobalFunction1 "ratanumeroUrl" ratanumeroUrl
  registerGlobalFunction "ratanumerotUrl" ratanumerotUrl
  registerGlobalFunction1 "ratakmSijaintiUrl" ratakmSijaintiUrl
  registerGlobalFunction1 "pmSijaintiUrl" pmSijaintiUrl
  registerGlobalFunction1 "ratakmValiUrl" ratakmValiUrl
  registerGlobalFunction "liikennepaikkavalitUrl" liikennepaikkavalitUrl
  registerGlobalFunction3 "reittiUrl" reittiUrl
  registerGlobalFunction3 "reittihakuUrl" reittihakuUrl
  registerGlobalFunction "ratapihapalveluTyypitUrl" ratapihapalveluTyypitUrl
  registerGlobalFunction "opastinTyypitUrl" opastinTyypitUrl
  registerGlobalFunction "vaihdeTyypitUrl" vaihdeTyypitUrl
  registerGlobalFunction "rautatieliikennepaikatUrl" rautatieliikennepaikatUrl
  registerGlobalFunction "liikennepaikanOsatUrl" liikennepaikanOsatUrl
  registerGlobalFunction "raideosuudetUrl" raideosuudetUrl
  registerGlobalFunction "laituritUrl" laituritUrl
  registerGlobalFunction "elementitUrl" elementitUrl
  registerGlobalFunction "lorajatUrl" lorajatUrl
  registerGlobalFunction1 "raiteenKorkeudetUrl" raiteenKorkeudetUrl
  registerGlobalFunction1 "eiUrlRatanumero" eiUrlRatanumero
  registerGlobalFunction1 "esUrlRatanumero" esUrlRatanumero
  registerGlobalFunction1 "vsUrlRatanumero" vsUrlRatanumero
  registerGlobalFunction1 "loUrlRatanumero" loUrlRatanumero
  registerGlobalFunction1 "eiUrlAikataulupaikka" eiUrlAikataulupaikka
  registerGlobalFunction1 "esUrlAikataulupaikka" esUrlAikataulupaikka
  registerGlobalFunction1 "vsUrlAikataulupaikka" vsUrlAikataulupaikka
  registerGlobalFunction1 "loUrlAikataulupaikka" loUrlAikataulupaikka
  registerGlobalFunction "kunnossapitoalueetMetaUrl" kunnossapitoalueetMetaUrl
  registerGlobalFunction "liikenteenohjausalueetMetaUrl" liikenteenohjausalueetMetaUrl
  registerGlobalFunction "kayttokeskuksetMetaUrl" kayttokeskuksetMetaUrl
  registerGlobalFunction "liikennesuunnittelualueetMetaUrl" liikennesuunnittelualueetMetaUrl
  registerGlobalFunction "ratapihapalvelutUrlTilasto" ratapihapalvelutUrlTilasto
  registerGlobalFunction "toimialueetUrlTilasto" toimialueetUrlTilasto
  registerGlobalFunction "tilirataosatUrlTilasto" tilirataosatUrlTilasto
  registerGlobalFunction "liikennesuunnittelualueetUrlTilasto" liikennesuunnittelualueetUrlTilasto
  registerGlobalFunction "paikantamismerkitUrlTilasto" paikantamismerkitUrlTilasto
  registerGlobalFunction "kilometrimerkitUrlTilasto" kilometrimerkitUrlTilasto
  registerGlobalFunction "radatUrlTilasto" radatUrlTilasto
  registerGlobalFunction "liikennepaikanOsatUrlTilasto" liikennepaikanOsatUrlTilasto
  registerGlobalFunction "rautatieliikennepaikatUrlTilasto" rautatieliikennepaikatUrlTilasto
  registerGlobalFunction "liikennepaikkavalitUrlTilasto" liikennepaikkavalitUrlTilasto
  registerGlobalFunction "raideosuudetUrlTilasto" raideosuudetUrlTilasto
  registerGlobalFunction1 "elementitUrlTilasto" elementitUrlTilasto
  registerGlobalFunction "raiteensulutUrlTilasto" raiteensulutUrlTilasto
  registerGlobalFunction "raiteetUrlTilasto" raiteetUrlTilasto
  registerGlobalFunction "liikenteenohjauksenrajatUrlTilasto" liikenteenohjauksenrajatUrlTilasto
  registerGlobalFunction "tunnelitUrlTilasto" tunnelitUrlTilasto
  registerGlobalFunction "sillatUrlTilasto" sillatUrlTilasto
  registerGlobalFunction "laituritUrlTilasto" laituritUrlTilasto
  registerGlobalFunction "tasoristeyksetUrlTilasto" tasoristeyksetUrlTilasto
  registerGlobalFunction "kayttokeskuksetUrlTilasto" kayttokeskuksetUrlTilasto
  registerGlobalFunction "kytkentaryhmatUrlTilasto" kytkentaryhmatUrlTilasto
  registerGlobalFunction "asiatUrl" asiatUrl
  registerGlobalFunction "esTyypitUrl" esTyypitUrl
  registerGlobalFunction "loUrlTilasto" loUrlTilasto
  registerGlobalFunction "eiUrlTilasto" eiUrlTilasto
  registerGlobalFunction "esUrlTilasto" esUrlTilasto
  registerGlobalFunction "vsUrlTilasto" vsUrlTilasto
  registerGlobalFunction1 "muutoksetInfra" muutoksetInfra
  registerGlobalFunction1 "muutoksetEtj2" muutoksetEtj2
   

  addMeta [("charset", "UTF-8")]
  setTitle "Rafiikka"
  addStyle "https://cdn.jsdelivr.net/gh/openlayers/openlayers.github.io@master/en/v6.3.1/css/ol.css"
  addStyle "https://unpkg.com/ol-layerswitcher@3.5.0/src/ol-layerswitcher.css"
  addStyle "https://cdnjs.cloudflare.com/ajax/libs/selectize.js/0.12.6/css/selectize.default.min.css"
  addStyle "style.css"

  addScriptSrc "DragDropTouch.js"
  addScriptSrc "datefns.js"
  addScriptSrc "drag.js"

  simple runSnabbdom () Frontpage.view stage

  infraAPIrevisionsUrl >>= getRevision "infra"
  etj2APIrevisionsUrl >>= getRevision "etj2"

  setTimeout (secondsToNominalDiffTime 2) $ (do debug @Show ("cb!" :: [Char]); getElementById "palkki") >>= \x -> do
    debug @Show ("acting!" :: [Char]);
    initTooltips $ fromJust x

getRevision :: Text -> URI -> JSM ()
getRevision api url = getJson Other url Nothing (debug @Show) $ \x -> do
  case fromJSON x of
    Success [Revision rev] -> do
      Just win <- currentWindow
      revs <- win ! ("revisions" :: Text)
      revs <# api $ rev
      info @Show $ "Got " <> api <> " revision " <> show rev
    Success _ -> warn @Show ("whoops!" :: Text)
    Error msg -> warn @Show msg

{- TODO
  - grafiikan tasojen järjestys (piirto-z-index) jotenkin valittavaksi
  - columneille vastaava 2-portainen aktiivisuus kuin junille
  - urliin myös tasot
  - junanumero labeliksi viivan myötäisesti
  - aikataulupaikat epätasaisille väleille (esim linnuntiesijainnin mukaan)
  - dateaxis custom formaatit
  - dateaxis päivälabel erikseen tuntitickien alle
  - lataus scrollatessa, eli kun scrollataan reunaan tai hypätään tyhjälle, niin siirretään xAxis min/max keskikohta vanhaan reunaan. Ja trigataan load ennakkotietodatalle
  - aikataulupiste (erityisesti vaakasuora viiva) kertomaan "raide" eli siis kapasiteetinhallintayksikkö
  - ratanumero-akseli nyt olettaa ratakm=1000m. Miten korjata?
  - kielivalinta fi/en
  - ajat näyttämään suomen aikaa selaimen localesta riippumatta?
  - riippuvuudet odottelemaan alkulatauksia
  - Jätä aktiiviset ennakkotiedot näkyviin vaikka sarja piilossa.
  - toteumille connect = false ja autoGapCount=999999999999 ?
  - koita toteumille/aikatauluille Heat-korostusta
  - junan sijainti korostumaan aikataulunäkymässä
-}
