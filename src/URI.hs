{-# LANGUAGE QuasiQuotes #-}
{-# LANGUAGE RecordWildCards #-}
{-# LANGUAGE NamedFieldPuns #-}
{-# LANGUAGE ScopedTypeVariables #-}
module URI where

import Universum hiding (local)
import Text.URI (mkURI, URI, mkPathPiece, mkQueryKey, mkQueryValue, QueryParam (QueryParam, QueryFlag), unRText)
import Text.URI.Lens (uriPath, uriQuery, uriTrailingSlash)
import Text.URI.QQ
import Browser
import JSDOM.Types (JSM)
import JSDOM (currentWindow)
import Language.Javascript.JSaddle ((!))
import Language.Javascript.JSaddle.Classes (FromJSVal(fromJSVal))
import Data.Maybe (fromJust)
import Types (Train (Train, departureDate, trainNumber), Revisions (infra, etj2))
import URISerialization (ToURIFragment(toURIFragment))
import Time (startOfTime, endOfTime, Interval (Interval), roundToPreviousMonth, roundToNextMonth, roundToPreviousDay)
import StateAccessor (getMainState)
import State (AppState(AppState, timeSetting), roundTimeSettingToPreviousDay, toInterval, TimeSetting)
import Control.Lens (filtered, folded)

aikatauluAPIUrl :: URI
aikatauluAPIUrl = [uri|https://rata.digitraffic.fi/api/v1/trains/|]

graphQLUrl :: URI
graphQLUrl = [uri|https://rata.digitraffic.fi/api/v1/graphql/graphiql/?|]

mqttHost :: Text
mqttHost = "rata.digitraffic.fi"

mqttPort :: Natural
mqttPort = 443;

mqttTopic :: Maybe Train -> Text
mqttTopic (Just Train{..}) = "train-locations/" <> toURIFragment departureDate <> "/" <> toURIFragment trainNumber
mqttTopic Nothing          = "train-locations/#"

infiniteInterval :: MonadThrow m => m QueryParam
infiniteInterval = QueryParam <$> mkQueryKey "time"
                              <*> mkQueryValue (toURIFragment $ Interval startOfTime endOfTime)

infraInterval :: JSM [QueryParam]
infraInterval = do
    AppState{timeSetting} <- getMainState
    pure $ QueryParam <$> mkQueryKey "time"
                      <*> mkQueryValue (toURIFragment $ roundTimeSettingToPreviousDay timeSetting)

etj2Interval :: JSM [QueryParam]
etj2Interval = do
    AppState{timeSetting} <- getMainState
    let (Interval start end) = toInterval timeSetting
    pure $ QueryParam <$> mkQueryKey "time"
                      <*> mkQueryValue (toURIFragment $ Interval (roundToPreviousMonth start) (roundToNextMonth end))

rumaInterval :: JSM [QueryParam]
rumaInterval = do
    AppState{timeSetting} <- getMainState
    let (Interval start end) = toInterval timeSetting
    pure $ mkParam "start" (roundToPreviousDay start) <>
           mkParam "end"   (roundToPreviousDay end)

mkParam :: (Applicative f, MonadThrow f, ToURIFragment v) => Text -> v -> f QueryParam
mkParam key value = QueryParam <$> mkQueryKey key
                               <*> mkQueryValue (toURIFragment value)

baseInfraAPIUrl :: Bool -> JSM URI
baseInfraAPIUrl skipRevision = baseUrl "infra" (if skipRevision then Nothing else Just infra)

baseEtj2APIUrl :: Bool -> JSM URI
baseEtj2APIUrl skipRevision = baseUrl "jeti" (if skipRevision then Nothing else Just etj2)

-- Infra-API URL with time
infraAPIUrl :: JSM URI
infraAPIUrl = over uriQuery . (<>) <$> infraInterval <*> baseInfraAPIUrl False

-- Etj2-API URL with time
etj2APIUrl :: JSM URI
etj2APIUrl = over uriQuery . (<>) <$> etj2Interval <*> baseEtj2APIUrl False

infraAPIrevisionsUrl :: JSM URI
infraAPIrevisionsUrl = over uriQuery (<> mkParam "count" (1 :: Int)) .
                       over uriPath (<> mkPathPiece "revisions.json")
                       <$> baseInfraAPIUrl False

etj2APIrevisionsUrl :: JSM URI
etj2APIrevisionsUrl = over uriQuery (<> mkParam "count" (1 :: Int)) .
                      over uriPath (<> mkPathPiece "revisions.json")
                      <$> baseEtj2APIUrl False

baseUrl :: Text -> Maybe (Revisions -> Text) -> JSM URI
baseUrl api revision = do
    safari <- isSafari
    local <- isLocal
    seed <- isSeed

    Just win <- currentWindow
    Just revs <- fromJSVal =<< win ! ("revisions" :: Text)

    pure $ 
        set uriTrailingSlash True $
        fromJust $ mkURI $
        "https://" <>
        (if safari || local || seed then "rafiikka.lahteenmaki.net" else "rata.digitraffic.fi") <>
        "/" <> api <> "-api/0.7" <> maybe "" (("/" <>) . ($ revs)) revision

appendPath :: Text -> URI -> URI
appendPath = over uriPath . (<>) . mkPathPiece

cqlFilter :: Text -> URI -> URI
cqlFilter = over uriQuery . (<>) . mkParam "cql_filter"

propertyName :: Text -> URI -> URI
propertyName = over uriQuery . (<>) . mkParam "propertyName"

withTime :: Maybe TimeSetting -> URI -> URI
withTime Nothing = id
withTime (Just ts) =
    over uriQuery (<> mkParam "time" (toURIFragment ts)) .
    over uriQuery (\params -> params^..folded.filtered isTimeParam)

isTimeParam :: QueryParam -> Bool
isTimeParam (QueryFlag key) = unRText key == "time"
isTimeParam (QueryParam key _) = unRText key == "time"

ratanumeroUrl :: Text -> JSM URI
ratanumeroUrl ratanumero =
    appendPath "radat.json" .
    cqlFilter ("ratanumero=" <> ratanumero)
    <$> infraAPIUrl

ratanumerotUrl :: JSM URI
ratanumerotUrl =
    appendPath "radat.json" .
    propertyName "ratakilometrit,ratanumero,objektinVoimassaoloaika"
    <$> infraAPIUrl