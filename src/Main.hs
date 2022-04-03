{-# LANGUAGE OverloadedStrings, ScopedTypeVariables, TypeApplications #-}
{-# OPTIONS_GHC -Wno-unused-imports #-}

module Main where

import Universum
import FFI ( registerGlobalFunction1, registerGlobalFunction, registerGlobalFunctionPure1, registerGlobalFunction2 )
import Tooltips ( initTooltips )
import Shpadoinkle ( JSM )
import Shpadoinkle.Backend.Snabbdom (runSnabbdom, stage)
import Shpadoinkle.Html ( addMeta, addScriptSrc, addStyle, setTitle )
import Shpadoinkle.Run              (runJSorWarp, simple, liveWithStaticAndIndex)
import qualified Data.ByteString.Lazy as B
import Language.Javascript.JSaddle.Run (enableLogging)
import Data.Maybe (fromJust)
import Data.Time.Clock (secondsToNominalDiffTime)
import Browser (setTimeout, getElementById)
import Frontpage (view)
import Shpadoinkle.Console (debug)
import Yleiset (parseInterval_, startOfDayUTC_, startOfMonthUTC_, laajennaAikavali_)
import StateAccessor (getStates, getState, getMainState, setState, setMainState, removeSubState)
import State (defaultState)

main :: IO ()
main = do
  putTextLn "\nRafiikka"
  putTextLn "http://localhost:8080\n"
  runJSorWarp 8080 app

dev :: IO ()
dev = do
  bs <- B.readFile "./index-debug.html"
  liveWithStaticAndIndex bs 8080 app "./"

app :: JSM ()
app = do
  enableLogging True

  registerGlobalFunctionPure1 "parseInterval" parseInterval_
  registerGlobalFunctionPure1 "startOfDayUTC" startOfDayUTC_
  registerGlobalFunctionPure1 "startOfMonthUTC" startOfMonthUTC_
  registerGlobalFunctionPure1 "laajennaAikavali" laajennaAikavali_
  registerGlobalFunction "getStates" getStates
  registerGlobalFunction "defaultState" defaultState
  registerGlobalFunction1 "initTooltips" initTooltips
  registerGlobalFunction1 "getState" getState
  registerGlobalFunction2 "setState" setState
  registerGlobalFunction "getMainState" getMainState
  registerGlobalFunction1 "setMainState" setMainState
  registerGlobalFunction1 "removeSubState" removeSubState

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

  setTimeout (secondsToNominalDiffTime 2) $ (do debug @Show ("cb!" :: [Char]); getElementById "palkki") >>= \x -> do
    debug @Show ("acting!" :: [Char]);
    initTooltips $ fromJust x

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
