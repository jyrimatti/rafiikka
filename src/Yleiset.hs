{-# LANGUAGE ScopedTypeVariables #-}
{-# OPTIONS_GHC -Wno-orphans #-}
{-# LANGUAGE TypeApplications #-}

module Yleiset where

import Universum hiding (get)
import Data.Time (UTCTime)
import Data.Time.Calendar.MonthDay ()
import Data.Time.Calendar.OrdinalDate ()
import Time (roundToPreviousDay, roundToPreviousMonth, Interval (Interval))
import Control.Lens ((+~), (-~))
import Data.Time.Lens (months, FlexibleDateTime (flexDT))
import Data.List.NonEmpty (fromList)
import URISerialization (FromURIFragment(fromURIFragment))
import State (TimeSetting)
import Data.JSString (JSString)
import Language.Javascript.JSaddle (JSVal, JSM, (!), jsg, new, jsg3, FromJSVal)
import Network.URI (URI, parseURI)
import GHCJS.Marshal (FromJSVal(fromJSVal))
import FFI (deserializationFailure)

data DataType = Other | Infra
  deriving Show

instance FromJSVal DataType where
  fromJSVal _ = pure $ Just Other
  -- FIXME

instance FromJSVal URI where
  fromJSVal x = do
    str :: Maybe String <- fromJSVal x
    case str of
      Just s -> case parseURI s of
        Just u -> pure $ Just u
        Nothing -> deserializationFailure x "URI" 
      Nothing -> deserializationFailure x "URI"
    

parseInterval_ :: Text -> Maybe TimeSetting 
parseInterval_ = fromURIFragment

startOfDayUTC_ :: UTCTime -> UTCTime
startOfDayUTC_ = roundToPreviousDay

startOfMonthUTC_ :: UTCTime -> UTCTime
startOfMonthUTC_ = roundToPreviousMonth

expandInterval :: Interval -> Interval
expandInterval (Interval start end) = Interval ((flexDT.months -~ 1) start)
                                               ((flexDT.months +~ 1) end)

laajennaAikavali_ :: NonEmpty UTCTime -> NonEmpty UTCTime
laajennaAikavali_ xs = case toList xs of
  [start, end] ->
    let
      (Interval a3 b3) = expandInterval $ Interval start end
    in fromList [a3, b3]
  _ -> xs

errorHandler :: JSVal -> JSM ()
errorHandler err = do
  errorStack <- err ! ("stack" :: JSString)
  stack <- new (jsg @JSString "Error") () ! ("stack" :: JSString)
  _ <- jsg3 @JSString "log" err errorStack stack
  pure ()
