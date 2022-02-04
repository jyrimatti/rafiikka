{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TypeApplications #-}
{-# OPTIONS_GHC -Wno-orphans #-}
{-# LANGUAGE LambdaCase #-}

module Yleiset where

import Universum
import Data.Time (UTCTime, CalendarDiffTime)
import Data.Time.Calendar.MonthDay ()
import Data.Time.Calendar.OrdinalDate ()
import Time (removeDuration, addDuration, showISO, roundToPreviousDay, parseISO, roundToPreviousMonth, Interval (Interval))
import Language.Javascript.JSaddle (new, jsg, JSM, ToJSVal (toJSVal), JSString, FromJSVal (fromJSVal), obj, (<#), (!), ghcjsPure, js0)
import State (TimeSetting (DurationFrom, DurationTo, Span, Instant), parseTimeSetting, AppState (AppState), Degrees (Degrees), parseState, Mode (Map, Diagram), Location (Location))
import Control.Lens ((+~), (-~))
import Data.Time.Lens (months, FlexibleDateTime (flexDT))
import Browser (withDebug)
import GHCJS.Foreign ( jsUndefined, isUndefined, isFunction )
import Data.List.NonEmpty (fromList)
import FFI (deserializationFailure)

parseInterval_ :: Text -> Maybe TimeSetting 
parseInterval_ = parseTimeSetting

instance ToJSVal TimeSetting where
  toJSVal x = toJSVal $ case x of
    t@(DurationFrom _ d) -> do
      start <- new (jsg @JSString "Date") . showISO $ getStart t
      end   <- new (jsg @JSString "Date") . showISO $ getEnd t
      dur   <- toJSVal $ showISO d
      pure [start, end, dur, jsUndefined]
    t@(DurationTo d _) -> do
      start <- new (jsg @JSString "Date") . showISO $ getStart t
      end   <- new (jsg @JSString "Date") . showISO $ getEnd t
      dur   <- toJSVal $ showISO d
      pure [start, end, jsUndefined, dur]
    t -> do
      start <- new (jsg @JSString "Date") . showISO $ getStart t
      end   <- new (jsg @JSString "Date") . showISO $ getEnd t
      pure [start, end, jsUndefined, jsUndefined]

instance FromJSVal UTCTime where
  fromJSVal x = do
    undef <- ghcjsPure $ isUndefined x
    if undef
      then deserializationFailure x "UTCTime"
      else do
        a <- x ! ("toISOString" :: JSString)
        isFun <- ghcjsPure $ isFunction a
        if not isFun
          then deserializationFailure x "UTCTime"
          else do
            b <- x ^. js0 ("toISOString" :: JSString)
            isUndef <- ghcjsPure $ isUndefined b
            if isUndef
              then deserializationFailure x "UTCTime"
              else do
                a1 <- fromJSVal b
                pure $ parseISO =<< a1

instance ToJSVal UTCTime where
  toJSVal = new (jsg @JSString "Date") . showISO 

startOfDayUTC_ :: UTCTime -> UTCTime
startOfDayUTC_ = roundToPreviousDay

startOfMonthUTC_ :: UTCTime -> UTCTime
startOfMonthUTC_ = roundToPreviousMonth

getStart :: TimeSetting -> UTCTime
getStart (Instant x)           = x
getStart (Span (Interval x _)) = x
getStart (DurationFrom x _)    = x
getStart (DurationTo d x)      = removeDuration d x

getEnd :: TimeSetting -> UTCTime
getEnd (Instant x)           = x
getEnd (Span (Interval _ x)) = x
getEnd (DurationFrom x d)    = addDuration d x
getEnd (DurationTo _ x)      = x

getDurationFrom :: TimeSetting -> Maybe CalendarDiffTime
getDurationFrom (DurationFrom _ x) = Just x
getDurationFrom _ = Nothing

getDurationTo :: TimeSetting -> Maybe CalendarDiffTime
getDurationTo (DurationTo x _ ) = Just x
getDurationTo _ = Nothing

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

instance ToJSVal AppState where
  toJSVal (AppState mode (Degrees rotation) layers t location) = do
    o <- obj
    o <# ("moodi" :: JSString) $ case mode of Map -> "map" :: Text; Diagram -> "diagram"
    whenJust location $
      (o <# ("sijainti" :: JSString)) . (\(Location x) -> x)
    o <# ("rotaatio" :: JSString) $ show @Text rotation
    o <# ("tasot" :: JSString) $ show @Text <$> layers
    o <# ("aika" :: JSString) $ t
    toJSVal o


parseState_ :: [Text] -> JSM AppState
parseState_ xs = withDebug ("parseState_: " <> show xs) $
  parseState xs