{-# LANGUAGE OverloadedStrings, ScopedTypeVariables #-}
{-# LANGUAGE TypeApplications #-}

module Main where

import FFI ( registerGlobalFunctionPure, registerGlobalFunction1 )
import Tooltips ( initTooltips )
import Shpadoinkle ( JSM )
import Shpadoinkle.Backend.Snabbdom (runSnabbdom, stage)
import Shpadoinkle.Html ( addMeta, addScriptSrc, addStyle, setTitle )
import Shpadoinkle.Run              (runJSorWarp, simple, liveWithStaticAndIndex)
import Prelude hiding (span, div, max)
import Data.Text (Text)
import qualified Data.ByteString.Lazy as B
import Language.Javascript.JSaddle.Run (enableLogging)
import Data.Maybe (fromJust)
import Data.Time.Clock (secondsToNominalDiffTime)
import Browser (setTimeout, getElementById)
import Frontpage (view)
import Shpadoinkle.Console (debug)

main :: IO ()
main = do
  putStrLn "\nRafiikka"
  putStrLn "http://localhost:8080\n"
  runJSorWarp 8080 app

dev :: IO ()
dev = do
  bs <- B.readFile "./index-debug.html"
  liveWithStaticAndIndex bs 8080 app "./"

app :: JSM ()
app = do
  enableLogging True

  registerGlobalFunctionPure "ikuisuusAlku2" ("2010-01-01T00:00:00Z" :: Text)
  registerGlobalFunction1 "initTooltips" initTooltips

  addMeta [("charset", "UTF-8")]
  setTitle "Rafiikka"
  addStyle "https://cdn.jsdelivr.net/gh/openlayers/openlayers.github.io@master/en/v6.3.1/css/ol.css"
  addStyle "https://unpkg.com/ol-layerswitcher@3.5.0/src/ol-layerswitcher.css"
  addStyle "https://cdnjs.cloudflare.com/ajax/libs/selectize.js/0.12.6/css/selectize.default.min.css"
  addStyle "style.css"

  addScriptSrc "DragDropTouch.js"
  addScriptSrc "datefns.js"
  addScriptSrc "drag.js"

  simple runSnabbdom () view stage

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
