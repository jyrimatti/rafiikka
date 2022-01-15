{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TypeApplications #-}

module Yleiset where

import Universum
import Data.Time (UTCTime, CalendarDiffTime)
import Control.Lens ()
import Data.Time.Calendar.MonthDay ()
import Data.Time.Calendar.OrdinalDate ()
import Time (parseInstant, parseInterval, parseDurationFrom, parseDurationTo, removeDuration, addDuration, showISO)
import Language.Javascript.JSaddle (new, jsg, JSM, JSVal, ToJSVal (toJSVal), JSString)

parseInterval_ :: Text -> JSM (Maybe [Maybe JSVal])
parseInterval_ txt =
  let ts = parseTimeSetting txt
  in case ts of 
    Just t@(DurationFrom _ d) -> do
      start <- new (jsg @JSString "Date") . showISO $ getStart t
      end   <- new (jsg @JSString "Date") . showISO $ getEnd t
      dur   <- toJSVal $ showISO d
      pure $ Just [Just start, Just end, Just dur, Nothing]
    Just t@(DurationTo d _) -> do
      start <- new (jsg @JSString "Date") . showISO $ getStart t
      end   <- new (jsg @JSString "Date") . showISO $ getEnd t
      dur   <- toJSVal $ showISO d
      pure $ Just [Just start, Just end, Nothing, Just dur]
    Just t -> do
      start <- new (jsg @JSString "Date") . showISO $ getStart t
      end   <- new (jsg @JSString "Date") . showISO $ getEnd t
      pure $ Just [Just start, Just end, Nothing, Nothing]
    Nothing -> pure Nothing

data TimeSetting =
    Instant UTCTime
  | Interval UTCTime UTCTime
  | DurationFrom UTCTime CalendarDiffTime
  | DurationTo CalendarDiffTime UTCTime
  deriving (Show)

parseTimeSetting :: Text -> Maybe TimeSetting
parseTimeSetting x =
  Instant <$> parseInstant x <|>
  uncurry Interval <$> parseInterval x <|>
  uncurry DurationFrom <$> parseDurationFrom x <|>
  uncurry DurationTo <$> parseDurationTo x

getStart :: TimeSetting -> UTCTime
getStart (Instant x) = x
getStart (Interval x _) = x
getStart (DurationFrom x _) = x
getStart (DurationTo d x) = removeDuration x d

getEnd :: TimeSetting -> UTCTime
getEnd (Instant x) = x
getEnd (Interval _ x) = x
getEnd (DurationFrom x d) = addDuration x d
getEnd (DurationTo _ x) = x

getDurationFrom :: TimeSetting -> Maybe CalendarDiffTime
getDurationFrom (DurationFrom _ x) = Just x
getDurationFrom _ = Nothing

getDurationTo :: TimeSetting -> Maybe CalendarDiffTime
getDurationTo (DurationTo x _ ) = Just x
getDurationTo _ = Nothing