{-# LANGUAGE OverloadedStrings, ScopedTypeVariables, TypeApplications #-}
{-# LANGUAGE DataKinds #-}
{-# LANGUAGE FlexibleContexts #-}
{-# LANGUAGE KindSignatures #-}
{-# OPTIONS_GHC -Wno-unused-imports #-}
{-# LANGUAGE RankNTypes #-}

module Main where

import Universum
import FFI ( registerGlobalFunction1, registerGlobalFunction, registerGlobalFunctionPure1, registerGlobalFunction2, function1, procedure1, registerGlobalFunction3, registerGlobalFunctionPure, registerGlobalFunctionPure2 )
import Browser.Tooltips ( initTooltips )
import Shpadoinkle ( JSM )
import Shpadoinkle.Backend.Snabbdom (runSnabbdom, stage)
import Shpadoinkle.Html ( addMeta, addScriptSrc, addStyle, setTitle )
import Shpadoinkle.Run              (runJSorWarp, simple, liveWithStaticAndIndex)
import qualified Data.ByteString.Lazy as B
import Language.Javascript.JSaddle.Run (enableLogging)
import Data.Maybe (fromJust)
import Data.Time.Clock (secondsToNominalDiffTime)
import Browser.Browser (setTimeout, getElementById, withDebug, isSeed, Location(..), setLocationHash)
import Frontpage (view)
import Shpadoinkle.Console (debug, warn, info)
import StateAccessor (getStates, getState, getMainState, setState, setMainState, removeSubState)
import State (defaultState, TimeSetting, AppState (location))
import Browser.Fetch (getJson, headJson)
import JSDOM.Types (Callback(Callback), JSVal, Function, FromJSVal (fromJSVal), Window, HTMLElement)
import Text.URI (URI, render)
import Data.Aeson ( Value, Result(Error, Success), fromJSON )
import Language.Javascript.JSaddle ((#), call, global, ToJSVal (toJSVal), jsg, liftJSM, (!), (<#), JSString, MakeArgs)
import Amcharts.DataSource (monitor, DataType (Other, Revisions), initDS, luoDatasource, DataSource, load)
import URI (infraAPIUrl, etj2APIUrl, aikatauluAPIUrl, graphQLUrl, mqttPort, mqttHost, mqttTopic, infraAPIrevisionsUrl, etj2APIrevisionsUrl, withTime, baseInfraAPIUrl, baseEtj2APIUrl, ratanumeroUrl, ratanumerotUrl, ratakmSijaintiUrl, pmSijaintiUrl, ratakmValiUrl, liikennepaikkavalitUrl, reittiUrl, reittihakuUrl, vaihdeTyypitUrl, opastinTyypitUrl, ratapihapalveluTyypitUrl, rautatieliikennepaikatUrl, liikennepaikanOsatUrl, raideosuudetUrl, laituritUrl, elementitUrl, lorajatUrl, raiteenKorkeudetUrl, eiUrlRatanumero, esUrlRatanumero, vsUrlRatanumero, loUrlRatanumero, eiUrlAikataulupaikka, esUrlAikataulupaikka, vsUrlAikataulupaikka, loUrlAikataulupaikka, kunnossapitoalueetMetaUrl, liikenteenohjausalueetMetaUrl, kayttokeskuksetMetaUrl, liikennesuunnittelualueetMetaUrl, ratapihapalvelutUrlTilasto, toimialueetUrlTilasto, tilirataosatUrlTilasto, liikennesuunnittelualueetUrlTilasto, paikantamismerkitUrlTilasto, kilometrimerkitUrlTilasto, radatUrlTilasto, liikennepaikanOsatUrlTilasto, rautatieliikennepaikatUrlTilasto, liikennepaikkavalitUrlTilasto, raideosuudetUrlTilasto, elementitUrlTilasto, raiteensulutUrlTilasto, raiteetUrlTilasto, liikenteenohjauksenrajatUrlTilasto, tunnelitUrlTilasto, sillatUrlTilasto, laituritUrlTilasto, tasoristeyksetUrlTilasto, kayttokeskuksetUrlTilasto, kytkentaryhmatUrlTilasto, asiatUrl, esTyypitUrl, loUrlTilasto, eiUrlTilasto, esUrlTilasto, vsUrlTilasto, muutoksetInfra, muutoksetEtj2, koordinaattiUrl, ratakmMuunnosUrl, koordinaattiMuunnosUrl, rtUrl, rtSingleUrl, rtGeojsonUrl, lrUrl, lrSingleUrl, lrGeojsonUrl, infraObjektityypitUrl, hakuUrlitInfra, hakuUrlitEtj2, hakuUrlitRuma, luoInfraAPIUrl, luoEtj2APIUrl, luoRumaUrl, luoAikatauluUrl, junasijainnitGeojsonUrl, junasijainnitUrl, APIResponse (APIResponse))
import JSDOM (currentWindow, currentDocument)
import Jeti.Types ( eiTilat, esTilat, vsTilat, loiTilat )
import Time (startOfTime, endOfTime, roundToPreviousDay, roundToPreviousMonth, intervalsIntersect, limitInterval, toISOStringNoMillis)
import URISerialization (fromURIFragment, ToURIFragment (toURIFragment))
import Match (onkoOID, subsystemId, onkoInfraOID, onkoTREXOID, onkoJetiOID, onkoRumaOID, onkoKoordinaatti, onkoRatakmSijainti, onkoPmSijainti, onkoRatakmVali, onkoRatanumero, onkoReitti, onkoInfra, onkoJeti, onkoRuma, onkoJuna, onkoLOI, onkoEI, onkoES, onkoVS, onkoRT, onkoLR, onkoWKT)
import Types (Revision(Revision))
import Yleiset (laajennaAikavali_, errorHandler)
import Control.Lens.Action ( (^!), act )
import GetSet
import Control.Lens.Action.Type (IndexPreservingAction)
import GHC.Records (getField)
import Infra.DataSource (ratanumerotDS, liikennepaikkavalitDS, liikennepaikanOsatDS, raideosuudetDS, laituritDS, elementitDS, lorajatDS, aikataulupaikatDS, rautatieliikennepaikatDS, ratatyoElementitDS, ratapihapalveluTyypitDS, opastintyypitDS, vaihdetyypitDS, kpalueetDS, ohjausalueetDS, kayttokeskuksetDS, lisualueetDS, objektityypitDS)
import Jeti.DataSource
import Browser.Popup (createPopup, Offset)
import JSDOM.Generated.Element (setAttribute)
import System.Time.Extra (sleep)
import Search (searchInfraDS, searchJetiDS, searchRumaDS)
import Browser.MutationObserver (onStyleChange)

main :: IO ()
main = do
  putTextLn "\nRafiikka"
  putTextLn "http://localhost:8080\n"
  runJSorWarp 8080 app

dev :: IO ()
dev = do
  bs <- B.readFile "./index-dev.html"
  liveWithStaticAndIndex bs 8080 app "./"

devDebug :: IO ()
devDebug = do
  bs <- B.readFile "./index-debug.html"
  liveWithStaticAndIndex bs 8080 app "./"

getJson_ :: URI -> JSVal -> Maybe JSVal -> JSM ()
getJson_ uri fa signal = withDebug "getJson_" $ do
  let cb :: Value -> JSM ()
      cb aa = void $ call fa global aa
  getJson (Other $ render uri) uri signal (debug @Show) cb

headJson_ :: URI -> JSVal -> Maybe JSVal -> JSM ()
headJson_ uri fa signal = do
  let cb :: Value -> JSM ()
      cb aa = void $ call fa global aa
  headJson (Other $ render uri) uri signal (debug @Show) cb

createPopup_ :: Maybe Text -> Offset -> Maybe JSVal -> JSM (HTMLElement,HTMLElement)
createPopup_ titleText offset onClose = do
  cb <- case onClose of
          Nothing -> pure Nothing
          Just c -> pure $ Just $ do
            _ <- call c global ()
            pure ()
  createPopup titleText offset cb

app :: JSM ()
app = do
  enableLogging False

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
  registerGlobalFunction3 "luoIkkuna" createPopup_

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
  registerGlobalFunction1 "reittiUrl" reittiUrl
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
  registerGlobalFunctionPure "junasijainnitGeojsonUrl" junasijainnitGeojsonUrl
  registerGlobalFunctionPure "junasijainnitUrl" junasijainnitUrl
  registerGlobalFunction2 "koordinaattiUrl" koordinaattiUrl
  registerGlobalFunction1 "ratakmMuunnosUrl" ratakmMuunnosUrl
  registerGlobalFunction1 "koordinaattiMuunnosUrl" koordinaattiMuunnosUrl
  registerGlobalFunction1 "rtUrl" rtUrl
  registerGlobalFunction1 "rtSingleUrl" rtSingleUrl
  registerGlobalFunction1 "rtGeojsonUrl" rtGeojsonUrl
  registerGlobalFunction1 "lrUrl" lrUrl
  registerGlobalFunction1 "lrSingleUrl" lrSingleUrl
  registerGlobalFunction1 "lrGeojsonUrl" lrGeojsonUrl
  registerGlobalFunction "infraObjektityypitUrl" infraObjektityypitUrl
  registerGlobalFunction "hakuUrlitInfra" hakuUrlitInfra
  registerGlobalFunction "hakuUrlitEtj2" hakuUrlitEtj2
  registerGlobalFunctionPure "hakuUrlitRuma" hakuUrlitRuma
  registerGlobalFunctionPure1 "luoInfraAPIUrl" luoInfraAPIUrl
  registerGlobalFunctionPure1 "luoEtj2APIUrl" luoEtj2APIUrl
  registerGlobalFunctionPure1 "luoRumaUrl" luoRumaUrl
  registerGlobalFunctionPure1 "luoAikatauluUrl" luoAikatauluUrl

  registerGlobalFunctionPure "eiTilat" (toURIFragment <$> eiTilat)
  registerGlobalFunctionPure "esTilat" (toURIFragment <$> esTilat)
  registerGlobalFunctionPure "vsTilat" (toURIFragment <$> vsTilat)
  registerGlobalFunctionPure "loiTilat" (toURIFragment <$> loiTilat)

  registerGlobalFunctionPure1 "subsystemId" subsystemId
  registerGlobalFunctionPure1 "onkoOID" onkoOID
  registerGlobalFunctionPure1 "onkoInfraOID" onkoInfraOID
  registerGlobalFunctionPure1 "onkoJetiOID" onkoJetiOID
  registerGlobalFunctionPure1 "onkoRumaOID" onkoRumaOID
  registerGlobalFunctionPure1 "onkoTREXOID" onkoTREXOID
  registerGlobalFunctionPure1 "onkoKoordinaatti" onkoKoordinaatti
  registerGlobalFunctionPure1 "onkoRatakmSijainti" onkoRatakmSijainti
  registerGlobalFunctionPure1 "onkoPmSijainti" onkoPmSijainti
  registerGlobalFunctionPure1 "onkoRatakmVali" onkoRatakmVali
  registerGlobalFunctionPure1 "onkoRatanumero" onkoRatanumero
  registerGlobalFunctionPure1 "onkoReitti" onkoReitti
  registerGlobalFunctionPure1 "onkoInfra" onkoInfra
  registerGlobalFunctionPure1 "onkoJeti" onkoJeti
  registerGlobalFunctionPure1 "onkoRuma" onkoRuma
  registerGlobalFunctionPure1 "onkoJuna" onkoJuna
  registerGlobalFunctionPure1 "onkoLOI" onkoLOI
  registerGlobalFunctionPure1 "onkoEI" onkoEI
  registerGlobalFunctionPure1 "onkoES" onkoES
  registerGlobalFunctionPure1 "onkoVS" onkoVS
  registerGlobalFunctionPure1 "onkoRT" onkoRT
  registerGlobalFunctionPure1 "onkoLR" onkoLR
  registerGlobalFunctionPure1 "onkoWKT" onkoWKT
  registerGlobalFunction1 "initDS" initDS

  registerGlobalFunctionPure "ratanumerotDS" ratanumerotDS
  registerGlobalFunctionPure "liikennepaikkavalitDS" liikennepaikkavalitDS
  registerGlobalFunctionPure "rautatieliikennepaikatDS" rautatieliikennepaikatDS
  registerGlobalFunctionPure "liikennepaikanOsatDS" liikennepaikanOsatDS
  registerGlobalFunctionPure "raideosuudetDS" raideosuudetDS
  registerGlobalFunctionPure "laituritDS" laituritDS
  registerGlobalFunctionPure "elementitDS" elementitDS
  registerGlobalFunctionPure "lorajatDS" lorajatDS
  registerGlobalFunctionPure "aikataulupaikatDS" aikataulupaikatDS
  registerGlobalFunctionPure "ratatyoElementitDS" ratatyoElementitDS
  registerGlobalFunctionPure "ratapihapalveluTyypitDS" ratapihapalveluTyypitDS
  registerGlobalFunctionPure "opastintyypitDS" opastintyypitDS
  registerGlobalFunctionPure "vaihdetyypitDS" vaihdetyypitDS
  registerGlobalFunctionPure "kpalueetDS" kpalueetDS
  registerGlobalFunctionPure "ohjausalueetDS" ohjausalueetDS
  registerGlobalFunctionPure "kayttokeskuksetDS" kayttokeskuksetDS
  registerGlobalFunctionPure "lisualueetDS" lisualueetDS
  registerGlobalFunctionPure "objektityypitDS" objektityypitDS
  registerGlobalFunctionPure "estyypitDS" estyypitDS
  registerGlobalFunctionPure "asiatDS" asiatDS

  registerGlobalFunctionPure "hakuUrlitInfraDS" searchInfraDS
  registerGlobalFunctionPure "hakuUrlitEtj2DS" searchJetiDS
  registerGlobalFunctionPure "hakuUrlitRumaDS" searchRumaDS

  registerGlobalFunction "loadTooltips" loadTooltips
  registerGlobalFunction "loadRevisions" loadRevisions
  registerGlobalFunction "loadData" loadData

  addMeta [("charset", "UTF-8")]
  setTitle "Rafiikka"
  addStyle "lib/ol.css"
  addStyle "lib/ol-layerswitcher.css"
  addStyle "lib/selectize.min.css"
  addStyle "style.css"

  addScriptSrc "lib/DragDropTouch.js"
  addScriptSrc "lib/datefns.js"
  addScriptSrc "drag.js"

  simple runSnabbdom () Frontpage.view stage

  --setTimeout (secondsToNominalDiffTime 1) loadTooltips
  --setTimeout (secondsToNominalDiffTime 2) loadRevisions
  --setTimeout (secondsToNominalDiffTime 3) loadData

loadTooltips :: JSM ()
loadTooltips = (do getElementById "palkki") >>= \x -> do
  info @Show ("Initializing tooltips" :: Text)
  initTooltips $ fromJust x

loadRevisions :: JSM ()
loadRevisions = do
  info @Show ("Loading revisions" :: Text)
  infraAPIrevisionsUrl >>= getRevision "infra"
  etj2APIrevisionsUrl >>= getRevision "etj2"

loadWithDelay :: DataSource -> JSM ()
loadWithDelay ds = do
  liftIO (sleep 1)
  load ds

loadData :: JSM ()
loadData = do
  info @Show ("Loading all datasources" :: Text)
  ds <- sequence [
    ratanumerotDS,
    liikennepaikkavalitDS,
    rautatieliikennepaikatDS,
    liikennepaikanOsatDS,
    raideosuudetDS,
    laituritDS,
    elementitDS,
    lorajatDS,
    aikataulupaikatDS,
    ratatyoElementitDS,
    ratapihapalveluTyypitDS,
    opastintyypitDS,
    vaihdetyypitDS,
    kpalueetDS,
    ohjausalueetDS,
    kayttokeskuksetDS,
    lisualueetDS,
    objektityypitDS,
    estyypitDS,
    asiatDS
   ]
  traverse_ loadWithDelay ds

getRevision :: Text -> APIResponse (NonEmpty Revision) -> JSM ()
getRevision api (APIResponse url) = getJson Revisions url Nothing (debug @Show) $ \x -> do
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
